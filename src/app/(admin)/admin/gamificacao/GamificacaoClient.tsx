"use client";

import { useState } from "react";
import { Trophy, Users, Search, Plus, Minus, Star } from "lucide-react";
import AthleteAvatar from "@/components/Identity/AthleteAvatar";
import AthleteIdentity from "@/components/Identity/AthleteIdentity";
import LevelsManager from "../settings/LevelsManager";
import PointsSettingsManager from "../settings/PointsSettingsManager";
import { adjustStudentPoints, correctStudentPoints, resetAllGamification } from "./actions";
import { AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import Toast from "@/components/Toast";

interface GamificacaoClientProps {
  students: any[];
  dynamicLevels: Record<string, any>;
  initialRules: any[];
}

export default function GamificacaoClient({ students, dynamicLevels, initialRules }: GamificacaoClientProps) {
  const [activeTab, setActiveTab] = useState<"gestao" | "regras">("gestao");
  
  // Gestão de Alunos State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  // Ação de Pontos State
  const [amount, setAmount] = useState<number | "">("");
  const [loadingAction, setLoadingAction] = useState<"bonus" | "deduct" | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error", text: string } | null>(null);
  const [isCorrectionMode, setIsCorrectionMode] = useState(false);

  // Estados para Reset Global
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const filteredStudents = students.filter(s => {
    const searchLow = searchTerm.toLowerCase().trim();
    if (!searchLow) return true; // Se vazio, mostra os primeiros da lista

    // Normalização para ignorar acentos e caracteres especiais
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const normalizedSearch = normalize(searchLow);
    
    const fullName = normalize(s.full_name);
    const displayName = normalize(s.display_name);
    const memberNum = String(s.member_number || "");

    return fullName.includes(normalizedSearch) || 
           displayName.includes(normalizedSearch) || 
           memberNum.includes(normalizedSearch);
  }).slice(0, 10);

  const handleAdjustPoints = async (action: "bonus" | "deduct") => {
    if (!selectedStudent || !amount || Number(amount) <= 0) return;
    
    setLoadingAction(action);
    setFeedbackMsg(null);

    const numericAmount = Number(amount);
    
    // DECISÃO DE LÓGICA (SSoT):
    // Se Modo Correção -> Usa correctStudentPoints (Afeta Ranking + Saldo)
    // Se Modo Normal -> Usa adjustStudentPoints (Resgate afeta apenas Saldo, Bônus afeta Ranking)
    
    let res;
    if (isCorrectionMode) {
      const delta = action === "bonus" ? numericAmount : -numericAmount;
      res = await correctStudentPoints(selectedStudent.id, delta, delta);
    } else {
      res = await adjustStudentPoints(selectedStudent.id, action, numericAmount);
    }
    
    if (res.success) {
      setFeedbackMsg({ 
        type: "success", 
        text: action === "bonus" ? `+${numericAmount} PTS adicionados com sucesso!` : `-${numericAmount} PTS subtraídos com sucesso!` 
      });
      
      // Update local state otimista
      const delta = action === "bonus" ? numericAmount : -numericAmount;
      
      // Saldo sempre atualiza
      selectedStudent.points = Math.max(0, selectedStudent.points + delta);
      
      // Ranking atualiza se for bônus OU se estiver em modo correção
      if (action === "bonus" || isCorrectionMode) {
        selectedStudent.points_total = Math.max(0, selectedStudent.points_total + delta);
      }
      
      setAmount(""); // reset input
      
      setTimeout(() => setFeedbackMsg(null), 3000);
    } else {
      setFeedbackMsg({ type: "error", text: res.error || "Ocorreu um erro na transação." });
    }
    
    setLoadingAction(null);
  };

  const handleGlobalReset = async () => {
    setIsResetting(true);
    try {
      const result = await resetAllGamification();
      if (result.success) {
        setToast({ msg: "GAMIFICAÇÃO ZERADA COM SUCESSO!", type: "success" });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setToast({ msg: result.error || "ERRO AO ZERAR PONTUAÇÃO", type: "error" });
        setIsResetting(false);
        setShowResetModal(false);
      }
    } catch (err) {
      setToast({ msg: "FALHA CRÍTICA NO SERVIDOR", type: "error" });
      setIsResetting(false);
      setShowResetModal(false);
    }
  };

  return (
    <div>
      {/* ── TABS NAVIGATION ── */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "32px", borderBottom: "4px solid #000", background: "#F5F5F5", padding: "4px 4px 0" }}>
        <button
          onClick={() => setActiveTab("gestao")}
          style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "16px 24px",
            fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em",
            cursor: "pointer", border: "none",
            background: activeTab === "gestao" ? "#FFF" : "transparent",
            color: activeTab === "gestao" ? "#000" : "#666",
            borderTop: activeTab === "gestao" ? "4px solid #000" : "4px solid transparent",
            borderLeft: activeTab === "gestao" ? "4px solid #000" : "4px solid transparent",
            borderRight: activeTab === "gestao" ? "4px solid #000" : "4px solid transparent",
            marginBottom: "-4px", transition: "all 0.1s"
          }}
        >
          <Users size={18} />
          Gestão Individual
        </button>

        <button
          onClick={() => setActiveTab("regras")}
          style={{
            display: "flex", alignItems: "center", gap: "10px", padding: "16px 24px",
            fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em",
            cursor: "pointer", border: "none",
            background: activeTab === "regras" ? "#FFF" : "transparent",
            color: activeTab === "regras" ? "#000" : "#666",
            borderTop: activeTab === "regras" ? "4px solid #000" : "4px solid transparent",
            borderLeft: activeTab === "regras" ? "4px solid #000" : "4px solid transparent",
            borderRight: activeTab === "regras" ? "4px solid #000" : "4px solid transparent",
            marginBottom: "-4px", transition: "all 0.1s"
          }}
        >
          <Trophy size={18} />
          Regras e Níveis
        </button>
      </div>

      {/* ── ALUNOS (GESTÃO INDIVIDUAL) ── */}
      {activeTab === "gestao" && (
        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "32px", alignItems: "start" }}>
          
          {/* BUSCA DE ALUNOS */}
          <div className="admin-card">
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <Search style={{ position: "absolute", left: 16, top: 16, color: "#999" }} size={20} />
              <input
                type="text"
                placeholder="Buscar Aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: "100%", padding: "16px 16px 16px 48px", border: "3px solid #000", fontWeight: 900, outline: "none", fontSize: "14px" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "500px", overflowY: "auto" }}>
              {filteredStudents.map(student => (
                <button
                  key={student.id}
                  onClick={() => { setSelectedStudent(student); setFeedbackMsg(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px", padding: "12px",
                    background: selectedStudent?.id === student.id ? "#000" : "#FFF",
                    color: selectedStudent?.id === student.id ? "#FFF" : "#000",
                    border: "2px solid #000", cursor: "pointer", textAlign: "left", 
                    transition: "all 0.1s",
                    boxShadow: selectedStudent?.id === student.id ? "none" : "3px 3px 0px #000",
                    transform: selectedStudent?.id === student.id ? "translate(2px, 2px)" : "none",
                    marginBottom: "4px"
                  }}
                >
                  <AthleteAvatar 
                    url={student.avatar_url} 
                    name={student.full_name} 
                    size={40}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                      {student.full_name || "Sem Nome"}
                    </div>
                    {student.display_name && student.display_name !== student.full_name && (
                      <div style={{ fontSize: "10px", opacity: 0.8, fontWeight: 700, fontStyle: "italic" }}>
                        "{student.display_name}"
                      </div>
                    )}
                    <div style={{ fontSize: "11px", opacity: 0.7, fontWeight: 700, marginTop: "2px" }}>{student.points.toLocaleString()} PTS</div>
                  </div>
                </button>
              ))}
              {filteredStudents.length === 0 && searchTerm && (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#666" }}>
                  Nenhum aluno encontrado
                </div>
              )}
            </div>
          </div>

          {/* PAINEL DO ALUNO SELECIONADO */}
          {selectedStudent ? (
            <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* HEADER ALUNO */}
              <div style={{ display: "flex", alignItems: "center", gap: "24px", borderBottom: "3px solid #000", paddingBottom: "24px" }}>
                <AthleteAvatar 
                  url={selectedStudent.avatar_url} 
                  name={selectedStudent.full_name} 
                  size={80} 
                  borderWidth={3}
                  shadowSize={4}
                />
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: "24px", fontWeight: 900, textTransform: "uppercase", margin: "0 0 6px", letterSpacing: "0.02em" }}>{selectedStudent.full_name}</h2>
                  {selectedStudent.display_name && selectedStudent.display_name !== selectedStudent.full_name && (
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#666", marginBottom: "8px", fontStyle: "italic" }}>
                      "{selectedStudent.display_name}"
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "12px", fontSize: "12px", fontWeight: 900, color: "#000", textTransform: "uppercase" }}>
                    <span style={{ background: "#F3F4F6", padding: "2px 8px", border: "1px solid #000" }}>ID: {selectedStudent.member_number}</span>
                    <span style={{ background: "#000", color: "#FFF", padding: "2px 8px", border: "1px solid #000" }}>Nível: {selectedStudent.level}</span>
                  </div>
                </div>
              </div>

              {/* SALDO ATUAL */}
              <div style={{ display: "flex", gap: "24px" }}>
                <div style={{ flex: 1, padding: "24px", background: "#F9FAFB", border: "3px solid #000" }}>
                  <div style={{ fontSize: "11px", fontWeight: 900, color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Saldo de Resgate</div>
                  <div style={{ fontSize: "40px", fontWeight: 900, lineHeight: 1 }}>{selectedStudent.points.toLocaleString()} <span style={{ fontSize: "16px", color: "#999" }}>PTS</span></div>
                </div>
                <div style={{ flex: 1, padding: "24px", background: "#F9FAFB", border: "3px solid #000" }}>
                  <div style={{ fontSize: "11px", fontWeight: 900, color: "#666", textTransform: "uppercase", marginBottom: "8px" }}>Pontuação Total (Ranking)</div>
                  <div style={{ fontSize: "40px", fontWeight: 900, lineHeight: 1 }}>{selectedStudent.points_total.toLocaleString()} <span style={{ fontSize: "16px", color: "#999" }}>PTS</span></div>
                </div>
              </div>

              {/* FEEDBACK MSG */}
              {feedbackMsg && (
                <div style={{ 
                  padding: "16px", fontWeight: 900, textTransform: "uppercase", fontSize: "12px", border: "2px solid #000",
                  background: feedbackMsg.type === "success" ? "#D1FAE5" : "#FEE2E2", 
                  color: feedbackMsg.type === "success" ? "#065F46" : "#991B1B" 
                }}>
                  {feedbackMsg.text}
                </div>
              )}

              {/* AÇÃO MANUAL */}
              <div style={{ background: "#F3F4F6", padding: "24px", border: "3px solid #000", display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 900, margin: 0, textTransform: "uppercase" }}>Ajuste Manual</h3>
                
                <div style={{ display: "flex", gap: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "11px", fontWeight: 900, color: "#666", textTransform: "uppercase", marginBottom: "8px", display: "block" }}>Quantidade de Pontos</label>
                    <input 
                      type="number" 
                      placeholder="Ex: 50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : "")}
                      style={{ width: "100%", padding: "16px", border: "3px solid #000", fontWeight: 900, fontSize: "16px", outline: "none", background: "#FFF" }}
                    />
                  </div>
                </div>

                {/* MODO CORREÇÃO SWITCH */}
                <div style={{ 
                  display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", 
                  background: isCorrectionMode ? "#FEF3C7" : "#FFF", border: "2px solid #000",
                  transition: "background 0.2s"
                }}>
                  <input 
                    type="checkbox" 
                    id="correction-mode"
                    checked={isCorrectionMode}
                    onChange={(e) => setIsCorrectionMode(e.target.checked)}
                    style={{ width: "20px", height: "20px", cursor: "pointer", accentColor: "#000" }}
                  />
                  <label htmlFor="correction-mode" style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", cursor: "pointer", flex: 1 }}>
                    Ativar Modo de Correção Administrativa (Afeta Ranking e Nível)
                  </label>
                </div>

                {isCorrectionMode && (
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#92400E", background: "#FFFBEB", padding: "8px", border: "1px dashed #D97706", textTransform: "uppercase" }}>
                    ⚠️ ATENÇÃO: Neste modo, subtrações de pontos reduzirão o total vitalício do aluno, podendo fazê-lo retroceder de nível.
                  </div>
                )}

                <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                  <button 
                    onClick={() => handleAdjustPoints("bonus")}
                    disabled={!amount || Number(amount) <= 0 || loadingAction !== null}
                    style={{ 
                      flex: 1, padding: "16px", background: isCorrectionMode ? "#FBBF24" : "#10B981", color: isCorrectionMode ? "#000" : "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0 #000", 
                      fontWeight: 900, fontSize: "13px", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" 
                    }}
                  >
                    {loadingAction === "bonus" ? <span className="animate-spin">⌛</span> : <Plus size={18} strokeWidth={3} />}
                    {isCorrectionMode ? "Adicionar (Correção)" : "Bonificar Aluno"}
                  </button>
                  <button 
                    onClick={() => handleAdjustPoints("deduct")}
                    disabled={!amount || Number(amount) <= 0 || loadingAction !== null || (!isCorrectionMode && Number(amount) > selectedStudent.points)}
                    style={{ 
                      flex: 1, padding: "16px", background: "#EF4444", color: "#FFF", border: "3px solid #000", boxShadow: "4px 4px 0 #000", 
                      fontWeight: 900, fontSize: "13px", textTransform: "uppercase", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      opacity: (!isCorrectionMode && Number(amount) > selectedStudent.points) ? 0.5 : 1
                    }}
                  >
                    {loadingAction === "deduct" ? <span className="animate-spin">⌛</span> : <Minus size={18} strokeWidth={3} />}
                    {isCorrectionMode ? "Remover (Correção)" : "Resgatar Pontos"}
                  </button>
                </div>
              </div>
              
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", background: "#F9FAFB", border: "3px dashed #CCC", color: "#999" }}>
              <Star size={48} strokeWidth={1} style={{ marginBottom: "16px" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 900, margin: "0 0 8px", textTransform: "uppercase", color: "#666" }}>Selecione um Aluno</h3>
              <p style={{ fontSize: "13px", fontWeight: 600, textAlign: "center", maxWidth: "300px" }}>
                Utilize a busca ao lado para encontrar um atleta e gerenciar sua pontuação manualmente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── REGRAS E NÍVEIS (SSoT Migrado de Settings) ── */}
      {activeTab === "regras" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px", animation: "tabFadeIn 0.3s ease" }}>
          
          <PointsSettingsManager initialRules={initialRules.reduce((acc, curr) => {
             // Adaptando prop pro formato que o PointsSettingsManager pode esperar (verificar construtor de props, se é array de objects ou Record)
             // Atualizando: O componente PointsSettingsManager espera um array, mas recebemos inicial via page.tsx como array de records.
             // Na vdd PointsSettingsManagerProps recebe Record<string, string>, wait let me check the file:
             // interface PointsSettingsManagerProps { initialRules: Record<string, string>; } mas const [rules, setRules] = useState<any[]>([]);
             // It calls `getPointsRules()` inside `useEffect` on mount anyway, so initialRules is just a prop that can be ignored or bypassed.
             acc[curr.key] = String(curr.points);
             return acc;
          }, {} as any)} />
          
          <LevelsManager initialLevels={dynamicLevels} />
          
          {/* ZONA DE PERIGO */}
          <div style={{ marginTop: "40px", padding: "32px", border: "4px solid #EF4444", background: "#FEF2F2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
              <AlertTriangle size={32} color="#EF4444" strokeWidth={3} />
              <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#991B1B", textTransform: "uppercase", margin: 0 }}>Zona de Perigo</h3>
            </div>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#991B1B", margin: "0 0 24px" }}>
              As ações abaixo são irreversíveis. Tenha certeza absoluta antes de prosseguir.
            </p>
            
            <button 
              onClick={() => setShowResetModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: "12px", padding: "16px 24px",
                background: "#EF4444", color: "#FFF", border: "4px solid #000",
                boxShadow: "6px 6px 0 #000", fontWeight: 900, textTransform: "uppercase",
                cursor: "pointer", fontSize: "14px"
              }}
            >
              <Trash2 size={20} strokeWidth={3} />
              Zerar Pontuação de Todos os Alunos
            </button>
          </div>

          {/* ── STANDARDIZED NUCLEAR RESET ── */}
          {showResetModal && (
            <ConfirmModal
              title="Ação Nuclear"
              message="Isso irá colocar o SALDO DE RESGATE e a PONTUAÇÃO DE RANKING de todos os alunos em ZERO. Esta ação não pode ser desfeita."
              confirmLabel={isResetting ? "LIMPANDO..." : "RESETAR TUDO AGORA"}
              cancelLabel="VOLTAR"
              onConfirm={handleGlobalReset}
              onCancel={() => setShowResetModal(false)}
              challengeText="RESETAR TUDO"
              isDanger={true}
            />
          )}

          {toast && (
            <Toast 
              msg={toast.msg} 
              type={toast.type} 
              onClose={() => setToast(null)} 
            />
          )}
        </div>
      )}
    </div>
  );
}
