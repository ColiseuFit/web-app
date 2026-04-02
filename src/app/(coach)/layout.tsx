import "@/app/globals.css";

/**
 * Root Coach Layout: Simple wrapper for coach-related portals.
 * Protection is handled in nested layouts.
 */
export const metadata = {
  title: "Portal do Coach | Coliseu",
  robots: { index: false, follow: false },
};

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#F7F7F7", minHeight: "100dvh", fontFamily: "var(--font-inter)" }}>
      {children}
    </div>
  );
}
