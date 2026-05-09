"use client";

import React from "react";
import { Footprints, ChevronRight, Zap, Activity } from "lucide-react";
import Link from "next/link";

interface RunningWorkout {
  id: string;
  target_description: string;
  target_distance_km?: number | string | null;
  target_pace_description?: string | null;
  target_rest_time_description?: string | null;
  completed_at?: string | null;
  week_number?: number;
  session_order?: number;
  running_plans?: { title: string } | { title: string }[] | null;
  reps?: number | null;
  category?: string | null;
  target_zone?: string | null;
  target_unit?: string | null;
}

interface Props {
  workout: RunningWorkout | RunningWorkout[] | null;
}

/**
 * RunningHomeCard - Componente de exibição do próximo treino na Home do Aluno.
 * 
 * @description Exibe o próximo treino de corrida pendente do atleta.
 * Ao invés de exibir apenas um bloco isolado, este componente processa um array de blocos 
 * pertencentes à mesma sessão e os agrupa em uma interface limpa e gamificada (Neo-Brutalism).
 * O volume total é normalizado em KM para prevenir bugs visuais e facilitar a leitura do atleta.
 * 
 * @param {Props} props - Propriedades do componente
 * @param {RunningWorkout | RunningWorkout[] | null} props.workout - Dados do treino, contendo a lista completa de blocos daquela sessão.
 * @returns {React.ReactElement | null} O Card do próximo treino, ou null se não houver treinos pendentes.
 * 
 * @UI_UX A estrutura do treino é comprimida em uma timeline vertical simplificada ("Estrutura do Treino"), 
 *        exibindo apenas badges (Zona, Categoria, KM) para reduzir a carga cognitiva do usuário antes do play.
 */
export default function RunningHomeCard({ workout }: Props) {
  if (!workout) return null;

  // Garantir que temos um array para a lógica de blocos
  const blocks = Array.isArray(workout) ? workout : [workout];
  if (blocks.length === 0) return null;

  const firstBlock = blocks[0];
  const planTitle = Array.isArray(firstBlock.running_plans) 
    ? firstBlock.running_plans[0]?.title 
    : (firstBlock.running_plans as any)?.title || "Planilha de Corrida";

  // Cálculo de Volume Total da Sessão (Somente KM e M)
  const totalKm = blocks.reduce((acc, b) => {
    const dist = parseFloat(String(b.target_distance_km)) || 0;
    const reps = b.reps || 1;
    const unit = b.target_unit?.toLowerCase() || 'km';
    
    if (unit === 'min') return acc;
    
    // Normalização: se a unidade for "m", verifica se já está em km (ex: 0.5) ou em metros (ex: 500)
    let distInKm = dist;
    if (unit === 'm') {
      distInKm = dist >= 1 ? dist / 1000 : dist;
    }
    
    return acc + (distInKm * reps);
  }, 0);

  return (
    <section className="animate-in" style={{ margin: "0 20px 24px", animationDelay: "0.2s" }}>
      <div style={{
        background: "#FFF",
        border: "3px solid #000",
        boxShadow: "6px 6px 0px #2980BA",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Header do Card */}
        <div style={{
          background: "#E8F4FD",
          padding: "10px 16px",
          borderBottom: "2px solid #000",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              background: "#2980BA",
              padding: "4px",
              borderRadius: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #000"
            }}>
              <Footprints size={14} color="#FFF" />
            </div>
            <span className="font-headline" style={{ 
              fontSize: "10px", 
              fontWeight: 900, 
              letterSpacing: "0.1em", 
              color: "#000", 
              textTransform: "uppercase" 
            }}>
              PRÓXIMO TREINO
            </span>
          </div>
          
          <div style={{ display: "flex", gap: 6 }}>
             {totalKm > 0 && (
               <div style={{
                 fontSize: "9px",
                 fontWeight: 950,
                 color: "#FFF",
                 background: "#000",
                 padding: "2px 6px",
                 borderRadius: "2px",
                 textTransform: "uppercase"
               }}>
                 {totalKm.toFixed(1)}KM
               </div>
             )}
             <div style={{
               fontSize: "9px",
               fontWeight: 900,
               color: "#2980BA",
               background: "#FFF",
               padding: "2px 6px",
               border: "1px solid #000",
               textTransform: "uppercase"
             }}>
               SEMANA {firstBlock.week_number}
             </div>
          </div>
        </div>

        {/* Conteúdo (Lista de Blocos) */}
        <div style={{ padding: "16px" }}>
          <div style={{ 
            fontSize: "10px", 
            fontWeight: 900, 
            color: "#2980BA", 
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: "0.04em"
          }}>
            {planTitle}
          </div>

          <div style={{
            fontSize: "24px",
            fontWeight: 950,
            textTransform: "uppercase",
            color: "#000",
            marginBottom: 16,
            lineHeight: 1.1
          }}>
            TREINO {firstBlock.session_order}
          </div>

          <div style={{ 
            display: "flex", flexDirection: "column", gap: 12, 
            background: "#F8FAFC", padding: "12px", border: "1px solid #E2E8F0" 
          }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>
              Estrutura do Treino ({blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'})
            </div>
            {blocks.map((b, idx) => (
              <div key={b.id} style={{ 
                position: "relative", 
                paddingLeft: 12,
                borderLeft: idx === blocks.length - 1 ? "2px solid transparent" : "2px solid #CBD5E1",
                paddingBottom: idx === blocks.length - 1 ? 0 : 12
              }}>
                {/* Indicador de Timeline */}
                <div style={{ 
                  position: "absolute", left: -5, top: 2, 
                  width: 8, height: 8, background: "#2980BA", borderRadius: "50%",
                }} />

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginTop: 1 }}>
                  {b.category && (
                    <span style={{ 
                      fontSize: "9px", fontWeight: 900, padding: "2px 6px", 
                      background: "#E2E8F0", color: "#334155", 
                      textTransform: "uppercase", borderRadius: "2px"
                    }}>
                      {b.category}
                    </span>
                  )}
                  {b.target_zone && b.target_zone.toLowerCase() !== "livre" && (
                    <span style={{ 
                      fontSize: "9px", fontWeight: 950, padding: "2px 6px", 
                      background: "#E8F4FD", color: "#2980BA", 
                      textTransform: "uppercase", borderRadius: "2px"
                    }}>
                      {b.target_zone}
                    </span>
                  )}
                  {(b.target_distance_km || b.reps) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "10px", fontWeight: 900, color: "#000" }}>
                      {(b.reps || 1) > 1 && <span style={{ color: "var(--nb-blue)", marginRight: 2 }}>{b.reps}x</span>}
                      {b.target_unit === "m" 
                        ? `${((Number(b.target_distance_km) || 0) >= 1 ? Number(b.target_distance_km) : Number(b.target_distance_km) * 1000).toFixed(0)}m`
                        : b.target_unit === "min" 
                          ? `${b.target_distance_km}min`
                          : `${b.target_distance_km}km`
                      }
                    </div>
                  )}
                  {b.target_pace_description && (
                    <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "9px", fontWeight: 800, color: "#475569" }}>
                      <ActivityIcon size={10} color="#2980BA" />
                      {b.target_pace_description}
                    </div>
                  )}
                  {b.target_rest_time_description && (
                    <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "9px", fontWeight: 800, color: "#475569" }}>
                      <span style={{ color: "#94A3B8" }}>DESC:</span> {b.target_rest_time_description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <Link 
              href="/programas/running"
              style={{ 
                textDecoration: "none",
                background: "#2980BA",
                color: "#FFF",
                width: "100%",
                padding: "12px",
                border: "2px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "4px 4px 0px #000",
                fontSize: "12px",
                fontWeight: 950,
                textTransform: "uppercase",
                transition: "all 0.1s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translate(-2px, -2px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              Iniciar Treino <ChevronRight size={18} strokeWidth={3} />
            </Link>
          </div>
        </div>

        {/* Footer Link */}
        <Link href="/programas/running" style={{ 
          display: "block",
          textAlign: "center",
          padding: "8px",
          background: "#F8F8F8",
          borderTop: "1px solid #EEE",
          fontSize: "10px",
          fontWeight: 900,
          color: "#999",
          textDecoration: "none",
          textTransform: "uppercase",
          letterSpacing: "0.1em"
        }}>
          Ver cronograma completo
        </Link>
      </div>
      
      <style jsx>{`
        .animate-in {
          animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        @keyframes slideInUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </section>
  );
}

function ActivityIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
