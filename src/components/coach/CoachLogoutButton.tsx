import { LogOut } from "lucide-react";
import { logoutCoach } from "@/app/(coach)/coach-portal/actions";

/**
 * CoachLogoutButton: Botão de saída de sessão do Portal do Coach.
 *
 * @architecture
 * - Utiliza Next.js Server Actions para garantir fallback HTML sem Javascript.
 * - Redireciona para /coach-portal após limpar cookies de sessão no servidor.
 * - iOS Safari compatible: minimos de toque e fallback para navegadores antigos (JS-less).
 */
export default function CoachLogoutButton() {
  return (
    <form action={logoutCoach} style={{ margin: 0, padding: 0 }}>
    <button
      type="submit"
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
        cursor: "pointer",
        color: "#000",
        fontSize: "11px",
        fontWeight: 900,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        WebkitTapHighlightColor: "transparent",
        transition: "opacity 0.15s",
        // Webkit
        WebkitAppearance: "none",
      } as React.CSSProperties}
    >
      <LogOut size={16} />
      <span style={{ display: "none" }}>
        Sair
      </span>
    </button>
    </form>
  );
}
