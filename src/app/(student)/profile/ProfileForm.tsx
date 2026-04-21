"use client";

import { useState, useRef, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { updateProfile, updatePassword } from "./actions";
import ConfirmModal from "@/components/ConfirmModal";
import { Lock, ShieldCheck, User as UserIcon, Mail, Phone, Info, MapPin, HeartPulse, Share2, Sparkles, Pencil, Trash2 } from "lucide-react";
import AthleteAvatar from "@/components/Identity/AthleteAvatar";
import { getDisplayName } from "@/lib/identity-utils";
import { maskCPF, maskPhone, maskCEP } from "@/lib/utils/masks";

/**
 * ProfileForm Component
 * 
 * Responsável pela gestão da identidade do aluno (perfil e segurança).
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
  
  // BUG FIX: Campos PESSOAL agora são controlados para não perder valor ao trocar de aba
  const [firstName, setFirstName] = useState(
    profile?.first_name || (profile?.full_name ? profile.full_name.split(' ')[0] : "")
  );
  const [lastName, setLastName] = useState(
    profile?.last_name || (profile?.full_name ? profile.full_name.split(' ').slice(1).join(' ') : "")
  );
  const [birthDate, setBirthDate] = useState(profile?.birth_date || "");
  const [gender, setGender] = useState(profile?.gender || "");
  
  // BUG FIX: displayName também controlado
  const [displayName, setDisplayName] = useState(profile?.display_name || profile?.full_name || "");

  // Campos de Emergência e Endereço
  const [emergencyName, setEmergencyName] = useState(profile?.emergency_contact_name || "");
  const [emergencyPhone, setEmergencyPhone] = useState(profile?.emergency_contact_phone || "");
  
  const [cep, setCep] = useState(profile?.address_zip_code || "");
  const [street, setStreet] = useState(profile?.address_street || "");
  const [number, setNumber] = useState(profile?.address_number || "");
  const [complement, setComplement] = useState(profile?.address_complement || "");
  const [neighborhood, setNeighborhood] = useState(profile?.address_neighborhood || "");
  const [city, setCity] = useState(profile?.address_city || "");
  const [stateUF, setStateUF] = useState(profile?.address_state || "");
  const [fetchingCep, setFetchingCep] = useState(false);
  const [cepError, setCepError] = useState("");
  
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  
  type TabType = "PESSOAL" | "ENDEREÇO" | "SOCIAL";
  const [activeTab, setActiveTab] = useState<TabType>("PESSOAL");

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

  // Cálculo de completude do perfil — usa estados locais para reatividade em tempo real
  const calculateCompleteness = () => {
    const fields = [
      firstName,
      lastName,
      birthDate,
      gender,
      cpfValue,
      phoneValue,
      bioText,
      avatarUrl,
      emergencyName,
      emergencyPhone,
      cep,
      street,
      number,
      neighborhood,
      city,
      stateUF
    ];
    const filled = fields.filter(f => f && f.length > 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completeness = calculateCompleteness();

  // Máscaras de Input removidas (usando utilitário central)

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = maskCEP(rawValue);
    setCep(formatted);
    setIsDirty(true);

    const numericCep = formatted.replace(/\D/g, "");
    if (numericCep.length === 8) {
      setFetchingCep(true);
      setCepError(""); // Limpa erro anterior
      try {
        const response = await fetch(`https://viacep.com.br/ws/${numericCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setStateUF(data.uf || "");
        } else {
          // UX FIX: Feedback inline ao invés de silêncio
          setCepError("CEP não encontrado. Verifique e tente novamente.");
          setStreet(""); setNeighborhood(""); setCity(""); setStateUF("");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
        setCepError("Erro ao consultar o CEP. Tente novamente.");
      } finally {
        setFetchingCep(false);
      }
    } else {
      setCepError(""); // Limpa erro ao editar
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
      // OPT FIX: Usa o sistema de mensagens do componente ao invés do alert() nativo
      setMessage({ type: "error", text: "Erro ao enviar imagem: " + (error.message || "Tente novamente.") });
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
        <AthleteAvatar
          url={avatarUrl}
          name={displayName}
          size={120}
          borderWidth={2}
          shadowSize={0} // FIX: Remove sombra pesada para visual minimalista
          rounded={true} // FIX: Avatar circular
        />
        
        <input 
          type="file" 
          accept="image/*" 
          onChange={uploadAvatar} 
          disabled={uploading}
          ref={fileInputRef}
          style={{ display: "none" }}
        />
        
        <div style={{ 
          display: "flex", 
          gap: "20px", 
          marginTop: "16px",
          justifyContent: "center"
        }}>
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: "none",
              border: "none",
              color: "#000",
              fontSize: "12px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px",
              transition: "opacity 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.7")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Pencil size={14} />
            {uploading ? "CARREGANDO..." : "Alterar"}
          </button>

          {avatarUrl && (
            <button 
              type="button" 
              onClick={() => setShowDeleteConfirm(true)}
              disabled={uploading}
              style={{
                background: "none",
                border: "none",
                color: "#E31B23",
                fontSize: "12px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px",
                transition: "opacity 0.2s"
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.7")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Trash2 size={14} />
              Remover
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

      {/* ── TABS NAVEGAÇÃO ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "32px", overflowX: "auto", paddingBottom: "8px" }}>
        {(["PESSOAL", "ENDEREÇO", "SOCIAL"] as TabType[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                minWidth: "120px",
                padding: "16px 8px",
                background: isActive ? "#000" : "#FFF",
                color: isActive ? "#FFF" : "#000",
                border: "2px solid #000",
                boxShadow: isActive ? "4px 4px 0px #E31B23" : "none",
                transform: isActive ? "translate(-2px, -2px)" : "none",
                fontSize: "11px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
              }}
            >
              {tab === "PESSOAL" && <UserIcon size={14} />}
              {tab === "ENDEREÇO" && <MapPin size={14} />}
              {tab === "SOCIAL" && <Share2 size={14} />}
              {tab}
            </button>
          );
        })}
      </div>

      <form action={handleSubmit} onChange={() => setIsDirty(true)} style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
        
        {/* === ABA: PESSOAL === */}
        <div style={{ display: activeTab === "PESSOAL" ? "flex" : "none", flexDirection: "column", gap: "48px" }}>
          
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

          {/* BUG FIX: campos agora controlados — valor preservado ao trocar de aba */}
          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Primeiro Nome</label>
            <input 
              type="text" 
              name="first_name" 
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setIsDirty(true); }}
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
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); setIsDirty(true); }}
              placeholder="Ex: DA SILVA" 
              maxLength={100}
              style={blockInputStyle}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Nascimento</label>
              <input 
                type="date" 
                name="birth_date" 
                value={birthDate}
                onChange={(e) => { setBirthDate(e.target.value); setIsDirty(true); }}
                style={{ ...blockInputStyle, padding: "13px 16px" }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Gênero</label>
              <select 
                name="gender" 
                value={gender}
                onChange={(e) => { setGender(e.target.value); setIsDirty(true); }}
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

        </div> {/* Fim Aba PESSOAL */}

        {/* === ABA: ENDEREÇO === */}
        <div style={{ display: activeTab === "ENDEREÇO" ? "flex" : "none", flexDirection: "column", gap: "48px" }}>

        {/* ── SEÇÃO 3: CONTATO DE EMERGÊNCIA ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px", background: "#FEF2F2", border: "2px solid #000" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <HeartPulse size={18} color="#E31B23" />
            <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>CONTATO DE EMERGÊNCIA</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Nome do Contato</label>
              <input 
                type="text" 
                name="emergency_contact_name" 
                value={emergencyName}
                onChange={(e) => { setEmergencyName(e.target.value); setIsDirty(true); }}
                placeholder="Ex: MARIA CORREIA" 
                maxLength={100}
                style={blockInputStyle}
              />
            </div>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Telefone</label>
              <div style={{ position: "relative" }}>
                <Phone size={14} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#CCC" }} />
                <input 
                  type="tel" 
                  name="emergency_contact_phone" 
                  value={emergencyPhone}
                  onChange={(e) => { setEmergencyPhone(maskPhone(e.target.value)); setIsDirty(true); }}
                  placeholder="(00) 00000-0000" 
                  maxLength={20}
                  style={{ ...blockInputStyle, padding: "14px 16px 14px 44px" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── SEÇÃO 4: ENDEREÇO ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "8px", height: "16px", background: "#000" }} />
            <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>ENDEREÇO</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>CEP</label>
              <div style={{ position: "relative" }}>
                <MapPin size={14} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "#CCC" }} />
                <input 
                  type="text" 
                  name="address_zip_code" 
                  value={cep}
                  onChange={handleCepChange}
                  placeholder="00000-000" 
                  maxLength={9}
                  style={{ 
                    ...blockInputStyle, 
                    padding: "14px 16px 14px 44px",
                    opacity: fetchingCep ? 0.5 : 1
                  }}
                />
                {fetchingCep && <span style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: "#E31B23", fontWeight: 900 }}>Buscando...</span>}
              </div>
              {/* UX FIX: Feedback inline de CEP inválido */}
              {cepError && <p style={{ fontSize: "10px", color: "#E31B23", fontWeight: 700, marginTop: "6px" }}>{cepError}</p>}
            </div>

            <div style={{ position: "relative", flex: 2 }}>
              <label style={labelStyle}>Logradouro</label>
              <input 
                type="text" 
                name="address_street" 
                value={street}
                onChange={(e) => { setStreet(e.target.value); setIsDirty(true); }}
                placeholder="Ex: RUA DAS FLORES" 
                maxLength={150}
                style={blockInputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Número</label>
              <input 
                type="text" 
                name="address_number" 
                value={number}
                onChange={(e) => { setNumber(e.target.value); setIsDirty(true); }}
                placeholder="Ex: 123" 
                maxLength={20}
                style={blockInputStyle}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Complemento</label>
              <input 
                type="text" 
                name="address_complement" 
                value={complement}
                onChange={(e) => { setComplement(e.target.value); setIsDirty(true); }}
                placeholder="Ex: APTO 4B (Opcional)" 
                maxLength={100}
                style={blockInputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Bairro</label>
              <input 
                type="text" 
                name="address_neighborhood" 
                value={neighborhood}
                onChange={(e) => { setNeighborhood(e.target.value); setIsDirty(true); }}
                placeholder="Ex: CENTRO" 
                maxLength={100}
                style={blockInputStyle}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Cidade</label>
              <input 
                type="text" 
                name="address_city" 
                value={city}
                onChange={(e) => { setCity(e.target.value); setIsDirty(true); }}
                placeholder="Ex: SÃO PAULO" 
                maxLength={100}
                style={blockInputStyle}
              />
            </div>

            <div style={{ position: "relative" }}>
              <label style={labelStyle}>UF</label>
              <input 
                type="text" 
                name="address_state" 
                value={stateUF}
                onChange={(e) => { setStateUF(e.target.value.toUpperCase()); setIsDirty(true); }}
                placeholder="Ex: SP" 
                maxLength={2}
                style={blockInputStyle}
              />
            </div>
          </div>
        </div>

        </div> {/* Fim Aba ENDEREÇO */}

        {/* === ABA: SOCIAL === */}
        <div style={{ display: activeTab === "SOCIAL" ? "flex" : "none", flexDirection: "column", gap: "48px" }}>

        {/* ── SEÇÃO 5: PERFIL SOCIAL ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ width: "8px", height: "16px", background: "#000" }} />
            <h3 style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: "#000" }}>PERFIL SOCIAL</h3>
          </div>

          {/* BUG FIX: displayName agora controlado — valor preservado ao trocar de aba */}
          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Apelido (Como os outros te verão)</label>
            <input 
              type="text" 
              name="display_name" 
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setIsDirty(true); }}
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

        </div> {/* Fim Abas no Form */}

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
      <div style={{ display: activeTab === "SOCIAL" ? "block" : "none", marginTop: "64px", borderTop: "2px solid #EEE", paddingTop: "48px" }}>
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
