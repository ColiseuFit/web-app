"use client";

import { useState, useRef } from "react";
import { Search, Plus, Phone, X, UserPlus, ChevronDown, Pencil, Trash2, User, Mail, Calendar, CreditCard, Info, Activity } from "lucide-react";
import { createStudent, updateStudent, deleteStudent, getStudentEvaluations, deletePhysicalEvaluation } from "../../actions";
import PhysicalEvaluationForm from "./PhysicalEvaluationForm";

/**
 * AlunosClient: Comprehensive Student Management CRM.
 *
 * @architecture
 * - Handles complex state encompassing data tables, inline search, and a slide-out drawer (Drawer UI).
 * - Mutates data exclusively via Server Actions.
 * - Integrates Physical Evaluation modules within the student drawer.
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
  xp: number;
  bio: string | null;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
}

const LEVELS = ["Todos", "iniciante", "scale", "intermediario", "rx", "elite"];

function formatLevel(level: string): string {
  if (!level) return "—";
  const l = level.toLowerCase();
  if (l === "iniciante") return "Iniciante";
  if (l === "scale") return "Scale";
  if (l === "intermediario") return "Intermediário";
  if (l === "rx") return "RX";
  if (l === "elite") return "Elite";
  return level.charAt(0).toUpperCase() + level.slice(1);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export default function AlunosClient({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("Todos");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  
  // Evaluation States
  const [drawerView, setDrawerView] = useState<"profile" | "evaluations" | "eval-form">("profile");
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loadingEvals, setLoadingEvals] = useState(false);
  const [selectedEval, setSelectedEval] = useState<any | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  // Filter logic
  const filtered = students.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (s.display_name && s.display_name.toLowerCase().includes(search.toLowerCase())) ||
      (s.phone && s.phone.includes(search));

    const matchesLevel = levelFilter === "Todos" || s.level === levelFilter;

    return matchesSearch && matchesLevel;
  });

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
      setSelectedStudent(null);
    } else {
      alert(result.error);
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
                <select name="level" defaultValue="iniciante">
                  <option value="iniciante">Iniciante (Branco)</option>
                  <option value="scale">Scale (Verde)</option>
                  <option value="intermediario">Intermediário (Azul)</option>
                  <option value="rx">RX (Vermelho)</option>
                  <option value="elite">Elite (Preto/Ouro)</option>
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
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ appearance: "none", paddingRight: "40px", border: "2px solid #000", fontWeight: 700, textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l === "Todos" ? "Filtrar por Nível" : `Nível: ${formatLevel(l)}`}</option>
            ))}
          </select>
          <ChevronDown size={16} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#000" }} />
        </div>
      </div>

      {/* ── STUDENTS TABLE ── */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "64px 20px", textAlign: "center", color: "#666", fontSize: "14px" }}>Nenhum resultado encontrado.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: "24px" }}>Nome do Atleta</th>
                  <th>Nível</th>
                  <th>XP Acumulado</th>
                  <th>Data Cadastro</th>
                  <th>Contato</th>
                  <th style={{ width: "80px" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
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
                    <td><span className={`admin-badge badge-${student.level}`}>{formatLevel(student.level)}</span></td>
                    <td style={{ fontSize: "14px", fontWeight: 700 }}>{student.xp.toLocaleString("pt-BR")} XP</td>
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
                      {formatLevel(selectedStudent.level)}
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
                PERFIL DO ATLETA
              </button>
              <button 
                onClick={switchToEvaluations} 
                style={{ 
                  flex: 1, padding: "20px", fontSize: 12, fontWeight: 900, textTransform: "uppercase",
                  background: drawerView !== "profile" ? "#FFF" : "transparent",
                  color: "#000", border: "none", cursor: "pointer",
                  transition: "all 0.1s"
                }}
              >
                AVALIAÇÕES FÍSICAS
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
                            {LEVELS.filter(l => l !== "Todos").map(l => <option key={l} value={l}>{formatLevel(l)}</option>)}
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
                            <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase" }}>XP Acumulado</span>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 900 }}>{selectedStudent.xp.toLocaleString()} <span style={{ fontSize: 12, color: "#666" }}>XP</span></div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
