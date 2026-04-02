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
    <div style={{ width: "100%", background: "transparent", padding: "24px 20px" }}>
      
      {/* ── HEADER DE PROGRESSO (OBJETIVOS) ── */}
      <div style={{ display: "flex", flexDirection: "column", marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h3 className="font-headline" style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.15em", color: "#000", textTransform: "uppercase" }}>
            CONTROLE DE OBJETIVOS
          </h3>
          <div style={{ padding: "4px 12px", background: "#000", border: "1px solid #000" }}>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#FFF", fontWeight: 900 }}>
              {completedCount} <span style={{ opacity: 0.5 }}>/</span> {totalCount}
            </span>
          </div>
        </div>
        <div style={{ width: "100%", height: "8px", backgroundColor: "#f0f0f0", border: "2px solid #000", position: "relative", overflow: "hidden" }}>
          <div 
            style={{ 
              height: "100%", 
              backgroundColor: "#E31B23", 
              transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)", 
              width: totalCount > 0 ? `${(completedCount/totalCount)*100}%` : "0%",
            }}
          />
        </div>
      </div>

      {/* ── LISTA DE METAS (VERTICAL LIST) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {goals.map((goal) => (
          <div 
            key={goal.id} 
            onClick={() => onToggleGoal && onToggleGoal(goal.id, goal.is_completed)}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px",
              background: goal.is_completed ? "#fafafa" : "#FFF",
              border: "2px solid #000",
              cursor: "pointer",
              transition: "all 0.1s ease",
              boxShadow: goal.is_completed ? "none" : "4px 4px 0px #000",
              transform: goal.is_completed ? "translate(2px, 2px)" : "none",
              opacity: goal.is_completed ? 0.7 : 1,
            }}
          >
            <div style={{ 
              width: "18px", 
              height: "18px", 
              border: "2px solid #000",
              marginRight: "16px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              backgroundColor: goal.is_completed ? "#000" : "#transparent",
            }}>
              {goal.is_completed && <div style={{ width: "6px", height: "6px", backgroundColor: "#FFF" }} />}
            </div>
            <span className="font-headline" style={{ 
              fontSize: "12px", 
              fontWeight: 900, 
              letterSpacing: "0.05em", 
              textTransform: "uppercase",
              color: "#000",
              textDecoration: goal.is_completed ? "line-through" : "none",
            }}>
              {goal.title}
            </span>
          </div>
        ))}
      </div>

      {/* INPUT DE NOVA META (STREAK STYLE) */}
      <form onSubmit={handleSubmit} style={{ marginTop: "24px" }}>
        <input
          type="text"
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="+ ESTABELECER NOVO ALVO"
          style={{
            width: "100%",
            backgroundColor: "#FFF",
            border: "2px solid #000",
            padding: "16px 20px",
            fontSize: "12px",
            color: "#000",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            outline: "none",
            boxShadow: "4px 4px 0px #f0f0f0"
          }}
        />
      </form>
    </div>
  );
};
