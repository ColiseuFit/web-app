import { getBoxSettings, getPointsRules, getLevels } from "@/lib/constants/settings_actions";
import { createClient } from "@/lib/supabase/server";
import SettingsTabs from "./SettingsTabs";

/**
 * Admin Settings Page: Box configuration and system preferences.
 * 
 * @architecture
 * - Server Component fetched initial values from SSoT (Supabase).
 * - Delegates interactivity to SettingsTabs (Client Component).
 * - Implements parallel pre-fetching for instantaneous page load.
 * 
 * @analytics
 * - Busca contagem de visualizações do vídeo ativo para exibição no painel de analytics.
 */
export default async function SettingsPage() {
  const supabase = await createClient();

  // Fetch initial settings from DB in parallel
  const [initialSettings, initialRules, initialLevels] = await Promise.all([
    getBoxSettings(),
    getPointsRules(),
    getLevels()
  ]);

  // Fetch video analytics data (dependent on settings for video_id)
  const currentVideoId = initialSettings.featured_video_id || "";
  
  const [videoViewsResult, totalStudentsResult] = await Promise.all([
    currentVideoId 
      ? supabase.from("video_views").select("id", { count: "exact", head: true }).eq("video_id", currentVideoId)
      : Promise.resolve({ count: 0 }),
    supabase.from("profiles").select("id", { count: "exact", head: true })
  ]);

  const videoViewCount = (videoViewsResult as any)?.count ?? 0;
  const totalStudents = (totalStudentsResult as any)?.count ?? 0;

  return (
    <div className="admin-container-fluid">
      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 4px", textTransform: "uppercase" }}>
          Configurações
        </h1>
        <p style={{ fontSize: "14px", color: "#666", fontWeight: 600, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Controle Central e Parâmetros Operacionais do Box
        </p>
      </div>

      <SettingsTabs 
        initialSettings={initialSettings} 
        initialRules={initialRules}
        initialLevels={initialLevels}
        videoViewCount={videoViewCount}
        totalStudents={totalStudents}
      />
    </div>
  );
}
