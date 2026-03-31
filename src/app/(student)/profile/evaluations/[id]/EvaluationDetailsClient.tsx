"use client";

import { useState } from "react";
import Link from "next/link";

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
 * seguindo a estética brutalista "Iron Monolith".
 * 
 * Funcionalidades principais:
 * - Tab Navigation: Alterna entre diferentes vistas técnicas sem reload.
 * - Radar de Evolução: Slider interativo (0-100) para comparação imediata (clipping) 
 *   entre a imagem anterior (gray-scale) e a atual.
 * - Indicadores de Delta: Cálculos em tempo real comparando medidas atuais com a anterior,
 *   usando cores de status baseadas em progresso (Verde) ou atenção (Vermelho).
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
    if (diff === 0) return "rgba(255,255,255,0.4)";
    const good = inverse ? diff > 0 : diff < 0;
    return good ? "#10B981" : "#F43F5E";
  };

  const tabs = [
    { id: "resumo", label: "RESUMO" },
    { id: "antropometria", label: "ANTROPO" },
    { id: "composicao", label: "COMPOSIÇÃO" },
    { id: "postura", label: "POSTURA" },
  ];

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
          <Link href="/profile/evaluations" style={{ color: "#FFF", display: "flex", alignItems: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "14px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>ANÁLISE DE ATLETA</h1>
        </div>
      </header>

      {/* ── TAB NAVIGATION ── */}
      <nav style={{ 
        maxWidth: "480px", 
        margin: "0 auto", 
        padding: "0 20px", 
        display: "flex", 
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "#131313"
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
              color: activeTab === tab.id ? "#E31B23" : "rgba(255,255,255,0.3)",
              borderBottom: activeTab === tab.id ? "2px solid #E31B23" : "2px solid transparent",
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
              <div style={{ fontSize: "14px", fontWeight: 900, color: "#E31B23", fontFamily: "'Outfit', sans-serif" }}>
                {new Date(evaluation.evaluation_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}
              </div>
              <div style={{ fontSize: "10px", fontWeight: 700, background: "rgba(255,255,255,0.05)", padding: "4px 8px", borderRadius: "2px" }}>
                ESTADO: <span style={{ color: "#10B981" }}>EM EVOLUÇÃO</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "32px" }}>
               {/* Weight Card */}
               <div style={{ background: "#0E0E0E", padding: "20px" }}>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>PESO ATUAL</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "24px", fontWeight: 900, color: "#FFF" }}>{evaluation.weight} <span style={{ fontSize: "10px" }}>KG</span></div>
                  {previous && (
                    <span style={{ fontSize: "10px", fontWeight: 800, color: getStatusColor(evaluation.weight - previous.weight) }}>
                      {getDelta(evaluation.weight, previous.weight)}
                    </span>
                  )}
                </div>
              </div>
              {/* BF Card */}
              <div style={{ background: "#0E0E0E", padding: "20px" }}>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>GORDURA CORPO</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "24px", fontWeight: 900, color: "#E31B23" }}>{evaluation.body_fat_percentage}%</div>
                  {previous && (
                    <span style={{ fontSize: "10px", fontWeight: 800, color: getStatusColor(evaluation.body_fat_percentage - previous.body_fat_percentage) }}>
                      {getDelta(evaluation.body_fat_percentage, previous.body_fat_percentage)}
                    </span>
                  )}
                </div>
              </div>
              {/* BMI Card */}
              <div style={{ background: "#0E0E0E", padding: "20px" }}>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>IMC (BODY INDEX)</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 900, color: "#FFF" }}>{bmi}</div>
              </div>
              {/* Lean Mass Card */}
              <div style={{ background: "#0E0E0E", padding: "20px" }}>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>MASSA MAGRA</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 900, color: "#10B981" }}>{leanMass} <span style={{ fontSize: "10px", color: "#FFF" }}>KG</span></div>
                  {prevLeanMass && (
                    <span style={{ fontSize: "10px", fontWeight: 800, color: getStatusColor(Number(leanMass) - Number(prevLeanMass), true) }}>
                      {getDelta(Number(leanMass), Number(prevLeanMass))}
                    </span>
                  )}
                </div>
              </div>

              {/* Height Card */}
              <div style={{ background: "#0E0E0E", padding: "20px" }}>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>ALTURA</div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 900, color: "#FFF" }}>{evaluation.height} <span style={{ fontSize: "10px" }}>M</span></div>
              </div>

              {/* WHR Card */}
              <div style={{ background: "#0E0E0E", padding: "20px" }}>
                <div style={{ fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.3)", marginBottom: "4px" }}>WHR (CINTURA/QUADRIL)</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "20px", fontWeight: 900, color: (evaluation.waist_hip_ratio || 0) > 0.9 ? "#F43F5E" : "#FFF" }}>
                    {evaluation.waist_hip_ratio || "--"}
                  </div>
                  <span style={{ fontSize: "8px", fontWeight: 900, color: (evaluation.waist_hip_ratio || 0) > 0.9 ? "#F43F5E" : "rgba(255,255,255,0.4)" }}>
                    {(evaluation.waist_hip_ratio || 0) > 0.9 ? "ATENÇÃO" : "SAUDÁVEL"}
                  </span>
                </div>
              </div>
            </div>

            {/* RADAR DE EVOLUÇÃO (Visual Wow) */}
            {previous && evaluation.photos.length > 0 && previous.photos.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "12px", fontWeight: 900 }}>RADAR DE EVOLUÇÃO</h2>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
                </div>
                
                <div style={{ position: "relative", aspectRatio: "3/4", background: "#0E0E0E", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {/* Previous Image */}
                  <img 
                    src={previous.photos[0].url} 
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%) opacity(0.5)" }} 
                  />
                  {/* Current Image (Clipped) */}
                  <div style={{ 
                    position: "absolute", 
                    inset: 0, 
                    width: `${evolutionSplit}%`, 
                    overflow: "hidden", 
                    borderRight: "2px solid #E31B23",
                    zIndex: 2
                  }}>
                    <img 
                      src={evaluation.photos[0].url} 
                      style={{ width: "440px", height: "100%", objectFit: "cover" }} 
                    />
                  </div>
                  {/* Labels */}
                  <div style={{ position: "absolute", left: "12px", top: "12px", fontSize: "10px", fontWeight: 900, color: "rgba(255,255,255,0.5)", zIndex: 3 }}>ANTERIOR</div>
                  <div style={{ position: "absolute", right: "12px", top: "12px", fontSize: "10px", fontWeight: 900, color: "#FFF", zIndex: 3, background: "#E31B23", padding: "2px 6px" }}>ATUAL</div>
                  
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
                <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", marginTop: "12px", textAlign: "center", letterSpacing: "0.1em" }}>DESLIZE PARA COMPARAR DEFINIÇÃO E VOLUME</p>
              </section>
            )}

            {/* GALERIA COMPLETA */}
            {evaluation.photos.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "12px", fontWeight: 900 }}>GALERIA DE REGISTROS</h2>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                  {evaluation.photos.map((photo, i) => (
                    <div key={i} style={{ background: "#0E0E0E", padding: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <img src={photo.url} alt={photo.label} style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", marginBottom: "8px" }} />
                      <div style={{ fontSize: "9px", fontWeight: 800, color: "rgba(255,255,255,0.4)", textAlign: "center", textTransform: "uppercase" }}>{photo.label || `FOTO ${i+1}`}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {evaluation.notes && (
              <section style={{ padding: "20px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid #E31B23" }}>
                <h3 style={{ fontSize: "10px", fontWeight: 900, marginBottom: "8px", color: "rgba(255,255,255,0.4)" }}>OBSERVAÇÕES DO COACH</h3>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{evaluation.notes}</p>
              </section>
            )}
          </div>
        )}

        {/* ── CONTENT: ANTROPOMETRIA ── */}
        {activeTab === "antropometria" && (
          <div className="animate-fadeIn">
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "12px", fontWeight: 900, marginBottom: "20px", color: "#E31B23" }}>PERIMETRIA TÉCNICA (CM)</h2>
            <div style={{ display: "grid", gap: "1px", background: "rgba(255,255,255,0.05)" }}>
              {[
                { key: "neck", label: "PESCOÇO" },
                { key: "shoulder", label: "OMBRO" },
                { key: "chest", label: "TÓRAX" },
                { key: "waist", label: "CINTURA" },
                { key: "abdomen", label: "ABDÔMEN" },
                { key: "hip", label: "QUADRIL" },
                { key: "arm_right", label: "BRAÇO RELAXADO DIR." },
                { key: "arm_left", label: "BRAÇO RELAXADO ESQ." },
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
                  <div key={field.key} style={{ background: "#0E0E0E", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{field.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "14px" }}>{value}</span>
                      {previous?.measurements?.[field.key] && (
                        <span style={{ fontSize: "9px", color: getStatusColor(Number(value) - Number(previous.measurements[field.key]), true) }}>
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
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "12px", fontWeight: 900, color: "#E31B23" }}>DOBRAS CUTÂNEAS (MM)</h2>
              <span style={{ fontSize: "8px", fontWeight: 900, opacity: 0.4 }}>PROTOCOLO: {evaluation.protocol}</span>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "32px" }}>
              {[
                { key: "triceps", label: "TRÍCEPS" },
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
                  <div key={field.key} style={{ background: "#0E0E0E", padding: "16px" }}>
                    <div style={{ fontSize: "8px", fontWeight: 700, color: "rgba(255,255,255,0.4)", marginBottom: "4px", textTransform: "uppercase" }}>{field.label}</div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: "18px", fontWeight: 900 }}>{value}</div>
                  </div>
                );
              })}
            </div>

            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "12px", fontWeight: 900, marginBottom: "20px", color: "rgba(255,255,255,0.4)" }}>DIÂMETROS ÓSSEOS (CM)</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
              {[
                { key: "humerus", label: "ÚMERO" },
                { key: "femur", label: "FÊMUR" },
                { key: "wrist", label: "PULSO" },
                { key: "ankle", label: "TORNOZELO" }
              ].map(field => {
                const value = evaluation.bone_diameters[field.key];
                if (value === undefined || value === null) return null;
                return (
                  <div key={field.key} style={{ background: "#0E0E0E", padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: "7px", fontWeight: 700, opacity: 0.4, marginBottom: "4px", textTransform: "uppercase" }}>{field.label}</div>
                    <div style={{ fontSize: "12px", fontWeight: 900 }}>{value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CONTENT: POSTURA ── */}
        {activeTab === "postura" && (
          <div className="animate-fadeIn">
            <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: "12px", fontWeight: 900, marginBottom: "20px", color: "#E31B23" }}>ANÁLISE BIOMECÂNICA</h2>
            
            {Object.entries(evaluation.postural_analysis).map(([view, findings]) => (
              <div key={view} style={{ marginBottom: "24px", background: "#0E0E0E", borderLeft: "2px solid #E31B23", padding: "16px" }}>
                <div style={{ fontSize: "10px", fontWeight: 900, color: "#E31B23", marginBottom: "12px", textTransform: "uppercase" }}>
                  {view === "anterior" ? "VISTA ANTERIOR" : 
                   view === "posterior" ? "VISTA POSTERIOR" : 
                   view === "lateral_right" ? "LATERAL DIREITA" : 
                   view === "lateral_left" ? "LATERAL ESQUERDA" : view}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", lineHeight: 1.5, background: "rgba(255,255,255,0.02)", padding: "12px" }}>
                   {String(findings)}
                </div>
              </div>
            ))}
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
