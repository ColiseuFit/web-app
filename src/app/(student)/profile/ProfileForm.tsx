"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, updatePassword } from "./actions";
import ConfirmModal from "@/components/ConfirmModal";
import { Lock, ShieldCheck, User } from "lucide-react";

export default function ProfileForm({ user, profile }: { user: any, profile: any }) {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passFormRef = useRef<HTMLFormElement>(null);

  // Faz upload pro Storage e salva a URL pública temporariamente
  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Você precisa selecionar uma imagem.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // 1. Upload do novo arquivo
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Se já existia um avatar, tenta deletar o arquivo antigo para evitar lixo
      if (avatarUrl) {
        try {
          const oldPath = avatarUrl.split("/").pop();
          if (oldPath && oldPath.includes(user.id)) {
            await supabase.storage.from("avatars").remove([oldPath]);
          }
        } catch (err) {
          console.error("Erro ao limpar avatar antigo:", err);
        }
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (error: any) {
      alert("Erro ao enviar imagem: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    
    // Garante que o avatar_url seja enviado (mesmo se vazio para remoção)
    formData.set("avatar_url", avatarUrl || "");

    const res = await updateProfile(formData);
    
    if (res?.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
    }
    setLoading(false);
  }

  async function handlePassSubmit(formData: FormData) {
    setPassLoading(true);
    setPassMessage(null);
    const res = await updatePassword(formData);
    if (res?.error) {
      setPassMessage({ type: "error", text: res.error });
    } else {
      setPassMessage({ type: "success", text: "Senha atualizada com sucesso!" });
      passFormRef.current?.reset();
    }
    setPassLoading(false);
  }

  // Common input styles alignment (Iron Monolith Light)
  const blockInputStyle = {
    width: "100%",
    background: "#FFF",
    border: "2px solid #000",
    padding: "14px 16px",
    color: "#000",
    fontSize: "14px",
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    borderRadius: 0,
    boxShadow: "2px 2px 0px #F0F0F0",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", 
    fontSize: "9px", 
    fontWeight: 900, 
    textTransform: "uppercase", 
    color: "#000", 
    opacity: 0.6,
    marginBottom: "10px", 
    letterSpacing: "0.2em" 
  };

  return (
    <div style={{
      background: "#FFF",
      border: "2px solid #000",
      padding: "32px 24px",
      boxShadow: "4px 4px 0px #000",
    }}>
      
      {/* Avatar Section */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "40px" }}>
        <div style={{
          width: "120px",
          height: "120px",
          background: "#F9F9F9",
          border: "2px solid #000",
          boxShadow: "4px 4px 0px #000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          marginBottom: "16px",
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%) contrast(1.1)" }} />
          ) : (
            <User size={40} style={{ color: "var(--text-dim)" }} />
          )}
        </div>
        
        <input 
          type="file" 
          accept="image/*" 
          onChange={uploadAvatar} 
          disabled={uploading}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
        
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--nb-shadow-sm)",
              color: "var(--text)",
              padding: "8px 16px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "transform 0.1s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "translate(1px, 1px)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
          >
            {uploading ? "SINCRO..." : "ALTERAR FOTO"}
          </button>

          {avatarUrl && (
            <button 
              type="button" 
              onClick={() => setShowDeleteConfirm(true)}
              disabled={uploading}
              style={{
                background: "transparent",
                border: "1px solid var(--red)",
                color: "var(--red)",
                padding: "8px 16px",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              REMOVER FOTO
            </button>
          )}
        </div>

        {showDeleteConfirm && (
          <ConfirmModal
            title="Remover Foto"
            message="ESTA AÇÃO IRÁ EXCLUIR SUA FOTO DE PERFIL PERMANENTEMENTE DOS SERVIDORES. DESEJA CONTINUAR COM A EXCLUSÃO?"
            confirmLabel="CONFIRMAR REMOÇÃO"
            cancelLabel="VOLTAR"
            onConfirm={async () => {
              if (avatarUrl) {
                const oldPath = avatarUrl.split("/").pop();
                if (oldPath) await supabase.storage.from("avatars").remove([oldPath]);
              }
              setAvatarUrl("");
              setShowDeleteConfirm(false);
            }}
            onCancel={() => setShowDeleteConfirm(false)}
            isDanger={true}
          />
        )}
      </div>

      <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
        
        {/* ── PERSONALIZAÇÃO ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "8px", height: "16px", background: "var(--red)" }} />
            <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)" }}>PERSONALIZAÇÃO</h3>
          </div>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Codinome de Atleta</label>
            <input 
              type="text" 
              name="display_name" 
              defaultValue={profile?.display_name || profile?.full_name || ""} 
              placeholder="Ex: JOÃO SILVA" 
              style={blockInputStyle}
            />
          </div>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Gênero</label>
            <select 
              name="gender" 
              defaultValue={profile?.gender || ""} 
              style={{...blockInputStyle, appearance: "none"}}
            >
              <option value="" disabled>Selecione...</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Ficha Biográfica</label>
            <textarea 
              name="bio" 
              defaultValue={profile?.bio || ""} 
              rows={4}
              placeholder="Ex: FOCADO EM LPO E PERFORMANCE..." 
              style={{ ...blockInputStyle, resize: "none" }}
            />
          </div>
        </div>

        {/* ── DADOS PESSOAIS ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "8px", height: "16px", background: "var(--red)" }} />
            <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)" }}>DADOS PESSOAIS</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Primeiro Nome</label>
              <input 
                type="text" 
                name="first_name" 
                defaultValue={profile?.first_name || (profile?.full_name ? profile.full_name.split(' ')[0] : "")} 
                placeholder="Ex: JOÃO" 
                style={blockInputStyle}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Sobrenome</label>
              <input 
                type="text" 
                name="last_name" 
                defaultValue={profile?.last_name || (profile?.full_name ? profile.full_name.split(' ').slice(1).join(' ') : "")} 
                placeholder="Ex: DA SILVA" 
                style={blockInputStyle}
              />
            </div>
          </div>


          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>CPF</label>
              <input 
                type="text" 
                name="cpf" 
                defaultValue={profile?.cpf || ""} 
                placeholder="000.000.000-00" 
                style={blockInputStyle}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Nascimento</label>
              <input 
                type="date" 
                name="birth_date" 
                defaultValue={profile?.birth_date || ""} 
                style={{ ...blockInputStyle, padding: "13px 16px" }}
              />
            </div>
          </div>
        </div>

        {message && (
          <div style={{
            padding: "14px",
            background: message.type === "error" ? "#FFF" : "#000",
            border: `2px solid #000`,
            color: message.type === "error" ? "#E31B23" : "#FFF",
            boxShadow: "3px 3px 0px #000",
            fontSize: "12px",
            fontWeight: 800,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            {message.text}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading} 
          style={{ 
            marginTop: "8px",
            background: "#E31B23",
            color: "#FFFFFF",
            border: "2px solid #000",
            boxShadow: "4px 4px 0px #000",
            padding: "16px",
            fontSize: "12px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            cursor: "pointer",
            transition: "all 0.1s",
            fontFamily: "'Outfit', sans-serif",
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "translate(2px, 2px)";
            e.currentTarget.style.boxShadow = "2px 2px 0px #000";
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "4px 4px 0px #000";
          }}
        >
          {loading ? "PROCESSANDO..." : "SALVAR ALTERAÇÕES"}
        </button>
      </form>

      {/* ── SENHA E SEGURANÇA ── */}
      <div style={{ marginTop: "64px", borderTop: "2px solid var(--border)", paddingTop: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{ width: "8px", height: "16px", background: "var(--red)" }} />
          <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text)" }}>SEGURANÇA DA CONTA</h3>
        </div>

        <form ref={passFormRef} action={handlePassSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <p style={{ fontSize: "12px", color: "var(--text-dim)", lineHeight: "1.6", marginBottom: "8px" }}>
            Mantenha sua conta protegida. A nova senha deve ter no mínimo 8 caracteres.
          </p>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Nova Senha</label>
            <div style={{ position: "relative" }}>
              <Lock size={14} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
              <input 
                type="password" 
                name="password" 
                placeholder="********" 
                required
                style={{ ...blockInputStyle, padding: "14px 16px 14px 44px" }}
              />
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Confirmar Nova Senha</label>
            <div style={{ position: "relative" }}>
              <ShieldCheck size={14} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
              <input 
                type="password" 
                name="confirm_password" 
                placeholder="********" 
                required
                style={{ ...blockInputStyle, padding: "14px 16px 14px 44px" }}
              />
            </div>
          </div>

          {passMessage && (
            <div style={{
              padding: "14px",
              background: passMessage.type === "error" ? "#FFF" : "#000",
              border: `2px solid #000`,
              boxShadow: "3px 3px 0px #000",
              color: passMessage.type === "error" ? "#E31B23" : "#FFF",
              fontSize: "12px",
              fontWeight: 800,
              textAlign: "center",
              textTransform: "uppercase",
            }}>
              {passMessage.text}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={passLoading} 
            style={{ 
              background: "#FFF",
              color: "#000",
              border: "2px solid #000",
              boxShadow: "4px 4px 0px #000",
              padding: "16px",
              fontSize: "11px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              cursor: "pointer",
              transition: "all 0.1s",
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translate(2px, 2px)";
              e.currentTarget.style.boxShadow = "2px 2px 0px #000";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "4px 4px 0px #000";
            }}
          >
            {passLoading ? "ATUALIZANDO..." : "REDEFINIR SENHA"}
          </button>
        </form>
      </div>
    </div>
  );
}
