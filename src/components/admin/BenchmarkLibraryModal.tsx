"use client";

import { X, Trophy, Timer, Flame, Dumbbell } from "lucide-react";

export interface BenchmarkWod {
  id: string;
  category: "Girls" | "Heroes" | "Coliseu";
  title: string;
  type_tag: string;
  time_cap: string;
  result_type: string;
  wod_content: string;
}

const BENCHMARKS: BenchmarkWod[] = [
  {
    id: "fran",
    category: "Girls",
    title: "FRAN",
    type_tag: "FOR TIME",
    time_cap: "10:00",
    result_type: "time",
    wod_content: "21-15-9\nThrusters (95/65 lb)\nPull-ups",
  },
  {
    id: "grace",
    category: "Girls",
    title: "GRACE",
    type_tag: "FOR TIME",
    time_cap: "07:00",
    result_type: "time",
    wod_content: "30 Clean and Jerks (135/95 lb)",
  },
  {
    id: "helen",
    category: "Girls",
    title: "HELEN",
    type_tag: "FOR TIME",
    time_cap: "15:00",
    result_type: "time",
    wod_content: "3 Rounds For Time:\n400m Run\n21 Kettlebell Swings (53/35 lb)\n12 Pull-ups",
  },
  {
    id: "diane",
    category: "Girls",
    title: "DIANE",
    type_tag: "FOR TIME",
    time_cap: "12:00",
    result_type: "time",
    wod_content: "21-15-9\nDeadlifts (225/155 lb)\nHandstand Push-ups",
  },
  {
    id: "murph",
    category: "Heroes",
    title: "MURPH",
    type_tag: "FOR TIME",
    time_cap: "60:00",
    result_type: "time",
    wod_content: "1 mile Run\n100 Pull-ups\n200 Push-ups\n300 Squats\n1 mile Run\n\n* Com colete de peso (20/14 lb)",
  },
  {
    id: "dt",
    category: "Heroes",
    title: "DT",
    type_tag: "FOR TIME",
    time_cap: "15:00",
    result_type: "time",
    wod_content: "5 Rounds For Time:\n12 Deadlifts (155/105 lb)\n9 Hang Power Cleans (155/105 lb)\n6 Push Jerks (155/105 lb)",
  },
  {
    id: "cindy",
    category: "Girls",
    title: "CINDY",
    type_tag: "AMRAP",
    time_cap: "20:00",
    result_type: "rounds",
    wod_content: "AMRAP 20 min:\n5 Pull-ups\n10 Push-ups\n15 Squats",
  },
  {
    id: "karen",
    category: "Girls",
    title: "KAREN",
    type_tag: "FOR TIME",
    time_cap: "15:00",
    result_type: "time",
    wod_content: "150 Wall-Ball Shots (20/14 lb)",
  }
];

interface BenchmarkLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (benchmark: BenchmarkWod) => void;
}

export default function BenchmarkLibraryModal({ isOpen, onClose, onSelect }: BenchmarkLibraryModalProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: "20px"
    }}>
      <div style={{
        background: "#FFF", width: "100%", maxWidth: "800px", maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        border: "4px solid #000",
        boxShadow: "10px 10px 0px rgba(227,27,35,1)"
      }}>
        {/* HEADER */}
        <div style={{
          padding: "24px", borderBottom: "4px solid #000",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          background: "#111", color: "#FFF"
        }}>
          <div>
            <h2 style={{ fontSize: "28px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", margin: "0 0 8px", display: "flex", alignItems: "center", gap: "10px" }}>
              <Trophy size={28} color="var(--brand-primary, #E31B23)" />
              Biblioteca de Benchmarks
            </h2>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Carregue treinos clássicos em um clique
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: "transparent", border: "none", color: "#FFF", 
              cursor: "pointer", padding: "8px", opacity: 0.8 
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* LIST */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px", background: "#F9FAFB" }}>
          {BENCHMARKS.map((wod) => (
            <div key={wod.id} style={{
              border: "2px solid #000", background: "#FFF",
              display: "flex", flexDirection: "column",
              transition: "transform 0.1s ease",
            }}>
              <div style={{ padding: "20px", display: "flex", gap: "24px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 900, background: "#000", color: "#FFF", padding: "4px 8px", textTransform: "uppercase" }}>
                      {wod.category}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 800, background: "rgba(227,27,35,0.1)", color: "#E31B23", padding: "4px 8px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Flame size={12} /> {wod.type_tag}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 800, border: "1px solid #000", padding: "4px 8px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Timer size={12} /> {wod.time_cap}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 8px", textTransform: "uppercase" }}>
                    {wod.title}
                  </h3>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "#555", margin: 0, whiteSpace: "pre-line" }}>
                    {wod.wod_content}
                  </p>
                </div>
                <div>
                  <button 
                    onClick={() => {
                        onSelect(wod);
                        onClose();
                    }}
                    style={{
                      background: "#000", color: "#FFF",
                      border: "none", padding: "16px 24px",
                      fontSize: "12px", fontWeight: 800, textTransform: "uppercase",
                      letterSpacing: "0.05em", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "8px"
                    }}
                  >
                    Usar este WOD <Dumbbell size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
