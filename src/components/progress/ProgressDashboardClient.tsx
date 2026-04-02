"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProgressGauge } from "./ProgressGauge";
import { PRMatrix } from "./PRMatrix";
import { GoalsSection } from "./GoalsSection";
import PRRegistrationModal from "./PRRegistrationModal";
import { 
  toggleGoalStatus, 
  createGoal,
  updateWeeklyTarget 
} from "@/app/(student)/actions";

interface PR {
  id: string;
  movement_key: string;
  value: number;
  unit: 'kg' | 'time' | 'reps';
  category: 'lpo' | 'strength' | 'gymnastics' | 'benchmark';
  level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  date: string;
}

interface Goal {
  id: string;
  title: string;
  is_completed: boolean;
}

interface ProgressDashboardClientProps {
  initialPrs: PR[];
  initialGoals: Goal[];
  studentName: string;
  targetFrequency: number;
  currentCheckIns: number;
  studentLevel?: string;
}

/**
 * ProgressDashboardClient - O coração interativo do módulo de Progresso.
 * 
 * @security
 * - Todas as mutações são realizadas via Server Actions (`actions.ts`).
 * - Validação de dados via schemas Zod antes da persistência.
 * - Isolamento de tenant garantido pela autenticação do Supabase.
 * 
 * @technical
 * - Implementa **Optimistic UI** para a mudança de metas semanais (vibrante e instantâneo).
 * - Componente unificado que orquestra Gauges de Progresso, Matriz de PRs e Lista de Objetivos.
 * - Centraliza o estado local para evitar múltiplas viagens ao servidor durante interações rápidas.
 */
export default function ProgressDashboardClient({
  initialPrs,
  initialGoals,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  studentName,
  targetFrequency,
  currentCheckIns,
  studentLevel
}: ProgressDashboardClientProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [prs, setPrs] = useState<PR[]>(initialPrs);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [target, setTarget] = useState(targetFrequency);
  const [showPRModal, setShowPRModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Handlers
  const handleUpdateTarget = async (newTarget: number) => {
    if (newTarget === target) return;
    
    // Optimistic update
    const previousTarget = target;
    setTarget(newTarget);

    startTransition(async () => {
      const result = await updateWeeklyTarget(newTarget);
      if (result?.error) {
        setTarget(previousTarget);
        alert("Erro ao atualizar meta: " + result.error);
      }
    });
  };

  const handleToggleGoal = async (id: string, currentStatus: boolean) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, is_completed: !currentStatus } : g))
    );

    startTransition(async () => {
      const result = await toggleGoalStatus(id, currentStatus);
      if (result?.error) {
        setGoals((prev) =>
          prev.map((g) => (g.id === id ? { ...g, is_completed: currentStatus } : g))
        );
        alert("Erro ao atualizar meta: " + result.error);
      }
    });
  };

  const handleAddGoal = async (title: string) => {
    if (!title.trim()) return;

    startTransition(async () => {
      const result = await createGoal(title);
      if (result?.error) {
        alert("Erro ao criar meta: " + result.error);
      } else if (result?.data) {
        // Adding with real ID from server to avoid UUID mismatch on immediate toggle
        setGoals(prev => [...prev, result.data as Goal]);
      }
    });
  };

  const handleUpsertPR = () => {
    setShowPRModal(true);
  };

  return (
    <>
      {showPRModal && (
        <PRRegistrationModal 
          onClose={() => setShowPRModal(false)}
          initialLevel={studentLevel as "L1" | "L2" | "L3" | "L4" | "L5" | undefined}
          onSuccess={() => {
            setShowPRModal(false);
            // Revalida os dados do servidor sem reload destrutivo
            router.refresh();
          }}
        />
      )}
      
      {/* 1. MONITOR DE COMPROMISSO */}
      <section style={{ margin: "0 20px 32px", background: "#FFF", border: "2px solid #000", position: "relative", overflow: "hidden", boxShadow: "8px 8px 0px rgba(0,0,0,0.1)" }}>
        
        <div style={{ padding: "16px 20px", borderBottom: "2px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#000" }}>
          <span className="font-headline" style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em", color: "#FFF", textTransform: "uppercase" }}>COMPROMISSO SEMANAL</span>
          <div style={{ width: "8px", height: "8px", background: "#E31B23", border: "1px solid #FFF" }} />
        </div>

        <div style={{ padding: "32px 0" }}>
          <ProgressGauge 
            current={currentCheckIns} 
            target={target} 
            label="Meta de Treinos" 
          />

          {/* TARGET SELECTOR (NEO-BRUTALIST) */}
          <div style={{ marginTop: "32px", padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p className="font-headline" style={{ fontSize: "8px", fontWeight: 900, color: "rgba(0,0,0,0.5)", letterSpacing: "0.25em", marginBottom: "16px", textTransform: "uppercase" }}>
              DEFINIR NOVA META SEMANAL
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px" }}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                const isActive = target === num;
                return (
                  <button
                    key={num}
                    onClick={() => handleUpdateTarget(num)}
                    disabled={isPending}
                    style={{
                      width: "40px",
                      height: "40px",
                      background: isActive ? "#000" : "#FFF",
                      border: "2px solid #000",
                      color: isActive ? "#FFF" : "#000",
                      fontSize: "14px",
                      fontWeight: 900,
                      fontStyle: "italic",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isPending ? "not-allowed" : "pointer",
                      transition: "all 0.1s ease",
                      boxShadow: isActive ? "4px 4px 0px #E31B23" : "2px 2px 0px rgba(0,0,0,0.1)",
                      transform: isActive ? "translate(-2px, -2px)" : "none",
                    }}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: "24px", padding: "8px 16px", background: "#f0f0f0", border: "1px solid #000", boxShadow: "2px 2px 0px #000" }}>
              <p style={{ fontSize: "10px", color: "#000", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {isPending ? "SINCRONIZANDO..." : `META ATIVA: ${target} DIAS`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. RECORDES PESSOAIS */}
      <section style={{ margin: "0 20px 32px", background: "#FFF", border: "2px solid #000", position: "relative", overflow: "hidden", boxShadow: "8px 8px 0px rgba(0,0,0,0.1)" }}>
        
        <div style={{ padding: "16px 20px", borderBottom: "2px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#000" }}>
          <span className="font-headline" style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em", color: "#FFF", textTransform: "uppercase" }}>BIBLIOTECA DE PRS</span>
          <div style={{ width: "8px", height: "8px", background: "#FFF" }} />
        </div>

        <PRMatrix 
          prs={prs || []} 
          onUpsert={handleUpsertPR}
        />
      </section>

      {/* 3. METAS E OBJETIVOS */}
      <section style={{ margin: "0 20px 32px", background: "#FFF", border: "2px solid #000", position: "relative", overflow: "hidden", boxShadow: "8px 8px 0px rgba(0,0,0,0.1)" }}>
        
        <div style={{ padding: "16px 20px", borderBottom: "2px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#000" }}>
          <span className="font-headline" style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.2em", color: "#FFF", textTransform: "uppercase" }}>OBJETIVOS TÉCNICOS</span>
          <div style={{ width: "8px", height: "8px", background: "#E31B23" }} />
        </div>

        <div style={{ padding: "0" }}>
          <GoalsSection 
            goals={goals || []} 
            onToggleGoal={handleToggleGoal}
            onAddGoal={handleAddGoal}
          />
        </div>
      </section>
    </>
  );
}
