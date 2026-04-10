import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";

/**
 * Página de Histórico de Avaliações Físicas do Aluno.
 * Design Brutalista Light / Iron Monolith.
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
    <div style={{ backgroundColor: "#FFF", color: "#000", minHeight: "100vh", paddingBottom: "120px" }}>
      <DashboardStyles />
      
      {/* ── HEADER ── */}
      <header style={{
        background: "#FFF",
        position: "sticky",
        top: 0,
        zIndex: 100,
        padding: "16px",
        borderBottom: "2px solid #000"
      }}>
        <div style={{ maxWidth: "480px", margin: "0 auto", display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/profile" style={{ color: "#000", display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "14px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.1em" }}>HISTÓRICO DE AVALIAÇÕES</h1>
        </div>
      </header>

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 20px" }}>
        
        {/* ── PERFORMANCE SNAPSHOT ── */}
        <section style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <h2 className="font-display" style={{ fontSize: "18px", letterSpacing: "0.05em", fontWeight: 900 }}>STATUS DE PERFORMANCE</h2>
            <div style={{ flex: 1, height: "2px", background: "#000" }} />
          </div>

          <div style={{ 
            background: "#FFF", 
            border: "2px solid #000",
            padding: "24px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "4px 4px 0px #F0F0F0"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", position: "relative", zIndex: 1 }}>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", marginBottom: "4px", letterSpacing: "0.1em", opacity: 0.5 }}>TENDÊNCIA PESO</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "28px", fontWeight: 950 }}>{evaluations?.[0]?.weight || "--"} <span style={{ fontSize: "14px", fontWeight: 800, color: "#999" }}>KG</span></span>
                  {evaluations && evaluations.length > 1 && (
                    <span style={{ fontSize: "12px", fontWeight: 900, color: (evaluations[0].weight < evaluations[1].weight) ? "#10B981" : "#E31B23" }}>
                      {evaluations[0].weight < evaluations[1].weight ? "↓" : "↑"}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ borderLeft: "2px dashed #EEE", paddingLeft: "24px" }}>
                <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", marginBottom: "4px", letterSpacing: "0.1em", opacity: 0.5 }}>TENDÊNCIA %BF</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "28px", fontWeight: 950, color: "#E31B23" }}>{evaluations?.[0]?.body_fat_percentage || "--"}%</span>
                   {evaluations && evaluations.length > 1 && (
                    <span style={{ fontSize: "12px", fontWeight: 900, color: (evaluations[0].body_fat_percentage < evaluations[1].body_fat_percentage) ? "#10B981" : "#E31B23" }}>
                      {evaluations[0].body_fat_percentage < evaluations[1].body_fat_percentage ? "↓" : "↑"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ 
              marginTop: "20px",
              padding: "12px",
              background: "#F9F9F9",
              border: "1px dashed #000",
              textAlign: "center",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              color: evaluations && evaluations.length > 0 ? "#E31B23" : "#000"
            }}>
              {evaluations && evaluations.length > 1 
                ? (evaluations[0].body_fat_percentage < evaluations[1].body_fat_percentage ? "ESTADO: EM EVOLUÇÃO (GORDURA EM QUEDA)" : "ESTADO: MANUTENÇÃO TÉCNICA REQUERIDA")
                : "ESTADO: AGUARDANDO DADOS PARA COMPARATIVO"}
            </div>
          </div>
        </section>

        {/* ── LISTA DE AVALIAÇÕES ── */}
        <section style={{ marginBottom: "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <h2 className="font-display" style={{ fontSize: "18px", letterSpacing: "0.05em", fontWeight: 900 }}>HISTÓRICO</h2>
            <div style={{ flex: 1, height: "2px", background: "#000" }} />
          </div>

          {evaluations && evaluations.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {evaluations.map((ev) => (
                <Link key={ev.id} href={`/profile/evaluations/${ev.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ 
                    background: "#FFF", 
                    padding: "20px", 
                    border: "2px solid #000",
                    borderLeft: "6px solid #E31B23",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    boxShadow: "3px 3px 0px #000",
                  }}>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.6, marginBottom: "8px" }}>
                        {new Date(ev.evaluation_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                      </div>
                      <div style={{ display: "flex", gap: "24px" }}>
                        <div>
                          <span style={{ fontSize: "9px", fontWeight: 900, color: "#000", opacity: 0.5, letterSpacing: "0.05em" }}>PESO</span>
                          <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 950, fontSize: "20px", color: "#000" }}>{ev.weight} <span style={{ fontSize: "12px", fontWeight: 800, color: "#999" }}>KG</span></div>
                        </div>
                        <div>
                          <span style={{ fontSize: "9px", fontWeight: 900, color: "#000", opacity: 0.5, letterSpacing: "0.05em" }}>% BF</span>
                          <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 950, fontSize: "20px", color: "#E31B23" }}>{ev.body_fat_percentage}%</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ color: "#000", opacity: 0.3 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ 
              background: "#FFF", 
              padding: "40px 24px", 
              textAlign: "center",
              border: "2px dashed #000",
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1" style={{ margin: "0 auto 16px", opacity: 0.2 }}>
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p style={{ fontSize: "13px", fontWeight: 800, color: "#000", marginBottom: "0", letterSpacing: "0.02em" }}>NENHUMA AVALIAÇÃO DISPONÍVEL</p>
            </div>
          )}
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
