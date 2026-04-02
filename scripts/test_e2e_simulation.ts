import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service_role to bypass RLS in the script
const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimulation() {
  console.log("--- INICIANDO SIMULAÇÃO E2E (ALUNO -> ADMIN -> POINTS) ---");

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
  console.log(`[Aluno Encontrado] Nome: ${student.full_name} | Pontos Atuais: ${student.points_balance}`);

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
  await supabase.from("check_ins").delete().eq("class_slot_id", slot.id).eq("student_id", student.id);

  // 3. Aluno realiza Check-in
  console.log("-> [AÇÃO ALUNO] Realizando Check-in na porta do app...");
  const { error: checkinError } = await supabase.from("check_ins").insert({
    class_slot_id: slot.id,
    student_id: student.id,
    time_slot: slot.time_start.substring(0, 5),
    status: 'checked'
  });

  if (checkinError) {
    console.error("Erro no check-in:", checkinError);
    return;
  }
  console.log("✓ Check-in realizado com sucesso.");

  // 4. Admin/Coach Fecha a Aula e Distribui Pontos
  console.log("-> [AÇÃO COACH] Finalizando a aula e confirmando presença...");
  
  // A - Marcar aula como finalizada (Simulação de validated_at)
  const { error: updateError } = await supabase
    .from("check_ins")
    .update({ 
      status: "confirmed", 
      validated_at: new Date().toISOString(),
      score_points: 50 
    })
    .eq("class_slot_id", slot.id)
    .eq("student_id", student.id);

  if (updateError) {
    console.error("Erro ao validar presença:", updateError);
    return;
  }

  // B - Distribuir Pontos via RPC
  console.log("-> Distribuindo 50 Pontos para o aluno presente...");
  // Nota: Assumindo que o RPC increment_points existe conforme documentado no schema.sql
  await supabase.rpc('increment_points', { 
    user_id: student.id, 
    amount: 50 
  });
  
  console.log("✓ Aula Fechada! Pontos Distribuídos.");

  // 5. Validar o saldo final no banco
  const { data: updatedStudent } = await supabase
    .from("profiles")
    .select("points_balance")
    .eq("id", student.id)
    .single();

  console.log(`[RESULTADO FINAL] Novo Saldo de Pontos do Aluno: ${updatedStudent?.points_balance} Points`);
  console.log("--- SIMULAÇÃO E2E CONCLUÍDA COM SUCESSO ---");
}

runSimulation();
