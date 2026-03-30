"use client";

import { Building2, Bell, Shield, Users } from "lucide-react";

/**
 * Admin Settings Page: Box configuration and system preferences.
 *
 * @design Static MVP shell with organized settings sections.
 * Will be wired to Supabase `box_settings` table for persistence.
 */
export default function SettingsPage() {
  return (
    <div className="admin-container-fluid">
      {/* ── PAGE HEADER ── */}
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 4px" }}>
          Configurações
        </h1>
        <p style={{ fontSize: "14px", color: "#666", fontWeight: 500, margin: 0 }}>
          Controle Central e Parâmetros Operacionais do Box
        </p>
      </div>

      {/* ── SECTIONS ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Box Info */}
        <div className="admin-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
            <Building2 size={24} />
            <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Identidade do Box</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div>
              <label>NOME DA UNIDADE</label>
              <input type="text" defaultValue="Coliseu CrossFit" />
            </div>
            <div>
              <label>WHATSAPP SUPORTE / RECEPÇÃO</label>
              <input type="tel" defaultValue="" placeholder="(11) 99999-9999" />
            </div>
          </div>
        </div>

        {/* Capacidade */}
        <div className="admin-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
            <Users size={24} />
            <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Logística & Capacidade</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div>
              <label>LIMITE DE ALUNOS POR TURMA</label>
              <input type="number" defaultValue={20} min={1} max={50} />
            </div>
            <div>
              <label>TEMPO LIMITE P/ CANCELAMENTO (HORAS)</label>
              <input type="number" defaultValue={2} min={1} max={24} />
            </div>
          </div>
        </div>

        {/* Notificações */}
        <div className="admin-card">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", borderBottom: "2px solid #000", paddingBottom: "16px" }}>
            <Bell size={24} />
            <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Notificações & Eventos</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", fontWeight: 700, cursor: "pointer", background: "#F9F9F9", padding: "16px", border: "1px solid #EEE" }}>
              <input type="checkbox" defaultChecked style={{ width: "20px", height: "200px", accentColor: "#000" }} />
              ALERTA DE ANIVERSARIANTES NA RECEPÇÃO
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", fontWeight: 700, cursor: "pointer", background: "#F9F9F9", padding: "16px", border: "1px solid #EEE" }}>
              <input type="checkbox" defaultChecked style={{ width: "20px", height: "20px", accentColor: "#000" }} />
              NOTIFICAR CHECK-IN NA TV DO BOX (WOD TV)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "14px", fontWeight: 700, cursor: "pointer", background: "#F9F9F9", padding: "16px", border: "1px solid #EEE" }}>
              <input type="checkbox" style={{ width: "20px", height: "20px", accentColor: "#000" }} />
              RELATÓRIO SEMANAL OPERACIONAL (E-MAIL)
            </label>
          </div>
        </div>

        {/* Segurança */}
        <div className="admin-card" style={{ background: "#F1F1F1 !important" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <Shield size={24} color="var(--admin-danger)" />
            <h2 style={{ fontSize: "16px", fontWeight: 800, textTransform: "uppercase", margin: 0 }}>Segurança de Nível Profissional</h2>
          </div>
          <p style={{ fontSize: "13px", color: "#666", lineHeight: 1.6, fontWeight: 500 }}>
            As permissões de acesso (Admin, Coach, Recepção) são blindadas via banco de dados e políticas RLS. 
            Modificações na estrutura de cargos devem ser solicitadas via ticket técnico para garantir a integridade dos dados.
          </p>
        </div>

        {/* Save */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "16px" }}>
          <button className="admin-btn admin-btn-primary" style={{ height: "60px", padding: "0 40px", fontSize: "16px", opacity: 0.5, cursor: "not-allowed" }} disabled>
            SALVAR ALTERAÇÕES (EM BREVE)
          </button>
        </div>
      </div>
    </div>
  );
}
