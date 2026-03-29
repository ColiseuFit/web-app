"use client";

import React, { useState, useTransition } from "react";
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
 * ProgressDashboardClient - The interactive heart of the Progress module.
 * Fully connected to Server Actions for database persistence.
 */
export default function ProgressDashboardClient({
  initialPrs,
  initialGoals,
  studentName,
  targetFrequency,
  currentCheckIns,
  studentLevel
}: ProgressDashboardClientProps) {
  const [prs, setPrs] = useState<PR[]>(initialPrs);
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [target, setTarget] = useState(targetFrequency);
  const [showPRModal, setShowPRModal] = useState(false);
  const [isPending, startTransition] = useTransition();

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
        setGoals(prev => [...prev, result.data]);
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
          initialLevel={studentLevel as any}
          onSuccess={() => {
            setShowPRModal(false);
            window.location.reload(); 
          }}
        />
      )}
      
      {/* 1. MONITOR DE COMPROMISSO */}
      <section style={{ margin: "0 20px 24px", background: "var(--surface-lowest)", border: "1px solid var(--border-glow)", position: "relative", overflow: "hidden", borderRadius: "4px" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: "var(--red)" }} />
        
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-glow)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "var(--text-muted)", textTransform: "uppercase" }}>COMPROMISSO SEMANAL</span>
        </div>

        <div style={{ padding: "24px 0 32px" }}>
          <ProgressGauge 
            current={currentCheckIns} 
            target={target} 
            label="Compromisso Semanal" 
          />

          {/* TARGET SELECTOR (TACTICAL UI) */}
          <div style={{ marginTop: "24px", padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.2em", marginBottom: "12px", textTransform: "uppercase" }}>
              AJUSTAR META DE TREINOS
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                const isActive = target === num;
                return (
                  <button
                    key={num}
                    onClick={() => handleUpdateTarget(num)}
                    disabled={isPending}
                    style={{
                      width: "36px",
                      height: "36px",
                      background: isActive ? "var(--red)" : "rgba(255,255,255,0.03)",
                      border: "1px solid",
                      borderColor: isActive ? "var(--red)" : "var(--border-glow)",
                      color: isActive ? "white" : "var(--text-muted)",
                      fontSize: "12px",
                      fontWeight: 900,
                      fontStyle: "italic",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isPending ? "not-allowed" : "pointer",
                      transition: "all 0.2s cubic-bezier(0.2, 0, 0, 1)",
                      filter: isActive ? "drop-shadow(0 0 8px rgba(227,27,35,0.4))" : "none",
                      position: "relative",
                      overflow: "hidden"
                    }}
                    className="btn-outline-hover"
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "16px", fontStyle: "italic", opacity: isPending ? 0.5 : 1 }}>
              {isPending ? "SINCRONIZANDO..." : `META ATUAL: ${target} DIAS/SEMANA`}
            </p>
          </div>
        </div>
      </section>

      {/* 2. RECORDES PESSOAIS */}
      <section style={{ margin: "0 20px 24px", background: "var(--surface-lowest)", border: "1px solid var(--border-glow)", position: "relative", overflow: "hidden", borderRadius: "4px" }}>
        
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-glow)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "var(--text-muted)", textTransform: "uppercase" }}>ARSENAL DE MOVIMENTOS (PRS)</span>
        </div>

        <PRMatrix 
          prs={prs || []} 
          onUpsert={handleUpsertPR}
        />
      </section>

      {/* 3. METAS E OBJETIVOS */}
      <section style={{ margin: "0 20px 24px", background: "var(--surface-lowest)", border: "1px solid var(--border-glow)", position: "relative", overflow: "hidden", borderRadius: "4px" }}>
        
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-glow)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", color: "var(--text-muted)", textTransform: "uppercase" }}>OBJETIVOS E METAS</span>
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
