"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * CoachLogoutButton: Botão de saída de sessão do Portal do Coach.
 *
 * @architecture
 * - Client Component necessário pois o layout do coach é Server Component.
 * - Utiliza `supabase.auth.signOut()` para invalida a sessão no cliente.
 * - Após logout, redireciona para /coach-portal para novo acesso.
 * - iOS/Safari compatible: usa tap area de 44px mínimo.
 */
export default function CoachLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/coach-portal");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      aria-label="Sair da conta"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        padding: "0 16px",
        height: "44px",           // mínimo iOS tap target
        minWidth: "44px",
        background: "none",
        border: "2px solid #000",
        cursor: loading ? "not-allowed" : "pointer",
        color: "#000",
        fontSize: "11px",
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        WebkitTapHighlightColor: "transparent",
        opacity: loading ? 0.5 : 1,
        transition: "opacity 0.15s",
        // Webkit
        WebkitAppearance: "none",
        appearance: "none",
      } as React.CSSProperties}
    >
      <LogOut size={16} />
      <span style={{ display: "none" }}>
        {/* Label oculto em telas muito pequenas — o ícone já comunica */}
        {loading ? "Saindo..." : "Sair"}
      </span>
    </button>
  );
}
