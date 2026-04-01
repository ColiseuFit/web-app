"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { Search, Plus, UserPlus, Trash2, Shield, Loader2, X, User as UserIcon, Mail, Phone, Check } from "lucide-react";
import { searchUsersForCoach, toggleCoachRole, getCoaches, createNewCoach } from "./actions";
import { USER_ROLES, getRoleInfo } from "@/lib/constants/roles";

type Mode = "search" | "create";

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
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

  async function handleToggleRole(userId: string, currentRole: string | null) {
    if (!confirm(currentRole === USER_ROLES.COACH ? "Deseja remover as permissões de Professor deste usuário?" : "Deseja promover este usuário a Professor?")) return;

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
            SISTEMA
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#000", marginTop: 8 }}>
            SUPABASE AUTH + RLS
          </span>
        </div>
      </div>

      {/* COACHES GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 32 }}>
        {coaches.map((c) => (
          <div key={c.user_id} className="admin-card" style={{ padding: 24, display: "flex", alignItems: "center", gap: 24, position: "relative" }}>
            <div style={{ 
                width: 72, height: 72, background: "#F3F4F6", border: "4px solid #000", 
                display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 28, textTransform: "uppercase", position: "relative",
                flexShrink: 0
            }}>
              {c.profile.avatar_url ? (
                  <img src={c.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                  c.profile.full_name?.[0] || "?"
              )}
              {c.role === USER_ROLES.ADMIN && (
                  <div style={{ position: "absolute", bottom: -10, right: -10, background: "#000", color: "#FFF", padding: 6, border: "3px solid #FFF", display: "flex" }}>
                      <Shield size={14} fill="currentColor" />
                  </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", marginBottom: 4, letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.profile.full_name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, background: getRoleInfo(c.role).color, color: "#FFF", padding: "2px 8px", textTransform: "uppercase" }}>
                        {c.role === USER_ROLES.ADMIN ? "ADMIN / COACH" : getRoleInfo(c.role).label.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "#666", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                      <Phone size={12} /> {c.profile.phone || "N/A"}
                    </span>
                    {c.profile.email && (
                      <span style={{ fontSize: 12, color: "#666", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                        <Mail size={12} /> {c.profile.email.split('@')[0]}...
                      </span>
                    )}
                  </div>
              </div>
            </div>

            {c.role === USER_ROLES.COACH && (
                <button 
                    onClick={() => handleToggleRole(c.user_id, USER_ROLES.COACH)}
                    className="admin-btn admin-btn-ghost"
                    style={{ position: "absolute", top: 12, right: 12, border: "none", color: "#999", padding: 8 }}
                    title="Remover Permissões"
                >
                    <Trash2 size={18} />
                </button>
            )}
          </div>
        ))}

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
                            <div style={{ 
                                width: 48, height: 48, border: "2px solid #000", 
                                background: "#F3F4F6", display: "flex", alignItems: "center", 
                                justifyContent: "center", overflow: "hidden", fontWeight: 900
                            }}>
                              {user.avatar_url ? (
                                <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                user.full_name?.[0] || "?"
                              )}
                            </div>
                            <div>
                              <p style={{ fontWeight: 900, textTransform: "uppercase", fontSize: 14, margin: 0 }}>{user.full_name}</p>
                              <p style={{ fontSize: 11, color: "#666", fontWeight: 700, margin: 0 }}>{user.email}</p>
                            </div>
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
                        <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "#666", margin: "0 0 12px", textAlign: "center" }}>SENHA TEMPORÁRIA DE ACESSO</p>
                        <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: 8, margin: 0, textAlign: "center", fontFamily: "monospace" }}>{createdPassword}</p>
                      </div>

                      <div style={{ padding: 16, background: "rgba(16, 185, 129, 0.1)", borderLeft: "4px solid #10b981" }}>
                        <p style={{ fontSize: 12, color: "#065f46", fontWeight: 700, lineHeight: 1.5, margin: 0 }}>
                          Forneça esta senha ao professor para o primeiro login. O sistema exigirá a troca imediata após o acesso.
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
    </div>

  );
}
