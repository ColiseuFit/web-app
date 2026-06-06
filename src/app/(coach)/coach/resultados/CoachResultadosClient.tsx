"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TrendingUp, Trophy } from "lucide-react";
import { LevelInfo } from "@/lib/constants/levels";
import type { CoachResultGroup } from "./actions";
import { flagResultAction } from "./actions";
import WodResultCard from "./WodResultCard";
import CoachKpis from "./CoachKpis";
import CoachFilters from "./CoachFilters";

/**
 * CoachResultadosClient: Student results tracking dashboard.
 * Uses the Iron Monolith B&W brutalist style.
 * Fully modular and compliant with line length and component separation rules.
 */
export default function CoachResultadosClient({
  initialGroups,
  dynamicLevels,
  initialDateFrom,
  initialDateTo,
}: {
  initialGroups: CoachResultGroup[];
  dynamicLevels: Record<string, LevelInfo>;
  initialDateFrom: string;
  initialDateTo: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state to hold the results and allow instant UI updates on clearing scores
  const [groups, setGroups] = useState<CoachResultGroup[]>(initialGroups);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("todos");
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  
  const [flaggedIds, setFlaggedIds] = useState<Set<string>>(
    new Set(
      initialGroups
        .flatMap((g) => g.results)
        .filter((r) => r.is_flagged)
        .map((r) => r.checkin_id)
    )
  );

  // Sync state with props when data changes (e.g. after date filter change)
  useEffect(() => {
    setGroups(initialGroups);
    setFlaggedIds(
      new Set(
        initialGroups
          .flatMap((g) => g.results)
          .filter((r) => r.is_flagged)
          .map((r) => r.checkin_id)
      )
    );
  }, [initialGroups]);

  // Date filters states
  const [customFrom, setCustomFrom] = useState(initialDateFrom);
  const [customTo, setCustomTo] = useState(initialDateTo);

  const getTodayStr = (): string => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const find = (type: string) => parts.find(p => p.type === type)?.value;
    return `${find('year')}-${find('month')}-${find('day')}`;
  };

  const getPastDateStr = (daysAgo: number): string => {
    const now = new Date();
    const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(past);
    const find = (type: string) => parts.find(p => p.type === type)?.value;
    return `${find('year')}-${find('month')}-${find('day')}`;
  };

  const getFirstDayOfMonthStr = (): string => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit'
    });
    const parts = formatter.formatToParts(now);
    const yyyy = parts.find(p => p.type === 'year')?.value;
    const mm = parts.find(p => p.type === 'month')?.value;
    return `${yyyy}-${mm}-01`;
  };

  const todayStr = getTodayStr();
  const sevenDaysAgoStr = getPastDateStr(6);
  const firstDayStr = getFirstDayOfMonthStr();

  // Determine which preset is active
  const activePreset = useMemo(() => {
    if (initialDateFrom === todayStr && initialDateTo === todayStr) return "hoje";
    if (initialDateFrom === sevenDaysAgoStr && initialDateTo === todayStr) return "7dias";
    if (initialDateFrom === firstDayStr && initialDateTo === todayStr) return "mes";
    return "custom";
  }, [initialDateFrom, initialDateTo, todayStr, sevenDaysAgoStr, firstDayStr]);

  const handleDateFilterChange = (from: string, to: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("dateFrom", from);
    params.set("dateTo", to);
    router.push(`?${params.toString()}`);
  };

  // Filter groups in client memory based on search query and level selected
  const filteredGroups = useMemo(() => {
    return groups
      .map((group) => {
        let filteredResults = group.results;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filteredResults = filteredResults.filter((r) =>
            r.student_name.toLowerCase().includes(q)
          );
        }

        if (levelFilter !== "todos") {
          filteredResults = filteredResults.filter(
            (r) => r.performance_level?.toLowerCase() === levelFilter
          );
        }

        if (filteredResults.length === 0) return null;
        return { ...group, results: filteredResults };
      })
      .filter((g): g is CoachResultGroup => g !== null);
  }, [groups, searchQuery, levelFilter]);

  // Compute KPIs from filtered data
  const kpis = useMemo(() => {
    const allResults = filteredGroups.flatMap((g) => g.results);
    const uniqueStudents = new Set(allResults.map((r) => r.student_id));
    const excellenceCount = allResults.filter((r) => r.is_excellence).length;
    return {
      totalResults: allResults.length,
      uniqueStudents: uniqueStudents.size,
      totalWods: filteredGroups.length,
      excellenceCount,
    };
  }, [filteredGroups]);

  // Handle Flag/Unflag
  const handleFlag = async (checkinId: string) => {
    const isFlagged = flaggedIds.has(checkinId);
    setFlaggingId(checkinId);

    // Optimistic Update
    setFlaggedIds((prev) => {
      const next = new Set(prev);
      if (isFlagged) next.delete(checkinId);
      else next.add(checkinId);
      return next;
    });

    try {
      const res = await flagResultAction(checkinId, !isFlagged);
      if (res.error) {
        console.error("Erro ao sinalizar resultado:", res.error);
        router.refresh();
      }
    } catch (err) {
      console.error("Erro de rede ao sinalizar resultado:", err);
      router.refresh();
    } finally {
      setFlaggingId(null);
    }
  };

  // Moderator clear score handler
  const handleClearScore = async (checkinId: string) => {
    if (!window.confirm("Deseja realmente limpar/excluir o score deste aluno? O aluno precisará reinserir o resultado.")) {
      return;
    }

    // Optimistically update the UI to avoid lag
    setGroups((prevGroups) =>
      prevGroups.map((g) => ({
        ...g,
        results: g.results.map((r) =>
          r.checkin_id === checkinId
            ? { ...r, result: null, performance_level: null, is_excellence: false }
            : r
        ),
      }))
    );

    try {
      const { moderatorClearWodResult } = await import("./actions");
      const res = await moderatorClearWodResult(checkinId);
      if (res.error) {
        alert("Erro ao limpar score: " + res.error);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("Erro inesperado ao limpar score:", err);
      alert("Erro ao conectar ao servidor.");
      router.refresh();
    }
  };

  return (
    <div style={{ paddingBottom: "40px", maxWidth: "800px", margin: "0 auto" }}>
      {/* Global CSS for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseCustom {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>

      {/* HEADER PRINCIPAL */}
      <div style={{ marginBottom: "28px", animation: "fadeIn 0.3s ease-out" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "42px",
              height: "42px",
              background: "#000",
              color: "#FFF",
              borderRadius: "6px",
            }}
          >
            <TrendingUp size={22} strokeWidth={2.5} />
          </div>
          <h1
            style={{
              fontSize: "26px",
              fontWeight: 900,
              color: "#000",
              margin: 0,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Desempenho dos Alunos
          </h1>
        </div>
        <p
          style={{
            fontSize: "13px",
            color: "#666",
            margin: 0,
            borderLeft: "3.5px solid #000",
            paddingLeft: "12px",
            fontWeight: 600,
          }}
        >
          Acompanhe os resultados registrados, audite dados e filtre a evolução técnica das turmas.
        </p>
      </div>

      {/* KPI GRID */}
      <CoachKpis
        totalResults={kpis.totalResults}
        uniqueStudents={kpis.uniqueStudents}
        totalWods={kpis.totalWods}
        excellenceCount={kpis.excellenceCount}
      />

      {/* FILTER SECTION */}
      <CoachFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        levelFilter={levelFilter}
        setLevelFilter={setLevelFilter}
        activePreset={activePreset}
        handleDateFilterChange={handleDateFilterChange}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        todayStr={todayStr}
        sevenDaysAgoStr={sevenDaysAgoStr}
        firstDayStr={firstDayStr}
      />

      {/* RESULTS LIST */}
      {filteredGroups.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "50px 24px",
            border: "2px dashed #D1D5DB",
            borderRadius: "8px",
            background: "#FAFAFA",
            animation: "fadeIn 0.5s ease-out",
          }}
        >
          <Trophy size={48} color="#9CA3AF" style={{ marginBottom: "16px" }} />
          <p
            style={{
              fontSize: "16px",
              fontWeight: 800,
              color: "#374151",
              margin: "0 0 4px",
              textTransform: "uppercase",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Nenhum resultado encontrado
          </p>
          <p style={{ fontSize: "13px", color: "#6B7280", margin: 0, fontWeight: 550 }}>
            Tente mudar o período temporal ou busque por outro nome de aluno.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            animation: "fadeIn 0.5s ease-out",
          }}
        >
          {filteredGroups.map((group, idx) => (
            <WodResultCard
              key={group.wod_id}
              group={group}
              dynamicLevels={dynamicLevels}
              flaggedIds={flaggedIds}
              flaggingId={flaggingId}
              onFlag={handleFlag}
              onClear={handleClearScore}
              initialExpanded={idx === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
