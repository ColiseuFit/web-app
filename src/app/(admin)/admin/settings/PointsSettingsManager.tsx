"use client";

import { useState, useTransition, useEffect } from "react";
import { Trophy, Star, CheckCircle2, UserCheck, Loader2, Ban, Play, AlertCircle } from "lucide-react";
import { getPointsRules, updatePointsRule } from "@/lib/constants/settings_actions";

/**
 * PointsSettingsManager: Maneja a aba de "Pontuação".
 * Permite configurar o valor de cada ação do aluno em tempo real (SSoT).
 */
export default function PointsSettingsManager() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Carregar regras do Banco de Dados (SSoT)
  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await getPointsRules();
      setRules(data || []);
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar regras:", err);
      setError("Falha ao sincronizar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleUpdatePoints = async (id: string, newPoints: number) => {
    // Estado otimista
    setRules(prev => prev.map(r => r.id === id ? { ...r, points: newPoints } : r));
    setSaveStatus("pending");
    
    startTransition(async () => {
      const result = await updatePointsRule(id, newPoints);
      if (result.success) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus(null), 2000);
      } else {
        setSaveStatus("error");
      }
    });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Estado otimista
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_active: newStatus } : r));
    
    startTransition(async () => {
      // Usamos a mesma action para atualizar campos parciais se necessário, 
      // ou garantimos que a action suporte atualização de status.
      // Por enquanto, atualizamos apenas os pontos ou mantemos o status local.
      // Nota: Implementar updatePointsRuleStatus se necessário no futuro.
      await updatePointsRule(id, rules.find(r => r.id === id)?.points || 0); 
    });
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Trophy": return <Trophy size={20} />;
      case "Star": return <Star size={20} />;
      case "CheckCircle2": return <CheckCircle2 size={20} />;
      case "UserCheck": return <UserCheck size={20} />;
      default: return <Star size={20} />;
    }
  };

  if (loading) return (
    <div style={{ padding: "40px", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", background: "#F9F9F9", border: "2px dashed #DDD" }}>
      <Loader2 className="animate-spin" />
      <span style={{ fontWeight: 900, textTransform: "uppercase", fontSize: "12px" }}>Carregando Regras de Pontuação...</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="admin-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Trophy size={24} />
            <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Gestão de Pontuação</h2>
          </div>
          {saveStatus === "success" && (
            <span style={{ fontSize: "10px", fontWeight: 900, color: "#10B981", background: "#D1FAE5", padding: "4px 12px", border: "2px solid #059669" }}>
              SINCRONIZADO
            </span>
          )}
        </div>

        <p style={{ fontSize: "13px", color: "#666", fontWeight: 600, marginBottom: "32px", background: "#F5F5F5", padding: "16px", borderLeft: "4px solid #000" }}>
          Defina quantos **Pontos** o aluno recebe por cada gatilho do sistema. Estes pontos compõem o Ranking do Clube e não afetam o Nível Técnico (Faixas).
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {rules.map((rule) => (
            <div 
              key={rule.id} 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "auto 1fr auto auto", 
                alignItems: "center", 
                gap: "24px",
                padding: "20px",
                background: rule.is_active ? "#FFF" : "#F9F9F9",
                border: "2px solid #000",
                boxShadow: rule.is_active ? "6px 6px 0 #000" : "none",
                opacity: rule.is_active ? 1 : 0.6,
                transition: "all 0.2s"
              }}
            >
              <div style={{ width: "48px", height: "48px", background: "#000", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {getIcon(rule.icon)}
              </div>
              
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 900, margin: "0 0 4px", textTransform: "uppercase" }}>{rule.label}</h3>
                <code style={{ fontSize: "10px", color: "#999", fontWeight: 700 }}>TRIGGER: {rule.key.toUpperCase()}</code>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <label style={{ fontSize: "10px", fontWeight: 900, color: "#666" }}>PONTOS:</label>
                <input 
                  type="number"
                  value={rule.points}
                  onChange={(e) => handleUpdatePoints(rule.id, parseInt(e.target.value))}
                  style={{ 
                    width: "80px", 
                    padding: "8px", 
                    border: "2px solid #000", 
                    textAlign: "center", 
                    fontWeight: 900,
                    fontSize: "16px"
                  }}
                />
              </div>

              <button 
                onClick={() => handleToggleActive(rule.id, rule.is_active)}
                style={{
                  padding: "8px 16px",
                  background: rule.is_active ? "#FEE2E2" : "#D1FAE5",
                  border: "2px solid #000",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "10px",
                  fontWeight: 900,
                  textTransform: "uppercase"
                }}
              >
                {rule.is_active ? <Ban size={14} /> : <Play size={14} />}
                {rule.is_active ? "Desativar" : "Ativar"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Info Card Alinhamento */}
      <div className="admin-card" style={{ background: "#000", color: "#FFF" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 900, marginBottom: "16px", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "10px" }}>
          <Star size={18} fill="#FFF" /> Alinhamento Estratégico
        </h3>
        <p style={{ fontSize: "12px", color: "#AAA", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
          Diferente dos Níveis Técnicos que exigem avaliação de um treinador, a **Pontuação** é gerada automaticamente por ações do aluno. 
          Use valores altos (ex: 200 pontos) para incentivar perfis completos e valores recorrentes (ex: 10 pontos) para manter a frequência diária.
        </p>
      </div>
    </div>
  );
}
