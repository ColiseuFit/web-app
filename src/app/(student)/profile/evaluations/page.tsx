import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Flame, Activity, Trophy, Camera, TrendingUp } from "lucide-react";
import { calculateAge, calculateBMR, calculateTDEE, enrichEvaluation } from "@/lib/physique-utils";

import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";
import BiometricTrendChart from "./BiometricTrendChart";
import Image from "next/image";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("gender, birth_date")
    .eq("id", user.id)
    .single();

  // Enriquecimento de dados (Self-Healing via Centralized Engine)
  const enrichedEvaluations = (evaluations || []).map(ev => 
    enrichEvaluation(ev, { gender: profile?.gender, birth_date: profile?.birth_date })
  );


  const latest = enrichedEvaluations?.[0];
  const first = enrichedEvaluations?.[enrichedEvaluations?.length - 1];

  // Cálculos Metabólicos (Baseado na mais recente)
  const age = profile?.birth_date && latest
    ? calculateAge(profile.birth_date, latest.evaluation_date) 
    : 30;
  
  const bmr = latest 
    ? calculateBMR(latest.weight, latest.height, age, profile?.gender || 'male')
    : null;
  
  const tdee = bmr ? calculateTDEE(bmr) : null;

  // Progresso acumulado
  const weightLostSinceStart = (latest && first && first.id !== latest.id) 
    ? (first.weight - latest.weight).toFixed(1) 
    : null;

  // Formatação nativa para Início/Atual
  const formatMonthYear = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("pt-BR", { 
      month: "short", 
      year: "numeric", 
      timeZone: "UTC" 
    }).replace(".", "").toUpperCase();
  };

  // Extração de fotos para comparação
  const getFrontPhoto = (evalObj: any) => {
    if (!evalObj?.photos || !Array.isArray(evalObj.photos)) return null;
    const photo = evalObj.photos.find((p: any) => 
      p.label?.toLowerCase().includes('front') || 
      p.label?.toLowerCase().includes('frente')
    );
    return photo?.url || evalObj.photos[0]?.url || null;
  };

  const firstPhoto = getFrontPhoto(first);
  const latestPhoto = getFrontPhoto(latest);
  const hasPhotos = firstPhoto || latestPhoto;

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
        <section style={{ marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <h2 className="font-display" style={{ fontSize: "16px", letterSpacing: "0.05em", fontWeight: 900 }}>PERFORMANCE & INSIGHTS</h2>
            <div style={{ flex: 1, height: "2px", background: "#000" }} />
          </div>

          {/* VITÓRIA ACUMULADA */}
          {weightLostSinceStart && parseFloat(weightLostSinceStart) > 0 && (
            <div style={{ 
              background: "#E31B23", 
              color: "#FFF", 
              padding: "20px", 
              marginBottom: "20px", 
              border: "3px solid #000",
              boxShadow: "6px 6px 0px #000"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Trophy color="#FFF" size={20} />
                <div style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em" }}>VITÓRIA ACUMULADA</div>
              </div>
              <div style={{ fontSize: "16px", fontWeight: 950, lineHeight: 1.2 }}>
                Desde sua primeira avaliação, você já eliminou <span style={{ background: "#000", padding: "0 4px" }}>{weightLostSinceStart}KG</span> de peso total.
              </div>
            </div>
          )}

          <div style={{
            background: "#FFF",
            border: "2px solid #000",
            padding: "24px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "4px 4px 0px #F0F0F0",
            marginBottom: "20px"
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", position: "relative", zIndex: 1 }}>
              <div>
                <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", marginBottom: "4px", letterSpacing: "0.1em", opacity: 0.5 }}>PESO ATUAL</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "28px", fontWeight: 950 }}>{latest?.weight || "--"} <span style={{ fontSize: "14px", fontWeight: 800, color: "#999" }}>KG</span></span>
                </div>
              </div>
              <div style={{ borderLeft: "2px dashed #EEE", paddingLeft: "24px" }}>
                <div style={{ fontSize: "9px", fontWeight: 900, color: "#000", marginBottom: "4px", letterSpacing: "0.1em", opacity: 0.5 }}>% GORDURA</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "28px", fontWeight: 950, color: "#E31B23" }}>{latest?.body_fat_percentage || "--"}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* INSIGHTS METABÓLICOS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
             <div style={{ background: "#000", color: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "4px 4px 0px #AAA" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                  <Flame size={14} color="#E31B23" />
                  <div style={{ fontSize: "8px", fontWeight: 900, opacity: 0.8, letterSpacing: "0.1em" }}>TMB (REPOUSO)</div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 950 }}>{bmr || "--"}</div>
                  <div style={{ fontSize: "10px", fontWeight: 900, opacity: 0.6 }}>KCAL</div>
                </div>
             </div>

             <div style={{ background: "#FFF", color: "#000", padding: "20px", border: "2px solid #000", boxShadow: "4px 4px 0px #000" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                  <Activity size={14} color="#E31B23" />
                  <div style={{ fontSize: "8px", fontWeight: 900, opacity: 0.5, letterSpacing: "0.1em" }}>GAS. DIÁRIO</div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 950 }}>{tdee || "--"}</div>
                  <div style={{ fontSize: "10px", fontWeight: 900, opacity: 0.6 }}>KCAL</div>
                </div>
             </div>
          </div>
          <p style={{ fontSize: "9px", color: "#999", fontWeight: 700, lineHeight: 1.4, marginBottom: "24px" }}>
            *Insights calculados com base na sua avaliação mais recente e perfil atual.
          </p>

          <BiometricTrendChart evaluations={enrichedEvaluations} />
        </section>

        {/* ── EVOLUÇÃO VISUAL ── */}
        {hasPhotos && (first?.id !== latest.id) && (
          <section style={{ marginBottom: "40px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <h2 className="font-display" style={{ fontSize: "16px", letterSpacing: "0.05em", fontWeight: 900 }}>EVOLUÇÃO VISUAL</h2>
              <div style={{ flex: 1, height: "2px", background: "#000" }} />
            </div>

            <div style={{ 
              background: "#FFF", 
              border: "3px solid #000",
              boxShadow: "6px 6px 0px #000",
              overflow: "hidden"
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px", background: "#000" }}>
                {/* ANTES */}
                <div style={{ background: "#FFF", position: "relative", aspectRatio: "3/4" }}>
                  {firstPhoto ? (
                    <Image 
                      src={firstPhoto} 
                      alt="Primeira Avaliação" 
                      fill 
                      style={{ objectFit: "cover", opacity: 0.8, filter: "grayscale(100%)" }}
                      unoptimized
                    />
                  ) : (
                    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F1F1F1", padding: "20px", textAlign: "center" }}>
                      <Camera size={24} color="#CCC" style={{ marginBottom: "8px" }} />
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#999" }}>SEM FOTO INICIAL</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: "12px", left: "12px", background: "#000", color: "#FFF", padding: "4px 8px", fontSize: "10px", fontWeight: 900 }}>
                    INÍCIO • {first ? formatMonthYear(first.evaluation_date) : "--"}
                  </div>
                </div>

                {/* DEPOIS */}
                <div style={{ background: "#FFF", position: "relative", aspectRatio: "3/4" }}>
                  {latestPhoto ? (
                    <Image 
                      src={latestPhoto} 
                      alt="Última Avaliação" 
                      fill 
                      style={{ objectFit: "cover" }}
                      unoptimized
                    />
                  ) : (
                    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F1F1F1", padding: "20px", textAlign: "center" }}>
                      <Camera size={24} color="#CCC" style={{ marginBottom: "8px" }} />
                      <span style={{ fontSize: "10px", fontWeight: 800, color: "#999" }}>SEM FOTO ATUAL</span>
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: "12px", right: "12px", background: "#E31B23", color: "#FFF", padding: "4px 8px", fontSize: "10px", fontWeight: 900 }}>
                    ATUAL • {latest ? formatMonthYear(latest.evaluation_date) : "--"}
                  </div>
                </div>
              </div>

              {/* Botão para abrir detalhes comparativos */}
              <Link href={`/profile/evaluations/${latest.id}`} style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "8px",
                padding: "16px",
                background: "#000",
                color: "#FFF",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.05em"
              }}>
                <TrendingUp size={16} />
                VER COMPARAÇÃO DETALHADA
              </Link>
            </div>
          </section>
        )}

        {/* ── LISTA DE AVALIAÇÕES ── */}
        <section style={{ marginBottom: "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
            <h2 className="font-display" style={{ fontSize: "18px", letterSpacing: "0.05em", fontWeight: 900 }}>HISTÓRICO</h2>
            <div style={{ flex: 1, height: "2px", background: "#000" }} />
          </div>

          {enrichedEvaluations && enrichedEvaluations.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {enrichedEvaluations.map((ev) => (
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
