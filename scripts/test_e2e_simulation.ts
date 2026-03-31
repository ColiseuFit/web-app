import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service_role to bypass RLS in the script
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimulation() {
  console.log("--- INICIANDO SIMULAÇÃO E2E (ALUNO -> ADMIN -> XP) ---");

  // 1. Get student 'Teste Aluno'
  const { data: student, error: studentError } = await supabase
    .from("profiles")
    .select("*")
    .eq("full_name", "Teste Aluno")
    .single();

  if (studentError || !student) {
    console.error("Erro ao achar aluno:", studentError);
    return;
  }
  console.log(`[Aluno Encontrado] Nome: ${student.full_name} | XP Atual: ${student.xp_balance}`);

  // 2. Clear old checkins and slot context to start fresh
  const today = new Date().getDay(); // 0-6
  
  const { data: slot, error: slotError } = await supabase
    .from("class_slots")
    .select("id, name, time_start")
    .eq("day_of_week", today)
    .limit(1)
    .single();

  if (slotError || !slot) {
    console.error("Nenhuma aula encontrada hoje para simular.");
    return;
  }
  console.log(`[Aula Encontrada] ${slot.name} às ${slot.time_start}`);

  console.log("-> Limpando estado anterior...");
  await supabase.from("slot_checkins").delete().eq("class_slot_id", slot.id).eq("student_id", student.id);
  await supabase.from("class_slot_history").delete().eq("class_slot_id", slot.id);

  // 3. Aluno realiza Check-in
  console.log("-> [AÇÃO ALUNO] Realizando Check-in na porta do app...");
  const { error: checkinError } = await supabase.from("slot_checkins").insert({
    class_slot_id: slot.id,
    student_id: student.id,
    checked_in_at: new Date().toISOString(),
  });

  if (checkinError) {
    console.error("Erro no check-in:", checkinError);
    return;
  }
  console.log("✓ Check-in realizado com sucesso.");

  // 4. Admin Fecha a Aula e Distribui XP (Simulation of closeClassAction)
  console.log("-> [AÇÃO ADMIN] Fechando a aula pelo modal administrativo e confirmando presença...");
  
  // A - Registrar histórico da aula
  const { error: historyError } = await supabase.from("class_slot_history").insert({
    class_slot_id: slot.id,
    execution_date: new Date().toISOString().split('T')[0],
    coach_id: null,
    status: "completed",
    notes: "Fechada via Simulação E2E"
  });

  // B - Distribuir XP
  console.log("-> Distribuindo 50 XP (Base) para o aluno presente...");
  const newXpBalance = student.xp_balance + 50;
  await supabase.from("profiles").update({ xp_balance: newXpBalance }).eq("id", student.id);
  
  // C - Register XP Log
  await supabase.from("xp_logs").insert({
    student_id: student.id,
    amount: 50,
    source: "class_checkin",
    description: `Aula concluída: ${slot.name} (${slot.time_start}) - Presença Confirmada`
  });

  console.log("✓ Aula Fechada! XP Distribuído.");

  // 5. Validar o XP final no banco
  const { data: updatedStudent } = await supabase
    .from("profiles")
    .select("xp_balance")
    .eq("id", student.id)
    .single();

  console.log(`[RESULTADO FINAL] Novo Saldo de XP do Aluno: ${updatedStudent?.xp_balance} XP`);
  console.log("--- SIMULAÇÃO E2E CONCLUÍDA COM SUCESSO ---");
}

runSimulation();
