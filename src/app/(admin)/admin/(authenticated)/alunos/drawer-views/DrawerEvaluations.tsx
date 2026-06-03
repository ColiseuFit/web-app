/**
 * DrawerEvaluations: Listagem do Histórico de Avaliações Físicas do aluno.
 * 
 * @architecture
 * - Componente Visual Puro: Exibe cards com data, protocolo, peso e %G.
 * - Ações de Editar e Excluir são delegadas ao Orquestrador via props.
 * - Skeleton de carregamento exibido enquanto `loadingEvals` estiver ativo.
 */
"use client";

import { Activity, Plus, Pencil, Trash2 } from "lucide-react";
import type { DrawerEvaluationsProps } from "./types";

export default function DrawerEvaluations({
  selectedStudent,
  evaluations,
  loadingEvals,
  setSelectedEval,
  setDrawerView,
  handleDeleteEval
}: DrawerEvaluationsProps) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Activity size={20} />
          <h4 style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Histórico Biométrico</h4>
        </div>
        <button onClick={() => { setSelectedEval(null); setDrawerView("eval-form"); }} className="admin-btn admin-btn-primary" style={{ padding: "10px 20px", fontSize: 12 }}>
          <Plus size={16} /> NOVA AVALIAÇÃO
        </button>
      </div>

      {loadingEvals ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 900, color: "#999" }}>CARREGANDO DADOS...</p>
        </div>
      ) : evaluations.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", border: "4px dashed #EEE" }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#999", margin: 0 }}>NENHUMA AVALIAÇÃO FÍSICA REGISTRADA</p>
          <p style={{ fontSize: 11, color: "#CCC", marginTop: 8 }}>Clique no botão acima para iniciar o primeiro registro.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          {evaluations.map(e => (
            <div key={e.id} className="admin-card" style={{ padding: 20, border: "3px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "8px 8px 0px rgba(0,0,0,0.05)" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>{new Date(e.evaluation_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>
                <div style={{ fontSize: 11, color: "#666", fontWeight: 800, marginTop: 4, textTransform: "uppercase" }}>{e.protocol || "PROTOCOLO N/A"} • {e.weight}kg • BF: {e.body_fat_percentage?.toFixed(1) || "—"}%</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setSelectedEval(e); setDrawerView("eval-form"); }} className="admin-btn admin-btn-ghost" style={{ width: 40, height: 40, padding: 0 }} title="Editar"><Pencil size={18} /></button>
                <button onClick={() => handleDeleteEval(e.id)} className="admin-btn admin-btn-ghost" style={{ width: 40, height: 40, padding: 0, color: "#DC2626" }} title="Remover"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
