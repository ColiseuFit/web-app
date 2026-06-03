/**
 * DrawerSecurity: Gestão de Acesso (E-mail de Login + Reset de Senha).
 * 
 * @architecture
 * - Componente Visual Puro: Exibe os campos de credenciais para o Admin alterar.
 * - Fix Aplicado: O input de e-mail agora recebe `defaultValue={selectedStudent.email}`
 *   para que o Admin veja o e-mail atual antes de decidir trocar.
 * - Nenhuma Server Action importada diretamente; o handler vem do Orquestrador via props.
 */
"use client";

import { ShieldCheck, Lock as LockIcon, Mail as MailIcon } from "lucide-react";
import type { DrawerSecurityProps } from "./types";

export default function DrawerSecurity({
  selectedStudent,
  loading,
  handleUpdateAuth,
  handleResendInvite
}: DrawerSecurityProps) {
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <ShieldCheck size={24} style={{ color: "var(--admin-primary)" }} />
        <h3 style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Gestão de Acesso</h3>
      </div>

      <form action={handleUpdateAuth} style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div className="admin-card" style={{ padding: 24, border: "3px solid #000" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <MailIcon size={16} />
            <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Alterar E-mail de Login</span>
          </div>
          <input 
            type="email" 
            name="email" 
            defaultValue={selectedStudent.email || ""}
            placeholder="Novo e-mail (Obrigatório para login)" 
            style={{ width: "100%", padding: 14, border: "2px solid #000", fontWeight: 700 }}
          />
          <p style={{ fontSize: 11, color: "#666", marginTop: 8 }}>Muda o endereço usado pelo atleta para entrar no Coliseu.</p>
        </div>

        <div className="admin-card" style={{ padding: 24, border: "3px solid #000" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <LockIcon size={16} />
            <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Resetar Senha</span>
          </div>
          <input 
            type="text" 
            name="password" 
            placeholder="Nova senha (Min 8 caracteres)" 
            style={{ width: "100%", padding: 14, border: "2px solid #000", fontWeight: 700 }}
          />
          <p style={{ fontSize: 11, color: "#666", marginTop: 8 }}>Cuidado: A nova senha terá efeito imediato e deslogará sessões antigas se configurado.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <button 
            type="submit" 
            disabled={loading} 
            className="admin-btn admin-btn-primary" 
            style={{ height: 64, fontSize: 14 }}
          >
            {loading ? "ATUALIZANDO CREDENCIAIS..." : "CONFIRMAR ALTERAÇÕES DE SEGURANÇA"}
          </button>

          <div style={{ height: "1px", background: "#000", margin: "16px 0", opacity: 0.1 }} />

          <div className="admin-card" style={{ padding: 24, border: "3px dashed #000", background: "#FAFAFA", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
              <MailIcon size={18} />
              <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Reenviar Link de Onboarding</span>
            </div>
            <p style={{ fontSize: 11, color: "#666", marginBottom: 20 }}>
              Use isto se o aluno não recebeu o e-mail inicial ou se o link expirou. Isso gerará um novo link de ativação.
            </p>
            <button 
              type="button"
              onClick={() => handleResendInvite(selectedStudent.id)}
              disabled={loading}
              className="admin-btn admin-btn-ghost"
              style={{ width: "100%", height: 48, borderColor: "#000", borderStyle: "solid", borderWidth: "2px", fontWeight: 900, fontSize: 12 }}
            >
              {loading ? "PROCESSANDO..." : "REENVIAR AGORA"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
