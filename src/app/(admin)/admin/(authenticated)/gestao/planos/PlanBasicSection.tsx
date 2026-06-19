"use client";

import { ChevronDown } from "lucide-react";

/**
 * @component PlanBasicSection
 * @description
 * Subcomponente extraído do PlanForm.tsx (Anti-Monolith) que gerencia
 * os dados cadastrais básicos de um Plano Comercial.
 * 
 * Responsabilidades:
 * - Nome do plano, tipo de acesso/catraca, status, venda online e pré-venda.
 * - Estilização Neo-Brutalist (B&W) de alta legibilidade, com campos em coluna única (linha única)
 *   para evitar adensamento visual e melhorar a UX.
 * 
 * @param props Props de estado e handlers passados pelo orquestrador PlanForm.tsx
 */
interface PlanBasicSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  name: string;
  setName: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  accessTypeId: string;
  setAccessTypeId: (val: string) => void;
  onlineSale: boolean;
  setOnlineSale: (val: boolean) => void;
  isPreSale: boolean;
  setIsPreSale: (val: boolean) => void;
  accessTypes: Array<{ id: string; label: string }>;
  isSubmitting: boolean;
}

export function PlanBasicSection({
  isOpen,
  onToggle,
  name,
  setName,
  status,
  setStatus,
  accessTypeId,
  setAccessTypeId,
  onlineSale,
  setOnlineSale,
  isPreSale,
  setIsPreSale,
  accessTypes,
  isSubmitting
}: PlanBasicSectionProps) {
  return (
    <div style={{ border: "2px solid #000", borderRadius: "0px", overflow: "hidden", backgroundColor: "#fff", boxShadow: "4px 4px 0px rgba(0,0,0,0.05)" }}>
      <div 
        onClick={onToggle}
        style={{ 
          padding: "20px 24px", 
          backgroundColor: isOpen ? "#F9FAFB" : "#FFF", 
          cursor: "pointer", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          borderBottom: isOpen ? "2px solid #000" : "none" 
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#000", margin: 0, textTransform: "uppercase", letterSpacing: "-0.01em" }}>
          Dados Cadastrais
        </h3>
        <ChevronDown size={20} style={{ color: "#000", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </div>
      
      {isOpen && (
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px", backgroundColor: "#FFF" }}>
          <div className="admin-form-group">
            <label>Nome do Plano *</label>
            <input 
              type="text" 
              className="admin-input" 
              placeholder="Ex: CrossFit Anual Recorrente" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required 
            />
            <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
              Identificação comercial do plano usada em faturas, relatórios e no aplicativo do aluno.
            </span>
          </div>

          <div className="admin-form-group">
            <label>Tipo de Acesso *</label>
            <select 
              className="admin-input" 
              value={accessTypeId}
              onChange={(e) => setAccessTypeId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Livre / Sem Restrição</option>
              {accessTypes.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)", marginTop: "6px", display: "block" }}>
              Associa este plano a uma catraca ou restrição física do box.
            </span>
          </div>

          <div className="admin-form-group">
            <label>Status de Venda</label>
            <select 
              className="admin-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="active">Ativo para Venda</option>
              <option value="draft">Rascunho (Salvo mas oculto)</option>
              <option value="archived">Arquivado / Fora de Linha</option>
            </select>
          </div>

          <div className="admin-form-group">
            <label>Disponibilizar para Venda Online (App)</label>
            <select 
              className="admin-input"
              value={String(onlineSale)}
              onChange={(e) => setOnlineSale(e.target.value === "true")}
              disabled={isSubmitting}
            >
              <option value="true">Sim (Permite que o aluno contrate diretamente pelo app)</option>
              <option value="false">Não (Exclusivo para fechamento interno no balcão)</option>
            </select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px", fontWeight: 800, cursor: "pointer", textTransform: "uppercase", marginTop: "8px" }}>
            <input 
              type="checkbox" 
              checked={isPreSale}
              onChange={(e) => setIsPreSale(e.target.checked)}
              disabled={isSubmitting}
              style={{ width: "18px", height: "18px", accentColor: "#000", cursor: "pointer" }} 
            />
            Este plano é uma Pré-Venda
          </label>
        </div>
      )}
    </div>
  );
}
