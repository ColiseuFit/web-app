"use client";

import { useState } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";

interface Photo {
  url: string;
  label?: string;
}

interface EvaluationData {
  id: string;
  evaluation_date: string;
  weight: number;
  height: number;
  body_fat_percentage: number;
  waist_hip_ratio?: number;
  measurements: Record<string, any>;
  skinfolds: Record<string, any>;
  bone_diameters: Record<string, any>;
  postural_analysis: Record<string, any>;
  photos: Photo[];
  notes?: string;
  protocol?: string;
}

/**
 * Componente de visualização detalhada da avaliação física do atleta.
 * 
 * Este componente implementa a interface de "3 Pilares" (Antropometria, Composição e Postura)
 * seguindo a estética brutalista "Iron Monolith" (Light mode).
 * 
 * Funcionalidades principais:
 * - Tab Navigation: Alterna entre diferentes vistas técnicas sem reload.
 * - Radar de Evolução: Slider interativo (0-100) para comparação imediata (clipping) 
 *   entre a imagem anterior (gray-scale) e a atual.
 * - Indicadores de Delta: Cálculos em tempo real comparando medidas atuais com a anterior,
 *   usando cores de status baseadas em progresso (Verde) ou atenção (Vermelha).
 * 
 * @param {object} props - Propriedades do componente.
 * @param {EvaluationData} props.evaluation - Dados da avaliação atual selecionada.
 * @param {EvaluationData | null} props.previous - Dados da avaliação imediatamente anterior (se existir).
 */
export default function EvaluationDetailsClient({ 
  evaluation, 
  previous 
}: { 
  evaluation: EvaluationData; 
  previous: EvaluationData | null;
}) {
  const [activeTab, setActiveTab] = useState<"resumo" | "antropometria" | "composicao" | "postura">("resumo");
  const [evolutionSplit, setEvolutionSplit] = useState(50); // For the slider (0-100)

  // Cálculos
  const bmi = (evaluation.weight && evaluation.height) 
    ? (evaluation.weight / (evaluation.height * evaluation.height)).toFixed(1) 
    : "--";
  
  const leanMass = (evaluation.weight && evaluation.body_fat_percentage)
    ? (evaluation.weight * (1 - evaluation.body_fat_percentage / 100)).toFixed(1)
    : "--";

  const prevLeanMass = (previous?.weight && previous?.body_fat_percentage)
    ? (previous.weight * (1 - previous.body_fat_percentage / 100)).toFixed(1)
    : null;

  const getDelta = (curr: number, prev: number | undefined) => {
    if (!prev) return null;
    const diff = curr - prev;
    const sign = diff > 0 ? "+" : "";
    return `${sign}${diff.toFixed(1)}`;
  };

  const getStatusColor = (diff: number, inverse = false) => {
    if (diff === 0) return "rgba(0,0,0,0.4)";
    const good = inverse ? diff > 0 : diff < 0;
    return good ? "#10B981" : "#E31B23";
  };

  const tabs = [
    { id: "resumo", label: "RESUMO" },
    { id: "antropometria", label: "ANTROPO" },
    { id: "composicao", label: "COMPOSIÇÃO" },
    { id: "postura", label: "POSTURA" },
  ];

  return (
    <div style={{ backgroundColor: "#FFF", color: "#000", fontFamily: "'Inter', sans-serif", minHeight: "100vh", paddingBottom: "100px" }}>
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
          <Link href="/profile/evaluations" style={{ color: "#000", display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "14px", fontWeight: 950, textTransform: "uppercase", letterSpacing: "0.1em" }}>ANÁLISE DE ATLETA</h1>
        </div>
      </header>

      {/* ── TAB NAVIGATION ── */}
      <nav style={{ 
        maxWidth: "480px", 
        margin: "0 auto", 
        padding: "0 20px", 
        display: "flex", 
        borderBottom: "2px solid #000",
        background: "#FFF"
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: "16px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              color: activeTab === tab.id ? "#E31B23" : "#999",
              borderBottom: activeTab === tab.id ? "3px solid #E31B23" : "3px solid transparent",
              transition: "all 0.2s ease"
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "24px 20px" }}>
        
        {/* ── CONTENT: RESUMO ── */}
        {activeTab === "resumo" && (
          <div className="animate-fadeIn">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div style={{ fontSize: "14px", fontWeight: 900, color: "#E31B23", fontFamily: "var(--font-display, 'Outfit', sans-serif)" }}>
                {new Date(evaluation.evaluation_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}
              </div>
              <div style={{ fontSize: "10px", fontWeight: 900, background: "#000", color: "#FFF", padding: "4px 8px" }}>
                ESTADO: <span style={{ color: "#10B981" }}>EM EVOLUÇÃO</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "32px" }}>
               {/* Weight Card */}
               <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "3px 3px 0px #F0F0F0" }}>
                <div style={{ fontSize: "8px", fontWeight: 900, color: "#000", opacity: 0.5, marginBottom: "4px", letterSpacing: "0.1em" }}>PESO ATUAL</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "24px", fontWeight: 950, color: "#000" }}>{evaluation.weight} <span style={{ fontSize: "10px", fontWeight: 900, color: "#999" }}>KG</span></div>
                  {previous && (
                    <span style={{ fontSize: "10px", fontWeight: 900, color: getStatusColor(evaluation.weight - previous.weight) }}>
                      {getDelta(evaluation.weight, previous.weight)}
                    </span>
                  )}
                </div>
              </div>
              {/* BF Card */}
              <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "3px 3px 0px #F0F0F0" }}>
                <div style={{ fontSize: "8px", fontWeight: 900, color: "#000", opacity: 0.5, marginBottom: "4px", letterSpacing: "0.1em" }}>GORDURA CORPO</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "24px", fontWeight: 950, color: "#E31B23" }}>{evaluation.body_fat_percentage}%</div>
                  {previous && (
                    <span style={{ fontSize: "10px", fontWeight: 900, color: getStatusColor(evaluation.body_fat_percentage - previous.body_fat_percentage) }}>
                      {getDelta(evaluation.body_fat_percentage, previous.body_fat_percentage)}
                    </span>
                  )}
                </div>
              </div>
              {/* BMI Card */}
              <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "3px 3px 0px #F0F0F0" }}>
                <div style={{ fontSize: "8px", fontWeight: 900, color: "#000", opacity: 0.5, marginBottom: "4px", letterSpacing: "0.1em" }}>IMC (BODY INDEX)</div>
                <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 950, color: "#000" }}>{bmi}</div>
              </div>
              {/* Lean Mass Card */}
              <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "3px 3px 0px #F0F0F0" }}>
                <div style={{ fontSize: "8px", fontWeight: 900, color: "#000", opacity: 0.5, marginBottom: "4px", letterSpacing: "0.1em" }}>MASSA MAGRA</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 950, color: "#10B981" }}>{leanMass} <span style={{ fontSize: "10px", color: "#000" }}>KG</span></div>
                  {prevLeanMass && (
                    <span style={{ fontSize: "10px", fontWeight: 900, color: getStatusColor(Number(leanMass) - Number(prevLeanMass), true) }}>
                      {getDelta(Number(leanMass), Number(prevLeanMass))}
                    </span>
                  )}
                </div>
              </div>

              {/* Height Card */}
              <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "3px 3px 0px #F0F0F0" }}>
                <div style={{ fontSize: "8px", fontWeight: 900, color: "#000", opacity: 0.5, marginBottom: "4px", letterSpacing: "0.1em" }}>ALTURA</div>
                <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 950, color: "#000" }}>{evaluation.height} <span style={{ fontSize: "10px", color: "#999" }}>M</span></div>
              </div>

              {/* WHR Card */}
              <div style={{ background: "#FFF", padding: "20px", border: "2px solid #000", boxShadow: "3px 3px 0px #F0F0F0" }}>
                <div style={{ fontSize: "8px", fontWeight: 900, color: "#000", opacity: 0.5, marginBottom: "4px", letterSpacing: "0.1em" }}>WHR (CINTURA/QUADRIL)</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 950, color: (evaluation.waist_hip_ratio || 0) > 0.9 ? "#E31B23" : "#000" }}>
                    {evaluation.waist_hip_ratio || "--"}
                  </div>
                  <span style={{ fontSize: "8px", fontWeight: 900, color: (evaluation.waist_hip_ratio || 0) > 0.9 ? "#E31B23" : "rgba(0,0,0,0.4)" }}>
                    {(evaluation.waist_hip_ratio || 0) > 0.9 ? "ATENÇÃO" : "SAUDÁVEL"}
                  </span>
                </div>
              </div>
            </div>

            {/* RADAR DE EVOLUÇÃO (Visual Wow) */}
            {previous && evaluation.photos.length > 0 && previous.photos.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "14px", fontWeight: 900 }}>RADAR DE EVOLUÇÃO</h2>
                  <div style={{ flex: 1, height: "2px", background: "#000" }} />
                </div>
                
                <div style={{ position: "relative", aspectRatio: "3/4", background: "#F5F5F5", overflow: "hidden", border: "2px solid #000", boxShadow: "6px 6px 0px #000" }}>
                  {/* Previous Image */}
                  <img 
                    src={previous.photos[0].url} 
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%) opacity(0.6)" }} 
                  />
                  {/* Current Image (Clipped) */}
                  <div style={{ 
                    position: "absolute", 
                    inset: 0, 
                    width: `${evolutionSplit}%`, 
                    overflow: "hidden", 
                    borderRight: "4px solid #E31B23",
                    zIndex: 2,
                    boxShadow: "2px 0 10px rgba(0,0,0,0.5)"
                  }}>
                    <img 
                      src={evaluation.photos[0].url} 
                      style={{ width: "440px", height: "100%", objectFit: "cover" }} 
                    />
                  </div>
                  {/* Labels */}
                  <div style={{ position: "absolute", left: "12px", top: "12px", fontSize: "10px", fontWeight: 900, color: "#000", background: "#FFF", border: "2px solid #000", padding: "2px 6px", zIndex: 3 }}>ANTERIOR</div>
                  <div style={{ position: "absolute", right: "12px", top: "12px", fontSize: "10px", fontWeight: 900, color: "#FFF", zIndex: 3, background: "#E31B23", border: "2px solid #000", padding: "2px 6px" }}>ATUAL</div>
                  
                  {/* Slider Control */}
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={evolutionSplit} 
                    onChange={(e) => setEvolutionSplit(Number(e.target.value))}
                    style={{ 
                      position: "absolute", 
                      bottom: "24px", 
                      left: "50%", 
                      transform: "translateX(-50%)",
                      width: "80%", 
                      zIndex: 10,
                      accentColor: "#E31B23",
                      cursor: "ew-resize"
                    }}
                  />
                </div>
                <p style={{ fontSize: "9px", color: "#000", opacity: 0.6, marginTop: "16px", textAlign: "center", letterSpacing: "0.1em", fontWeight: 900 }}>DESLIZE PARA COMPARAR DEFINIÇÃO E VOLUME</p>
              </section>
            )}

            {/* GALERIA COMPLETA */}
            {evaluation.photos.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "14px", fontWeight: 900 }}>GALERIA DE REGISTROS</h2>
                  <div style={{ flex: 1, height: "2px", background: "#000" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                  {evaluation.photos.map((photo, i) => (
                    <div key={i} style={{ background: "#FFF", padding: "8px", border: "2px solid #000", boxShadow: "3px 3px 0px #000" }}>
                      <img src={photo.url} alt={photo.label} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", marginBottom: "8px", border: "1px solid #000" }} />
                      <div style={{ fontSize: "10px", fontWeight: 900, color: "#000", textAlign: "center", textTransform: "uppercase" }}>{photo.label || `FOTO ${i+1}`}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {evaluation.notes && (
              <section style={{ padding: "20px", background: "#FFF", border: "2px solid #000", borderLeft: "6px solid #E31B23", boxShadow: "4px 4px 0px #F0F0F0" }}>
                <h3 style={{ fontSize: "12px", fontWeight: 950, marginBottom: "8px", color: "#000", textTransform: "uppercase" }}>OBSERVAÇÕES DO COACH</h3>
                <p style={{ fontSize: "13px", color: "#000", lineHeight: 1.6, fontWeight: 700 }}>{evaluation.notes}</p>
              </section>
            )}
          </div>
        )}

        {/* ── CONTENT: ANTROPOMETRIA ── */}
        {activeTab === "antropometria" && (
          <div className="animate-fadeIn">
            <h2 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "14px", fontWeight: 950, marginBottom: "20px", color: "#E31B23" }}>PERIMETRIA TÉCNICA (CM)</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { key: "neck", label: "PESCOÇO" },
                { key: "shoulder", label: "OMBRO" },
                { key: "chest", label: "TÓRAX" },
                { key: "waist", label: "CINTURA" },
                { key: "abdomen", label: "ABDÔMEN" },
                { key: "hip", label: "QUADRIL" },
                { key: "arm_right", label: "BRAÇO RELAXADO DIR." },
                { key: "arm_left", label: "BRAÇO RELAXADO ESQ." },
                { key: "arm_flexed_right", label: "BRAÇO CONTR. DIR." },
                { key: "arm_flexed_left", label: "BRAÇO CONTR. ESQ." },
                { key: "forearm_right", label: "ANTEBRAÇO DIR." },
                { key: "forearm_left", label: "ANTEBRAÇO ESQ." },
                { key: "thigh_right", label: "COXA DIR." },
                { key: "thigh_left", label: "COXA ESQ." },
                { key: "calf_right", label: "PANTURRILHA DIR." },
                { key: "calf_left", label: "PANTURRILHA ESQ." }
              ].map(field => {
                const value = evaluation.measurements[field.key];
                if (value === undefined || value === null) return null;
                return (
                  <div key={field.key} style={{ background: "#FFF", padding: "16px", border: "2px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "2px 2px 0px #F0F0F0" }}>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "#000", textTransform: "uppercase", letterSpacing: "0.05em" }}>{field.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontWeight: 950, fontSize: "18px" }}>{value}</span>
                      {previous?.measurements?.[field.key] && (
                        <span style={{ fontSize: "11px", fontWeight: 900, color: getStatusColor(Number(value) - Number(previous.measurements[field.key]), true) }}>
                          {getDelta(Number(value), Number(previous.measurements[field.key]))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CONTENT: COMPOSIÇÃO ── */}
        {activeTab === "composicao" && (
          <div className="animate-fadeIn">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "14px", fontWeight: 950, color: "#E31B23" }}>DOBRAS CUTÂNEAS (MM)</h2>
              <span style={{ fontSize: "9px", fontWeight: 900, background: "#000", color: "#FFF", padding: "4px 8px" }}>PROTOCOLO: {evaluation.protocol}</span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "40px" }}>
              {[
                { key: "triceps", label: "TRÍCEPS" },
                { key: "biceps", label: "BÍCEPS" },
                { key: "subscapular", label: "SUBESCAPULAR" },
                { key: "chest", label: "PEITORAL" },
                { key: "midaxillary", label: "AXILAR MÉDIA" },
                { key: "suprailiac", label: "SUPRA-ILÍACA" },
                { key: "abdominal", label: "ABDOMINAL" },
                { key: "thigh", label: "COXA" }
              ].map(field => {
                const value = evaluation.skinfolds[field.key];
                if (value === undefined || value === null) return null;
                return (
                  <div key={field.key} style={{ background: "#FFF", padding: "16px", border: "2px solid #000", boxShadow: "2px 2px 0px #000" }}>
                    <div style={{ fontSize: "10px", fontWeight: 900, color: "#000", opacity: 0.6, marginBottom: "4px", textTransform: "uppercase" }}>{field.label}</div>
                    <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "20px", fontWeight: 950 }}>{value}</div>
                  </div>
                );
              })}
            </div>

            <h2 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "14px", fontWeight: 950, marginBottom: "20px", color: "#000" }}>DIÂMETROS ÓSSEOS (CM)</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
              {[
                { key: "humerus", label: "ÚMERO" },
                { key: "femur", label: "FÊMUR" },
                { key: "wrist", label: "PULSO" },
                { key: "ankle", label: "TORNOZELO" }
              ].map(field => {
                const value = evaluation.bone_diameters[field.key];
                if (value === undefined || value === null) return null;
                return (
                  <div key={field.key} style={{ background: "#FFF", padding: "16px", textAlign: "center", border: "2px dashed #000" }}>
                    <div style={{ fontSize: "10px", fontWeight: 900, opacity: 0.6, marginBottom: "4px", textTransform: "uppercase" }}>{field.label}</div>
                    <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "18px", fontWeight: 950 }}>{value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CONTENT: POSTURA ── */}
        {activeTab === "postura" && (
          <div className="animate-fadeIn">
            <h2 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "14px", fontWeight: 950, marginBottom: "20px", color: "#000" }}>ANÁLISE BIOMECÂNICA</h2>
            
            {Object.entries(evaluation.postural_analysis).map(([view, findings]) => (
              <div key={view} style={{ marginBottom: "24px", background: "#FFF", border: "2px solid #000", borderLeft: "8px solid #000", padding: "20px", boxShadow: "4px 4px 0px #F0F0F0" }}>
                <div style={{ fontSize: "12px", fontWeight: 950, color: "#000", marginBottom: "12px", textTransform: "uppercase" }}>
                  {view === "anterior" ? "VISTA ANTERIOR" : 
                   view === "posterior" ? "VISTA POSTERIOR" : 
                   view === "lateral_right" ? "LATERAL DIREITA" : 
                   view === "lateral_left" ? "LATERAL ESQUERDA" : view}
                </div>
                <div style={{ fontSize: "13px", color: "#000", lineHeight: 1.5, background: "#F9F9F9", padding: "16px", border: "1px dashed #000", fontWeight: 600 }}>
                   {String(findings)}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <BottomNav />
    </div>
  );
}
