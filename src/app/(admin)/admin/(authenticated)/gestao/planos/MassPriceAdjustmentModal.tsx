"use client";

import { useState } from "react";
import { X, TrendingUp, AlertTriangle, Users, Target, CalendarDays } from "lucide-react";
import { granularContractPriceAdjustment } from "./actions/plans-actions";

export default function MassPriceAdjustmentModal({
  plans,
  onClose,
  onSuccess
}: {
  plans: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [scope, setScope] = useState<"plan" | "individual" | "date">("plan");
  const [adjustmentType, setAdjustmentType] = useState<"percent" | "fixed">("percent");
  
  // Para individual (em um app real seria um select2/autocomplete. Aqui deixaremos um input simples do ID)
  const [targetStudentId, setTargetStudentId] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.append("scope", scope);
    
    const result = await granularContractPriceAdjustment(formData);

    if (result.success) {
      setMessage({ type: "success", text: result.message || "Reajuste efetuado com sucesso." });
      setTimeout(() => onSuccess(), 3000);
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao reajustar." });
    }
    setLoading(false);
  }

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)",
      backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 99999, padding: 20
    }}>
      <div style={{
        background: "#FFF",
        width: "100%",
        maxWidth: "600px",
        border: "4px solid #000",
        boxShadow: "16px 16px 0px #000",
        padding: "32px",
        position: "relative",
        animation: "modalAppear 0.2s ease-out",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        <button 
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, border: "2px solid #000", background: "#FFF", padding: 4, cursor: "pointer" }}
        >
          <X size={20} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ padding: 12, background: "#000", color: "#FFF", borderRadius: "50%" }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", margin: 0, letterSpacing: "-0.02em" }}>
              Reajuste Avançado
            </h2>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#666", margin: "4px 0 0" }}>
              Aumentos granulares por Contrato, Data ou Plano
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* SELETOR DE ESCOPO */}
          <div style={{ display: "flex", gap: 12 }}>
            <button 
              type="button" 
              onClick={() => setScope("plan")}
              style={{ flex: 1, padding: "16px 8px", border: scope === "plan" ? "3px solid #000" : "2px solid #E5E7EB", background: scope === "plan" ? "#F9FAFB" : "#FFF", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", opacity: scope === "plan" ? 1 : 0.6 }}
            >
              <Users size={20} />
              <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Por Plano</span>
            </button>
            <button 
              type="button" 
              onClick={() => setScope("date")}
              style={{ flex: 1, padding: "16px 8px", border: scope === "date" ? "3px solid #000" : "2px solid #E5E7EB", background: scope === "date" ? "#F9FAFB" : "#FFF", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", opacity: scope === "date" ? 1 : 0.6 }}
            >
              <CalendarDays size={20} />
              <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Por Safra / Data</span>
            </button>
            <button 
              type="button" 
              onClick={() => setScope("individual")}
              style={{ flex: 1, padding: "16px 8px", border: scope === "individual" ? "3px solid #000" : "2px solid #E5E7EB", background: scope === "individual" ? "#F9FAFB" : "#FFF", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, cursor: "pointer", opacity: scope === "individual" ? 1 : 0.6 }}
            >
              <Target size={20} />
              <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Individual</span>
            </button>
          </div>

          <hr style={{ border: "1px solid #E5E7EB" }} />

          {/* DADOS DO ESCOPO SELECIONADO */}
          {scope === "plan" && (
             <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Plano a Reajustar</label>
                <select name="target_plan_id" style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", fontSize: 14 }} required>
                  <option value="">Selecione o plano...</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {parseFloat(p.price).toFixed(2)}</option>)}
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 8 }}>
                  <input type="checkbox" name="update_plan_base" value="true" style={{ width: 16, height: 16, accentColor: "#000" }} defaultChecked />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#333" }}>Aplicar esse novo valor às futuras vendas deste plano também</span>
                </label>
             </div>
          )}

          {scope === "individual" && (
             <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>ID do Aluno (UUID)</label>
                <input type="text" name="target_student_id" placeholder="Cole o ID do aluno aqui..." style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", fontSize: 14 }} required />
                <span style={{ fontSize: 11, color: "#666" }}>Nesta versão do modal, o reajuste individual necessita do ID do sistema do aluno.</span>
             </div>
          )}

          {scope === "date" && (
             <div style={{ display: "flex", gap: 16 }}>
               <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Data Limite (Safra)</label>
                  <input type="date" name="target_date" style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", fontSize: 14 }} required />
               </div>
               <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Plano (Opcional)</label>
                  <select name="target_plan_id" style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", fontSize: 14 }}>
                    <option value="">Todos os planos</option>
                    {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
               </div>
             </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>
                Tipo de Aumento
              </label>
              <select 
                name="adjustment_type"
                value={adjustmentType}
                onChange={e => setAdjustmentType(e.target.value as "percent" | "fixed")}
                style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", fontSize: 14 }} 
              >
                <option value="percent">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>
                Valor do Aumento
              </label>
              <input 
                type="number" 
                name="adjustment_value"
                step="0.01"
                min="0.01"
                placeholder={adjustmentType === "percent" ? "Ex: 5" : "Ex: 20.00"}
                style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", fontSize: 14 }} 
                required 
              />
            </div>
          </div>

          <div style={{ background: "#FEF2F2", border: "3px solid #DC2626", padding: 16, marginTop: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#DC2626", marginBottom: 8 }}>
              <AlertTriangle size={18} />
              <span style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Repasse de Base ({scope})</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#666", lineHeight: 1.4 }}>
              Atenção: Ao prosseguir, o sistema vai buscar todos os contratos ativos que caiam na regra que você marcou acima, vai quebrar a trava do Snapshot, e <strong>impor o novo valor de mensalidade nas faturas que ainda vão ser geradas</strong>. Confirme os dados antes de aplicar.
            </span>
          </div>

          {message && (
            <div style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, background: message.type === "error" ? "#FEF2F2" : "#F0FDF4", color: message.type === "error" ? "#DC2626" : "#15803D", border: `2px solid ${message.type === "error" ? "#FECACA" : "#BBF7D0"}` }}>
              {message.text}
            </div>
          )}

          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <button type="submit" disabled={loading} className="admin-btn admin-btn-primary" style={{ flex: 1, height: 56, fontSize: 13, background: "#000", color: "#FFF" }}>
              {loading ? "PROCESSANDO LOTE..." : "APLICAR REAJUSTE"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
