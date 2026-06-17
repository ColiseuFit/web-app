import { NextResponse } from "next/server";
import { getTvData } from "@/app/tv/actions";
import { getTvDailyLeaderboard, getTvWeeklyLeaderboard } from "@/app/tv/actions-leaderboard";

// Forçar execução dinâmica no servidor (Serverless) quando o cache CDN expirar
export const dynamic = "force-dynamic";

/**
 * GET /api/tv
 * 
 * Endpoint REST consolidado para a Coliseu TV.
 * Retorna em um único payload os slots/WOD do dia, o ranking diário e o ranking semanal.
 * 
 * @security Edge CDN Caching:
 * - A resposta é cacheada na borda da rede global da Vercel (Edge CDN) por 30 segundos.
 * - Evita invocações de funções Serverless (Active CPU) e requisições ao Supabase
 *   para as requisições recorrentes das TVs no box.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date") || undefined;

    // Busca todos os dados necessários em paralelo
    const [tvDataRes, dailyLeaderboardRes, weeklyLeaderboardRes] = await Promise.all([
      getTvData(dateStr),
      getTvDailyLeaderboard(dateStr),
      getTvWeeklyLeaderboard()
    ]);

    if (tvDataRes.error) {
      return NextResponse.json({ error: tvDataRes.error }, { status: 500 });
    }

    const payload = {
      tvData: tvDataRes.data || null,
      dailyLeaderboard: dailyLeaderboardRes.success ? (dailyLeaderboardRes.data || null) : null,
      weeklyLeaderboard: weeklyLeaderboardRes.success ? (weeklyLeaderboardRes.data || null) : null
    };

    // Cabeçalho de cache CDN de borda da Vercel
    // Caches por 60 segundos, servindo cache obsoleto por mais 30 segundos enquanto revalida em background
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
        "CDN-Cache-Control": "public, s-maxage=60",
        "Vercel-CDN-Cache-Control": "public, s-maxage=60"
      }
    });

  } catch (err: any) {
    console.error("[API-TV] Erro interno na consolidação de dados:", err);
    return NextResponse.json(
      { error: err.message || "Erro desconhecido ao consolidar dados da TV." },
      { status: 500 }
    );
  }
}
