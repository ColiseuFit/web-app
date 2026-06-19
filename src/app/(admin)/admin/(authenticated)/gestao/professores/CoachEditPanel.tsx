"use client";

/**
 * CoachEditPanel: Painel expansível de edição de perfil e redefinição de senha.
 *
 * @architecture
 * Extraído do ProfessoresClient.tsx para conformidade com o protocolo Anti-Monolith (< 500 linhas).
 * Contém os campos de edição de dados do coach (nome, telefone, e-mail, bio)
 * e a seção de redefinição de senha via Admin API.
 *
 * @security
 * - Redefinição de senha usa `updateCoachAuth` (Admin API bypass) para forçar nova credencial.
 * - Persistência de perfil usa `updateCoachProfile` com bypass de RLS.
 */

import React, { useState } from "react";
import { Loader2, Save, Lock, KeyRound } from "lucide-react";
import { updateCoachProfile, updateCoachAuth, getCoaches } from "./actions";

interface CoachEditPanelProps {
  userId: string;
  initialData: {
    full_name: string;
    phone: string;
    email: string;
    bio: string;
  };
  onClose: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
  onRefresh: (coaches: any[]) => void;
}

/** Estilo reutilizável para inputs do formulário de edição */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  border: "3px solid #E5E7EB",
  fontWeight: 700,
  fontSize: 14,
  outline: "none",
  background: "#FAFAFA",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  textTransform: "uppercase",
  color: "#999",
  letterSpacing: "0.08em",
  marginBottom: 6,
  display: "block",
};

export default function CoachEditPanel({ userId, initialData, onClose, onToast, onRefresh }: CoachEditPanelProps) {
  const [editData, setEditData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);

  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  /**
   * handleSaveProfile: Persiste as alterações do perfil via Server Action.
   */
  async function handleSaveProfile() {
    setIsSaving(true);
    const res = await updateCoachProfile(userId, editData);
    if (res.error) {
      onToast(res.error, "error");
    } else {
      onToast("Perfil atualizado com sucesso!", "success");
      const fresh = await getCoaches();
      if (fresh.data) onRefresh(fresh.data);
    }
    setIsSaving(false);
  }

  /**
   * handleResetPassword: Redefine a senha de um Coach via Admin API.
   * Permite que o administrador desbloqueie o acesso ao Coach Portal.
   */
  async function handleResetPassword() {
    if (!newPassword || newPassword.trim().length < 6) {
      onToast("A senha deve ter no mínimo 6 caracteres.", "error");
      return;
    }
    setIsResettingPassword(true);
    try {
      const res = await updateCoachAuth(userId, newPassword.trim());
      if (res.error) {
        onToast(res.error, "error");
      } else {
        onToast("Senha redefinida com sucesso!", "success");
        setNewPassword("");
      }
    } catch {
      onToast("Erro inesperado ao redefinir senha.", "error");
    }
    setIsResettingPassword(false);
  }

  return (
    <div style={{
      borderTop: "4px solid #000",
      background: "#FAFAFA",
      padding: 28,
      animation: "expandIn 0.2s ease-out",
    }}>
      <style>{`
        @keyframes expandIn {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 800px; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <div style={{ width: 8, height: 8, background: "#000" }} />
        <span style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Editar Perfil
        </span>
      </div>

      {/* ── Campos de Dados ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Nome Completo</label>
          <input
            type="text"
            value={editData.full_name}
            onChange={(e) => setEditData(prev => ({ ...prev, full_name: e.target.value }))}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = "#000"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
          />
        </div>
        <div>
          <label style={labelStyle}>WhatsApp</label>
          <input
            type="tel"
            value={editData.phone}
            onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
            style={inputStyle}
            placeholder="(00) 00000-0000"
            onFocus={(e) => { e.currentTarget.style.borderColor = "#000"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>E-mail</label>
        <input
          type="email"
          value={editData.email}
          onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
          style={inputStyle}
          placeholder="professor@coliseufit.com"
          onFocus={(e) => { e.currentTarget.style.borderColor = "#000"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>Bio / Especialidades</label>
        <textarea
          value={editData.bio}
          onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
          rows={3}
          placeholder="Ex: CrossFit L2, Especialista em Halterofilismo, Personal Trainer..."
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: 80,
            fontFamily: "inherit",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#000"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#E5E7EB"; }}
        />
      </div>

      {/* ── SEÇÃO DE REDEFINIÇÃO DE SENHA ── */}
      <div style={{ marginBottom: 24, padding: 20, background: "#FFF7ED", border: "3px solid #F59E0B", borderStyle: "dashed" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <KeyRound size={16} style={{ color: "#D97706", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#92400E" }}>
            Redefinir Senha de Acesso
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#78350F", fontWeight: 600, lineHeight: 1.5, margin: "0 0 12px" }}>
          Use este campo para forçar uma nova senha de acesso ao Portal do Coach. A senha anterior será substituída imediatamente.
        </p>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Nova Senha (mín. 6 caracteres)</label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ ...inputStyle, borderColor: "#F59E0B", background: "#FFF" }}
              placeholder="Digite a nova senha..."
              onFocus={(e) => { e.currentTarget.style.borderColor = "#000"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#F59E0B"; }}
            />
          </div>
          <button
            onClick={handleResetPassword}
            disabled={isResettingPassword || !newPassword || newPassword.trim().length < 6}
            className="admin-btn"
            style={{
              height: 49,
              paddingInline: 24,
              gap: 8,
              background: (!newPassword || newPassword.trim().length < 6) ? "#D1D5DB" : "#D97706",
              color: "#FFF",
              border: "3px solid #000",
              fontWeight: 900,
              fontSize: 12,
              textTransform: "uppercase",
              cursor: (!newPassword || newPassword.trim().length < 6) ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              display: "inline-flex",
              alignItems: "center",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {isResettingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
            <span>REDEFINIR</span>
          </button>
        </div>
      </div>

      {/* ── Ações do Painel ── */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          className="admin-btn admin-btn-ghost"
          style={{ height: 48, paddingInline: 24, border: "2px solid #E5E7EB" }}
        >
          CANCELAR
        </button>
        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="admin-btn admin-btn-primary"
          style={{ height: 48, paddingInline: 32, gap: 8 }}
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          SALVAR ALTERAÇÕES
        </button>
      </div>
    </div>
  );
}
