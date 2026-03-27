import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import LevelCard from "@/components/LevelCard";

/**
 * Página de Perfil (Athletic Identity) do Aluno.
 * Baseada no design "Iron Monolith".
 * 
 * @security
 * - Sessão verificada via Server Component.
 * - Dados buscados com RLS ativo no Supabase.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: latestEvaluation } = await supabase
    .from("physical_evaluations")
    .select("*")
    .eq("student_id", user.id)
    .order("evaluation_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Cálculo de massa magra se houver dados
  const leanMass = (latestEvaluation?.weight && latestEvaluation?.body_fat_percentage)
    ? (latestEvaluation.weight * (1 - latestEvaluation.body_fat_percentage / 100)).toFixed(1)
    : null;

  /**
   * Identidade Visual do Nível (Coliseu Levels) no Perfil
   * 
   * @technical O mapeamento converte strings de nível em tokens de cor,
   * ícones e efeitos de destaque (Glow) para níveis de elite.
   */
  const getLevelInfo = (lvl: string) => {
    const l = lvl?.toLowerCase() || "";
    if (l.includes("branco")) return { id: "L1", color: "var(--lvl-white)", label: "L1 - BRANCO", textColor: "#000", icon: "/levels/icone-coliseu-levels-iniciante.svg", description: "Domínio dos padrões básicos de movimento e construção de base aeróbica sólida." };
    if (l.includes("verde")) return { id: "L2", color: "var(--lvl-green)", label: "L2 - VERDE", textColor: "#000", icon: "/levels/icone-coliseu-levels-scale.svg", description: "Capacidade de adaptar movimentos complexos e aumento da carga de trabalho." };
    if (l.includes("azul")) return { id: "L3", color: "var(--lvl-blue)", label: "L3 - AZUL", textColor: "#FFF", icon: "/levels/icone-coliseu-levels-intermediario.svg", description: "Transição para movimentos ininterruptos e domínio parcial de habilidades ginásticas." };
    if (l.includes("vermelho") || l.includes("rx")) return { id: "L4", color: "var(--lvl-red)", label: "L4 - RX", textColor: "#FFF", icon: "/levels/icone-coliseu-levels-rx.svg", description: "O Padrão Ouro. Execução fiel de todos os WODs oficiais do Open/Games." };
    if (l.includes("preto") || l.includes("elite") || l.includes("casca")) return { id: "L5", color: "#C5A059", label: "L5 - ELITE", textColor: "#C5A059", glow: "rgba(197, 160, 89, 0.4)", icon: "/levels/icone-coliseu-levels-elite.svg", description: "O topo da pirâmide. Atletas de alto rendimento, força bruta e ginásticos inabaláveis." };
    return { id: "L1", color: "var(--surface-highest)", label: (lvl || "INICIANTE").toUpperCase(), textColor: "#FFF", icon: "/levels/icone-coliseu-levels-iniciante.svg", description: "O início da jornada no Coliseu." };
  };

  /**
   * DADOS MOCK - V1.2 (TESTE)
   * Centralização dos dados para facilitar o desenvolvimento da UI.
   */
  const MOCK_STATS = {
    xp_actual: 12450,
    xp_next_level: 15000,
    trainings_count: 142,
    current_streak: 12,
    total_xp_goal: 15000, // Alvo para o próximo nível (L3)
  };

  const level = getLevelInfo(profile?.level || "verde"); // Forçando verde para teste de L2 -> L3
  const xpProgress = (MOCK_STATS.xp_actual / MOCK_STATS.total_xp_goal) * 100;
  const xpRemaining = MOCK_STATS.total_xp_goal - MOCK_STATS.xp_actual;

  return (
    <div style={{ backgroundColor: "var(--bg)", color: "var(--text)", minHeight: "100vh", paddingBottom: "100px" }}>
      <StudentHeader />

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "0 20px" }}>
        
        {/* ── HERO SECTION (NÍVEL DO ATLETA) ── */}
        <section style={{ paddingTop: "20px", paddingBottom: "24px" }}>
          {/* Header Compacto do Perfil */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div>
              <h1 style={{ fontSize: "24px", fontWeight: 900, textTransform: "uppercase", fontFamily: "var(--font-display)", lineHeight: 1, marginBottom: "4px" }}>
                {(profile?.display_name || profile?.full_name || "ATLETA").toUpperCase()}
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                #{(profile?.member_number || "000").toString().padStart(3, '0')} · COL. CLUBE
              </p>
            </div>
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="Profile" style={{ width: "48px", height: "48px", borderRadius: "50%", border: "1px solid var(--border-glow)", objectFit: "cover", filter: "grayscale(100%)" }} />
            ) : (
              <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--surface-lowest)", border: "1px solid var(--border-glow)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ color: "var(--text-muted)", fontSize: "20px" }}>person</span>
              </div>
            )}
          </div>

          {/* LEVEL CARD CLIENT COMPONENT (V1.2) */}
          <LevelCard 
            level={level} 
            mockStats={MOCK_STATS} 
            xpProgress={xpProgress} 
            xpRemaining={xpRemaining} 
          />
          
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <Link href="/profile/edit" style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em", textDecoration: "none", borderBottom: "1px dotted var(--text-muted)", paddingBottom: "2px" }}>
              EDITAR PERFIL
            </Link>
          </div>
        </section>

        {/* ── STATS ROW (REAL-TIME MOCK) ── */}
        <section style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr 1fr", 
          gap: "1px", 
          background: "var(--border-glow)",
          marginBottom: "48px",
        }}>
          {[
            { label: "XP TOTAL", value: MOCK_STATS.xp_actual.toLocaleString("pt-BR"), color: "var(--red)" },
            { label: "TREINOS", value: MOCK_STATS.trainings_count.toString(), color: "var(--text)" },
            { label: "DAYS STREAK", value: MOCK_STATS.current_streak.toString(), color: "var(--text)" },
          ].map((stat, i) => (
            <div key={i} style={{ background: "var(--surface-lowest)", padding: "20px 10px", textAlign: "center" }}>
              <div style={{ 
                fontFamily: "var(--font-display, 'Outfit', sans-serif)", 
                fontSize: "24px", 
                fontWeight: 900, 
                color: stat.color,
                marginBottom: "4px",
              }}>{stat.value}</div>
              <div style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.1em" }}>{stat.label}</div>
            </div>
          ))}
        </section>

        {/* ── ÚLTIMA AVALIAÇÃO ── */}
        <section style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <h2 className="font-display" style={{ fontSize: "16px", letterSpacing: "0.05em" }}>ÚLTIMA AVALIAÇÃO</h2>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, var(--red), transparent)" }} />
            <Link href="/profile/evaluations" style={{ 
              fontSize: "9px", 
              fontWeight: 800, 
              color: "var(--text-muted)", 
              textDecoration: "none",
              letterSpacing: "0.1em",
              border: "1px solid var(--border-glow)",
              padding: "4px 8px"
            }}>VER TUDO</Link>
          </div>

          {latestEvaluation ? (
            <div style={{ 
              background: "var(--surface-lowest)", 
              padding: "24px", 
              border: "1px solid var(--border-glow)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "20px"
            }}>
              <div>
                <div style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.1em" }}>PESO ATUAL</div>
                <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "24px", fontWeight: 900 }}>{latestEvaluation.weight} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>KG</span></div>
              </div>
              <div style={{ borderLeft: "1px solid var(--border-glow)", paddingLeft: "20px" }}>
                <div style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.1em" }}>% GORDURA</div>
                <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "24px", fontWeight: 900, color: "var(--red)" }}>{latestEvaluation.body_fat_percentage}%</div>
              </div>
              <div style={{ borderLeft: "1px solid var(--border-glow)", paddingLeft: "20px" }}>
                <div style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.1em" }}>MASSA MAGRA</div>
                <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "24px", fontWeight: 900 }}>{leanMass || "--"} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>KG</span></div>
              </div>
            </div>
          ) : (
            <div style={{ 
              background: "var(--surface-lowest)", 
              padding: "32px", 
              textAlign: "center",
              border: "1px dashed var(--border-glow)",
            }}>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>NENHUMA AVALIAÇÃO REGISTRADA</p>
              <button className="btn-icon" style={{ margin: "0 auto", borderColor: "var(--red)", color: "var(--red)" }}>
                SOLICITAR AVALIAÇÃO
              </button>
            </div>
          )}
        </section>

        {/* ── RECORDES PESSOAIS (PRs) ── */}
        <section style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <h2 className="font-display" style={{ fontSize: "16px", letterSpacing: "0.05em" }}>RECORDES PESSOAIS</h2>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, var(--red), transparent)" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {[
              { label: "BACK SQUAT", value: "140 KG" },
              { label: "DEADLIFT", value: "185 KG" },
              { label: "CLEAN & JERK", value: "95 KG" },
              { label: "SNATCH", value: "72 KG" },
            ].map((pr, i) => (
              <div key={i} style={{ 
                background: "var(--surface-lowest)", 
                padding: "20px", 
                borderTop: "1px solid var(--border-glow)",
                position: "relative",
                overflow: "hidden",
              }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px", letterSpacing: "0.05em" }}>{pr.label}</div>
                <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 900 }}>{pr.value}</div>
                <span className="material-symbols-outlined" style={{ 
                  position: "absolute", 
                  right: "10px", 
                  bottom: "10px", 
                  opacity: 0.1, 
                  color: "var(--red)",
                  fontSize: "16px"
                }}>
                  trending_up
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CONQUISTAS (ACHIEVEMENTS) NRC-STYLE ── */}
        <section style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <h2 className="font-display" style={{ fontSize: "16px", letterSpacing: "0.05em" }}>CONQUISTAS</h2>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, var(--red), transparent)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { icon: "diamond", color: "#FFF", label: "FUNDADOR", desc: "Membro Fundador do Coliseu Clube" },
              { icon: "shield", color: "var(--red)", label: "HERO WOD", desc: "Sobreviveu ao Murph RX" },
              { icon: "bolt", color: "var(--lvl-green)", label: "100 TREINOS", desc: "Atingiu a marca de 100 WODs" },
              { icon: "local_fire_department", color: "#FF9800", label: "STREAK X10", desc: "10 dias seguidos de treinos" },
            ].map((achievement, i) => (
              <div key={i} style={{ 
                background: "var(--surface-lowest)", 
                padding: "16px 20px",
                border: "1px solid var(--border-glow)",
                display: "flex",
                alignItems: "center",
                gap: "20px"
              }}>
                <div style={{
                  width: "48px",
                  height: "56px",
                  clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                  background: "var(--bg)",
                  border: `1px solid ${achievement.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                  boxShadow: `inset 0 0 10px ${achievement.color}40`,
                  flexShrink: 0
                }}>
                   <span className="material-symbols-outlined" style={{ 
                    fontSize: "24px", 
                    color: achievement.color,
                  }}>
                    {achievement.icon}
                  </span>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", textTransform: "uppercase", marginBottom: "4px" }}>{achievement.label}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{achievement.desc}</div>
                </div>
              </div>
            ))}
          </div>
          
          <button style={{ 
            width: "100%", 
            background: "transparent", 
            border: "1px solid var(--border-glow)", 
            padding: "16px", 
            marginTop: "16px", 
            fontSize: "10px", 
            fontWeight: 800, 
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
            cursor: "pointer",
            borderRadius: "2px"
          }}>
            VER TODOS OS SELOS
          </button>
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
