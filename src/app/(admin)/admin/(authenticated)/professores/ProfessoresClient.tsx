"use client";

/**
 * ProfessoresClient: Portal de Gestão de Equipe e IAM (Identity Access Management).
 * 
 * @architecture
 * - Padronização Iron Monolith: UI de alta fidelidade focada em operações administrativas críticas.
 * - Ciclo de Vida IAM: 
 *   1. Promoção: Transforma um aluno existente em Coach via `user_roles`.
 *   2. Onboarding: Criação direta de novos perfis com credenciais automáticas (`coliseu123`).
 *   3. Edição: Painel expansível permite atualizar dados de perfil (nome, telefone, e-mail, bio).
 * - SSoT de Permissões: Todas as mudanças de role impactam imediatamente as políticas de RLS 
 *   do Supabase em todo o ecossistema (App, Admin, Coach Portal).
 * 
 * @lifecycle
 * Utiliza Server Actions para mutação de dados e revalidação de cache (`getCoaches`).
 */

import React, { useState, useTransition, useRef, useEffect } from "react";
import { Search, Plus, UserPlus, Trash2, Shield, Loader2, X, Mail, Phone, Check, Edit3, Save, ChevronDown, ChevronUp, User as UserIcon } from "lucide-react";
import { searchUsersForCoach, toggleCoachRole, getCoaches, createNewCoach, updateCoachProfile } from "./actions";
import { USER_ROLES, getRoleInfo } from "@/lib/constants/roles";
import AthleteAvatar from "@/components/Identity/AthleteAvatar";
import AthleteIdentity from "@/components/Identity/AthleteIdentity";
import ConfirmModal from "@/components/ConfirmModal";

type Mode = "search" | "create";

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
  bio?: string;
  birth_date?: string;
  gender?: string;
  user_roles?: { role: string }[];
}

interface CoachEntry {
  user_id: string;
  role: string;
  profile: Profile;
}

interface Toast {
  msg: string;
  type: "success" | "error";
}

export default function ProfessoresClient({ initialCoaches }: { initialCoaches: CoachEntry[] }) {
  const [coaches, setCoaches] = useState<CoachEntry[]>(initialCoaches);
  const [isPending, startTransition] = useTransition();

  // Expanded card for editing
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ full_name: string; phone: string; email: string; bio: string }>({
    full_name: "", phone: "", email: "", bio: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  // Search/Add State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mode, setMode] = useState<Mode>("search");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Form states for NEW coach
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  // Confirmation state
  const [pendingRoleToggle, setPendingRoleToggle] = useState<{
    userId: string;
    currentRole: string | null;
  } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Real-time search for candidates
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!isDrawerOpen || searchTerm.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchUsersForCoach(searchTerm);
      if (res.data) setSearchResults(res.data);
      setIsSearching(false);
    }, 400);

    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchTerm, isDrawerOpen]);

  /**
   * handleExpandCard: Abre o painel de edição de um coach específico.
   * Preenche os campos de edição com os dados atuais do perfil.
   */
  function handleExpandCard(coach: CoachEntry) {
    if (expandedId === coach.user_id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(coach.user_id);
    setEditData({
      full_name: coach.profile.full_name || "",
      phone: coach.profile.phone || "",
      email: coach.profile.email || "",
      bio: coach.profile.bio || "",
    });
  }

  /**
   * handleSaveProfile: Persiste as alterações do perfil via Server Action.
   * Usa estado otimista para feedback instantâneo.
   */
  async function handleSaveProfile(userId: string) {
    setIsSaving(true);
    const res = await updateCoachProfile(userId, editData);
    if (res.error) {
      showToast(res.error, "error");
    } else {
      showToast("Perfil atualizado com sucesso!", "success");
      // Refresh data
      const fresh = await getCoaches();
      if (fresh.data) setCoaches(fresh.data);
    }
    setIsSaving(false);
  }

  /**
   * handleToggleRole: Orquestrador de Promoção/Democração Técnica.
   */
  async function handleToggleRole(userId: string, currentRole: string | null) {
    setPendingRoleToggle({ userId, currentRole });
  }

  async function executeToggleRole(userId: string, currentRole: string | null) {
    setPendingRoleToggle(null);
    startTransition(async () => {
      const res = await toggleCoachRole(userId, currentRole !== "coach");
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast(currentRole === "coach" ? "Permissões removidas." : "Professor adicionado!", "success");
        const fresh = await getCoaches();
        if (fresh.data) setCoaches(fresh.data);
        if (currentRole !== USER_ROLES.COACH) setIsDrawerOpen(false);
      }
    });
  }

  /**
   * handleCreateCoach: Transação Atômica de Onboarding Staff.
   */
  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return showToast("Preencha os campos obrigatórios", "error");

    const res = await createNewCoach(newName, newEmail, newPhone);
    if (res.success) {
      showToast("Professor cadastrado com sucesso!", "success");
      setCreatedPassword(res.tempPassword || null);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      const updated = await getCoaches();
      if (updated.data) setCoaches(updated.data);
    } else {
      showToast(res.error || "Erro ao cadastrar", "error");
    }
  };

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

  return (
    <div className="animate-in fade-in duration-500">
      {/* TOOLBAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 4px", textTransform: "uppercase" }}>
            Gestão de Professores
          </h1>
          <p style={{ fontSize: 14, color: "#666", fontWeight: 600, margin: 0 }}>
            Administre a equipe técnica e permissões de acesso.
          </p>
        </div>
        
        <button 
            className="admin-btn admin-btn-primary"
            onClick={() => setIsDrawerOpen(true)}
            style={{ height: 52 }}
        >
            <Plus size={20} /> NOVO PROFESSOR
        </button>
      </div>

      {/* DASHBOARD STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 40 }}>
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: "6px solid #000" }}>
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
            TOTAL PROFESSORES
          </span>
          <span style={{ fontSize: 48, fontWeight: 900, color: "#000", lineHeight: 1 }}>{coaches.length}</span>
        </div>
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: "6px solid #2563EB" }}>
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
            ADMINS
          </span>
          <span style={{ fontSize: 48, fontWeight: 900, color: "#000", lineHeight: 1 }}>
            {coaches.filter(c => c.role === USER_ROLES.ADMIN).length}
          </span>
        </div>
        <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 8, borderLeft: "6px solid #16A34A" }}>
          <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
            COACHES
          </span>
          <span style={{ fontSize: 48, fontWeight: 900, color: "#000", lineHeight: 1 }}>
            {coaches.filter(c => c.role === USER_ROLES.COACH).length}
          </span>
        </div>
      </div>

      {/* COACHES GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: 24 }}>
        {coaches.map((c) => {
          const isExpanded = expandedId === c.user_id;
          return (
            <div 
              key={c.user_id} 
              className="admin-card" 
              style={{ 
                padding: 0, 
                overflow: "hidden",
                transition: "box-shadow 0.2s",
                boxShadow: isExpanded ? "8px 8px 0px rgba(0,0,0,0.15)" : undefined,
              }}
            >
              {/* ── CARD HEADER (sempre visível) ── */}
              <div style={{ padding: 24, display: "flex", alignItems: "center", gap: 20, position: "relative" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <AthleteAvatar 
                    url={c.profile.avatar_url} 
                    name={c.profile.full_name} 
                    size={72} 
                    shadowSize={4}
                  />
                  {c.role === USER_ROLES.ADMIN && (
                    <div style={{ position: "absolute", bottom: -2, right: -2, background: "#000", color: "#FFF", padding: 4, border: "2px solid #FFF", display: "flex", zIndex: 10 }}>
                      <Shield size={12} fill="currentColor" />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", marginBottom: 4, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.profile.full_name}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, background: getRoleInfo(c.role).color, color: "#FFF", padding: "2px 8px", textTransform: "uppercase" }}>
                        {c.role === USER_ROLES.ADMIN ? "ADMIN / COACH" : getRoleInfo(c.role).label.toUpperCase()}
                      </span>
                    </div>
                    {/* ── Dados de contato compactos ── */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#666", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                        <Mail size={12} /> {c.profile.email || "Sem e-mail"}
                      </span>
                      <span style={{ fontSize: 12, color: "#666", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                        <Phone size={12} /> {c.profile.phone || "Sem telefone"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Action Buttons ── */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button 
                    onClick={() => handleExpandCard(c)}
                    className="admin-btn admin-btn-ghost"
                    style={{ border: "2px solid #E5E7EB", color: isExpanded ? "#000" : "#999", padding: 8, background: isExpanded ? "#F3F4F6" : "transparent" }}
                    title="Editar Perfil"
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <Edit3 size={18} />}
                  </button>
                  {c.role === USER_ROLES.COACH && (
                    <button 
                      onClick={() => handleToggleRole(c.user_id, USER_ROLES.COACH)}
                      className="admin-btn admin-btn-ghost"
                      style={{ border: "2px solid #FECACA", color: "#EF4444", padding: 8 }}
                      title="Remover Permissões"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── PAINEL DE EDIÇÃO (expansível) ── */}
              {isExpanded && (
                <div style={{ 
                  borderTop: "4px solid #000", 
                  background: "#FAFAFA", 
                  padding: 28,
                  animation: "expandIn 0.2s ease-out",
                }}>
                  <style>{`
                    @keyframes expandIn {
                      from { opacity: 0; max-height: 0; }
                      to { opacity: 1; max-height: 600px; }
                    }
                  `}</style>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                    <div style={{ width: 8, height: 8, background: "#000" }} />
                    <span style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Editar Perfil
                    </span>
                  </div>

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

                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setExpandedId(null)}
                      className="admin-btn admin-btn-ghost"
                      style={{ height: 48, paddingInline: 24, border: "2px solid #E5E7EB" }}
                    >
                      CANCELAR
                    </button>
                    <button
                      onClick={() => handleSaveProfile(c.user_id)}
                      disabled={isSaving}
                      className="admin-btn admin-btn-primary"
                      style={{ height: 48, paddingInline: 32, gap: 8 }}
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                      SALVAR ALTERAÇÕES
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {coaches.length === 0 && (
          <div style={{ gridColumn: "1 / -1", padding: 80, textAlign: "center", background: "#F9FAFB", border: "4px dashed #CCC", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#999", textTransform: "uppercase", letterSpacing: "0.1em" }}>Nenhum professor cadastrado</div>
            <button 
              onClick={() => setIsDrawerOpen(true)} 
              className="admin-btn admin-btn-primary"
              style={{ height: 48, paddingInline: 32 }}
            >
              ADICIONAR O PRIMEIRO
            </button>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR (IRON MONOLITH STYLE) */}
      {isDrawerOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 20
        }}>
          {/* Backdrop Closer */}
          <div 
            style={{ position: "absolute", inset: 0 }} 
            onClick={() => setIsDrawerOpen(false)} 
          />

          <div style={{
            position: "relative",
            background: "#FFF", 
            width: "100%", 
            maxWidth: "680px", 
            maxHeight: "90vh",
            display: "flex", 
            flexDirection: "column",
            border: "4px solid #000",
            boxShadow: "32px 32px 0px rgba(0,0,0,0.1)",
            animation: "modalAppear 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <style>{`
              @keyframes modalAppear {
                from { opacity: 0; transform: scale(0.95); }
                to { opacity: 1; transform: scale(1); }
              }
            `}</style>

            {/* HEADER */}
            <div style={{ 
              padding: "24px 32px", 
              borderBottom: "4px solid #000", 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              background: "#000", 
              color: "#FFF" 
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 12, height: 12, background: "#FFF" }} />
                <h2 style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", margin: 0, letterSpacing: "0.05em" }}>Adicionar Professor</h2>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)} 
                style={{ background: "none", border: "none", color: "#FFF", cursor: "pointer", padding: 4 }}
              >
                <X size={24} />
              </button>
            </div>

            {/* TABS */}
            <div style={{ display: "flex", borderBottom: "4px solid #000", background: "#F3F4F6" }}>
              <button
                onClick={() => { setMode("search"); setCreatedPassword(null); }}
                style={{
                  flex: 1, padding: "20px 0", fontSize: 13, fontWeight: 900, textTransform: "uppercase",
                  background: mode === "search" ? "#FFF" : "transparent",
                  color: "#000", border: "none", cursor: "pointer", 
                  borderRight: "4px solid #000",
                  transition: "all 0.1s"
                }}
              >
                <Search size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "text-bottom" }} />
                Buscar Aluno
              </button>
              <button
                onClick={() => { setMode("create"); setCreatedPassword(null); }}
                style={{
                  flex: 1, padding: "20px 0", fontSize: 13, fontWeight: 900, textTransform: "uppercase",
                  background: mode === "create" ? "#FFF" : "transparent",
                  color: "#000", border: "none", cursor: "pointer",
                  transition: "all 0.1s"
                }}
              >
                <UserPlus size={16} style={{ display: "inline", marginRight: 8, verticalAlign: "text-bottom" }} />
                Novo Cadastro
              </button>
            </div>

            {/* CONTENT */}
            <div style={{ padding: 40, overflowY: "auto" }}>
              {mode === "search" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div style={{ position: "relative" }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>Pesquisar por nome ou e-mail</label>
                    <input
                      type="text"
                      placeholder="EX: MÁRCIO COLISEU..."
                      style={{
                        width: "100%", padding: "16px 16px 16px 48px", background: "#FFF",
                        border: "3px solid #000", fontSize: 14, fontWeight: 800, outline: "none"
                      }}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search style={{ position: "absolute", left: 16, bottom: 18, color: "#999" }} size={20} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 300, overflowY: "auto", paddingRight: 8 }}>
                    {isSearching ? (
                      <div style={{ display: "flex", justifyContent: "center", padding: 20 }}>
                        <Loader2 className="animate-spin" size={24} color="#000" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((user) => (
                        <div
                          key={user.id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: 16, border: "3px solid #000", background: "#FFF",
                            transition: "transform 0.1s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <AthleteIdentity 
                            profile={user} 
                            avatarSize={48}
                          />
                          </div>

                          {coaches.some(c => c.user_id === user.id) ? (
                            <span style={{ fontSize: 10, background: "#F3F4F6", color: "#999", padding: "4px 12px", fontWeight: 900, textTransform: "uppercase", border: "2px solid #EEE" }}>
                              JÁ É COACH
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleRole(user.id, null)}
                              className="admin-btn admin-btn-primary"
                              style={{ height: 40, padding: "0 16px", fontSize: 11 }}
                            >
                              PROMOVER
                            </button>
                          )}
                        </div>
                      ))
                    ) : searchTerm.length >= 3 ? (
                      <div style={{ padding: 40, textAlign: "center", border: "3px dashed #EEE" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#999", margin: 0 }}>NENHUM CANDIDATO ENCONTRADO</p>
                      </div>
                    ) : (
                      <div style={{ padding: 40, textAlign: "center", opacity: 0.5 }}>
                        <p style={{ fontSize: 12, fontWeight: 800, color: "#000", letterSpacing: "0.05em" }}>AGUARDANDO TERMO DE PESQUISA...</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateCoach} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {createdPassword ? (
                    <div className="animate-in zoom-in duration-300" style={{ padding: 32, border: "4px solid #10b981", background: "#ecfdf5", display: "flex", flexDirection: "column", gap: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Check style={{ color: "#10b981" }} size={24} strokeWidth={3} />
                        <p style={{ fontSize: 14, fontWeight: 900, color: "#065f46", textTransform: "uppercase", margin: 0, letterSpacing: "0.05em" }}>CADASTRO REALIZADO!</p>
                      </div>
                      
                      <div style={{ background: "#000", color: "#FFF", padding: 24, border: "4px solid #000", boxShadow: "12px 12px 0px rgba(16, 185, 129, 0.2)" }}>
                        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#666", margin: "0 0 12px", textAlign: "center" }}>SENHA PADRÃO DE ACESSO</p>
                        <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: 8, margin: 0, textAlign: "center", fontFamily: "monospace" }}>{createdPassword}</p>
                      </div>

                      <div style={{ padding: 16, background: "rgba(16, 185, 129, 0.1)", borderLeft: "4px solid #10b981" }}>
                        <p style={{ fontSize: 12, color: "#065f46", fontWeight: 700, lineHeight: 1.5, margin: 0 }}>
                          Forneça esta senha padrão ao professor para o primeiro login no Portal. Ele poderá alterar esta senha posteriormente no aplicativo.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => { setCreatedPassword(null); setMode("search"); }}
                        className="admin-btn admin-btn-primary"
                        style={{ width: "100%", height: 56, fontSize: 14, background: "#065f46" }}
                      >
                        CONCLUÍDO
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Nome Completo</label>
                        <input
                          type="text"
                          required
                          placeholder="EX: RODRIGO SILVA"
                          style={{ width: "100%", padding: 16, border: "3px solid #000", fontWeight: 800, outline: "none" }}
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>E-mail de Trabalho</label>
                        <input
                          type="email"
                          required
                          placeholder="professor@coliseufit.com"
                          style={{ width: "100%", padding: 16, border: "3px solid #000", fontWeight: 800, outline: "none" }}
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>WhatsApp (Opcional)</label>
                        <input
                          type="tel"
                          placeholder="(00) 00000-0000"
                          style={{ width: "100%", padding: 16, border: "3px solid #000", fontWeight: 800, outline: "none" }}
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                        />
                      </div>

                      <div style={{ marginTop: 12, padding: 20, background: "#F3F4F6", border: "2px solid #000", borderStyle: "dashed" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#666", margin: 0, lineHeight: 1.4 }}>
                          Ao criar o perfil, o sistema gerará automaticamente as credenciais de acesso para o App do Aluno com permissões de Coach.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isPending}
                        className="admin-btn admin-btn-primary"
                        style={{ width: "100%", height: 64, fontSize: 16, marginTop: 10 }}
                      >
                        {isPending ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                        CRIAR CONTA DE PROFESSOR
                      </button>
                    </>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION (STANDARDIZED) */}
      {toast && (
        <div style={{ 
            position: "fixed", top: 40, right: 40, zIndex: 10000, 
            padding: "20px 32px", 
            background: toast.type === "success" ? "#000" : "#DC2626", 
            color: "#FFF", 
            fontWeight: 900, 
            border: "4px solid #000", 
            boxShadow: "16px 16px 0px rgba(0,0,0,0.1)",
            textTransform: "uppercase", 
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
            letterSpacing: "0.05em",
            animation: "toastIn 0.3s ease-out"
        }}>
          <style>{`
            @keyframes toastIn {
              from { transform: translateX(100%); opacity: 0; }
              to { transform: translateX(0); opacity: 1; }
            }
          `}</style>
          {toast.type === "success" ? <Check size={20} /> : <X size={20} />}
          {toast.msg}
        </div>
      )}

      {/* ── ROLE TOGGLE CONFIRMATION ── */}
      {pendingRoleToggle && (
        <ConfirmModal
          title={pendingRoleToggle.currentRole === USER_ROLES.COACH ? "REMOVER PERMISSÕES" : "PROMOVER PROFESSOR"}
          message={pendingRoleToggle.currentRole === USER_ROLES.COACH 
            ? "TEM CERTEZA QUE DESEJA REMOVER O ACESSO TÉCNICO DESTE USUÁRIO?" 
            : "DESEJA CONCEDER ACESSO DE PROFESSOR A ESTE USUÁRIO?"
          }
          onConfirm={() => executeToggleRole(pendingRoleToggle.userId, pendingRoleToggle.currentRole)}
          onCancel={() => setPendingRoleToggle(null)}
          isDanger={pendingRoleToggle.currentRole === USER_ROLES.COACH}
        />
      )}
    </div>

  );
}
