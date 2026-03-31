import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import LevelCard from "@/components/LevelCard";
import DashboardStyles from "@/components/DashboardStyles";
import { Zap, Shield, Diamond, Star, Award, Medal, Trophy, TrendingUp } from "lucide-react";
import { getTodayDate } from "@/lib/date-utils";

export const metadata: Metadata = {
  title: "Meu Perfil",
};

/**
 * Página de Perfil (Athletic Identity) do Aluno.
 * Componente central do ecossistema "Iron Monolith", consolidando XP, PRs e Conquistas.
 * 
 * @security
 * - Sessão verificada via Server Component (auth.getUser).
 * - Multi-fetch paralelo com RLS ativo no Supabase para máxima performance e segurança.
 * - Isolamento total de dados: Garante que o `auth.uid()` acesse apenas suas próprias métricas.
 * 
 * @technical
 * - Data Lifecycle: Mapeia XP acumulado para os níveis visuais (Coliseu Levels L1-L5).
 * - PR/Benchmark: Integração com o mural de Shields (Mídia binária via SVG).
 * - Biometria: Exibe resumo da última avaliação física processada.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Data Fetching
  const [
    { data: profile },
    { data: latestEvaluation },
    { data: checkInsCount },
    { data: prs },
    { data: benchmarks }
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("physical_evaluations").select("*").eq("student_id", user.id).order("evaluation_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("check_ins").select("created_at").eq("student_id", user.id).order("created_at", { ascending: false }),
    supabase.from("personal_records").select("*").eq("student_id", user.id).order("date", { ascending: false }).limit(4),
    supabase.from("student_benchmarks").select("*").eq("student_id", user.id)
  ]);

  // Cálculo de massa magra se houver dados
  const leanMass = (latestEvaluation?.weight && latestEvaluation?.body_fat_percentage)
    ? (latestEvaluation.weight * (1 - latestEvaluation.body_fat_percentage / 100)).toFixed(1)
    : null;

  /**
   * Identidade Visual do Nível (Coliseu Levels) no Perfil
   * @technical O mapeamento converte strings de nível em tokens de cor,
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
   * LÓGICA DE PROGRESSÃO DATA-DRIVEN
   * Substitui os mocks por dados reais e cálculos baseados em XP.
   */
  const xpActual = profile?.xp_balance || 0;
  
  // Lógica temporária de escalonamento (5k por nível)
  const calculateGoal = (xp: number) => {
    if (xp < 5000) return 5000;
    if (xp < 10000) return 10000;
    if (xp < 15000) return 15000;
    if (xp < 20000) return 20000;
    return xp + 5000;
  };

  const totalXpGoal = calculateGoal(xpActual);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const xpProgress = (xpActual / totalXpGoal) * 100;
  const xpRemaining = totalXpGoal - xpActual;
  
  const checkIns = checkInsCount || [];
  
  // Cálculo de Streak Real (Dias Seguidos)
  const calculateStreak = (history: any[]) => {
    if (history.length === 0) return 0;
    
    const uniqueDates = Array.from(new Set(
      history.map(c => new Date(c.created_at).toISOString().split("T")[0])
    )).sort().reverse();
    
    const today = getTodayDate();
    const yesterday = new Date(new Date(today + "T00:00:00Z").getTime() - 86400000).toISOString().split("T")[0];
    
    let current = today;
    let streak = 0;
    let index = 0;

    // Se não treinou hoje nem ontem, streak é 0
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
    
    // Começamos a contar a partir da data do último treino encontrado
    let checkDate = uniqueDates[0];
    
    for (const date of uniqueDates) {
      if (date === checkDate) {
        streak++;
        // Retroceder 1 dia para a próxima checagem
        checkDate = new Date(new Date(checkDate + "T00:00:00Z").getTime() - 86400000).toISOString().split("T")[0];
      } else {
        break;
      }
    }
    return streak;
  };

  const streak = calculateStreak(checkIns);

  const stats = {
    xp_actual: xpActual,
    xp_next_level: totalXpGoal,
    trainings_count: checkIns.length,
    current_streak: streak,
    total_xp_goal: totalXpGoal,
  };

  const level = getLevelInfo(profile?.level || "branco");

  return (
    <div style={{ backgroundColor: "var(--bg)", color: "var(--text)", minHeight: "100vh", paddingBottom: "100px" }}>
      <DashboardStyles />
      <StudentHeader />

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "0 20px" }}>
        
        {/* ── HERO SECTION (NÍVEL DO ATLETA) ── */}
        <section style={{ paddingTop: "20px", paddingBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          
          {/* LEVEL CARD CLIENT COMPONENT (V1.2) - HERO PRINCIPAL */}
          <div style={{ width: "100%" }}>
            <LevelCard 
              level={level} 
              stats={stats} 
              xpProgress={xpProgress} 
              xpRemaining={xpRemaining} 
              avatarUrl={profile?.avatar_url}
            />
          </div>

          {/* NOVO BLOCO DE IDENTIDADE (CENTRALIZADO & IMPOSTO) */}
          <div style={{ textAlign: "center", marginTop: "32px", width: "100%" }}>
            <h1 style={{ 
              fontSize: "clamp(32px, 10vw, 42px)", 
              fontWeight: 900, 
              fontFamily: "var(--font-display)", 
              lineHeight: 0.9, 
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: "var(--text)"
            }}>
              {profile?.first_name || profile?.display_name?.split(' ')[0] || "ATLETA"}
            </h1>
            
            <p style={{ 
              fontSize: "14px", 
              fontWeight: 800, 
              color: "var(--text-muted)", 
              textTransform: "uppercase", 
              letterSpacing: "0.4em", 
              marginTop: "8px",
              opacity: 0.8
            }}>
              {profile?.last_name || profile?.display_name?.split(' ').slice(1).join(' ') || ""}
            </p>

            <div style={{ 
              marginTop: "16px",
              padding: "4px 12px",
              background: "var(--surface-lowest)",
              display: "inline-block",
              border: "1px solid var(--border-glow)",
              fontSize: "10px", 
              fontWeight: 700, 
              color: "var(--text-muted)", 
              letterSpacing: "0.2em", 
              textTransform: "uppercase" 
            }}>
              #{(profile?.member_number || "000").toString().padStart(3, '0')} · COL. CLUBE
            </div>
            
            <div style={{ marginTop: "24px" }}>
              <Link href="/profile/edit" style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.15em", textDecoration: "none", borderBottom: "1px dotted var(--text-muted)", paddingBottom: "2px", opacity: 0.6 }}>
                EDITAR PERFIL
              </Link>
            </div>
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
            { label: "XP TOTAL", value: stats.xp_actual.toLocaleString("pt-BR"), color: "var(--red)" },
            { label: "TREINOS", value: stats.trainings_count.toString(), color: "var(--text)" },
            { label: "DAYS STREAK", value: stats.current_streak.toString(), color: "var(--text)" },
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
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "10px"
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
              <div style={{ borderLeft: "1px solid var(--border-glow)", paddingLeft: "20px" }}>
                <div style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px", letterSpacing: "0.1em" }}>WHR (C/Q)</div>
                <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "24px", fontWeight: 900, color: (latestEvaluation.waist_hip_ratio || 0) > 0.9 ? "var(--red)" : "inherit" }}>
                  {latestEvaluation.waist_hip_ratio || "--"}
                </div>
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {prs && prs.length > 0 ? (
              prs.map((pr, i) => (
                <div key={i} style={{ 
                  background: "var(--surface-lowest)", 
                  padding: "20px", 
                  borderTop: "1px solid var(--border-glow)",
                  position: "relative",
                  overflow: "hidden",
                }}>
                  <div style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "6px", letterSpacing: "0.05em", textTransform: "uppercase" }}>{pr.movement_name}</div>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 900 }}>{pr.value} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{pr.unit}</span></div>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 900 }}>{pr.value} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{pr.unit}</span></div>
                  <div style={{ 
                    position: "absolute", 
                    right: "10px", 
                    bottom: "10px", 
                    opacity: 0.1, 
                    color: "var(--red)" 
                  }}>
                    <TrendingUp size={16} />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "span 2", padding: "24px", textAlign: "center", border: "1px dashed var(--border-glow)", fontSize: "12px", color: "var(--text-muted)" }}>
                NENHUM RECORDE REGISTRADO
              </div>
            )}
          </div>
        </section>

        {/* ── MURAL DE CONQUISTAS (ACHIEVEMENTS & BENCHMARKS) ── */}
        <section style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <h2 className="font-display" style={{ fontSize: "16px", letterSpacing: "0.05em" }}>MURAL DE CONQUISTAS</h2>
            <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, var(--volt), transparent)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Seção de Benchmarks (Shields) */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(3, 1fr)", 
              gap: "12px", 
              marginBottom: "12px" 
            }}>
              {[
                { id: "du", title: "DOUBLE UNDERS", icon: "bolt" },
                { id: "pu", title: "PULL UPS", icon: "shield" },
                { id: "hspu", title: "HSPU", icon: "diamond" },
              ].map((bm_meta) => {
                const bmInstance = benchmarks?.find(b => b.benchmark_id === bm_meta.id);
                const completed = !!bmInstance;
                
                return (
                  <div key={bm_meta.id} style={{
                    background: "var(--surface-lowest)",
                    border: "1px solid var(--border-glow)",
                    padding: "20px 10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "12px",
                    borderRadius: "4px",
                    opacity: completed ? 1 : 0.2,
                    filter: completed ? "none" : "grayscale(100%)",
                    position: "relative"
                  }}>
                    <div style={{
                      width: "42px",
                      height: "48px",
                      clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                      background: completed ? "rgba(225, 255, 0, 0.1)" : "transparent",
                      border: `1px solid ${completed ? "var(--volt)" : "var(--text-dim)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <div style={{ 
                        color: completed ? "var(--volt)" : "var(--text-dim)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}>
                        {bm_meta.id === "du" && <Zap size={20} fill={completed ? "var(--volt)" : "none"} />}
                        {bm_meta.id === "pu" && <Shield size={20} fill={completed ? "var(--volt)" : "none"} />}
                        {bm_meta.id === "hspu" && <Diamond size={20} fill={completed ? "var(--volt)" : "none"} />}
                      </div>
                    </div>
                    <div style={{ fontSize: "8px", fontWeight: 900, color: "var(--text)", textAlign: "center", letterSpacing: "0.1em" }}>
                      {bm_meta.title}
                    </div>
                    {completed && (
                      <div style={{
                        position: "absolute",
                        width: "30px",
                        height: "30px",
                        background: "var(--volt)",
                        filter: "blur(15px)",
                        opacity: 0.2,
                        zIndex: -1
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Conquistas Gerais */}
            {[
              { icon: Star, color: "var(--red)", label: "FUNDADOR", desc: "Membro Fundador do Coliseu Clube" },
              { icon: Award, color: "#FFD700", label: "PIONEIRO", desc: "Primeira turma de treinamento Coliseu" },
              { icon: Medal, color: "var(--volt)", label: "TOP 10% XP", desc: "Entre os atletas mais ativos do mês" },
            ].map((achievement, i) => (
              <div key={i} style={{ 
                background: "var(--surface-lowest)", 
                padding: "16px 20px",
                border: "1px solid var(--border-glow)",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                borderRadius: "4px"
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "var(--bg)",
                  border: `1px solid ${achievement.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: `0 0 10px ${achievement.color}20`
                }}>
                  <div style={{ color: achievement.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <achievement.icon size={20} />
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "white", textTransform: "uppercase", marginBottom: "2px" }}>{achievement.label}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)" }}>{achievement.desc}</div>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            className="btn-outline-hover"
            style={{ 
              width: "100%", 
              background: "transparent", 
              border: "1px solid var(--border-glow)", 
              padding: "16px", 
              marginTop: "16px", 
              fontSize: "9px", 
              fontWeight: 800, 
              letterSpacing: "0.15em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              cursor: "pointer",
              borderRadius: "4px"
            }}
          >
            VER TODAS AS CONQUISTAS
          </button>
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
