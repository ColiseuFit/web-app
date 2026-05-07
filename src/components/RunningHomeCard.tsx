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
 * RunningHomeCard — Visualização da Próxima Sessão (Timeline Híbrida).
 * 
 * @design Neo-Brutalist Blue (#2980BA / #E8F4FD).
 * @ux Focado na progressão linear por sessões, suportando múltiplos blocos.
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
    if (unit === 'm') return acc + ((dist * reps) / 1000);
    return acc + (dist * reps);
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
               SEM {firstBlock.week_number} · S{firstBlock.session_order}
             </div>
          </div>
        </div>

        {/* Conteúdo (Lista de Blocos) */}
        <div style={{ padding: "16px" }}>
          <div style={{ 
            fontSize: "10px", 
            fontWeight: 800, 
            color: "#2980BA", 
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.02em"
          }}>
            {planTitle}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {blocks.map((b, idx) => (
              <div key={b.id} style={{ 
                position: "relative", 
                paddingLeft: 12,
                borderLeft: idx === blocks.length - 1 ? "none" : "2px dashed #EEE"
              }}>
                {/* Indicador de Timeline */}
                <div style={{ 
                  position: "absolute", left: -4, top: 4, 
                  width: 6, height: 6, background: "#2980BA", borderRadius: "50%",
                  border: "2px solid #FFF"
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: "14px", lineHeight: 1.2, color: "#000", textTransform: "uppercase" }}>
                      {(b.reps || 1) > 1 && <span style={{ color: "var(--nb-blue)", marginRight: 4 }}>{b.reps}x</span>}
                      {b.target_description}
                    </div>
                    
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                      {b.category && (
                        <span style={{ 
                          fontSize: "8px", fontWeight: 900, padding: "1px 4px", 
                          background: "#F1F5F9", color: "#64748B", 
                          border: "1px solid #CBD5E1", textTransform: "uppercase" 
                        }}>
                          {b.category}
                        </span>
                      )}
                      {b.target_zone && b.target_zone.toLowerCase() !== "livre" && (
                        <span style={{ 
                          fontSize: "8px", fontWeight: 950, padding: "1px 4px", 
                          background: "#E8F4FD", color: "#2980BA", 
                          border: "1px solid #2980BA", textTransform: "uppercase" 
                        }}>
                          {b.target_zone}
                        </span>
                      )}
                      {(b.target_distance_km || b.reps) && (
                        <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "9px", fontWeight: 800, color: "#475569" }}>
                          <Zap size={8} color="#2980BA" fill="#2980BA" />
                          {b.target_unit === "m" 
                            ? `${((Number(b.target_distance_km) || 0) >= 1 ? Number(b.target_distance_km) : Number(b.target_distance_km) * 1000).toFixed(0)}M`
                            : b.target_unit === "min" 
                              ? `${b.target_distance_km}MIN`
                              : `${b.target_distance_km}KM`
                          }
                        </div>
                      )}
                      {b.target_pace_description && (
                        <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: "9px", fontWeight: 800, color: "#475569" }}>
                          <ActivityIcon size={8} color="#2980BA" />
                          {b.target_pace_description}
                        </div>
                      )}
                    </div>
                  </div>
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
