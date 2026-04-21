import { NextResponse } from "next/server";

/**
 * Rota GET: /api/auth/strava
 * Inicia o fluxo de OAuth2 enviando o usuário para o gateway do Strava.
 */
export async function GET(request: Request) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  
  if (!clientId) {
    return NextResponse.json(
      { error: "STRAVA_CLIENT_ID não configurado." },
      { status: 500 }
    );
  }

  // Determinar a URL base (lidar com 0.0.0.0 -> localhost em dev)
  let origin = new URL(request.url).origin;
  if (process.env.NODE_ENV === 'development' || origin.includes("0.0.0.0")) {
    origin = "http://localhost:3000";
  }
  
  const redirectUri = `${origin}/api/auth/strava/callback`;

  // Precisamos das permissões: activity:read_all (para ler km dos treinos) 
  // e read (padrão)
  const scope = "read,activity:read_all";
  
  // URL de Autorização
  const stravaAuthUrl = new URL("https://www.strava.com/oauth/authorize");
  stravaAuthUrl.searchParams.append("client_id", clientId);
  stravaAuthUrl.searchParams.append("redirect_uri", redirectUri);
  stravaAuthUrl.searchParams.append("response_type", "code");
  stravaAuthUrl.searchParams.append("scope", scope);
  stravaAuthUrl.searchParams.append("approval_prompt", "force"); // Sempre forçar pedir pra garantir tokens limpos
  
  // Redireciona o cliente para o login oficial do Strava
  return NextResponse.redirect(stravaAuthUrl.toString());
}
