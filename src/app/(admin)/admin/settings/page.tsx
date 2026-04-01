import { getBoxSettings } from "@/lib/constants/settings_actions";
import SettingsTabs from "./SettingsTabs";

/**
 * Admin Settings Page: Box configuration and system preferences.
 * 
 * @architecture
 * - Server Component fetched initial values from SSoT (Supabase).
 * - Delegates interactivity to SettingsTabs (Client Component).
 */
export default async function SettingsPage() {
  // Fetch initial settings from DB
  const initialSettings = await getBoxSettings();

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

      <SettingsTabs initialSettings={initialSettings} />
    </div>
  );
}
