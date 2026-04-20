"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronDown, Maximize2, X } from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import DashboardStyles from "@/components/DashboardStyles";
import { calculateBodyComposition, calculateBMI, calculateAge } from "@/lib/physique-utils";
import { AlertCircle } from "lucide-react";

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

interface StudentProfile {
  gender?: string | null;
  birth_date?: string | null;
  full_name?: string | null;
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
  previous,
  student
}: { 
  evaluation: EvaluationData; 
  previous: EvaluationData | null;
  student: StudentProfile | null;
}) {
  const [activeTab, setActiveTab] = useState<"resumo" | "antropometria" | "composicao" | "postura">("resumo");
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [evolutionSplit, setEvolutionSplit] = useState(50); // For the slider (0-100)
  const [selectedPose, setSelectedPose] = useState("Frente");

  // Ref para o container da comparação de fotos (drag customizado)
  const compContainerRef = useRef<HTMLDivElement>(null);

  /**
   * Handler de drag customizado usando Pointer Events API.
   * Funciona de forma confiável em touch (mobile) e mouse (desktop).
   * `touch-action: none` previne conflito com o scroll da página.
   * @param e - Evento de PointerDown que inicia o drag
   */
  const handleDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const update = (clientX: number) => {
      const container = compContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      setEvolutionSplit(Math.round((x / rect.width) * 100));
    };

    update(e.clientX);

    const onMove = (ev: PointerEvent) => update(ev.clientX);
    const onUp = () => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
    };

    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
  }, []);

  // --- CÁLCULOS E SELF-HEALING ---
  // 1. Idade e Gênero base (SSoT)
  const age = student?.birth_date ? calculateAge(student.birth_date, evaluation.evaluation_date) : 30; // 30 is a safe average fallback if missing
  const gender = student?.gender || "masculino";

  // 2. IMC
  const bmi = calculateBMI(evaluation.weight, evaluation.height) || "--";
  
  // 3. Percentual de Gordura (Pilar da Operação Antigravity)
  const getHealedBF = (evalObj: EvaluationData) => {
    // Se já temos o valor persistido, usamos ele (respeitando a autoridade do Coach)
    if (evalObj.body_fat_percentage && evalObj.body_fat_percentage > 0) return evalObj.body_fat_percentage;

    // Se não, tentamos calcular em tempo real (Self-Healing) estritamente via Pollock 7
    const results = calculateBodyComposition(
      evalObj.weight,
      evalObj.height,
      evalObj.skinfolds as any,
      age,
      gender,
      "Pollock 7 Dobras"
    );

    return (results.bf !== null && results.bf > 0) ? results.bf : null;
  };

  const bodyFat = getHealedBF(evaluation);
  const prevBodyFat = previous ? getHealedBF(previous) : null;

  // 4. Massa Magra
  const leanMass = (evaluation.weight && bodyFat)
    ? (evaluation.weight * (1 - bodyFat / 100)).toFixed(1)
    : "--";

  const prevLeanMass = (previous?.weight && prevBodyFat)
    ? (previous.weight * (1 - prevBodyFat / 100)).toFixed(1)
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

  const availablePoses = ["Frente", "Costas", "Lateral Direita", "Lateral Esquerda", "Postural"];
  
  // Get matching photos
  const currentPhoto = evaluation.photos.find(p => p.label === selectedPose) || evaluation.photos[0];
  const previousPhoto = previous?.photos.find(p => p.label === selectedPose);

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
        
        {/* WARNING: Gênero Ausente */}
        {(!student?.gender) && activeTab === "resumo" && (
          <div style={{ 
            background: "#FFF4F4", 
            border: "2px solid #E31B23", 
            padding: "16px", 
            marginBottom: "24px", 
            display: "flex", 
            gap: "12px",
            boxShadow: "4px 4px 0px #000"
          }}>
            <AlertCircle color="#E31B23" size={20} />
            <div>
              <div style={{ fontSize: "10px", fontWeight: 900, color: "#E31B23", marginBottom: "4px" }}>PERFIL INCOMPLETO</div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#000" }}>
                Não identificamos seu gênero no perfil. Isso pode afetar a precisão de alguns cálculos nesta avaliação.
                <Link href="/profile" style={{ textDecoration: "underline", marginLeft: "4px", color: "#E31B23" }}>Completar agora →</Link>
              </p>
            </div>
          </div>
        )}
        {/* ── CONTENT: RESUMO ── */}
        {activeTab === "resumo" && (
          <div className="animate-fadeIn">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
              <div style={{ fontSize: "14px", fontWeight: 900, color: "#E31B23", fontFamily: "var(--font-display, 'Outfit', sans-serif)" }}>
                {new Date(evaluation.evaluation_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).toUpperCase()}
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
                  <div style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "24px", fontWeight: 950, color: "#E31B23" }}>
                    {bodyFat ? `${bodyFat}%` : "--"}
                  </div>
                  {prevBodyFat && bodyFat && (
                    <span style={{ fontSize: "10px", fontWeight: 900, color: getStatusColor(bodyFat - prevBodyFat) }}>
                      {getDelta(bodyFat, prevBodyFat)}
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
            <section style={{ marginBottom: "40px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <h2 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "14px", fontWeight: 900 }}>ANÁLISE DE PROGRESSO VISUAL</h2>
                <div style={{ flex: 1, height: "2px", background: "#000" }} />
              </div>

              {/* POSE SELECTOR (Dropdown) */}
              <div style={{ marginBottom: "24px", marginTop: "12px", position: "relative" }}>
                <div style={{ fontSize: "10px", fontWeight: 900, color: "#000", marginBottom: "8px", letterSpacing: "0.05em" }}>SELECIONE A POSE:</div>
                <div style={{ position: "relative", display: "inline-block", width: "100%" }}>
                  <select
                    value={selectedPose}
                    onChange={(e) => setSelectedPose(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "#FFF",
                      border: "3px solid #000",
                      borderRadius: "0",
                      fontSize: "14px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      cursor: "pointer",
                      appearance: "none",
                      boxShadow: "4px 4px 0px #000",
                      fontFamily: "var(--font-display, 'Outfit', sans-serif)"
                    }}
                  >
                    {availablePoses.map(pose => {
                      const hasPhoto = evaluation.photos.some(p => p.label === pose);
                      if (!hasPhoto) return null;
                      return <option key={pose} value={pose}>{pose}</option>;
                    })}
                  </select>
                  <div style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <ChevronDown size={20} strokeWidth={3} color="#000" />
                  </div>
                </div>
              </div>
              
              {currentPhoto ? (
                <div ref={compContainerRef} style={{ position: "relative", aspectRatio: "3/4", background: "#F5F5F5", overflow: "hidden", border: "2px solid #000", boxShadow: "6px 6px 0px #000" }}>
                  
                  {/* Botão de Expandir (Zindex maior que o drag) */}
                  <button 
                    onClick={() => setFullscreenImage(currentPhoto.url)}
                    style={{
                      position: "absolute",
                      top: "12px",
                      right: "12px",
                      zIndex: 20,
                      background: "#FFF",
                      border: "2px solid #000",
                      padding: "8px",
                      cursor: "pointer",
                      boxShadow: "3px 3px 0px #000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    title="Ver em tela cheia"
                  >
                    <Maximize2 size={18} strokeWidth={3} color="#000" />
                  </button>

                  {previous && previousPhoto ? (
                    <>
                      {/* Previous Image */}
                      <img 
                        src={previousPhoto.url} 
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
                        boxShadow: "2px 0 10px rgba(0,0,0,0.3)"
                      }}>
                        <img 
                          src={currentPhoto.url} 
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                        />
                      </div>
                      {/* Drag Handle Overlay — toda a área é a zona de arraste */}
                      <div
                        onPointerDown={handleDragStart}
                        style={{
                          position: "absolute",
                          inset: 0,
                          zIndex: 10,
                          cursor: "ew-resize",
                          touchAction: "none",
                          userSelect: "none",
                        }}
                      >
                        {/* Linha divisória vertical */}
                        <div style={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: `${evolutionSplit}%`,
                          width: "3px",
                          background: "#E31B23",
                          transform: "translateX(-50%)",
                          pointerEvents: "none",
                        }} />

                        {/* Handle com apenas ícone de setas — minimalista e funcional */}
                        <div style={{
                          position: "absolute",
                          top: "50%",
                          left: `${evolutionSplit}%`,
                          transform: "translate(-50%, -50%)",
                          background: "#E31B23",
                          border: "3px solid #000",
                          borderRadius: "50%",
                          width: "40px",
                          height: "40px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "3px 3px 0px #000",
                          pointerEvents: "none",
                        }}>
                          <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
                            <path d="M1 7H19M1 7L5 3M1 7L5 11M19 7L15 3M19 7L15 11" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>

                        {/* Label ATUAL — flutua no centro da metade esquerda */}
                        {evolutionSplit > 12 && (
                          <div style={{
                            position: "absolute",
                            bottom: "16px",
                            left: `${evolutionSplit / 2}%`,
                            transform: "translateX(-50%)",
                            background: "#E31B23",
                            border: "2px solid #000",
                            padding: "4px 8px",
                            pointerEvents: "none",
                            whiteSpace: "nowrap",
                          }}>
                            <span style={{ fontSize: "10px", fontWeight: 900, color: "#FFF", letterSpacing: "0.05em" }}>ATUAL</span>
                          </div>
                        )}

                        {/* Label ANTERIOR com data — flutua no centro da metade direita */}
                        {evolutionSplit < 88 && (
                          <div style={{
                            position: "absolute",
                            bottom: "16px",
                            left: `${evolutionSplit + (100 - evolutionSplit) / 2}%`,
                            transform: "translateX(-50%)",
                            background: "#FFF",
                            border: "2px solid #000",
                            padding: "4px 8px",
                            pointerEvents: "none",
                            whiteSpace: "nowrap",
                          }}>
                            <span style={{ fontSize: "10px", fontWeight: 900, color: "#000", letterSpacing: "0.05em" }}>
                              {new Date(previous.evaluation_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Only Current Image */}
                      <img 
                        src={currentPhoto.url} 
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} 
                      />
                      <div style={{ 
                        position: "absolute", 
                        inset: 0, 
                        background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 40%)",
                        zIndex: 1
                      }} />
                      
                      {/* Contextual Message */}
                      <div style={{ 
                        position: "absolute", 
                        bottom: "20px", 
                        left: "20px", 
                        right: "20px", 
                        zIndex: 2,
                        background: "#FFF",
                        border: "2px solid #000",
                        padding: "12px",
                        boxShadow: "4px 4px 0px #000"
                      }}>
                        <div style={{ fontSize: "10px", fontWeight: 900, color: "#E31B23", marginBottom: "4px", letterSpacing: "0.05em" }}>
                          {!previous ? "PRIMEIRO REGISTRO" : "NOVO ÂNGULO"}
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: 700, lineHeight: "1.3", color: "#000" }}>
                          {!previous 
                            ? "Esta é sua primeira foto nesta pose. Ela servirá como base para comparar sua evolução no próximo encontro." 
                            : "Não encontramos um registro anterior desta pose. Salvamos esta para comparar com sua evolução futura!"}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ 
                  aspectRatio: "3/4", 
                  background: "#F9F9F9", 
                  border: "2px dashed #CCC", 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  justifyContent: "center",
                  padding: "40px",
                  textAlign: "center"
                }}>
                  <div style={{ opacity: 0.3, marginBottom: "16px" }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 900, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Nenhuma foto selecionada ou disponível
                  </span>
                </div>
              )}

              {previous && currentPhoto && previousPhoto && (
                <p style={{ fontSize: "9px", color: "#000", opacity: 0.6, marginTop: "16px", textAlign: "center", letterSpacing: "0.1em", fontWeight: 900 }}>
                  DESLIZE PARA COMPARAR DEFINIÇÃO E VOLUME
                </p>
              )}
            </section>



            {/* GALERIA COMPLETA */}
            {evaluation.photos.length > 0 && (
              <section style={{ marginBottom: "40px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <h2 style={{ fontFamily: "var(--font-display, 'Outfit', sans-serif)", fontSize: "14px", fontWeight: 900 }}>GALERIA DE REGISTROS</h2>
                  <div style={{ flex: 1, height: "2px", background: "#000" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                  {evaluation.photos.map((photo, i) => (
                    <div 
                      key={i} 
                      onClick={() => setFullscreenImage(photo.url)}
                      style={{ 
                        background: "#FFF", 
                        padding: "8px", 
                        border: "2px solid #000", 
                        boxShadow: "3px 3px 0px #000",
                        cursor: "zoom-in"
                      }}
                    >
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

      {/* ── LIGHTBOX: FULLSCREEN IMAGE ── */}
      {fullscreenImage && (
        <div 
          onClick={() => setFullscreenImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(5px)",
            cursor: "zoom-out",
            animation: "fadeIn 0.2s ease-out"
          }}
        >
          {/* Close Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              background: "#E31B23",
              border: "3px solid #000",
              color: "#FFF",
              padding: "12px",
              cursor: "pointer",
              boxShadow: "4px 4px 0px #000",
              zIndex: 1001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={24} strokeWidth={3} />
          </button>

          {/* Image Container */}
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              position: "relative",
              border: "4px solid #FFF",
              boxShadow: "10px 10px 0px #000",
              background: "#000"
            }}
          >
            <img 
              src={fullscreenImage} 
              alt="Visualização ampliada"
              style={{
                maxWidth: "100vw",
                maxHeight: "85vh",
                display: "block",
                objectFit: "contain"
              }} 
            />
          </div>

          <div style={{
            position: "absolute",
            bottom: "40px",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#FFF",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            background: "#000",
            padding: "8px 16px",
            border: "1px solid rgba(255,255,255,0.2)"
          }}>
            Toque fora para fechar
          </div>
        </div>
      )}
    </div>
  );
}
