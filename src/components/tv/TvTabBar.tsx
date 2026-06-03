"use client";

import { Users, Zap, Trophy, Cake } from "lucide-react";

/** Tipos canônicos das abas disponíveis na TV */
export type TvTabId = "checkin" | "wod" | "ranking" | "birthdays";

interface TvTab {
  id: TvTabId;
  label: string;
  icon: React.ReactNode;
}

interface TvTabBarProps {
  activeTab: TvTabId;
  onTabChange: (tab: TvTabId) => void;
}

/**
 * Barra de abas brutalista para a Coliseu TV.
 * Renderiza 4 abas com ícones Lucide e feedback visual instantâneo.
 *
 * @param activeTab - ID da aba atualmente ativa
 * @param onTabChange - Handler de evento para troca de aba
 */
export default function TvTabBar({ activeTab, onTabChange }: TvTabBarProps) {
  const tabs: TvTab[] = [
    { id: "checkin", label: "CHECK-IN", icon: <Users size={16} /> },
    { id: "wod", label: "WOD", icon: <Zap size={16} /> },
    { id: "ranking", label: "RANKING", icon: <Trophy size={16} /> },
    { id: "birthdays", label: "ANIVERSARIANTES", icon: <Cake size={16} /> },
  ];

  return (
    <div className="flex items-center" style={{ gap: "8px" }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="font-display font-black text-xs uppercase tracking-wider cursor-pointer flex items-center border-2 border-black"
            style={{
              padding: "10px 18px",
              gap: "8px",
              backgroundColor: isActive ? "#FACC15" : "#FFFFFF",
              color: "#000000",
              boxShadow: isActive ? "none" : "3px 3px 0px #000",
              transform: isActive ? "translate(2px, 2px)" : "none",
              transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {tab.icon}
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
