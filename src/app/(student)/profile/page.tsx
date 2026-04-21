import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import LevelCard from "@/components/LevelCard";
import DashboardStyles from "@/components/DashboardStyles";
import { EvalRequestButton, EvalGateLink } from "@/components/EvalRequestButton";
import AccessGate from "@/components/AccessGate";
import { Zap, Shield, Diamond, Star, Award, Medal, Trophy, TrendingUp, Settings, LineChart, MessageCircle } from "lucide-react";
import { getTodayDate } from "@/lib/date-utils";
import { getLevelInfo } from "@/lib/constants/levels";
import { getCachedLevels } from "@/lib/constants/levels_actions";
import { getBoxSettings } from "@/lib/constants/settings_actions";
import { enrichEvaluation } from "@/lib/physique-utils";

export const metadata: Metadata = {
  title: "Meu Perfil",
};

/**
 * Página de Perfil (Athletic Identity) do Aluno.
 * Componente central do ecossistema "Iron Monolith", consolidando Pontuação, PRs e Conquistas.
 * 
 * @architecture
 * - SSoT de Identidade: Agrega Perfil, Avaliações, Check-ins e Benchmarks em um único "Passaporte do Atleta".
 * - Motor de Progressão: Mapeia `points_balance` para os níveis visuais (Coliseu Levels L1-L5).
 * - Algoritmo de Streak: Cálculo server-side de dias consecutivos baseado no histórico de `check_ins`.
 * 
 * @security
 * - RBAC: Sessão verificada via Server Component; RLS garante isolamento total de dados.
 * - Integridade: Validação de cache via `getCachedLevels` para consistência de tokens de design.
 * 
 * @technical
 * - Biometria: Exibe resumo da última avaliação física processada (WHR e Massa Magra).
 * - PR/Benchmark: Integração com o mural de Shields (Mídia binária via SVG).
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
    { data: rawLatestEvaluation },
    { data: checkInsCount },

    { data: prs },
    { data: benchmarks },
    dynamicLevels,
    boxSettings
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("physical_evaluations").select("*").eq("student_id", user.id).order("evaluation_date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("check_ins").select("created_at").eq("student_id", user.id).order("created_at", { ascending: false }),
    supabase.from("personal_records").select("*").eq("student_id", user.id).order("date", { ascending: false }).limit(4),
    supabase.from("student_benchmarks").select("*").eq("student_id", user.id),
    getCachedLevels(),
    getBoxSettings()
  ]);

  /**
   * Prepara link de WhatsApp a partir da SSoT (box_settings → box_whatsapp).
   * Remove caracteres não numéricos e monta URL wa.me com mensagem pré-definida.
   */
  const rawWhatsApp = boxSettings?.box_whatsapp || "";
  const whatsappNumber = rawWhatsApp.replace(/\D/g, "");
  const whatsappLink = whatsappNumber
    ? `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent("Olá! Gostaria de agendar uma avaliação física no Coliseu.")}`
    : null;

  const upgradeLink = whatsappNumber
    ? `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre como fazer o upgrade para o Plano Clube Premium.")}`
    : null;

  // 1.5 Auto-Healing (Dynamic Enrichment)
  const latestEvaluation = rawLatestEvaluation 
    ? enrichEvaluation(rawLatestEvaluation, { gender: profile?.gender, birth_date: profile?.birth_date })
    : null;

  // Massa magra agora vem do objeto enriquecido
  const leanMass = latestEvaluation?.lean_mass;

  /**
   * Identidade Visual do Nível (Coliseu Levels) no Perfil
   * @technical O mapeamento converte strings de nível em tokens de cor,
   */

  /**
   * LÓGICA DE PONTUAÇÃO DATA-DRIVEN (SSoT)
   * @logic
   * 1. Consome `points_balance` do perfil.
   * 2. Níveis (Graduações) são geridos separadamente pelos coaches e não vinculados mecanicamente aos pontos.
   */
  const pointsActual = profile?.points_balance || 0;
  const isClubPass = profile?.membership_type === 'club_pass';
  
  const checkIns = checkInsCount || [];
  
  /**
   * CÁLCULO DE STREAK (Resiliência)
   * @technical
   * - Agrupa check-ins por data única (ISO 8601).
   * - Valida continuidade a partir de hoje ou ontem (Buffer de repouso).
   * - Itera retroativamente para contar dias seguidos sem quebras.
   */
  const calculateStreak = (history: any[]) => {
    if (history.length === 0) return 0;
    
    const uniqueDates = Array.from(new Set(
      history.map(c => new Date(c.created_at).toISOString().split("T")[0])
    )).sort().reverse();
    
    const today = getTodayDate();
    const yesterday = new Date(new Date(today + "T00:00:00Z").getTime() - 86400000).toISOString().split("T")[0];
    
    // Se não treinou hoje nem ontem, streak é 0
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
    
    // Começamos a contar a partir da data do último treino encontrado
    let checkDate = uniqueDates[0];
    let streak = 0;
    
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
    points_actual: pointsActual,
    trainings_count: checkIns.length,
    current_streak: streak,
  };

  const level = getLevelInfo(profile?.level || "iniciante", dynamicLevels);

  return (
    <div style={{ backgroundColor: "#FFF", color: "#000", minHeight: "100vh", paddingBottom: "120px" }}>
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
              avatarUrl={profile?.avatar_url}
            />
          </div>

          {/* NOVO BLOCO DE IDENTIDADE (CENTRALIZADO & IMPOSTO) */}
          <div style={{ textAlign: "center", marginTop: "40px", width: "100%", position: "relative" }}>
            <h1 className="font-display" style={{ 
              fontSize: "clamp(42px, 12vw, 52px)", 
              fontWeight: 950, 
              lineHeight: 0.8, 
              textTransform: "uppercase",
              letterSpacing: "-0.04em",
              color: "#000",
              textShadow: `4px 4px 0px ${level.color}20`
            }}>
              {profile?.first_name || profile?.display_name?.split(' ')[0] || "ATLETA"}
            </h1>
            
            <p className="font-headline" style={{ 
              fontSize: "14px", 
              fontWeight: 900, 
              color: "#000", 
              textTransform: "uppercase", 
              letterSpacing: "0.3em", 
              marginTop: "12px",
              opacity: 0.8
            }}>
              {profile?.last_name || profile?.display_name?.split(' ').slice(1).join(' ') || "COLISEU CLUB"}
            </p>

            <EvalGateLink
              href="/profile/evaluations"
              isClubPass={isClubPass}
              upgradeLink={upgradeLink}
              style={{ 
                marginTop: "24px",
                padding: "8px 20px",
                background: "#000",
                display: "inline-block",
                border: "2px solid #000",
                fontSize: "11px", 
                fontWeight: 900, 
                color: "#FFF", 
                letterSpacing: "0.2em", 
                textTransform: "uppercase",
                boxShadow: `4px 4px 0px ${level.color}`
              }}
            >
              MEMBER ID: #{(profile?.member_number || "000").toString().padStart(3, '0')}
            </EvalGateLink>
            
            <div style={{ marginTop: "32px", display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap", width: "100%" }}>
              <Link href="/profile/edit" style={{ 
                flex: "1",
                minWidth: "140px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "11px", 
                fontWeight: 900, 
                color: "#000", 
                background: "#FFF",
                letterSpacing: "0.1em", 
                textDecoration: "none", 
                border: "2px solid #000", 
                padding: "14px 16px",
                boxShadow: "3px 3px 0px #000"
              }}>
                <Settings size={14} strokeWidth={2.5} />
                EDITAR PERFIL
              </Link>
              <Link href="/progresso" style={{ 
                flex: "1",
                minWidth: "140px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "11px", 
                fontWeight: 900, 
                color: level.btnTextColor || (level.key === 'iniciante' ? '#000' : '#FFF'), 
                background: level.color,
                letterSpacing: "0.1em", 
                textDecoration: "none", 
                border: "2px solid #000",
                padding: "14px 16px",
                boxShadow: "3px 3px 0px #000"
              }}>
                <LineChart size={14} strokeWidth={2.5} />
                MINHA EVOLUÇÃO
              </Link>
            </div>
          </div>
        </section>

        {/* ── STATS ROW (REAL-TIME MOCK) ── */}
        <section style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr 1fr", 
          gap: "8px", 
          marginBottom: "48px",
        }}>
          {[
            { label: "PONTOS TOTAIS", value: stats.points_actual.toLocaleString("pt-BR"), color: "#E31B23" },
            { label: "TREINOS", value: stats.trainings_count.toString(), color: "#000" },
            { label: "DIAS SEGUIDOS", value: stats.current_streak.toString(), color: "#000" },
          ].map((stat, i) => (
            <div key={i} style={{ 
              background: "#FFF", 
              padding: "20px 10px", 
              textAlign: "center",
              border: "2px solid #000",
              boxShadow: "2px 2px 0px #000"
            }}>
              <div style={{ 
                fontFamily: "var(--font-display, 'Outfit', sans-serif)", 
                fontSize: "28px", 
                fontWeight: 950, 
                color: stat.color,
                marginBottom: "4px",
                lineHeight: 1
              }}>{stat.value}</div>
              <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", letterSpacing: "0.1em", opacity: 0.7 }}>{stat.label}</div>
            </div>
          ))}
        </section>

        {/* ── AVALIAÇÕES FÍSICAS ── */}
        <section style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <h2 className="font-display" style={{ fontSize: "18px", letterSpacing: "0.05em", fontWeight: 900 }}>AVALIAÇÕES FÍSICAS</h2>
            <div style={{ flex: 1, height: "2px", background: "#000" }} />
            <EvalGateLink
              href="/profile/evaluations"
              isClubPass={isClubPass}
              upgradeLink={upgradeLink}
              style={{ 
                fontSize: "10px", 
                fontWeight: 900, 
                color: "#000", 
                textDecoration: "none",
                letterSpacing: "0.1em",
                border: "2px solid #000",
                padding: "6px 12px",
                background: "#FFF",
                boxShadow: "2px 2px 0px #000"
              }}
            >VER TUDO</EvalGateLink>
          </div>

          {latestEvaluation ? (
            <>
              <EvalGateLink href="/profile/evaluations" isClubPass={isClubPass} upgradeLink={upgradeLink} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <div style={{ 
                  background: "#FFF", 
                  padding: "24px", 
                  border: "2px solid #000",
                  boxShadow: "4px 4px 0px #F0F0F0",
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "20px 16px",
                  position: "relative"
                }}>
                  <div style={{ borderBottom: "1px solid #EEE", paddingBottom: "12px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", marginBottom: "8px", letterSpacing: "0.1em", opacity: 0.5 }}>PESO ATUAL</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 950 }}>{latestEvaluation.weight} <span style={{ fontSize: "14px", fontWeight: 800, color: "#999" }}>KG</span></div>
                  </div>
                  <div style={{ borderBottom: "1px solid #EEE", paddingBottom: "12px" }}>
                    <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", marginBottom: "8px", letterSpacing: "0.1em", opacity: 0.5 }}>% GORDURA</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 950, color: "#E31B23" }}>{latestEvaluation.body_fat_percentage}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", marginBottom: "8px", letterSpacing: "0.1em", opacity: 0.5 }}>MASSA MAGRA</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 950 }}>{leanMass || "--"} <span style={{ fontSize: "14px", fontWeight: 800, color: "#999" }}>KG</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", marginBottom: "8px", letterSpacing: "0.1em", opacity: 0.5 }}>WHR (C/Q)</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 950, color: (latestEvaluation.waist_hip_ratio || 0) > 0.9 ? "#E31B23" : "inherit" }}>
                      {latestEvaluation.waist_hip_ratio || "--"}
                    </div>
                  </div>

                  {/* NOVO FOOTER DE ACESSO */}
                  <div style={{ 
                    gridColumn: "span 2", 
                    marginTop: "8px", 
                    paddingTop: "16px", 
                    borderTop: "2px solid #000",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <span style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.1em" }}>VER EVOLUÇÃO E GRÁFICOS</span>
                    <TrendingUp size={16} strokeWidth={3} />
                  </div>
                </div>
              </EvalGateLink>
              {/* CTA: solicitar nova avaliação */}
              {whatsappLink && (
                <EvalRequestButton
                  whatsappLink={whatsappLink}
                  upgradeLink={upgradeLink}
                  isClubPass={isClubPass}
                  label="SOLICITAR NOVA AVALIAÇÃO"
                  size={14}
                />
              )}
            </>
          ) : (
            <div style={{ 
              background: "#FFF", 
              padding: "40px 24px", 
              textAlign: "center",
              border: "2px dashed #000",
            }}>
              <p style={{ fontSize: "13px", fontWeight: 800, color: "#000", marginBottom: "20px", letterSpacing: "0.02em" }}>NENHUMA AVALIAÇÃO REGISTRADA</p>
              {whatsappLink && (
                <EvalRequestButton
                  whatsappLink={whatsappLink}
                  upgradeLink={upgradeLink}
                  isClubPass={isClubPass}
                  label="SOLICITAR AVALIAÇÃO"
                  size={12}
                />
              )}
            </div>
          )}
        </section>

        {/* ── RECORDES PESSOAIS (PRs) ── */}
        <section style={{ marginBottom: "48px" }}>
          {isClubPass ? (
            <AccessGate 
              message="OS RECORDES PESSOAIS (PRs) E O MONITORAMENTO DE EVOLUÇÃO DE CARGAS SÃO EXCLUSIVOS PARA O PLANO CLUBE PREMIUM."
              upgradeLink={upgradeLink}
            />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <h2 className="font-display" style={{ fontSize: "18px", letterSpacing: "0.05em", fontWeight: 900 }}>RECORDES PESSOAIS</h2>
                <div style={{ flex: 1, height: "2px", background: "#000" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {prs && prs.length > 0 ? (
                  prs.map((pr, i) => (
                    <div key={i} style={{ 
                      background: "#FFF", 
                      padding: "20px", 
                      border: "2px solid #000",
                      boxShadow: "2px 2px 0px #000",
                      position: "relative",
                      overflow: "hidden",
                    }}>
                      <div style={{ fontSize: "10px", fontWeight: 900, color: "#000", marginBottom: "8px", letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.5 }}>{pr.movement_name}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 950 }}>{pr.value} <span style={{ fontSize: "12px", fontWeight: 800, color: "#999" }}>{pr.unit}</span></div>
                      <div style={{ 
                        position: "absolute", 
                        right: "-5px", 
                        bottom: "-5px", 
                        opacity: 0.1, 
                        color: "#000" 
                      }}>
                        <TrendingUp size={32} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ gridColumn: "span 2", padding: "32px", textAlign: "center", border: "2px dashed #EEE", fontSize: "12px", fontWeight: 800, color: "#999" }}>
                    NENHUM RECORDE REGISTRADO
                  </div>
                )}
              </div>
            </>
          )}
        </section>

        {/* ── MURAL DE CONQUISTAS ── */}
        <section style={{ marginBottom: "0px" }}>
          {isClubPass ? (
            <AccessGate 
              message="O MURAL DE CONQUISTAS E SELOS DE EXCELÊNCIA TÉCNICA É UMA FUNCIONALIDADE RESERVADA PARA ATLETAS CLUBE PREMIUM."
              upgradeLink={upgradeLink}
            />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <h2 className="font-display" style={{ fontSize: "18px", letterSpacing: "0.05em", fontWeight: 900 }}>CONQUISTAS</h2>
                <div style={{ flex: 1, height: "2px", background: "#000" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Seção de Benchmarks (Shields Brutalistas) */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(3, 1fr)", 
                  gap: "12px", 
                  marginBottom: "12px" 
                }}>
                  {[
                    { id: "du", title: "DOUBLE UNDERS", icon: Zap },
                    { id: "pu", title: "PULL UPS", icon: Shield },
                    { id: "hspu", title: "HSPU", icon: Diamond },
                  ].map((bm_meta) => {
                    const bmInstance = benchmarks?.find(b => b.benchmark_id === bm_meta.id);
                    const completed = !!bmInstance;
                    
                    return (
                      <div key={bm_meta.id} style={{
                        background: completed ? "#000" : "#FFF",
                        border: "2px solid #000",
                        padding: "20px 10px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        boxShadow: completed ? "none" : "3px 3px 0px #F0F0F0",
                        opacity: completed ? 1 : 0.3,
                        transition: "all 0.2s ease"
                      }}>
                        <div style={{ color: completed ? "#FFF" : "#000" }}>
                          <bm_meta.icon size={24} strokeWidth={completed ? 2 : 1} />
                        </div>
                        <div style={{ 
                          fontSize: "8px", 
                          fontWeight: 900, 
                          color: completed ? "#FFF" : "#000", 
                          textAlign: "center", 
                          letterSpacing: "0.1em",
                          textTransform: "uppercase" 
                        }}>
                          {bm_meta.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

      </main>

      <BottomNav />
    </div>
  );
}
