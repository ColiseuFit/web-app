"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, Phone, X, UserPlus, ChevronDown, Pencil, Trash2, User, Mail, Calendar, CreditCard, Info, Activity, ShieldCheck, Lock as LockIcon, Mail as MailIcon, ChevronLeft, ChevronRight, Copy, Check, Tag } from "lucide-react";
import { createStudent, updateStudent, deleteStudent, getStudentEvaluations, deletePhysicalEvaluation, updateStudentAuth, updatePreRegistration } from "../../actions";
import PhysicalEvaluationForm from "./PhysicalEvaluationForm";
import { getLevelInfo, LevelInfo } from "@/lib/constants/levels";
import { MEMBERSHIP_TYPES, getMembershipLabel } from "@/lib/constants/membership";

/**
 * AlunosClient: Central de Inteligência e Gestão de Alunos (CRM).
 * 
 * @architecture
 * - Padronização Iron Monolith: UI de alta fidelidade com tokens CSS nativos e Lucide-React.
 * - SSoT de Navegação: O estado de filtros e paginação é sincronizado via URL (query params), 
 *   permitindo compartilhamento de links e persistência ao recarregar.
 * - Camada de Persistência: Todas as operações de escrita (CRUD, IAM/Segurança, Biometria) 
 *   são centralizadas em Server Actions no arquivo raiz `../actions.ts`.
 * 
 * @lifecycle
 * 1. Hidratação: Recebe lista paginada e metadados do servidor (`TurmasPage` context).
 * 2. Interação: Drawer multifuncional (Perfil -> Ficha -> Segurança).
 * 3. Feedback: Optimistic UI e mensagens de erro validadas via Zod no servidor.
 */

interface Student {
  id: string;
  full_name: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  level: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  points: number;
  bio: string | null;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
  membership_type: string;
}

// We will define this inside the component to use dynamic levels

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "America/Sao_Paulo"
  });
}

export default function AlunosClient({ 
  students, 
  preRegistrations = [],
  dynamicLevels,
  currentPage,
  totalPages,
  totalCount,
  currentSearch,
  currentLevel
}: { 
  students: Student[], 
  preRegistrations?: any[],
  dynamicLevels?: Record<string, LevelInfo>,
  currentPage: number,
  totalPages: number,
  totalCount: number,
  currentSearch: string,
  currentLevel: string
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Use dynamic levels prioritized, fallback to static defaults if needed
  const levelsList = dynamicLevels 
    ? Object.values(dynamicLevels).sort((a, b) => (a.order || 0) - (b.order || 0)) 
    : [];

  const LEVEL_FILTERS = ["Todos", ...levelsList.map(l => l.key)];

  // Local state for immediate feedback, synced with URL
  const [search, setSearch] = useState(currentSearch);
  const [levelFilter, setLevelFilter] = useState(currentLevel);
  const [viewMode, setViewMode] = useState<"alunos" | "leads">("alunos");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLeadId, setLoadingLeadId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  
  // Evaluation States
  const [drawerView, setDrawerView] = useState<"profile" | "evaluations" | "eval-form" | "security">("profile");
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(false);
  const [selectedEval, setSelectedEval] = useState<any | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [approvedLeadInfo, setApprovedLeadInfo] = useState<{ email: string; phone: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [leadLevels, setLeadLevels] = useState<Record<string, string>>({});
  const [leadMembershipTypes, setLeadMembershipTypes] = useState<Record<string, string>>({});

  // Auto-hide success messages (Except when showing a generated password)
  useEffect(() => {
    if (message?.type === "success" && !message.text.includes("Senha inicial gerada")) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const formRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  // URL Update Logic (Debounced Search)
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("search", search);
      else params.delete("search");
      
      params.set("page", "1"); // Reset to page 1 on search
      router.push(`${pathname}?${params.toString()}`);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, pathname, router, searchParams]);

  // Level Update Logic
  const handleLevelChange = (val: string) => {
    setLevelFilter(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val !== "Todos") params.set("level", val);
    else params.delete("level");
    
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  /**
   * handlePageChange: Orquestrador de Paginação.
   * 
   * @operation
   * Atualiza os query params 'page' na URL. Isso dispara a re-execução do 
   * Server Component correspondente (page.tsx), mantendo a integridade do 
   * data-fetching no lado do servidor (limit/offset do Supabase).
   */
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await createStudent(formData);

    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      setMessage({ type: "success", text: "Aluno matriculado com sucesso!" });
      formRef.current?.reset();
      setTimeout(() => setShowForm(false), 1500);
    }
    setLoading(false);
  }

  async function handleUpdate(formData: FormData) {
    if (!selectedStudent) return;
    setLoading(true);
    const result = await updateStudent(selectedStudent.id, formData);
    if (result?.success) {
      setIsEditing(false);
      // Let the modal stay open so the user sees it's saved.
      // The revalidatePath will update the list in the background.
    } else {
      setMessage({ type: "error", text: result.error || "Erro desconhecido ao salvar." });
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("TEM CERTEZA? Esta ação removerá o aluno e seu acesso permanentemente.")) return;
    setLoading(true);
    const result = await deleteStudent(id);
    if (result?.success) {
      setSelectedStudent(null);
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao excluir aluno." });
    }
    setLoading(false);
  }

  // --- Lead Management Handlers ---

  async function handleApproveLead(id: string) {
    const { approvePreRegistration } = await import("../../actions");
    setLoadingLeadId(id);
    const currentLevel = leadLevels[id] || "branco";
    const currentType = leadMembershipTypes[id] || "club";
    const result = await approvePreRegistration(id, currentLevel, currentType);
    if (result.success) {
      const lead = preRegistrations?.find(p => p.id === id);
      setApprovedLeadInfo({
        name: lead?.full_name || "Aluno",
        email: lead?.email || "",
        phone: lead?.phone || ""
      });
      setMessage({ type: "success", text: "Pré-cadastro aprovado! Convite enviado por e-mail." });
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao aprovar pré-cadastro." });
    }
    setLoadingLeadId(null);
  }

  async function handleRejectLead(id: string) {
    if (!confirm("Tem certeza que deseja REJEITAR este pré-cadastro?")) return;
    const { rejectPreRegistration } = await import("../../actions");
    setLoadingLeadId(id);
    const result = await rejectPreRegistration(id);
    if (result.success) {
      // Background revalidation will refresh the list
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao rejeitar pré-cadastro." });
    }
    setLoadingLeadId(null);
  }

  async function handleUpdateLead(formData: FormData) {
    if (!selectedLead) return;
    setLoading(true);
    const result = await updatePreRegistration(selectedLead.id, formData);
    if (result.success) {
      setIsEditingLead(false);
      setSelectedLead(null);
      setMessage({ type: "success", text: "Pré-cadastro atualizado com sucesso!" });
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao atualizar pré-cadastro." });
    }
    setLoading(false);
  }

  // --- Physical Evaluation Handlers ---

  async function fetchEvaluations(studentId: string) {
    setLoadingEvals(true);
    const result = await getStudentEvaluations(studentId);
    if (result.evaluations) {
      setEvaluations(result.evaluations);
    }
    setLoadingEvals(false);
  }

  async function handleDeleteEval(id: string) {
    if (!confirm("Excluir esta avaliação permanentemente?")) return;
    const res = await deletePhysicalEvaluation(id);
    if (res.success) {
      if (selectedStudent) fetchEvaluations(selectedStudent.id);
    }
  }

  async function handleUpdateAuth(formData: FormData) {
    if (!selectedStudent) return;
    setLoading(true);
    const result = await updateStudentAuth(selectedStudent.id, formData);
    if (result?.success) {
      setMessage({ type: "success", text: "Credenciais atualizadas com sucesso!" });
      setDrawerView("profile");
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao atualizar credenciais." });
    }
    setLoading(false);
  }

  async function executeResendInvite() {
    if (!selectedStudent) return;
    setShowResendConfirm(false);
    setLoading(true);
    const { resendInviteEmail } = await import("../../actions");
    const result = await resendInviteEmail(selectedStudent.id);
    if (result.success) {
      setMessage({ type: "success", text: "Convite de acesso reenviado com sucesso!" });
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao reenviar convite." });
    }
    setLoading(false);
  }

  function handleResendInvite(id: string) {
    setShowResendConfirm(true);
  }

  const handleOpenDrawer = (student: Student) => {
    setSelectedStudent(student);
    setIsEditing(false);
    setDrawerView("profile");
    setEvaluations([]); 
  };

  const switchToEvaluations = () => {
    setDrawerView("evaluations");
    if (selectedStudent) fetchEvaluations(selectedStudent.id);
  };

  return (
    <div className="admin-container-fluid">
      {/* ── PAGE HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
            Alunos
          </h1>
          <p style={{ fontSize: 13, color: "var(--admin-text-secondary)", marginTop: 2 }}>
            Central de alunos e admissões
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="admin-btn admin-btn-primary"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancelar" : "Novo Aluno"}
        </button>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: "24px", paddingBottom: "12px", marginBottom: "24px", borderBottom: "3px solid #000" }}>
        <button
          onClick={() => setViewMode("alunos")}
          style={{
            background: "none", border: "none",
            fontSize: "13px", fontWeight: 900,
            color: viewMode === "alunos" ? "#000" : "#666",
            borderBottom: viewMode === "alunos" ? "4px solid #DF2127" : "none",
            paddingBottom: "8px", marginBottom: "-15px",
            cursor: "pointer",
            textTransform: "uppercase", letterSpacing: "0.05em"
          }}
        >
          Membros Ativos ({totalCount})
        </button>
        <button
          onClick={() => setViewMode("leads")}
          style={{
            background: "none", border: "none",
            fontSize: "13px", fontWeight: 900,
            color: viewMode === "leads" ? "#000" : "#666",
            borderBottom: viewMode === "leads" ? "4px solid #DF2127" : "none",
            paddingBottom: "8px", marginBottom: "-15px",
            cursor: "pointer",
            textTransform: "uppercase", letterSpacing: "0.05em",
            display: "flex", gap: "6px", alignItems: "center"
          }}
        >
          Pré-cadastros
          {preRegistrations.length > 0 && (
            <span style={{ background: "#DF2127", color: "#FFF", padding: "2px 6px", borderRadius: "12px", fontSize: "11px", fontWeight: 800 }}>
              {preRegistrations.length}
            </span>
          )}
        </button>
      </div>

      {/* ── NEW STUDENT FORM ── */}
      {showForm && viewMode === "alunos" && (
        <div className="admin-card" style={{ marginBottom: 24, animation: "fadeIn 0.2s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <UserPlus size={18} />
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Matricular Novo Aluno</h2>
          </div>
          <form ref={formRef} action={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--admin-text-secondary)", marginBottom: 6 }}>Nome Completo *</label>
                <input type="text" name="full_name" required placeholder="Ex: João da Silva" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--admin-text-secondary)", marginBottom: 6 }}>Nível</label>
                <select name="level" defaultValue={levelsList[0]?.key || "iniciante"}>
                  {levelsList.map(l => (
                    <option key={l.key} value={l.key}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--admin-text-secondary)", marginBottom: 6 }}>Plano / Categoria</label>
                <select name="membership_type" defaultValue="club">
                  {MEMBERSHIP_TYPES.map((type) => (
                    <option key={type.key} value={type.key}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--admin-text-secondary)", marginBottom: 6 }}>E-mail de Login *</label>
                <input type="email" name="email" required placeholder="aluno@email.com" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--admin-text-secondary)", marginBottom: 6 }}>Senha Inicial</label>
                <input type="text" name="password" required defaultValue="coliseu123" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--admin-text-muted)" }}>O aluno poderá trocar a senha no primeiro login.</span>
              <button type="submit" disabled={loading} className="admin-btn admin-btn-primary">
                {loading ? "Matriculando..." : "Matricular Aluno"}
              </button>
            </div>
          </form>
          {message && (
            <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: message.type === "error" ? "#FEF2F2" : "#F0FDF4", color: message.type === "error" ? "#DC2626" : "#15803D", border: `1px solid ${message.type === "error" ? "#FECACA" : "#BBF7D0"}` }}>
              {message.text}
            </div>
          )}
        </div>
      )}

      {/* ── ALUNOS VIEW ── */}
      {viewMode === "alunos" && (
        <>
          {/* ── SEARCH & FILTERS ── */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "32px", alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#000" }} />
          <input type="search" placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: "44px", border: "2px solid #000", fontWeight: 500 }} />
        </div>
        <div style={{ position: "relative", minWidth: "200px" }}>
          <select value={levelFilter} onChange={(e) => handleLevelChange(e.target.value)} style={{ appearance: "none", paddingRight: "40px", border: "2px solid #000", fontWeight: 700, textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>
            {LEVEL_FILTERS.map((l) => (
              <option key={l} value={l}>{l === "Todos" ? "Filtrar por Nível" : `Nível: ${getLevelInfo(l, dynamicLevels).label}`}</option>
            ))}
          </select>
          <ChevronDown size={16} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#000" }} />
        </div>
      </div>

      {/* ── STUDENTS TABLE ── */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        {students.length === 0 ? (
          <div style={{ padding: "64px 20px", textAlign: "center", color: "#666", fontSize: "14px" }}>Nenhum resultado encontrado.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: "24px" }}>Nome do Atleta</th>
                  <th style={{ width: "120px" }}>Nível</th>
                  <th style={{ width: "110px" }}>Pontuação</th>
                  <th style={{ width: "75px" }}>Data</th>
                  <th style={{ width: "160px" }}>Contato</th>
                  <th style={{ width: "100px", textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student: Student) => (
                  <tr key={student.id}>
                    <td style={{ paddingLeft: "24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "36px", height: "36px", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "#FFF", flexShrink: 0 }}>
                          {student.full_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "14px", color: "#000" }}>{student.display_name || student.full_name}</div>
                          {student.display_name && student.display_name !== student.full_name && <div style={{ fontSize: "11px", color: "#666" }}>{student.full_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td><span className={`admin-badge badge-${getLevelInfo(student.level, dynamicLevels).key}`}>{getLevelInfo(student.level, dynamicLevels).label}</span></td>
                    <td style={{ fontSize: "14px", fontWeight: 700 }}>{student.points.toLocaleString("pt-BR")} PTS</td>
                    <td style={{ fontSize: "12px", color: "#666" }}>{formatDate(student.created_at)}</td>
                    <td style={{ fontSize: "13px", fontWeight: 600 }}>{student.phone || "—"}</td>
                    <td style={{ paddingRight: "16px" }}>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button onClick={() => handleOpenDrawer(student)} className="admin-btn admin-btn-ghost" style={{ height: "36px", width: "36px", padding: 0 }}><User size={16} /></button>
                        <button onClick={() => { setSelectedStudent(student); setIsEditing(true); setDrawerView("profile"); }} className="admin-btn admin-btn-ghost" style={{ height: "36px", width: "36px", padding: 0 }}><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(student.id)} className="admin-btn admin-btn-ghost" style={{ height: "36px", width: "36px", padding: 0, color: "#DC2626" }} title="Excluir"><Trash2 size={16} /></button>
                        {student.phone && (
                          <a href={`https://wa.me/55${student.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost" style={{ height: "36px", width: "36px", padding: 0 }}><Phone size={16} /></a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

          {/* ── PAGINATION CONTROLS ── */}
          {totalPages > 1 && (
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: 60,
              background: "#FFF",
              border: "3px solid #000",
              padding: "16px 24px",
              boxShadow: "8px 8px 0px rgba(0,0,0,1)"
            }}>
              <div style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Mostrando {students.length} de {totalCount} resultado{totalCount !== 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  style={{
                    padding: "10px 16px",
                    border: "2px solid #000",
                    background: currentPage <= 1 ? "#F3F4F6" : "#FFF",
                    cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 12, fontWeight: 900
                  }}
                >
                  <ChevronLeft size={18} /> ANTERIOR
                </button>
                <div style={{ fontSize: 13, fontWeight: 900, background: "#000", color: "#FFF", padding: "10px 20px" }}>
                  PÁGINA {currentPage} DE {totalPages}
                </div>
                <button 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  style={{
                    padding: "10px 16px",
                    border: "2px solid #000",
                    background: currentPage >= totalPages ? "#F3F4F6" : "#FFF",
                    cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 12, fontWeight: 900
                  }}
                >
                  PRÓXIMA <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── LEADS VIEW ── */}
      {viewMode === "leads" && (
        <div className="admin-card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
          {preRegistrations.length === 0 ? (
            <div style={{ padding: "64px 20px", textAlign: "center", color: "#666", fontSize: "14px" }}>Nenhum pré-cadastro pendente.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="admin-table" style={{ tableLayout: "fixed", width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: "24px", textAlign: "left" }}>Candidato</th>
                    <th style={{ width: "190px", textAlign: "left", paddingLeft: "16px", borderLeft: "2px solid rgba(0,0,0,0.08)" }}>Contato</th>
                    <th style={{ width: "65px", textAlign: "left", paddingLeft: "12px", borderLeft: "2px solid rgba(0,0,0,0.08)" }}>Data</th>
                    <th style={{ width: "115px", textAlign: "center", borderLeft: "2px solid rgba(0,0,0,0.08)" }}>Nível</th>
                    <th style={{ width: "115px", textAlign: "center", borderLeft: "2px solid rgba(0,0,0,0.08)" }}>Plano</th>
                    <th style={{ width: "215px", textAlign: "center", borderLeft: "2px solid rgba(0,0,0,0.08)" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {preRegistrations.map((lead: any) => (
                    <tr key={lead.id}>
                      <td style={{ paddingLeft: "24px", paddingRight: "12px" }}>
                        <div style={{ fontWeight: 800, fontSize: "14px", color: "#000", lineHeight: "1.2", overflow: "hidden" }}>{lead.full_name}</div>
                      </td>
                      <td style={{ width: "190px", paddingLeft: "16px", borderLeft: "2px solid rgba(0,0,0,0.05)" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600 }}>{lead.phone}</div>
                        <div style={{ fontSize: "10px", color: "#666", wordBreak: "break-all", lineHeight: 1.1 }}>{lead.email}</div>
                      </td>
                      <td style={{ width: "65px", fontSize: "10px", fontWeight: 700, paddingLeft: "12px", borderLeft: "2px solid rgba(0,0,0,0.05)" }}>{formatDate(lead.created_at)}</td>
                      <td style={{ width: "115px", padding: "12px 6px", borderLeft: "2px solid rgba(0,0,0,0.05)" }}>
                        <select 
                          value={leadLevels[lead.id] || "branco"}
                          onChange={(e) => setLeadLevels(prev => ({ ...prev, [lead.id]: e.target.value }))}
                          disabled={loadingLeadId === lead.id}
                          style={{ 
                            width: "100%", 
                            padding: "6px 8px", 
                            border: "2px solid #000", 
                            fontSize: "11px", 
                            fontWeight: 900, 
                            background: "#FFF",
                            color: "#000",
                            borderRadius: 0,
                            cursor: "pointer",
                            textTransform: "uppercase"
                          }}
                        >
                          {levelsList.map((lvl: any) => (
                            <option key={lvl.key} value={lvl.key}>
                              {lvl.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ width: "115px", padding: "12px 6px", borderLeft: "2px solid rgba(0,0,0,0.05)" }}>
                        <select 
                          value={leadMembershipTypes[lead.id] || "club"}
                          onChange={(e) => setLeadMembershipTypes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                          disabled={loadingLeadId === lead.id}
                          style={{ 
                            width: "100%", 
                            padding: "6px 8px", 
                            border: "2px solid #000", 
                            fontSize: "11px", 
                            fontWeight: 900, 
                            background: "#FFF",
                            color: "#000",
                            borderRadius: 0,
                            cursor: "pointer",
                            textTransform: "uppercase"
                          }}
                        >
                          {MEMBERSHIP_TYPES.map((type) => (
                            <option key={type.key} value={type.key}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ width: "215px", borderLeft: "2px solid rgba(0,0,0,0.05)", padding: "12px 8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", justifyContent: "center" }}>
                          {loadingLeadId === lead.id ? (
                            <span style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>...</span>
                          ) : (
                            <>
                              <button 
                                onClick={() => { setSelectedLead(lead); setIsEditingLead(true); }}
                                style={{ border: "none", background: "none", cursor: "pointer", color: "#666", padding: "4px" }}
                                title="Editar Pré-cadastro"
                              >
                                <Pencil size={18} />
                              </button>
                              
                              <button 
                                onClick={() => handleApproveLead(lead.id)}
                                className="admin-btn admin-btn-primary"
                                style={{ 
                                  height: "36px", 
                                  padding: "0 16px", 
                                  fontSize: "11px",
                                  fontWeight: 900,
                                  whiteSpace: "nowrap"
                                }}
                              >
                                ACEITAR
                              </button>

                              <button 
                                onClick={() => handleRejectLead(lead.id)}
                                style={{ 
                                  border: "none",
                                  background: "none",
                                  color: "#DC2626",
                                  fontSize: "11px",
                                  fontWeight: 900,
                                  textTransform: "uppercase",
                                  cursor: "pointer",
                                  padding: "0 8px"
                                }}
                              >
                                REJEITAR
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── STUDENT PROFILE MODAL (IRON MONOLITH STYLE) ── */}
      {selectedStudent && (
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
            onClick={() => setSelectedStudent(null)} 
          />

          <div style={{
            position: "relative",
            background: "#FFF", 
            width: "100%", 
            maxWidth: "1200px", 
            maxHeight: "95vh",
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
            
            {/* Modal Header */}
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
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", margin: 0, letterSpacing: "0.05em" }}>{selectedStudent.full_name}</h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, background: "#FFF", color: "#000", padding: "2px 8px", textTransform: "uppercase" }}>
                      {getLevelInfo(selectedStudent.level, dynamicLevels).label}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)} 
                style={{ background: "none", border: "none", color: "#FFF", cursor: "pointer", padding: 4 }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: "flex", borderBottom: "4px solid #000", background: "#F3F4F6" }}>
              <button 
                onClick={() => { setDrawerView("profile"); setIsEditing(false); }} 
                style={{ 
                  flex: 1, padding: "20px", fontSize: 12, fontWeight: 900, textTransform: "uppercase",
                  background: drawerView === "profile" ? "#FFF" : "transparent",
                  color: "#000", border: "none", cursor: "pointer", 
                  borderRight: "4px solid #000",
                  transition: "all 0.1s"
                }}
              >
                PERFIL
              </button>
              <button 
                onClick={switchToEvaluations} 
                style={{ 
                  flex: 1, padding: "20px", fontSize: 12, fontWeight: 900, textTransform: "uppercase",
                  background: drawerView === "evaluations" || drawerView === "eval-form" ? "#FFF" : "transparent",
                  color: "#000", border: "none", cursor: "pointer",
                  borderRight: "4px solid #000",
                  transition: "all 0.1s"
                }}
              >
                AVALIAÇÕES
              </button>
              <button 
                onClick={() => setDrawerView("security")} 
                style={{ 
                  flex: 1, padding: "20px", fontSize: 12, fontWeight: 900, textTransform: "uppercase",
                  background: drawerView === "security" ? "#FFF" : "transparent",
                  color: "#000", border: "none", cursor: "pointer",
                  transition: "all 0.1s"
                }}
              >
                SEGURANÇA
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ 
              flex: 1, 
              overflowY: drawerView === "eval-form" ? "hidden" : "auto", 
              padding: drawerView === "eval-form" ? 0 : "32px",
              display: "flex",
              flexDirection: "column"
            }}>
              {drawerView === "profile" && (
                <div style={{ width: "100%" }}>
                  {isEditing ? (
                    <form ref={editFormRef} action={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Nome Completo *</label>
                        <input type="text" name="full_name" defaultValue={selectedStudent.full_name || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} required />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Nome de Exibição</label>
                          <input type="text" name="display_name" defaultValue={selectedStudent.display_name || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>WhatsApp</label>
                          <input type="text" name="phone" defaultValue={selectedStudent.phone || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
                        </div>
                      </div>
                      
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>CPF</label>
                          <input type="text" name="cpf" defaultValue={selectedStudent.cpf || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Data de Nascimento</label>
                          <input type="date" name="birth_date" defaultValue={selectedStudent.birth_date || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Nível Técnico</label>
                          <select name="level" defaultValue={selectedStudent.level} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }}>
                            {levelsList.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                          </select>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Gênero</label>
                          <select name="gender" defaultValue={selectedStudent.gender || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }}>
                            <option value="">Selecione...</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Feminino">Feminino</option>
                          </select>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Plano de Acesso</label>
                        <select name="membership_type" defaultValue={selectedStudent.membership_type || "club"} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }}>
                          {MEMBERSHIP_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Bio / Notas Gerais</label>
                        <textarea name="bio" defaultValue={selectedStudent.bio || ""} rows={4} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", resize: "none" }} />
                      </div>

                      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                        <button type="submit" disabled={loading} className="admin-btn admin-btn-primary" style={{ flex: 1, height: 56 }}>{loading ? "Salvando..." : "SALVAR ALTERAÇÕES"}</button>
                        <button type="button" onClick={() => setIsEditing(false)} className="admin-btn admin-btn-ghost" style={{ flex: 1, height: 56 }}>CANCELAR</button>
                      </div>
                    </form>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                        <div className="admin-card" style={{ padding: 24, border: "3px solid #000", background: "#F9FAFB", boxShadow: "8px 8px 0px rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#666", marginBottom: 12 }}>
                            <Calendar size={18} />
                            <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Matriculado em</span>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 900 }}>{formatDate(selectedStudent.created_at)}</div>
                        </div>
                        <div className="admin-card" style={{ padding: 24, border: "3px solid #000", background: "#F9FAFB", boxShadow: "8px 8px 0px rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#666", marginBottom: 12 }}>
                            <Tag size={18} />
                            <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Plano</span>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: getMembershipLabel(selectedStudent.membership_type).includes("Pass") ? "#DC2626" : "#000" }}>
                            {getMembershipLabel(selectedStudent.membership_type)}
                          </div>
                        </div>
                        <div className="admin-card" style={{ padding: 24, border: "3px solid #000", background: "#F9FAFB", boxShadow: "8px 8px 0px rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#666", marginBottom: 12 }}>
                            <Activity size={18} />
                            <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>Pontuação Total</span>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 900 }}>{selectedStudent.points.toLocaleString()} <span style={{ fontSize: 12, color: "#666" }}>PTS</span></div>
                        </div>
                      </div>

                      <div style={{ background: "#000", color: "#FFF", padding: "2px 20px", display: "inline-block", width: "fit-content", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Dados Cadastrais
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>WhatsApp</p>
                          <p style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>{selectedStudent.phone || "NÃO INFORMADO"}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Documento (CPF)</p>
                          <p style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>{selectedStudent.cpf || "NÃO INFORMADO"}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Data Nascimento</p>
                          <p style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>{selectedStudent.birth_date ? new Date(selectedStudent.birth_date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "NÃO INFORMADO"}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Gênero</p>
                          <p style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>{selectedStudent.gender || "NÃO INFORMADO"}</p>
                        </div>
                      </div>

                      {selectedStudent.bio && (
                        <div>
                          <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 8 }}>Observações / Bio</p>
                          <div style={{ padding: 20, border: "2px dashed #000", fontSize: 14, fontWeight: 600, color: "#333", background: "#F9FAFB" }}>
                            {selectedStudent.bio}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                        <button onClick={() => setIsEditing(true)} className="admin-btn admin-btn-primary" style={{ flex: 1, height: 56 }}>
                          <Pencil size={18} /> EDITAR PERFIL
                        </button>
                        <button onClick={() => handleDelete(selectedStudent.id)} className="admin-btn admin-btn-ghost" style={{ flex: 1, height: 56, color: "#DC2626" }}>
                          <Trash2 size={18} /> EXCLUIR ATLETA
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {drawerView === "evaluations" && (
                <div style={{ width: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Activity size={20} />
                      <h4 style={{ fontSize: 16, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Histórico Biométrico</h4>
                    </div>
                    <button onClick={() => { setSelectedEval(null); setDrawerView("eval-form"); }} className="admin-btn admin-btn-primary" style={{ padding: "10px 20px", fontSize: 12 }}>
                      <Plus size={16} /> NOVA AVALIAÇÃO
                    </button>
                  </div>

                  {loadingEvals ? (
                    <div style={{ padding: 60, textAlign: "center" }}>
                      <p style={{ fontSize: 12, fontWeight: 900, color: "#999" }}>CARREGANDO DADOS...</p>
                    </div>
                  ) : evaluations.length === 0 ? (
                    <div style={{ padding: 60, textAlign: "center", border: "4px dashed #EEE" }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: "#999", margin: 0 }}>NENHUMA AVALIAÇÃO FÍSICA REGISTRADA</p>
                      <p style={{ fontSize: 11, color: "#CCC", marginTop: 8 }}>Clique no botão acima para iniciar o primeiro registro.</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
                      {evaluations.map(e => (
                        <div key={e.id} className="admin-card" style={{ padding: 20, border: "3px solid #000", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "8px 8px 0px rgba(0,0,0,0.05)" }}>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 900 }}>{new Date(e.evaluation_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>
                            <div style={{ fontSize: 11, color: "#666", fontWeight: 800, marginTop: 4, textTransform: "uppercase" }}>{e.protocol || "PROTOCOLO N/A"} • {e.weight}kg • BF: {e.body_fat || "—"}%</div>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setSelectedEval(e); setDrawerView("eval-form"); }} className="admin-btn admin-btn-ghost" style={{ width: 40, height: 40, padding: 0 }} title="Editar"><Pencil size={18} /></button>
                            <button onClick={() => handleDeleteEval(e.id)} className="admin-btn admin-btn-ghost" style={{ width: 40, height: 40, padding: 0, color: "#DC2626" }} title="Remover"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {drawerView === "eval-form" && (
                <PhysicalEvaluationForm 
                  studentId={selectedStudent.id}
                  initialData={selectedEval}
                  onClose={() => setDrawerView("evaluations")}
                  onSuccess={() => { setDrawerView("evaluations"); fetchEvaluations(selectedStudent.id); }}
                />
              )}

              {drawerView === "security" && (
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
              )}
            </div>
          </div>
        </div>
      )}
      {/* ── NOTIFICATION OVERLAY (NEO-BRUTALIST MODAL) ── */}
      {message && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 10000, padding: 20,
          animation: "fadeIn 0.2s ease-out"
        }}>
          <div style={{
            background: "#FFF",
            width: "100%",
            maxWidth: "480px",
            border: "4px solid #000",
            boxShadow: "24px 24px 0px #000",
            padding: "48px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            animation: "slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
          }}>
            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>

            <div style={{ 
              width: 64, height: 64, 
              background: message.type === "success" ? "#22C55E" : "#EF4444",
              border: "3px solid #000",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24,
              boxShadow: "4px 4px 0px #000"
            }}>
              {message.type === "success" ? <ShieldCheck color="white" size={32} /> : <Info color="white" size={32} />}
            </div>

            <h3 style={{ 
              fontSize: 20, fontWeight: 900, textTransform: "uppercase", 
              margin: "0 0 12px 0", letterSpacing: "0.05em",
              color: "#000"
            }}>
              {message.type === "success" ? "Sucesso" : "Atenção"}
            </h3>

            <p style={{ 
              fontSize: 14, fontWeight: 700, color: "#444", 
              margin: "0 0 32px 0", lineHeight: 1.5 
            }}>
              {message.text}
            </p>

            <button 
              onClick={() => setMessage(null)}
              className="admin-btn admin-btn-primary"
              style={{ 
                width: "100%", 
                height: 56, 
                fontSize: 14, 
                fontWeight: 900,
                backgroundColor: "#000",
                color: "#FFF"
              }}
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}
      {/* ── EDIT LEAD MODAL ── */}
      {isEditingLead && selectedLead && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: 20
        }}>
          <div style={{
            background: "#FFF", 
            width: "100%", 
            maxWidth: "500px", 
            border: "4px solid #000",
            boxShadow: "16px 16px 0px #000",
            padding: "32px",
            animation: "modalAppear 0.2s ease-out"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, textTransform: "uppercase", margin: 0 }}>Editar Pré-cadastro</h2>
              <button 
                onClick={() => { setIsEditingLead(false); setSelectedLead(null); }} 
                style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={24} />
              </button>
            </div>

            <form action={handleUpdateLead} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 6 }}>Nome Completo</label>
                <input 
                  type="text" 
                  name="full_name" 
                  required 
                  defaultValue={selectedLead.full_name} 
                  style={{ width: "100%", padding: 12, border: "2px solid #000", fontWeight: 700 }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 6 }}>E-mail</label>
                <input 
                  type="email" 
                  name="email" 
                  required 
                  defaultValue={selectedLead.email} 
                  style={{ width: "100%", padding: 12, border: "2px solid #000", fontWeight: 700 }} 
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 6 }}>Telefone</label>
                <input 
                  type="text" 
                  name="phone" 
                  required 
                  defaultValue={selectedLead.phone} 
                  style={{ width: "100%", padding: 12, border: "2px solid #000", fontWeight: 700 }} 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 6 }}>CPF</label>
                  <input 
                    type="text" 
                    name="cpf" 
                    defaultValue={selectedLead.cpf} 
                    style={{ width: "100%", padding: 12, border: "2px solid #000", fontWeight: 700 }} 
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 900, textTransform: "uppercase", marginBottom: 6 }}>Nascimento</label>
                  <input 
                    type="date" 
                    name="birth_date" 
                    defaultValue={selectedLead.birth_date ? selectedLead.birth_date.split('T')[0] : ""} 
                    style={{ width: "100%", padding: 12, border: "2px solid #000", fontWeight: 700 }} 
                  />
                </div>
              </div>

              <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
                <button 
                  type="button" 
                  onClick={() => { setIsEditingLead(false); setSelectedLead(null); }} 
                  className="admin-btn admin-btn-ghost" 
                  style={{ flex: 1, height: 48 }}
                >
                  CANCELAR
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="admin-btn admin-btn-primary" 
                  style={{ flex: 1, height: 48, backgroundColor: "#000", color: "#FFF" }}
                >
                  {loading ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Credentials Modal */}
      {/* Approved Lead / Invitation Modal */}
      {approvedLeadInfo && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-white w-full relative" style={{ maxWidth: "480px", border: "4px solid #000", boxShadow: "24px 24px 0px #000", padding: "48px 40px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ display: "inline-flex", padding: 12, background: "#10B981", border: "2px solid #000", marginBottom: 16 }}>
                <ShieldCheck size={32} color="#FFF" />
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", color: "#000", lineHeight: 1.1 }}>Aluno Aprovado</h2>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#666", marginTop: 8 }}>
                Um convite foi enviado para <strong>{approvedLeadInfo.email}</strong>.
              </p>
            </div>

            <div style={{ background: "#F5F5F5", border: "2px solid #000", padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#333", textAlign: "center", textTransform: "uppercase", marginBottom: 4 }}>Dica de Onboarding</p>
              <p style={{ fontSize: 11, color: "#666", textAlign: "center" }}>
                O aluno deve clicar no link do e-mail para ativar sua conta e definir sua senha pessoal.
              </p>
            </div>

            <button 
              onClick={() => {
                const text = `Olá ${approvedLeadInfo.name}! Boas-vindas ao Coliseu! 🏋️\n\nSeu cadastro foi aprovado. Enviamos um e-mail para ${approvedLeadInfo.email} com o link de ativação da sua conta.\n\nPor favor, cheque sua caixa de entrada (e spam) para definir sua senha e começar a treinar!`;
                
                // Formata o telefone (remove caracteres não numéricos)
                const cleanPhone = approvedLeadInfo.phone.replace(/\D/g, '');
                const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`;
                
                window.open(whatsappUrl, '_blank');
                setApprovedLeadInfo(null);
              }}
              className="admin-btn admin-btn-primary group"
              style={{ width: "100%", height: 56, backgroundColor: "#25D366", borderColor: "#128C7E", color: "#FFF", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}
            >
              <Phone size={20} /> ENVIAR BOAS-VINDAS (WHATSAPP)
            </button>

            <button 
              onClick={() => {
                const text = `Olá ${approvedLeadInfo.name}! Boas-vindas ao Coliseu! 🏋️\n\nSeu cadastro foi aprovado. Enviamos um e-mail para ${approvedLeadInfo.email} com o link de ativação da sua conta.\n\nPor favor, cheque sua caixa de entrada (e spam) para definir sua senha e começar a treinar!`;
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="admin-btn admin-btn-ghost group"
              style={{ width: "100%", height: 48, fontSize: 13, border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}
            >
              {copied ? <Check size={20} color="#10B981" /> : <Copy size={20} />}
              {copied ? "COPIADO!" : "COPIAR TEXTO DE BOAS-VINDAS"}
            </button>
            <button 
              onClick={() => setApprovedLeadInfo(null)}
              className="admin-btn admin-btn-ghost"
              style={{ width: "100%", height: 40, fontSize: 11 }}
            >
              FECHAR E VOLTAR
            </button>
          </div>
        </div>
      )}
      {/* NEO-BRUTALIST MODAL: CONFIRM RESEND */}
      {showResendConfirm && selectedStudent && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: 20
        }}>
          <div className="admin-card" style={{
            maxWidth: 440,
            width: "100%",
            background: "#FFF",
            border: "4px solid #000",
            boxShadow: "12px 12px 0px #000",
            padding: 32,
            position: "relative"
          }}>
            <button 
              onClick={() => setShowResendConfirm(false)}
              style={{ position: "absolute", top: 16, right: 16, border: "2px solid #000", borderRadius: 4, background: "#FFF", padding: 4 }}
            >
              <X size={16} />
            </button>

            <div style={{
              width: 64,
              height: 64,
              background: "var(--admin-primary)",
              color: "#FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              border: "3px solid #000",
              boxShadow: "4px 4px 0px #000",
              marginBottom: 24
            }}>
              <MailIcon size={32} />
            </div>

            <h3 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", marginBottom: 12, lineHeight: 1 }}>
              Reenviar Convite?
            </h3>
            
            <p style={{ fontSize: 13, color: "#444", marginBottom: 32, lineHeight: 1.5 }}>
              Um novo link de ativação será gerado e enviado para <strong>{selectedStudent.full_name}</strong>. 
              O link enviado anteriormente será invalidado permanentemente.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <button 
                onClick={() => setShowResendConfirm(false)}
                className="admin-btn admin-btn-ghost"
                style={{ height: 56, fontWeight: 900, border: "2px solid #000" }}
              >
                CANCELAR
              </button>
              <button 
                onClick={executeResendInvite}
                className="admin-btn admin-btn-primary"
                style={{ height: 56, fontWeight: 900, border: "2px solid #000" }}
              >
                SIM, REENVIAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
