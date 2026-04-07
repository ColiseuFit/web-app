"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Zap, ShieldCheck, Trophy, Star, Dumbbell } from "lucide-react";
import GeneralSettingsManager from "./GeneralSettingsManager";
import LevelsManager from "./LevelsManager";
import PointsSettingsManager from "./PointsSettingsManager";
import WodSettingsManager from "./WodSettingsManager";

interface SettingsTabsProps {
  initialSettings: Record<string, string>;
}

export default function SettingsTabs({ initialSettings }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<"geral" | "wod" | "metodologia" | "pontuacao" | "seguranca">("geral");

  const TABS = [
    { id: "geral", label: "Geral", icon: SettingsIcon },
    { id: "wod", label: "WOD", icon: Dumbbell },
    { id: "metodologia", label: "Metodologia", icon: Zap },
    { id: "pontuacao", label: "Pontuação", icon: Star },
    { id: "seguranca", label: "Segurança", icon: ShieldCheck }
  ];

  return (
    <>
      {/* ── TABS NAVIGATION ── */}
      <div style={{ 
        display: "flex", 
        gap: "4px", 
        marginBottom: "32px", 
        borderBottom: "4px solid #000",
        background: "#F5F5F5",
        padding: "4px 4px 0"
      }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "16px 24px",
                fontSize: "13px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
                border: "none",
                background: isActive ? "#FFF" : "transparent",
                color: isActive ? "#000" : "#666",
                borderTop: isActive ? "4px solid #000" : "4px solid transparent",
                borderLeft: isActive ? "4px solid #000" : "4px solid transparent",
                borderRight: isActive ? "4px solid #000" : "4px solid transparent",
                marginBottom: "-4px",
                transition: "all 0.1s"
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ animation: "tabFadeIn 0.3s ease" }}>
        <style jsx>{`
          @keyframes tabFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {activeTab === "geral" && (
          <GeneralSettingsManager initialSettings={initialSettings} />
        )}

        {activeTab === "wod" && (
          <WodSettingsManager initialSettings={initialSettings} />
        )}

        {activeTab === "metodologia" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            {/* Níveis Técnicos (Coliseu Levels) - Dynamic SSoT */}
            <LevelsManager />
            
            {/* Future: Points System Configuration */}
            <div className="admin-card" style={{ opacity: 0.6, borderStyle: "dashed" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <Trophy size={24} />
                <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Progressão & Níveis</h2>
              </div>
              <p style={{ fontSize: "13px", color: "#666", fontWeight: 500 }}>
                Configure as pontuações para check-ins, PRs e participação em eventos.
              </p>
            </div>
          </div>
        )}

        {activeTab === "pontuacao" && (
          <PointsSettingsManager />
        )}

        {activeTab === "seguranca" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="admin-card" style={{ background: "#F9FAFB" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
                <ShieldCheck size={24} />
                <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Infraestrutura & Segurança</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <p style={{ fontSize: "14px", color: "#333", lineHeight: 1.6, fontWeight: 600 }}>
                  A plataforma Coliseu utiliza **Supabase RLS (Row Level Security)** para garantir que cada usuário veja apenas o que lhe é permitido.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  {[
                    { role: "ADMINISTRADOR", desc: "Acesso total a configurações, faturamento e gestão de pessoas." },
                    { role: "COACH", desc: "Gestão de WODs, check-ins e avaliações físicas." },
                    { role: "RECEPÇÃO", desc: "Cadastro de alunos, controle de frequência e agendamentos." },
                    { role: "ALUNO", desc: "Visualização de treinos, histórico pessoal e ranking." }
                  ].map((item) => (
                    <div key={item.role} style={{ padding: "16px", background: "#FFF", border: "2px solid #EEE" }}>
                      <h3 style={{ fontSize: "12px", fontWeight: 900, marginBottom: "8px" }}>{item.role}</h3>
                      <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
