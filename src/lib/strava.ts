import { createClient } from "@supabase/supabase-js";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

/**
 * Garante que temos um access_token válido para o Strava.
 * Se estiver expirado (ou prestes a expirar), utiliza o refresh_token para obter um novo.
 */
export async function getValidStravaToken(studentId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Busca integração do aluno
  const { data: integration, error } = await supabase
    .from("athlete_integrations")
    .select("*")
    .eq("student_id", studentId)
    .eq("provider", "strava")
    .single();

  if (error || !integration) {
    throw new Error(`Integração Strava não encontrada para o aluno ${studentId}`);
  }

  // 2. Verifica se o token ainda é válido (margem de 5 minutos)
  const now = Math.floor(Date.now() / 1000);
  if (integration.expires_at > now + 300) {
    return integration.access_token;
  }

  console.log(`[STRAVA] Token expirado para aluno ${studentId}. Atualizando...`);

  // 3. Atualiza o token via API do Strava
  const response = await fetch("https://www.strava.com/api/v3/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: integration.refresh_token,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Falha ao atualizar token Strava: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();

  // 4. Salva o novo token no banco
  const { error: updateError } = await supabase
    .from("athlete_integrations")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("id", integration.id);

  if (updateError) {
    throw new Error(`Falha ao salvar novo token Strava: ${updateError.message}`);
  }

  console.log(`[STRAVA] Token atualizado com sucesso para aluno ${studentId}.`);
  return data.access_token;
}
