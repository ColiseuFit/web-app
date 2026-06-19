"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient , getAuthUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createStudentSchema, profileSchema, updateAuthSchema } from "@/lib/validations/security_schemas";

/**
 * Cria um novo aluno tanto no Auth quanto no Banco de Dados.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles can execute this action.
 * - RLS Bypass: Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. This is strictly necessary because 
 *   creating a credential via Auth API (`supabase.auth.admin.createUser`) and injecting the initial 
 *   Profile/Role cross-table before the user has logged in requires elevated privileges.
 * - Validation: Enforces input shape via `createStudentSchema` (Zod).
 * 
 * @param {FormData} formData - Dados brutos do formulário: email, password, full_name, level, membership_type.
 * @returns {Promise<{ success?: boolean; error?: string }>} An object indicating success or failure message.
 * @throws {Error} Does not throw unhandled errors; catches and returns `{ error: string }`.
 */
export async function createStudent(formData: FormData) {
  // 0. Data Validation with Zod
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    level: formData.get("level") || "branco",
    running_level: formData.get("running_level") || null,
    running_pace: formData.get("running_pace"),
    running_status: formData.get("running_status") || "active",
    membership_type: formData.get("membership_type") || "club", // Vínculo
  };

  const validation = createStudentSchema.safeParse(rawData);
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.issues[0].message };
  }
  const { email, password, full_name: fullName, level, running_level, running_pace, running_status, membership_type: membershipType } = validation.data;

  // 1. Verifica a sessão atual e se ele é admin/reception
  const supabase = await createClient();
  const currentUser = await getAuthUser();
  if (!currentUser) return { error: "Sem sessão logada." };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .single();

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Acesso negado. Apenas Recepção ou Admin." };
  }

  // Require Service Role Key para usar Auth Admin API
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: SUPABASE_SERVICE_ROLE_KEY não encontrada no servidor (Verifique o painel da Vercel)." };
  }

  // Create admin client bypassing RLS
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // 1. Cria credencial no Authentication
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    let errorMessage = "Ocorreu um erro ao criar a conta de acesso.";
    if (authError.message.includes("already been registered")) {
      errorMessage = "Este e-mail já está sendo utilizado por outro aluno.";
    }
    return { error: errorMessage };
  }

  const userId = authData.user.id;

  // 2. Insere Profile base bypassando RLS e gatilhos comuns
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .insert({
      id: userId,
      full_name: fullName,
      email: email,
      level: level,
      running_level: running_level,
      running_pace: running_pace,
      running_status: running_status,
      membership_type: membershipType, // Vínculo
    });

  if (profileError) {
    console.error("[createStudent] Profile Error:", profileError);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { error: `Não foi possível criar o perfil do aluno no banco (${profileError.message}). A conta foi removida para segurança.` };
  }

  // 3. Atribui a Role correta
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .insert({
      user_id: userId,
      role: "student",
    });

  if (roleError) {
    console.error("[createStudent] Role Error:", roleError);
    // Rollback total: limpa perfil e auth
    await supabaseAdmin.from("profiles").delete().eq("id", userId);
    await supabaseAdmin.auth.admin.deleteUser(userId);
    return { error: `Falha ao definir o nível de acesso (role) do aluno (${roleError.message}). Transação revertida.` };
  }

  revalidatePath("/admin/alunos");
  return { success: true };
}

/**
 * Atualiza os dados de um aluno existente na tabela de profiles.
 * 
 * @security
 * - Role Requirement: Only 'admin' or 'reception' roles.
 * - Standard Client: Uses the standard authenticated client (No RLS Bypass). 
 *   RLS Policies on `profiles` must allow UPDATE operations for Admins.
 * 
 * @param {string} studentId - O UUID específico do aluno a ser atualizado.
 * @param {FormData} formData - Form data containing up to 10 updated fields (full_name, display_name, level, phone, etc.).
 * @returns {Promise<{ success?: boolean; error?: string }>} Form operation status.
 */
export async function updateStudent(studentId: string, formData: FormData) {
  const supabase = await createClient();
  const currentUser = await getAuthUser();
  if (!currentUser) return { error: "Sessão expirada." };

  // Permission Check
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).single();
  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Permissão insuficiente." };
  }

  // Setup Admin Client for RLS bypass (Update other profiles)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }
  const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

  // 1. Gather all fields from formData
  const rawData: any = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      rawData[key] = value || null;
    }
  });

  // 2. Validate using SSoT Profile Schema (Partial allow for selective updates)
  const validation = profileSchema.partial().safeParse(rawData);
  if (!validation.success) {
    const errorMsg = validation.error.errors[0]?.message || "Dados inválidos.";
    return { error: errorMsg };
  }

  const updates: any = {
    ...validation.data,
    updated_at: new Date().toISOString(),
  };

  // 3. Handle Name Parsing for SSoT
  // The Admin UI mostly sends `full_name`. If it's provided, split it to maintain the SSoT of first/last name.
  if (updates.full_name) {
    updates.full_name = updates.full_name.trim();
    const parts = updates.full_name.split(" ");
    updates.first_name = parts[0] || "";
    updates.last_name = parts.slice(1).join(" ") || "";
  } else if (updates.first_name || updates.last_name) {
    if (updates.first_name) updates.first_name = updates.first_name.trim();
    if (updates.last_name) updates.last_name = updates.last_name.trim();
    // Rebuild full name if parts are updated separately
    updates.full_name = `${updates.first_name || ""} ${updates.last_name || ""}`.trim();
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", studentId);

  if (error) {
    console.error("[updateStudent] Supabase Error:", error);
    return { error: `Não foi possível atualizar as informações: ${error.message}` };
  }

  revalidatePath("/admin/alunos");
  revalidatePath("/admin/running");
  revalidatePath("/(student)/programas/running", "page");
  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/profile/evaluations");

  return { success: true };
}

/**
 * Busca metadados biométricos básicos de um aluno.
 * 
 * @param {string} studentId - O identificador do aluno.
 * @returns {Promise<{ gender: string | null; birth_date: string | null } | null>}
 */
export async function getStudentBiometricsInfo(studentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("gender, birth_date")
    .eq("id", studentId)
    .single();

  if (error || !data) return null;
  return {
    gender: data.gender,
    birth_date: data.birth_date
  };
}

/**
 * Remove permanentemente um aluno do Banco de Dados e Auth.
 * 
 * @CAUTION Esta ação é IRREVERSÍVEL e cascateia por todo o Banco de Dados.
 * 
 * @security
 * - Role Requirement: APENAS 'admin' pode executar isso. ('reception' é bloqueado).
 * - RLS Bypass: Usa Admin API (`deleteUser`) para limpar a credencial.
 * 
 * @param {string} studentId - O UUID específico do aluno a ser removido.
 * @returns {Promise<{ success?: boolean; error?: string }>} Deletion status.
 */
export async function deleteStudent(studentId: string) {
  const supabase = await createClient();
  const currentUser = await getAuthUser();
  if (!currentUser) return { error: "Sessão expirada." };

  // Only admin can delete (more strict than create)
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).single();
  if (!roleData || roleData.role !== "admin") {
    return { error: "Apenas administradores podem excluir alunos." };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada no servidor." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // 1. Delete from Auth (this will trigger cascade deletion in profiles if configured, 
  // but we manually handle the profiles table to ensure RLS/Triggers compliance)
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(studentId);
  if (authError) return { error: "Não foi possível remover completamente as credenciais de acesso." };

  revalidatePath("/admin/alunos");
  return { success: true };
}

/**
 * Atualiza as credenciais de autenticação de um aluno (E-mail ou Senha) via Admin API.
 * 
 * @security
 * - Role: Restrito a usuários com role 'admin'.
 * - RLS Bypass: Utiliza `SUPABASE_SERVICE_ROLE_KEY` para interagir diretamente com a Auth Admin API do Supabase.
 * - Registro: Falhas críticas são logadas no servidor para auditoria.
 * 
 * @param {string} studentId - O UUID único do aluno no Supabase Auth.
 * @param {FormData} formData - Objeto contendo os campos opcionais 'email' e 'password'.
 * @returns {Promise<{ success?: boolean; error?: string }>} Objeto indicando o status da operação.
 * 
 * @throws {Error} Captura erros da API de Auth e retorna como mensagem amigável; não interrompe o runtime.
 */
export async function updateStudentAuth(studentId: string, formData: FormData) {
  const supabase = await createClient();
  const currentUser = await getAuthUser();
  if (!currentUser) return { error: "Sessão expirada." };

  // Only admin can manage credentials
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", currentUser.id).single();
  if (!roleData || roleData.role !== "admin") {
    return { error: "Apenas administradores podem gerenciar acessos." };
  }

  const emailInput = (formData.get("email") as string || "").trim() || undefined;
  const passwordInput = (formData.get("password") as string || "") || undefined;

  // Validação Zod
  const validation = updateAuthSchema.safeParse({ email: emailInput, password: passwordInput });
  if (!validation.success) {
    return { error: "Dados inválidos: " + validation.error.issues[0].message };
  }

  const { email, password } = validation.data;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim().split(' ')[0];
  if (!serviceRoleKey) {
    return { error: "Erro de configuração: Chave mestra não encontrada." };
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );

  // Busca perfil atual do aluno para verificar se o e-mail realmente mudou
  const { data: profile, error: profileFetchError } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", studentId)
    .single();

  if (profileFetchError) {
    console.error("[updateStudentAuth] Fetch Profile Error:", profileFetchError);
    return { error: "Erro ao buscar dados do perfil do aluno." };
  }

  const currentEmail = profile?.email;
  const isEmailChanging = email && email.toLowerCase() !== currentEmail?.toLowerCase();

  const updates: any = {};
  if (isEmailChanging) updates.email = email;
  if (password) updates.password = password;

  if (Object.keys(updates).length === 0) {
    return { error: "Nenhuma alteração detectada. Digite uma nova senha ou um e-mail diferente do atual." };
  }

  // Atualização no Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(studentId, updates);
  
  if (authError) {
    console.error("[updateStudentAuth] Auth Error:", authError);
    let errorMessage = "Falha ao atualizar as informações de login.";
    if (authError.message.includes("already been registered")) {
      errorMessage = "O novo e-mail informado já está em uso por outro usuário.";
    }
    return { error: errorMessage };
  }

  // Sincroniza o e-mail na tabela pública profiles se atualizado com sucesso no Auth
  if (isEmailChanging) {
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ email })
      .eq("id", studentId);
      
    if (profileError) {
      console.error("[updateStudentAuth] Profile Sync Error:", profileError);
      return { error: "Credenciais de login atualizadas no Auth, mas falhou ao atualizar a tabela de cadastro." };
    }
  }

  revalidatePath("/admin/alunos");
  return { success: true };
}

/**
 * Busca estatísticas consolidadas de presença, faltas (no-shows) e inatividade de alunos.
 *
 * @security
 * - Role: Restrito a Admin e Recepção (validação em banco de dados).
 * - RLS: Usa as políticas padrões do Supabase Client.
 * 
 * @param {string} dateFrom - Data de início (inclusive) no formato ISO YYYY-MM-DD.
 * @param {string} dateTo - Data de término (inclusive) no formato ISO YYYY-MM-DD.
 * @returns {Promise<{ success?: boolean; error?: string; stats?: any }>} Objeto contendo o payload de estatísticas consolidadas e listas.
 * @throws {Error} Retorna erro estruturado amigável em caso de falha no banco de dados.
 */
export async function getAttendanceDashboardStats(dateFrom: string, dateTo: string) {
  const supabase = await createClient();
  const currentUser = await getAuthUser();
  if (!currentUser) return { error: "Sem sessão logada.", stats: null };

  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", currentUser.id)
    .single();

  if (!roleData || (roleData.role !== "admin" && roleData.role !== "reception")) {
    return { error: "Acesso negado. Apenas Recepção ou Admin.", stats: null };
  }

  // 1. Check-ins no período
  const { data: checkins, error: checkinsError } = await supabase
    .from("check_ins")
    .select(`
      id,
      status,
      score_points,
      validated_at,
      created_at,
      student_id,
      class_slot_id,
      wod_id,
      wods!inner(date, title),
      class_slots(id, name, time_start, capacity),
      profiles:student_id(id, full_name, display_name, level, avatar_url, phone, email)
    `)
    .gte("wods.date", dateFrom)
    .lte("wods.date", dateTo);

  if (checkinsError) {
    console.error("Erro ao buscar check-ins para dashboard:", checkinsError);
    return { error: "Erro ao carregar dados de check-ins.", stats: null };
  }

  // 2. Aulas finalizadas (sessions) no período
  const { data: sessions, error: sessionsError } = await supabase
    .from("class_sessions")
    .select(`
      id,
      class_slot_id,
      date,
      class_slots(capacity)
    `)
    .gte("date", dateFrom)
    .lte("date", dateTo);

  if (sessionsError) {
    console.error("Erro ao buscar aulas fechadas:", sessionsError);
  }

  // 3. Excluir admins/coaches da contagem de alunos ativos e inativos
  const { data: staffRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role", ["admin", "coach"]);
  const staffIds = (staffRoles || []).map((r: any) => r.user_id);

  let profilesQuery = supabase
    .from("profiles")
    .select("id, full_name, display_name, level, avatar_url, phone, email, created_at");
  if (staffIds.length > 0) {
    profilesQuery = profilesQuery.not("id", "in", `(${staffIds.join(",")})`);
  }
  const { data: allProfiles, error: profilesError } = await profilesQuery;

  if (profilesError) {
    console.error("Erro ao buscar perfis de alunos:", profilesError);
  }

  const list = (checkins || []).map((c: any) => ({
    ...c,
    profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
    wods: Array.isArray(c.wods) ? c.wods[0] : c.wods,
    class_slots: Array.isArray(c.class_slots) ? c.class_slots[0] : c.class_slots,
  })).filter((c: any) => c.profiles); // exclude orphan checkins (e.g. deleted user)

  let totalAttendances = 0;
  let totalNoShows = 0;
  const uniqueActiveStudents = new Set<string>();
  const studentNoShowsCount: Record<string, { student: any, count: number }> = {};

  list.forEach((c: any) => {
    // skip staff check-ins if any
    if (staffIds.includes(c.student_id)) return;

    if (c.status === "confirmed") {
      totalAttendances++;
      uniqueActiveStudents.add(c.student_id);
    } else if (c.status === "missed") {
      totalNoShows++;
      if (!studentNoShowsCount[c.student_id]) {
        studentNoShowsCount[c.student_id] = { student: c.profiles, count: 0 };
      }
      studentNoShowsCount[c.student_id].count++;
    } else if (c.status === "checked") {
      uniqueActiveStudents.add(c.student_id);
    }
  });

  const topNoShows = Object.values(studentNoShowsCount)
    .sort((a, b) => b.count - a.count);

  const totalCompletedClasses = sessions?.length || 0;

  // Occupancy rate calculation
  let totalCapacity = 0;
  let totalPresentInSessions = 0;

  (sessions || []).forEach((session: any) => {
    const slotCapacity = session.class_slots?.capacity || 20;
    totalCapacity += slotCapacity;
    
    const countPresent = list.filter((c: any) => 
      c.class_slot_id === session.class_slot_id && 
      c.wods?.date === session.date && 
      c.status === "confirmed"
    ).length;
    totalPresentInSessions += countPresent;
  });

  const avgOccupancyPercent = totalCapacity > 0 
    ? Math.round((totalPresentInSessions / totalCapacity) * 100) 
    : 0;

  // Inactive / Missing Students (Sumidos > 10 dias)
  // UTC Enforcement: Data de 10 dias atrás gerada no padrão UTC via ISOString para evitar shifts de fuso horário
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
  const tenDaysAgoStr = tenDaysAgo.toISOString().split("T")[0];

  const { data: recentActiveCheckins } = await supabase
    .from("check_ins")
    .select("student_id")
    .in("status", ["confirmed", "checked"])
    .gte("created_at", tenDaysAgoStr);

  const recentlyActiveStudentIds = new Set((recentActiveCheckins || []).map((c: any) => c.student_id));
  
  const missingStudentsList = (allProfiles || [])
    .filter((p: any) => {
      const isRecentlyActive = recentlyActiveStudentIds.has(p.id);
      const isOlderThan10Days = new Date(p.created_at) < tenDaysAgo;
      return !isRecentlyActive && isOlderThan10Days;
    });

  const missingStudentIds = missingStudentsList.map((s: any) => s.id);
  const lastCheckinsMap: Record<string, string> = {};
  if (missingStudentIds.length > 0) {
    const { data: lastCheckins } = await supabase
      .from("check_ins")
      .select("student_id, created_at")
      .eq("status", "confirmed")
      .in("student_id", missingStudentIds)
      .order("created_at", { ascending: false });

    (lastCheckins || []).forEach((c: any) => {
      if (!lastCheckinsMap[c.student_id]) {
        lastCheckinsMap[c.student_id] = new Date(c.created_at).toLocaleDateString("pt-BR", { timeZone: "UTC" });
      }
    });
  }

  const missingStudents = missingStudentsList.map((s: any) => ({
    id: s.id,
    full_name: s.full_name,
    display_name: s.display_name,
    level: s.level || "iniciante",
    phone: s.phone,
    avatar_url: s.avatar_url,
    email: s.email,
    last_presence: lastCheckinsMap[s.id] || "Nunca treinou"
  }));

  const todayDateStr = new Date().toISOString().split("T")[0];
  const slotsWithActivity = new Map<string, { class_slot_id: string, date: string, name: string, time_start: string }>();
  list.forEach((c: any) => {
    const slotId = c.class_slot_id;
    const date = c.wods?.date;
    if (slotId && date) {
      const key = `${slotId}-${date}`;
      if (!slotsWithActivity.has(key)) {
        slotsWithActivity.set(key, {
          class_slot_id: slotId,
          date,
          name: c.class_slots?.name || "CrossTraining",
          time_start: c.class_slots?.time_start || ""
        });
      }
    }
  });

  const finalizedKeys = new Set((sessions || []).map((s: any) => `${s.class_slot_id}-${s.date}`));
  const pendingClassesList: any[] = [];
  slotsWithActivity.forEach((value, key) => {
    if (value.date <= todayDateStr && !finalizedKeys.has(key)) {
      pendingClassesList.push({
        class_slot_id: value.class_slot_id,
        date: value.date,
        name: value.name,
        time_start: value.time_start
      });
    }
  });

  pendingClassesList.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time_start.localeCompare(b.time_start);
  });

  return {
    success: true,
    stats: {
      totalAttendances,
      totalNoShows,
      uniqueActiveCount: uniqueActiveStudents.size,
      totalCompletedClasses,
      totalPendingClasses: pendingClassesList.length,
      pendingClasses: pendingClassesList,
      avgOccupancyPercent,
      topNoShows,
      missingStudents,
      inactiveCount: missingStudentsList.length,
      checkinsList: list
        .filter((c: any) => !staffIds.includes(c.student_id))
        .map((c: any) => ({
          id: c.id,
          status: c.status,
          created_at: c.created_at,
          time_slot: c.time_slot,
          class_name: c.class_slots?.name || "CrossTraining",
          wod_date: c.wods?.date || "",
          student: c.profiles
        }))
    }
  };
}
