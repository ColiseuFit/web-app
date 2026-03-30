"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "./actions";

export default function ProfileForm({ user, profile }: { user: any, profile: any }) {
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Faz upload pro Storage e salva a URL pública temporariamente
  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("Você precisa selecionar uma imagem.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
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
    
    // Anexa a URL do avatar caso exista
    if (avatarUrl) {
      formData.append("avatar_url", avatarUrl);
    }

    const res = await updateProfile(formData);
    
    if (res?.error) {
      setMessage({ type: "error", text: res.error });
    } else {
      setMessage({ type: "success", text: "Perfil atualizado com sucesso!" });
    }
    setLoading(false);
  }

  return (
    <div style={{
      background: "#0E0E0E",
      border: "1px solid rgba(255,255,255,0.05)",
      padding: "32px 24px",
    }}>
      
      {/* Avatar Section */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "40px" }}>
        <div style={{
          width: "120px",
          height: "120px",
          background: "#050505",
          border: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          marginBottom: "16px",
        }}>
          {/* Corner accents */}
          <div style={{ position: "absolute", top: 0, left: 0, width: "12px", height: "12px", borderTop: "2px solid #E31B23", borderLeft: "2px solid #E31B23" }} />
          <div style={{ position: "absolute", bottom: 0, right: 0, width: "12px", height: "12px", borderBottom: "2px solid #E31B23", borderRight: "2px solid #E31B23" }} />

          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "grayscale(100%) contrast(1.1)" }} />
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="rgba(255,255,255,0.1)">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
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
        
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.5)",
            padding: "8px 16px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {uploading ? "SINCRO..." : "ALTERAR FOTO"}
        </button>
      </div>

      <form action={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
        
        {/* ── PERSONALIZAÇÃO ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "4px", height: "16px", background: "#E31B23" }} />
            <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#FFF" }}>PERSONALIZAÇÃO</h3>
          </div>

          <div style={{ position: "relative" }}>
            <label style={{ 
              display: "block", 
              fontSize: "9px", 
              fontWeight: 700, 
              textTransform: "uppercase", 
              color: "rgba(255,255,255,0.25)", 
              marginBottom: "10px", 
              letterSpacing: "0.2em" 
            }}>
              Codinome de Atleta
            </label>
            <input 
              type="text" 
              name="display_name" 
              defaultValue={profile?.display_name || profile?.full_name || ""} 
              placeholder="Ex: JOÃO SILVA" 
              style={{
                width: "100%",
                background: "#050505",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "14px 16px",
                color: "#FFFFFF",
                fontSize: "14px",
                fontFamily: "'Inter', sans-serif",
                outline: "none",
                borderRadius: 0,
              }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <label style={{ 
              display: "block", 
              fontSize: "9px", 
              fontWeight: 700, 
              textTransform: "uppercase", 
              color: "rgba(255,255,255,0.25)", 
              marginBottom: "10px", 
              letterSpacing: "0.2em" 
            }}>
              Gênero
            </label>
            <select 
              name="gender" 
              defaultValue={profile?.gender || ""} 
              style={{
                width: "100%",
                background: "#050505",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "14px 16px",
                color: "#FFFFFF",
                fontSize: "14px",
                fontFamily: "'Inter', sans-serif",
                outline: "none",
                borderRadius: 0,
                appearance: "none",
              }}
            >
              <option value="" disabled>Selecione...</option>
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
          </div>

          <div style={{ position: "relative" }}>
            <label style={{ 
              display: "block", 
              fontSize: "9px", 
              fontWeight: 700, 
              textTransform: "uppercase", 
              color: "rgba(255,255,255,0.25)", 
              marginBottom: "10px", 
              letterSpacing: "0.2em" 
            }}>
              Ficha Biográfica
            </label>
            <textarea 
              name="bio" 
              defaultValue={profile?.bio || ""} 
              rows={4}
              placeholder="Ex: FOCADO EM LPO E PERFORMANCE..." 
              style={{ 
                width: "100%",
                background: "#050505",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "14px 16px",
                color: "#FFFFFF",
                fontSize: "14px",
                fontFamily: "'Inter', sans-serif",
                outline: "none",
                borderRadius: 0,
                resize: "none" 
              }}
            />
          </div>
        </div>

        {/* ── DADOS PESSOAIS ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "4px", height: "16px", background: "#E31B23" }} />
            <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#FFF" }}>DADOS PESSOAIS</h3>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={{ 
                display: "block", 
                fontSize: "9px", 
                fontWeight: 700, 
                textTransform: "uppercase", 
                color: "rgba(255,255,255,0.25)", 
                marginBottom: "10px", 
                letterSpacing: "0.2em" 
              }}>
                Primeiro Nome
              </label>
              <input 
                type="text" 
                name="first_name" 
                defaultValue={profile?.first_name || (profile?.full_name ? profile.full_name.split(' ')[0] : "")} 
                placeholder="Ex: JOÃO" 
                style={{
                  width: "100%",
                  background: "#050505",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "14px 16px",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontFamily: "'Inter', sans-serif",
                  outline: "none",
                  borderRadius: 0,
                }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={{ 
                display: "block", 
                fontSize: "9px", 
                fontWeight: 700, 
                textTransform: "uppercase", 
                color: "rgba(255,255,255,0.25)", 
                marginBottom: "10px", 
                letterSpacing: "0.2em" 
              }}>
                Sobrenome
              </label>
              <input 
                type="text" 
                name="last_name" 
                defaultValue={profile?.last_name || (profile?.full_name ? profile.full_name.split(' ').slice(1).join(' ') : "")} 
                placeholder="Ex: DA SILVA" 
                style={{
                  width: "100%",
                  background: "#050505",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "14px 16px",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontFamily: "'Inter', sans-serif",
                  outline: "none",
                  borderRadius: 0,
                }}
              />
            </div>
          </div>


          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={{ 
                display: "block", 
                fontSize: "9px", 
                fontWeight: 700, 
                textTransform: "uppercase", 
                color: "rgba(255,255,255,0.25)", 
                marginBottom: "10px", 
                letterSpacing: "0.2em" 
              }}>
                CPF
              </label>
              <input 
                type="text" 
                name="cpf" 
                defaultValue={profile?.cpf || ""} 
                placeholder="000.000.000-00" 
                style={{
                  width: "100%",
                  background: "#050505",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "14px 16px",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontFamily: "'Inter', sans-serif",
                  outline: "none",
                  borderRadius: 0,
                }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={{ 
                display: "block", 
                fontSize: "9px", 
                fontWeight: 700, 
                textTransform: "uppercase", 
                color: "rgba(255,255,255,0.25)", 
                marginBottom: "10px", 
                letterSpacing: "0.2em" 
              }}>
                Nascimento
              </label>
              <input 
                type="date" 
                name="birth_date" 
                defaultValue={profile?.birth_date || ""} 
                style={{
                  width: "100%",
                  background: "#050505",
                  border: "1px solid rgba(255,255,255,0.08)",
                  padding: "13px 16px",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontFamily: "'Inter', sans-serif",
                  outline: "none",
                  borderRadius: 0,
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>
        </div>

        {message && (
          <div style={{
            padding: "14px",
            background: message.type === "error" ? "rgba(227,27,35,0.1)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${message.type === "error" ? "rgba(227,27,35,0.2)" : "rgba(255,255,255,0.1)"}`,
            color: message.type === "error" ? "#E31B23" : "#FFFFFF",
            fontSize: "12px",
            fontWeight: 600,
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
            border: "none",
            padding: "16px",
            fontSize: "12px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {loading ? "PROCESSANDO..." : "SALVAR ALTERAÇÕES"}
        </button>
      </form>
    </div>
  );
}
