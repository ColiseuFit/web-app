import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import StudentHeader from "@/components/StudentHeader";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";
import { TrendingUp, Activity, Flame, Scale, ArrowRight, Trophy } from "lucide-react";
import { getBoxSettings } from "@/lib/constants/settings_actions";
import { getAccessPermissions } from "@/lib/constants/access_actions";
import AccessGate from "@/components/AccessGate";
import { enrichEvaluation, calculateAge, calculateBMR, calculateTDEE } from "@/lib/physique-utils";

export const metadata: Metadata = {
  title: "Meu Progresso",
};

/**
 * Progresso Page — Bug #8 Fix
 *
 * Integra avaliações físicas ao portal do aluno Premium.
 * Exibe sumário biométrico da última avaliação e evolução acumulada.
 *
 * @access club_premium — club_pass vê AccessGate
 * @data Última avaliação física + perfil (gênero/nascimento para cálculos)
 */
export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // SSoT: Checagem do Tipo de Plano, Configurações e Dados Biométricos em paralelo
  const [
    { data: profile },
    { data: evaluations },
    boxSettings
  ] = await Promise.all([
    supabase.from("profiles").select("membership_type, gender, birth_date").eq("id", user.id).single(),
    supabase
      .from("physical_evaluations")
      .select("*")
      .eq("student_id", user.id)
      .order("evaluation_date", { ascending: false })
      .limit(10), // últimas 10 para calcular evolução
    getBoxSettings()
  ]);

  const permissions = await getAccessPermissions(profile?.membership_type || "club_pass");
  const hasAccess = permissions.can_view_prs;

  // Link de Upgrade (WhatsApp)
  const rawWhatsApp = boxSettings?.box_whatsapp || "";
  const whatsappNumber = rawWhatsApp.replace(/\D/g, "");
  const upgradeLink = whatsappNumber
    ? `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre como fazer o upgrade para o Plano Clube Premium.")}`
    : null;

  // Self-Healing: enriquece com cálculos biométricos
  const enrichedEvaluations = (evaluations || []).map(ev =>
    enrichEvaluation(ev, { gender: profile?.gender, birth_date: profile?.birth_date })
  );

  const latest = enrichedEvaluations?.[0] ?? null;
  const first = enrichedEvaluations?.[enrichedEvaluations.length - 1] ?? null;
  const hasEvaluations = !!latest;

  // Cálculos metabólicos baseados na avaliação mais recente
  const age = profile?.birth_date && latest
    ? calculateAge(profile.birth_date, latest.evaluation_date)
    : 30;

  const bmr = latest
    ? calculateBMR(latest.weight, latest.height, age, profile?.gender || "male")
    : null;

  const tdee = bmr ? calculateTDEE(bmr) : null;

  // Progresso acumulado (peso perdido desde a primeira avaliação)
  const totalWeightDelta = (latest && first && first.id !== latest.id)
    ? (first.weight - latest.weight)
    : null;

  const totalBFDelta = (latest?.body_fat_percentage && first?.body_fat_percentage && first.id !== latest.id)
    ? (first.body_fat_percentage - latest.body_fat_percentage)
    : null;

  // Formatação de data UTC-safe
  const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00Z").toLocaleDateString("pt-BR", {
      day: "2-digit", month: "long", year: "numeric", timeZone: "UTC"
    }).toUpperCase();

  return (
    <>
      <DashboardStyles />
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          zIndex: -1, background: "#FFF"
        }}
      />

      <StudentHeader />

      <main className="animate-in" style={{
        maxWidth: "500px", margin: "0 auto", padding: "0 20px 120px",
      }}>

        {/* ── HEADER DE IMPACTO ── */}
        <section style={{ paddingTop: "32px", paddingBottom: "32px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#E31B23", color: "white", padding: "4px 12px", border: "2px solid #000", boxShadow: "4px 4px 0px #000", marginBottom: "16px" }}>
            <TrendingUp size={14} strokeWidth={3} />
            <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em" }}>EVOLUÇÃO TÉCNICA</span>
          </div>
          <h1 className="font-display" style={{ fontSize: "52px", fontWeight: 950, lineHeight: 0.8, textTransform: "uppercase", letterSpacing: "-0.04em", margin: 0 }}>
             MEU<br/>PROGRESSO
          </h1>
          <p className="font-headline" style={{ fontSize: "12px", fontWeight: 800, color: "#000", marginTop: "12px", letterSpacing: "0.15em", textTransform: "uppercase", opacity: 0.6 }}>
            ACOMPANHE SUA JORNADA
          </p>
        </section>

        {!hasAccess ? (
          /* ── GATE: ACESSO RESTRITO ── */
          <AccessGate
            message="O REGISTRO DE RECORDES (PR) E ACOMPANHAMENTO EVOLUTIVO SÃO FUNCIONALIDADES EXCLUSIVAS PARA ATLETAS COM ACESSO CLUBE PREMIUM."
            upgradeLink={upgradeLink}
          />
        ) : !hasEvaluations ? (
          /* ── ESTADO VAZIO: SEM AVALIAÇÕES ── */
          <section style={{
            background: "#FFF", border: "3px dashed #000",
            padding: "48px 24px", textAlign: "center"
          }}>
            <Activity size={48} color="#000" style={{ opacity: 0.15, marginBottom: 16 }} />
            <h2 className="font-display" style={{ fontSize: "20px", fontWeight: 950, color: "#000", marginBottom: 8 }}>
              NENHUMA AVALIAÇÃO AINDA
            </h2>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#666", lineHeight: 1.5 }}>
              Fale com seu coach para agendar sua primeira avaliação física. Seus dados biométricos aparecerão aqui.
            </p>
          </section>
        ) : (
          /* ── CONTEÚDO: SUMÁRIO BIOMÉTRICO (club_premium) ── */
          <>
            {/* VITÓRIA ACUMULADA */}
            {totalWeightDelta !== null && totalWeightDelta > 0 && (
              <section style={{
                background: "#E31B23", color: "#FFF",
                padding: "20px", border: "3px solid #000",
                boxShadow: "6px 6px 0px #000", marginBottom: "24px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Trophy size={18} color="#FFF" />
                  <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.1em" }}>VITÓRIA ACUMULADA</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.3 }}>
                  Desde sua primeira avaliação, você eliminou{" "}
                  <span style={{ background: "#000", padding: "0 4px" }}>
                    {totalWeightDelta.toFixed(1)}KG
                  </span>{" "}
                  de peso total.
                  {totalBFDelta !== null && totalBFDelta > 0 && (
                    <span> Sua gordura corporal caiu <span style={{ background: "#000", padding: "0 4px" }}>{totalBFDelta.toFixed(1)}%</span>.</span>
                  )}
                </div>
              </section>
            )}

            {/* ÚLTIMA AVALIAÇÃO: MÉTRICAS PRINCIPAIS */}
            <section style={{ marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <h2 className="font-display" style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.05em" }}>
                  ÚLTIMA AVALIAÇÃO
                </h2>
                <div style={{ flex: 1, height: 2, background: "#000" }} />
                <span style={{ fontSize: 10, fontWeight: 900, color: "#999", whiteSpace: "nowrap" }}>
                  {formatDate(latest.evaluation_date)}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {/* PESO */}
                <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "3px 3px 0px #000" }}>
                  <div style={{ fontSize: 9, fontWeight: 900, opacity: 0.5, letterSpacing: "0.1em", marginBottom: 4 }}>PESO</div>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: 28, fontWeight: 950 }}>
                    {latest.weight} <span style={{ fontSize: 13, color: "#999", fontWeight: 800 }}>KG</span>
                  </div>
                </div>

                {/* % GORDURA */}
                <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "3px 3px 0px #000" }}>
                  <div style={{ fontSize: 9, fontWeight: 900, opacity: 0.5, letterSpacing: "0.1em", marginBottom: 4 }}>% GORDURA</div>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: 28, fontWeight: 950, color: "#E31B23" }}>
                    {latest.body_fat_percentage ? `${latest.body_fat_percentage}%` : "—"}
                  </div>
                </div>

                {/* MASSA MAGRA */}
                <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "3px 3px 0px #000" }}>
                  <div style={{ fontSize: 9, fontWeight: 900, opacity: 0.5, letterSpacing: "0.1em", marginBottom: 4 }}>MASSA MAGRA</div>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: 28, fontWeight: 950, color: "#10B981" }}>
                    {latest.lean_mass ? `${latest.lean_mass.toFixed(1)}` : "—"} <span style={{ fontSize: 13, color: "#999", fontWeight: 800 }}>KG</span>
                  </div>
                </div>

                {/* IMC */}
                <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "3px 3px 0px #000" }}>
                  <div style={{ fontSize: 9, fontWeight: 900, opacity: 0.5, letterSpacing: "0.1em", marginBottom: 4 }}>IMC</div>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: 28, fontWeight: 950 }}>
                    {latest.bmi ?? "—"}
                  </div>
                </div>
              </div>

              {/* METABOLISMO */}
              {bmr && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div style={{ background: "#000", color: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "4px 4px 0px #AAA" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <Flame size={14} color="#E31B23" />
                      <div style={{ fontSize: 8, fontWeight: 900, opacity: 0.8, letterSpacing: "0.1em" }}>TMB (REPOUSO)</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: 22, fontWeight: 950 }}>{bmr}</div>
                      <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.6 }}>KCAL</div>
                    </div>
                  </div>
                  <div style={{ background: "#FFF", color: "#000", padding: "20px", border: "2px solid #000", boxShadow: "4px 4px 0px #000" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <Activity size={14} color="#E31B23" />
                      <div style={{ fontSize: 8, fontWeight: 900, opacity: 0.5, letterSpacing: "0.1em" }}>GAS. DIÁRIO EST.</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: 22, fontWeight: 950 }}>{tdee}</div>
                      <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.6 }}>KCAL</div>
                    </div>
                  </div>
                </div>
              )}

              <p style={{ fontSize: 9, color: "#999", fontWeight: 700, lineHeight: 1.4, marginBottom: 24 }}>
                *Insights calculados com base na sua avaliação mais recente e perfil atual. TMB via Mifflin-St Jeor.
              </p>
            </section>

            {/* CTA: VER HISTÓRICO COMPLETO */}
            <Link
              href="/profile/evaluations"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "20px 24px", background: "#000", color: "#FFF",
                border: "3px solid #000", boxShadow: "6px 6px 0px #E31B23",
                textDecoration: "none", marginBottom: "24px"
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.6, letterSpacing: "0.1em", marginBottom: 4 }}>
                  {enrichedEvaluations.length} AVALIAÇÃO{enrichedEvaluations.length !== 1 ? "ÕES" : ""} NO HISTÓRICO
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: "0.05em" }}>
                  VER HISTÓRICO COMPLETO
                </div>
              </div>
              <ArrowRight size={24} color="#E31B23" />
            </Link>

            {/* PROTOCOLO INFO */}
            <div style={{ padding: "16px", background: "#F9F9F9", border: "2px solid #EEE", fontSize: 10, fontWeight: 700, color: "#999", lineHeight: 1.5 }}>
              <Scale size={12} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              Protocolo: <strong style={{ color: "#000" }}>Pollock 7 Dobras</strong> · Fórmula: <strong style={{ color: "#000" }}>Mifflin-St Jeor</strong> · Dados interpretados por avaliador habilitado.
            </div>
          </>
        )}

      </main>

      <BottomNav />
    </>
  );
}
