import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

/**
 * Página de Histórico de Avaliações Físicas do Aluno.
 * Design Brutalista / Iron Monolith.
 */
export default async function EvaluationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: evaluations } = await supabase
    .from("physical_evaluations")
    .select("*")
    .eq("student_id", user.id)
    .order("evaluation_date", { ascending: false });

  return (
    <div style={{ backgroundColor: "#131313", color: "#FFFFFF", fontFamily: "'Inter', sans-serif", minHeight: "100vh", paddingBottom: "100px" }}>
      {/* ── HEADER ── */}
      <header style={{
        background: "rgba(19,19,19,0.8)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        padding: "16px",
        borderBottom: "1px solid rgba(255,255,255,0.05)"
      }}>
        <div style={{ maxWidth: "480px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/profile" style={{ color: "#FFF", display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "14px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>HISTÓRICO DE AVALIAÇÕES</h1>
        </div>
      </header>

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 20px" }}>
        
        {/* ── PERFORMANCE SNAPSHOT ── */}
        <section style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <div style={{ width: "8px", height: "8px", backgroundColor: "#E31B23" }} />
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em" }}>STATUS DE PERFORMANCE</h2>
          </div>

          <div style={{ 
            background: "#0E0E0E", 
            border: "1px solid rgba(255,255,255,0.05)",
            padding: "24px",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Technical grid background */}
            <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "radial-gradient(#E31B23 0.5px, transparent 0.5px)", backgroundSize: "10px 10px", pointerEvents: "none" }} />
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", position: "relative", zIndex: 1 }}>
              <div>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", marginBottom: "4px", letterSpacing: "0.1em" }}>TENDÊNCIA PESO</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "24px", fontWeight: 900 }}>{evaluations?.[0]?.weight || "--"} <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>KG</span></span>
                  {evaluations && evaluations.length > 1 && (
                    <span style={{ fontSize: "10px", fontWeight: 800, color: (evaluations[0].weight < evaluations[1].weight) ? "#10B981" : "#F43F5E" }}>
                      {evaluations[0].weight < evaluations[1].weight ? "↓" : "↑"}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", paddingLeft: "24px" }}>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", marginBottom: "4px", letterSpacing: "0.1em" }}>TENDÊNCIA %BF</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: "24px", fontWeight: 900, color: "#E31B23" }}>{evaluations?.[0]?.body_fat_percentage || "--"}%</span>
                   {evaluations && evaluations.length > 1 && (
                    <span style={{ fontSize: "10px", fontWeight: 800, color: (evaluations[0].body_fat_percentage < evaluations[1].body_fat_percentage) ? "#10B981" : "#F43F5E" }}>
                      {evaluations[0].body_fat_percentage < evaluations[1].body_fat_percentage ? "↓" : "↑"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ 
              marginTop: "20px",
              padding: "10px",
              background: "rgba(255,255,255,0.02)",
              textAlign: "center",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              color: evaluations && evaluations.length > 0 ? "#E31B23" : "rgba(255,255,255,0.2)"
            }}>
              {evaluations && evaluations.length > 1 
                ? (evaluations[0].body_fat_percentage < evaluations[1].body_fat_percentage ? "ESTADO: EM EVOLUÇÃO (GORDURA EM QUEDA)" : "ESTADO: MANUTENÇÃO TÉCNICA REQUERIDA")
                : "ESTADO: AGUARDANDO DADOS PARA COMPARATIVO"}
            </div>
          </div>
        </section>

        {evaluations && evaluations.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {evaluations.map((ev) => (
              <Link key={ev.id} href={`/profile/evaluations/${ev.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ 
                  background: "#0E0E0E", 
                  padding: "20px", 
                  borderLeft: "4px solid #E31B23",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                      {new Date(ev.evaluation_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}
                    <div style={{ display: "flex", gap: "16px" }}>
                      <div>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>PESO:</span>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "16px", marginLeft: "4px" }}>{ev.weight} KG</span>
                      </div>
                      <div>
                        <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>BF:</span>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 900, fontSize: "16px", marginLeft: "4px", color: "#E31B23" }}>{ev.body_fat_percentage}%</span>
                      </div>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.2)" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: "16px", opacity: 0.5 }}>
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p style={{ fontSize: "12px", letterSpacing: "0.05em" }}>NENHUMA AVALIAÇÃO DISPONÍVEL</p>
          </div>
        )}

      </main>

      {/* ── BOTTOM NAV ── */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          width: "100%",
          background: "rgba(5,5,5,0.92)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          zIndex: 150,
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-around",
          }}
        >
          {[
            { href: "/dashboard", label: "Início", path: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z", type: "fill" },
            { href: "/treinos", label: "Treinos", path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z", type: "stroke" },
            { href: "/profile", label: "Perfil", path: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", type: "stroke" },
          ].map((item) => {
            const isActive = item.href === "/profile";
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none", flex: 1 }}>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  padding: "14px 0",
                  color: isActive ? "#E31B23" : "rgba(255,255,255,0.2)",
                  position: "relative",
                }}>
                  {isActive && (
                    <div style={{
                      position: "absolute",
                      top: "-1px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "40px",
                      height: "2px",
                      background: "#E31B23",
                    }} />
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={item.type === "fill" ? "currentColor" : "none"} stroke={item.type === "stroke" ? "currentColor" : "none"} strokeWidth="2">
                    <path d={item.path} />
                  </svg>
                  <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
