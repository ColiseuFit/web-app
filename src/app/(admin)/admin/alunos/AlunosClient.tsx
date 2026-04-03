"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, Phone, X, UserPlus, ChevronDown, Pencil, Trash2, User, Mail, Calendar, CreditCard, Info, Activity, ShieldCheck, Lock as LockIcon, Mail as MailIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { createStudent, updateStudent, deleteStudent, getStudentEvaluations, deletePhysicalEvaluation, updateStudentAuth } from "../../actions";
import PhysicalEvaluationForm from "./PhysicalEvaluationForm";
import { getLevelInfo, LevelInfo } from "@/lib/constants/levels";

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
}

// We will define this inside the component to use dynamic levels

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function AlunosClient({ 
  students, 
  dynamicLevels,
  currentPage,
  totalPages,
  totalCount,
  currentSearch,
  currentLevel
}: { 
  students: Student[], 
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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  
  // Evaluation States
  const [drawerView, setDrawerView] = useState<"profile" | "evaluations" | "eval-form" | "security">("profile");
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(false);
  const [selectedEval, setSelectedEval] = useState<any | null>(null);

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
      alert(result.error || "Erro desconhecido ao salvar.");
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
      alert(result.error);
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
      alert("Credenciais atualizadas com sucesso!");
      setDrawerView("profile");
    } else {
      alert(result.error || "Erro ao atualizar credenciais.");
    }
    setLoading(false);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
            Alunos
          </h1>
          <p style={{ fontSize: 13, color: "var(--admin-text-secondary)", marginTop: 2 }}>
            {students.length} membros cadastrados
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

      {/* ── NEW STUDENT FORM ── */}
      {showForm && (
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
                  <th>Nível</th>
                  <th>Pontuação</th>
                  <th>Data Cadastro</th>
                  <th>Contato</th>
                  <th style={{ width: "80px" }}>Ações</th>
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
                    <td style={{ fontSize: "13px" }}>{formatDate(student.created_at)}</td>
                    <td style={{ fontSize: "13px", fontWeight: 600 }}>{student.phone || "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button onClick={() => handleOpenDrawer(student)} className="admin-btn admin-btn-ghost" style={{ height: "36px", width: "36px", padding: 0 }}><User size={16} /></button>
                        <button onClick={() => { setSelectedStudent(student); setIsEditing(true); setDrawerView("profile"); }} className="admin-btn admin-btn-ghost" style={{ height: "36px", width: "36px", padding: 0 }}><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(student.id)} className="admin-btn admin-btn-ghost" style={{ height: "36px", width: "36px", padding: 0, color: "#DC2626" }}><Trash2 size={16} /></button>
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
                          <p style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>{selectedStudent.birth_date ? new Date(selectedStudent.birth_date).toLocaleDateString("pt-BR") : "NÃO INFORMADO"}</p>
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
                            <div style={{ fontSize: 16, fontWeight: 900 }}>{new Date(e.evaluation_date).toLocaleDateString("pt-BR")}</div>
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
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
