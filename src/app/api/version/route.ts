import { APP_VERSION } from "@/lib/constants/version";

export const runtime = "edge";

/**
 * API de Verificação de Versão
 * 
 * Utilizada pelo cliente para detectar se há uma nova versão disponível no servidor.
 * Executa no Edge runtime e utiliza cache do CDN para evitar execução serverless desnecessária.
 */
export async function GET() {
  return new Response(JSON.stringify({ version: APP_VERSION }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}

