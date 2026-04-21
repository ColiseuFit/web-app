import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error"); // Caso o usuário recuse

    if (error === "access_denied") {
    // Usuário clicou em cancelar no popup do Strava
    return NextResponse.redirect(`${origin}/programas/running?error=strava_denied`);
  }

  if (!code) {
    return NextResponse.json({ error: "Missing authorization code" }, { status: 400 });
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("Missing Strava env vars");
    return NextResponse.redirect(`${origin}/programas/running?error=server_config`);
  }

  try {
    // 1. Trocar o CODE pelos Tokens na API do Strava
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code"
      })
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error("Strava token exchange failed:", err);
      return NextResponse.redirect(`${origin}/programas/running?error=strava_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    /**
     * tokenData conterá:
     * token_type: "Bearer",
     * expires_at: 1568775134,
     * expires_in: 21600,
     * refresh_token: "e5n5...",
     * access_token: "a4b...",
     * athlete: { id: 12345, username: "..." }
     */

    // 2. Identificar o Aluno Logado
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      // Usuário não está logado no nosso app
      return NextResponse.redirect(`${origin}/login?redirect=/api/auth/strava`);
    }

    // 3. Salvar as chaves na nossa tabela Blindada de Integrações
    const { error: dbError } = await supabase
      .from("athlete_integrations")
      .upsert({
        student_id: user.id,
        provider: "strava",
        provider_athlete_id: tokenData.athlete.id.toString(),
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: tokenData.expires_at
      }, {
        onConflict: "student_id, provider"
      });

    if (dbError) {
      console.error("Supabase upsert failed:", dbError);
      return NextResponse.redirect(`${origin}/programas/running?error=db_save_failed`);
    }

    // 4. Sucesso! Redireciona o atleta de volta para a sua página de perfil ou Running Hub
    return NextResponse.redirect(`${origin}/programas/running?success=strava_connected`);

  } catch (error) {
    console.error("Strava callback error:", error);
    return NextResponse.redirect(`${origin}/programas/running?error=unknown`);
  }
}
