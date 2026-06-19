"use client";

import { useState, useEffect } from "react";
import { CreditCard, Calendar, ShoppingCart, Tag, Zap } from "lucide-react";
import type { Student } from "./types";
import { sellContract } from "../../gestao/planos/actions/plans-actions";

export default function DrawerSellContract({
  selectedStudent,
  onCancel,
  onSuccess
}: {
  selectedStudent: Student;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  useEffect(() => {
    // Carregar planos disponíveis via fetch no cliente ou Server Action exposta (já temos plans-actions, mas não temos GET simples, vamos buscar via fetch se houver rota ou chamar uma Server Action genérica se tivermos. Se não tivermos, teremos que criar um getPlans()).
    // Por enquanto, farei mock dos planos baseando no schema para que o design funcione perfeitamente.
    // Depois, criamos um getPlans ou adaptamos.
    async function loadPlans() {
      // Como estamos no Server Action "sellContract", precisamos do ID real.
      // Vou buscar todos os planos do BD chamando uma nova ação que criaremos em actions-plans ou usando Supabase Client. 
      // Por enquanto, assumiremos que farei essa bridge:
      const { getPlans } = await import("../../gestao/planos/actions/plans-actions");
      const plansArray = await getPlans();
      if (plansArray && Array.isArray(plansArray)) {
        setPlans(plansArray.filter((p: any) => p.status === "active"));
      }
    }
    loadPlans();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanId) {
      setMessage({ type: "error", text: "Selecione um plano." });
      return;
    }
    setLoading(true);
    setMessage(null);

    const result = await sellContract(
      selectedStudent.id,
      selectedPlanId,
      new Date(startDate).toISOString()
    );

    if (result.success) {
      setMessage({ type: "success", text: "Contrato assinado e Faturas geradas!" });
      setTimeout(() => onSuccess(), 2000);
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao matricular aluno." });
    }
    setLoading(false);
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ background: "#000", color: "#FFF", padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <ShoppingCart size={24} />
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Venda Presencial (Balcão)</h2>
          <p style={{ fontSize: 12, color: "#AAA", margin: "2px 0 0" }}>Matriculando: {selectedStudent.full_name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>
            Plano Comercial
          </label>
          <select 
            value={selectedPlanId} 
            onChange={e => setSelectedPlanId(e.target.value)}
            style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", fontSize: 14 }} 
            required
          >
            <option value="">Selecione um plano...</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} - R$ {p.price.toFixed(2)} / {p.billing_cycle}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>
            Data de Início do Contrato
          </label>
          <input 
            type="date" 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", fontSize: 14 }} 
            required 
          />
        </div>

        <div style={{ background: "#F9FAFB", border: "2px solid #EEE", padding: 16, marginTop: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: "#666", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={14} /> FOTOGRAFIA DO PLANO (SNAPSHOT)
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#444", margin: 0, lineHeight: 1.5 }}>
            As regras financeiras atuais do plano escolhido serão cravadas no contrato do aluno. Futuros reajustes de preço no menu "Planos" não afetarão este contrato (Blindagem Jurídica).
          </p>
        </div>

        {message && (
          <div style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, background: message.type === "error" ? "#FEF2F2" : "#F0FDF4", color: message.type === "error" ? "#DC2626" : "#15803D", border: `2px solid ${message.type === "error" ? "#FECACA" : "#BBF7D0"}` }}>
            {message.text}
          </div>
        )}

        <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
          <button type="submit" disabled={loading} className="admin-btn admin-btn-primary" style={{ flex: 1, height: 56, fontSize: 13 }}>
            {loading ? "Processando..." : "CRIAR CONTRATO E FATURAS"}
          </button>
          <button type="button" onClick={onCancel} className="admin-btn admin-btn-ghost" style={{ flex: 1, height: 56, fontSize: 13 }}>
            CANCELAR
          </button>
        </div>

      </form>
    </div>
  );
}
