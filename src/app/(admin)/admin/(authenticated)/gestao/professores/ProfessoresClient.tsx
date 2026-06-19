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

import React, { useState, useTransition } from "react";
import { Plus, Trash2, Shield, X, Mail, Phone, Check, Edit3, ChevronUp, UserMinus } from "lucide-react";
import { toggleCoachRole, getCoaches, deleteCoachUser } from "./actions";
import { USER_ROLES, getRoleInfo } from "@/lib/constants/roles";
import AthleteAvatar from "@/components/Identity/AthleteAvatar";
import ConfirmModal from "@/components/ConfirmModal";
import CoachEditPanel from "./CoachEditPanel";
import AddCoachDrawer from "./AddCoachDrawer";

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

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  // Confirmation state for role toggle (demote)
  const [pendingRoleToggle, setPendingRoleToggle] = useState<{
    userId: string;
    currentRole: string | null;
  } | null>(null);

  // Confirmation state for permanent delete
  const [pendingDelete, setPendingDelete] = useState<{
    userId: string;
    coachName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  /**
   * handleExpandCard: Toggle do painel de edição de um coach.
   */
  function handleExpandCard(coach: CoachEntry) {
    setExpandedId(expandedId === coach.user_id ? null : coach.user_id);
  }

  /**
   * executeDeleteCoach: Exclui permanentemente um Coach do sistema.
   * Remove Auth, Profile e Role, liberando o e-mail para reutilização.
   */
  async function executeDeleteCoach(userId: string) {
    setPendingDelete(null);
    setIsDeleting(true);
    try {
      const res = await deleteCoachUser(userId);
      if (res.error) {
        showToast(res.error, "error");
      } else {
        showToast("Professor excluído permanentemente.", "success");
        const fresh = await getCoaches();
        if (fresh.data) setCoaches(fresh.data);
      }
    } catch {
      showToast("Erro inesperado ao excluir professor.", "error");
    }
    setIsDeleting(false);
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
                      style={{ border: "2px solid #FDE68A", color: "#D97706", padding: 8 }}
                      title="Rebaixar para Aluno"
                    >
                      <UserMinus size={18} />
                    </button>
                  )}
                  {c.role === USER_ROLES.COACH && (
                    <button 
                      onClick={() => setPendingDelete({ userId: c.user_id, coachName: c.profile.full_name })}
                      disabled={isDeleting}
                      className="admin-btn admin-btn-ghost"
                      style={{ border: "2px solid #FECACA", color: "#EF4444", padding: 8 }}
                      title="Excluir Permanentemente"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* ── PAINEL DE EDIÇÃO (subcomponente extraído) ── */}
              {isExpanded && (
                <CoachEditPanel
                  userId={c.user_id}
                  initialData={{
                    full_name: c.profile.full_name || "",
                    phone: c.profile.phone || "",
                    email: c.profile.email || "",
                    bio: c.profile.bio || "",
                  }}
                  onClose={() => setExpandedId(null)}
                  onToast={showToast}
                  onRefresh={(data) => setCoaches(data)}
                />
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

      {/* MODAL ADICIONAR (subcomponente extraído) */}
      {isDrawerOpen && (
        <AddCoachDrawer
          coaches={coaches}
          onClose={() => setIsDrawerOpen(false)}
          onToast={showToast}
          onRefresh={(data) => setCoaches(data)}
          onPromote={(userId) => handleToggleRole(userId, null)}
        />
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

      {/* ── ROLE TOGGLE CONFIRMATION (DEMOTE) ── */}
      {pendingRoleToggle && (
        <ConfirmModal
          title={pendingRoleToggle.currentRole === USER_ROLES.COACH ? "REBAIXAR PARA ALUNO" : "PROMOVER PROFESSOR"}
          message={pendingRoleToggle.currentRole === USER_ROLES.COACH 
            ? "O PROFESSOR PERDERÁ O ACESSO AO COACH PORTAL E SERÁ REVERTIDO PARA ALUNO. O PERFIL E CREDENCIAIS SERÃO MANTIDOS." 
            : "DESEJA CONCEDER ACESSO DE PROFESSOR A ESTE USUÁRIO?"
          }
          onConfirm={() => executeToggleRole(pendingRoleToggle.userId, pendingRoleToggle.currentRole)}
          onCancel={() => setPendingRoleToggle(null)}
          isDanger={pendingRoleToggle.currentRole === USER_ROLES.COACH}
        />
      )}

      {/* ── PERMANENT DELETE CONFIRMATION ── */}
      {pendingDelete && (
        <ConfirmModal
          title="EXCLUSÃO PERMANENTE"
          message={`TEM CERTEZA QUE DESEJA EXCLUIR PERMANENTEMENTE O PROFESSOR "${pendingDelete.coachName}"? ESTA AÇÃO É IRREVERSÍVEL E REMOVERÁ A CONTA, O PERFIL E TODOS OS DADOS VINCULADOS DO SISTEMA. O E-MAIL FICARÁ LIVRE PARA REUSO.`}
          onConfirm={() => executeDeleteCoach(pendingDelete.userId)}
          onCancel={() => setPendingDelete(null)}
          isDanger={true}
        />
      )}
    </div>

  );
}
