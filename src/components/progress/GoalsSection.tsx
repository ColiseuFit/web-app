"use client";

import React, { useState } from "react";

interface Goal {
  id: string;
  title: string;
  is_completed: boolean;
}

interface GoalsSectionProps {
  goals: Goal[];
  onToggleGoal?: (id: string, status: boolean) => void;
  onAddGoal?: (title: string) => void;
}

/**
 * GoalsSection - Personalized target tracking (Iron Monolith Edition).
 * Refactored to focus on individual athlete goals.
 */
export const GoalsSection: React.FC<GoalsSectionProps> = ({ 
  goals, 
  onToggleGoal,
  onAddGoal 
}) => {
  const [newGoal, setNewGoal] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoal.trim()) {
      if (onAddGoal) onAddGoal(newGoal);
      setNewGoal("");
    }
  };

  const completedCount = goals.filter(g => g.is_completed).length;
  const totalCount = goals.length;

  return (
    <div style={{ width: "100%", background: "transparent", padding: "20px" }}>
      
      {/* ── HEADER DE PROGRESSO (OBJETIVOS) ── */}
      <div style={{ display: "flex", flexDirection: "column", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.25em", color: "var(--volt)", textTransform: "uppercase" }}>
            OBJETIVOS DE CURTO PRAZO
          </h3>
          <span style={{ fontSize: "10px", fontFamily: "monospace", color: "white", fontWeight: 900, opacity: 0.8 }}>
            {completedCount} <span style={{ opacity: 0.3 }}>/</span> {totalCount}
          </span>
        </div>
        <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.03)", position: "relative", overflow: "hidden", borderRadius: "2px" }}>
          <div 
            style={{ 
              height: "100%", 
              backgroundColor: "var(--volt)", 
              transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)", 
              width: totalCount > 0 ? `${(completedCount/totalCount)*100}%` : "0%",
              boxShadow: "0 0 10px rgba(225,255,0,0.4)"
            }}
          />
        </div>
      </div>

      {/* ── LISTA DE METAS (VERTICAL LIST) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {goals.map((goal) => (
          <div 
            key={goal.id} 
            onClick={() => onToggleGoal && onToggleGoal(goal.id, goal.is_completed)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "18px 0",
              borderBottom: "1px solid rgba(255,255,255,0.03)",
              cursor: "pointer",
              transition: "opacity 0.2s ease",
              opacity: goal.is_completed ? 0.4 : 1,
            }}
          >
            <div style={{ 
              width: "14px", 
              height: "14px", 
              border: "1px solid",
              borderColor: goal.is_completed ? "white" : "var(--text-muted)", 
              marginRight: "16px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              backgroundColor: goal.is_completed ? "white" : "transparent",
            }}>
              {goal.is_completed && <div style={{ width: "6px", height: "6px", backgroundColor: "black" }} />}
            </div>
            <span style={{ 
              fontSize: "11px", 
              fontWeight: 700, 
              letterSpacing: "0.05em", 
              textTransform: "uppercase",
              color: goal.is_completed ? "var(--text-muted)" : "white",
              textDecoration: goal.is_completed ? "line-through" : "none",
            }}>
              {goal.title}
            </span>
          </div>
        ))}
      </div>

      {/* INPUT DE NOVA META (STREAK STYLE) */}
      <form onSubmit={handleSubmit} style={{ marginTop: "12px" }}>
        <input
          type="text"
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="ESTABELECER NOVO ALVO..."
          style={{
            width: "100%",
            backgroundColor: "rgba(255,255,255,0.01)",
            border: "none",
            borderBottom: "1px solid var(--border-glow)",
            padding: "20px 0",
            fontSize: "10px",
            color: "white",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            outline: "none",
          }}
        />
      </form>
    </div>
  );
};
