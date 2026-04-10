"use client";

import { useState, useRef, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, updatePassword } from "./actions";
import ConfirmModal from "@/components/ConfirmModal";
import { Lock, ShieldCheck, User as UserIcon, Mail, Phone, Info } from "lucide-react";

/**
 * ProfileForm Component
 * 
 * Responsável pela gestão da identidade do atleta (perfil e segurança).
 * 
 * @design (Iron Monolith Light)
 * - Cores literais (#FFF/#000) utilizadas para garantir paridade total com o design system,
 *   evitando oscilações de tokens de tema em componentes críticos de identidade.
 * - Neo-Brutalismo: Sombras 4px sólidas, bordas 2px e tipografia Outfit 900.
 * 
 * @storage_logic (Auto-Healing)
 * - Implementa limpeza automática de arquivos órfãos no bucket 'avatars'.
 * - Ao realizar upload ou exclusão, o arquivo físico é removido do Supabase Storage
 *   para evitar custos desnecessários e acúmulo de lixo.
 */

interface ProfileFormProps {
  user: any;
  profile: any;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function ProfileForm({ user, profile, onDirtyChange }: ProfileFormProps) {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [isDirty, setIsDirtyInternal] = useState(false);
  
  const setIsDirty = (val: boolean) => {
    setIsDirtyInternal(val);
    if (onDirtyChange) onDirtyChange(val);
  };
  
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Estados para contadores e máscaras
  const [bioText, setBioText] = useState(profile?.bio || "");
  const [cpfValue, setCpfValue] = useState(profile?.cpf || "");
  const [phoneValue, setPhoneValue] = useState(profile?.phone || "");
  
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passFormRef = useRef<HTMLFormElement>(null);

  // Trava de segurança para alterações não salvas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Cálculo de completude do perfil
  const calculateCompleteness = () => {
    const fields = [
      profile?.first_name || "",
      profile?.last_name || "",
      profile?.birth_date || "",
      profile?.gender || "",
      cpfValue,
      phoneValue,
      bioText,
      avatarUrl
    ];
    const filled = fields.filter(f => f && f.length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completeness = calculateCompleteness();

  // Máscaras de Input
  const maskCPF = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  };

  const maskPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{1})(\d{4})(\d)/, "$2-$3") // Ajuste para 9 dígitos
        .replace(/(\d{5})(\d{4})/, "$1-$2");
    }
  };

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
      setIsDirty(false); // Limpa o estado de alteração ao salvar
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
    fontSize: "16px",
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
            <UserIcon size={40} style={{ color: "#AAA" }} />
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
              background: "#FFF",
              border: "2px solid #000",
              boxShadow: "3px 3px 0px #000",
              color: "#000",
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
                border: "2px solid #E31B23",
                color: "#E31B23",
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

      {/* ── MEDIDOR DE COMPLETUDE ── */}
      <div style={{
        background: "#000",
        padding: "16px",
        border: "2px solid #000",
        boxShadow: "4px 4px 0px #E31B23",
        marginBottom: "8px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "10px", fontWeight: 900, color: "#FFF", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Status do Perfil
          </span>
          <span style={{ fontSize: "10px", fontWeight: 900, color: "#E31B23" }}>
            {completeness}%
          </span>
        </div>
        <div style={{ width: "100%", height: "8px", background: "#333", border: "1px solid #000" }}>
          <div style={{ 
            width: `${completeness}%`, 
            height: "100%", 
            background: "#E31B23",
            transition: "width 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
          }} />
        </div>
        <p style={{ fontSize: "9px", color: "#AAA", marginTop: "8px", textTransform: "uppercase", fontWeight: 700 }}>
          {completeness === 100 ? "Perfil Pronto para Batalha" : "Complete seu perfil para visibilidade total"}
        </p>
      </div>

      <form action={handleSubmit} onChange={() => setIsDirty(true)} style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
        
        {/* ── SEÇÃO 1: IDENTIDADE DIGITAL ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "8px", height: "16px", background: "#000" }} />
            <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>DADOS DO PERFIL</h3>
          </div>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>E-mail da Conta</label>
            <div style={{ position: "relative" }}>
              <Mail size={14} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#CCC" }} />
              <input 
                type="text" 
                defaultValue={user.email || ""} 
                disabled
                style={{ ...blockInputStyle, padding: "14px 16px 14px 44px", opacity: 0.5, cursor: "not-allowed" }}
              />
            </div>
            <p style={{ fontSize: "9px", color: "#999", marginTop: "6px", fontWeight: 700 }}>O e-mail é vinculado à sua conta e não pode ser alterado aqui.</p>
          </div>
        </div>

        {/* ── SEÇÃO 2: DADOS DE CADASTRO ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "8px", height: "16px", background: "#E31B23" }} />
            <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>DADOS DE CADASTRO</h3>
          </div>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Primeiro Nome</label>
            <input 
              type="text" 
              name="first_name" 
              defaultValue={profile?.first_name || (profile?.full_name ? profile.full_name.split(' ')[0] : "")} 
              placeholder="Ex: JOÃO" 
              maxLength={100}
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
              maxLength={100}
              style={blockInputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Nascimento</label>
              <input 
                type="date" 
                name="birth_date" 
                defaultValue={profile?.birth_date || ""} 
                style={{ ...blockInputStyle, padding: "13px 16px" }}
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
          </div>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>CPF</label>
            <input 
              type="text" 
              name="cpf" 
              value={cpfValue} 
              placeholder="000.000.000-00" 
              maxLength={14}
              onChange={(e) => {
                setCpfValue(maskCPF(e.target.value));
                setIsDirty(true);
              }}
              style={blockInputStyle}
            />
          </div>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Telefone / WhatsApp</label>
            <div style={{ position: "relative" }}>
              <Phone size={14} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#CCC" }} />
              <input 
                type="tel" 
                name="phone" 
                value={phoneValue} 
                placeholder="(00) 00000-0000" 
                maxLength={20}
                onChange={(e) => {
                  setPhoneValue(maskPhone(e.target.value));
                  setIsDirty(true);
                }}
                style={{ ...blockInputStyle, padding: "14px 16px 14px 44px" }}
              />
            </div>
          </div>
        </div>

        {/* ── SEÇÃO 3: PERFIL SOCIAL ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "8px", height: "16px", background: "#000" }} />
            <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>PERFIL SOCIAL</h3>
          </div>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Apelido (Como os outros te verão)</label>
            <input 
              type="text" 
              name="display_name" 
              defaultValue={profile?.display_name || profile?.full_name || ""} 
              placeholder="Ex: GABI, SANTANA, MONSTRO..." 
              maxLength={50}
              style={blockInputStyle}
            />
          </div>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Ficha Biográfica</label>
            <textarea 
              name="bio" 
              value={bioText} 
              placeholder="Conte um pouco sobre sua jornada no fitness..." 
              maxLength={150}
              onChange={(e) => {
                setBioText(e.target.value);
                setIsDirty(true);
              }}
              style={{ ...blockInputStyle, height: "100px", resize: "none" }}
            />
            <div style={{ 
              position: "absolute", 
              bottom: "-20px", 
              right: "0", 
              fontSize: "10px", 
              fontWeight: 900, 
              color: bioText.length >= 140 ? "#E31B23" : "#AAA",
              textTransform: "uppercase"
            }}>
              {bioText.length}/150
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

        {/* ── BOTÃO DE AÇÃO (STICKY UNIVERSAL) ── */}
        <div style={{
          position: "sticky",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 82px)", // Cálculo dinâmico para iOS/Android
          left: 0,
          right: 0,
          zIndex: 10,
          padding: "16px 0",
          background: "linear-gradient(to top, var(--bg) 90%, transparent)",
          backdropFilter: "blur(4px)", // Toque premium de transparência
          pointerEvents: "none",
        }}>
          <button 
            type="submit" 
            disabled={loading || !isDirty} 
            style={{ 
              width: "100%",
              background: isDirty ? "#E31B23" : "#CCC",
              color: "#FFFFFF",
              border: "2px solid #000",
              boxShadow: "6px 6px 0px #000",
              padding: "20px",
              fontSize: "14px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              cursor: isDirty ? "pointer" : "not-allowed",
              transition: "all 0.1s",
              fontFamily: "'Outfit', sans-serif",
              pointerEvents: "auto", // Reativa cliques para o botão
            }}
            onMouseDown={(e) => {
              if (isDirty) {
                e.currentTarget.style.transform = "translate(2px, 2px)";
                e.currentTarget.style.boxShadow = "2px 2px 0px #000";
              }
            }}
            onMouseUp={(e) => {
              if (isDirty) {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "6px 6px 0px #000";
              }
            }}
          >
            {loading ? "PROCESSANDO..." : "CONFIRMAR ALTERAÇÕES"}
          </button>
        </div>
      </form>

      {/* ── SENHA E SEGURANÇA ── */}
      <div style={{ marginTop: "64px", borderTop: "2px solid #EEE", paddingTop: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{ width: "8px", height: "16px", background: "#E31B23" }} />
          <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>SEGURANÇA DA CONTA</h3>
        </div>

        <form ref={passFormRef} action={handlePassSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <p style={{ fontSize: "12px", color: "#666", lineHeight: "1.6", marginBottom: "8px" }}>
            Mantenha sua conta protegida. A nova senha deve ter no mínimo 8 caracteres.
          </p>

          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Nova Senha</label>
            <div style={{ position: "relative" }}>
              <Lock size={14} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#AAA" }} />
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
              <ShieldCheck size={14} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#AAA" }} />
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
