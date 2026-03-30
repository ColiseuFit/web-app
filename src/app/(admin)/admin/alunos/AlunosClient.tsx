"use client";

import { useState, useRef } from "react";
import { Search, Plus, Phone, X, UserPlus, ChevronDown, Pencil, Trash2, User, Mail, Calendar, CreditCard, Info } from "lucide-react";
import { createStudent, updateStudent, deleteStudent } from "../../actions";

/**
 * AlunosClient: Comprehensive Student Management CRM.
 *
 * @architecture
 * - Handles complex state encompassing data tables, inline search, and a slide-out drawer (Drawer UI).
 * - Mutates data exclusively via Server Actions (`createStudent`, `updateStudent`, `deleteStudent`) 
 *   that handle RLS bypasses safely in the backend. 
 * - Includes Form validation handling (Error/Success feedback loops).
 *
 * @design
 * - Dense Data Table: Shows vital KPIs (XP, level badge, communication links) at a glance.
 * - Slide-out Drawer: Used for deep editing to prevent page navigations (maintaining search/filter context).
 *
 * @param {Student[]} students - Array of aggregated user profiles (combines XP, check_ins count, profiles table).
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
  // Fallback para legados que possam ter escapado
  if (l === "branco") return "Iniciante";
  if (l === "verde") return "Scale";
  if (l === "azul") return "Intermediário";
  if (l === "vermelho") return "RX";
  if (l === "preto") return "Elite";
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

  /**
   * Executes the creation of a new student using the `createStudent` Server Action.
   * Handles loading state and maps validation errors/success to the UI notification area.
   * 
   * @param {FormData} formData - Contains raw input (full_name, email, password, level).
   */
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

      {/* ── NEW STUDENT FORM (Collapsible) ── */}
      {showForm && (
        <div
          className="admin-card"
          style={{ marginBottom: 24, animation: "fadeIn 0.2s ease" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <UserPlus size={18} />
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Matricular Novo Aluno</h2>
          </div>

          <form ref={formRef} action={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--admin-text-secondary)", marginBottom: 6 }}>
                  Nome Completo *
                </label>
                <input type="text" name="full_name" required placeholder="Ex: João da Silva" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--admin-text-secondary)", marginBottom: 6 }}>
                  Nível
                </label>
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
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--admin-text-secondary)", marginBottom: 6 }}>
                  E-mail de Login *
                </label>
                <input type="email" name="email" required placeholder="aluno@email.com" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--admin-text-secondary)", marginBottom: 6 }}>
                  Senha Inicial
                </label>
                <input type="text" name="password" required defaultValue="coliseu123" placeholder="Temporária" />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--admin-text-muted)" }}>
                O aluno poderá trocar a senha no primeiro login.
              </span>
              <button type="submit" disabled={loading} className="admin-btn admin-btn-primary">
                {loading ? "Matriculando..." : "Matricular Aluno"}
              </button>
            </div>
          </form>

          {message && (
            <div
              style={{
                marginTop: 16,
                padding: "10px 14px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                background: message.type === "error" ? "#FEF2F2" : "#F0FDF4",
                color: message.type === "error" ? "#DC2626" : "#15803D",
                border: `1px solid ${message.type === "error" ? "#FECACA" : "#BBF7D0"}`,
              }}
            >
              {message.text}
            </div>
          )}
        </div>
      )}

      {/* ── SEARCH & FILTERS ── */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "32px", alignItems: "center" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search
            size={18}
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#000",
            }}
          />
          <input
            type="search"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              paddingLeft: "44px", 
              border: "2px solid #000",
              fontWeight: 500
            }}
          />
        </div>
        <div style={{ position: "relative", minWidth: "200px" }}>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{ 
              appearance: "none", 
              paddingRight: "40px",
              border: "2px solid #000",
              fontWeight: 700,
              textTransform: "uppercase",
              fontSize: "12px",
              letterSpacing: "0.05em"
            }}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l === "Todos" ? "Filtrar por Nível" : `Nível: ${formatLevel(l)}`}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            style={{
              position: "absolute",
              right: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "#000",
            }}
          />
        </div>
      </div>

      {/* ── STUDENTS TABLE ── */}
      <div className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div
            style={{
              padding: "64px 20px",
              textAlign: "center",
              color: "#666",
              fontSize: "14px",
            }}
          >
            {search || levelFilter !== "Todos"
              ? "Nenhum resultado para os filtros aplicados."
              : "Nenhum aluno cadastrado no sistema."}
          </div>
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
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            background: "#000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: 800,
                            color: "#FFF",
                            flexShrink: 0,
                          }}
                        >
                          {student.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "14px", color: "#000" }}>
                            {student.display_name || student.full_name}
                          </div>
                          {student.display_name && student.display_name !== student.full_name && (
                            <div style={{ fontSize: "11px", color: "#666", fontWeight: 500 }}>
                              {student.full_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-badge badge-${student.level || "iniciante"}`}>
                        {formatLevel(student.level)}
                      </span>
                    </td>
                    <td style={{ fontSize: "14px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {student.xp.toLocaleString("pt-BR")} <span style={{ fontSize: "10px", color: "#999" }}>XP</span>
                    </td>
                    <td style={{ fontSize: "13px", color: "#444", fontWeight: 500 }}>
                      {formatDate(student.created_at)}
                    </td>
                    <td style={{ fontSize: "13px", color: "#000", fontWeight: 600 }}>
                      {student.phone ? (
                        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {student.phone}
                        </span>
                      ) : (
                        <span style={{ color: "#CCC" }}>Sem contato</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "4px" }}>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsEditing(false);
                          }}
                          className="admin-btn admin-btn-ghost"
                          style={{ height: "36px", width: "36px", padding: 0 }}
                          title="Ver Perfil"
                        >
                          <User size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsEditing(true);
                          }}
                          className="admin-btn admin-btn-ghost"
                          style={{ height: "36px", width: "36px", padding: 0 }}
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="admin-btn admin-btn-ghost"
                          style={{ height: "36px", width: "36px", padding: 0, color: "#DC2626" }}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                        {student.phone && (
                          <a
                            href={`https://wa.me/55${student.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="admin-btn admin-btn-ghost"
                            style={{ height: "36px", width: "36px", padding: 0 }}
                            title="WhatsApp"
                          >
                            <Phone size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TABLE FOOTER ── */}
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--admin-border)",
            fontSize: 12,
            color: "var(--admin-text-muted)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>
            {filtered.length} de {students.length} alunos
          </span>
        </div>
      </div>
      {/* ── STUDENT PROFILE DRAWER (Slide-out) ── */}
      {selectedStudent && (
        <>
          {/* Overlay */}
          <div 
            onClick={() => setSelectedStudent(null)}
            style={{
              position: "fixed",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
              zIndex: 1000,
              animation: "fadeIn 0.2s ease"
            }}
          />
          
          {/* Drawer */}
          <div
            style={{
              position: "fixed",
              top: 0, right: 0, bottom: 0,
              width: "100%",
              maxWidth: "500px",
              background: "#FFF",
              zIndex: 1001,
              boxShadow: "-10px 0 30px rgba(0,0,0,0.1)",
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: "24px", borderBottom: "1px solid var(--admin-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, background: "#000", color: "#FFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                  {selectedStudent.full_name?.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{selectedStudent.full_name}</h3>
                  <span className={`admin-badge badge-${selectedStudent.level}`} style={{ marginTop: 4 }}>
                    {formatLevel(selectedStudent.level)}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="admin-btn admin-btn-ghost" 
                style={{ width: 36, height: 36, padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {isEditing ? (
                <form ref={editFormRef} action={handleUpdate} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>Nome de Exibição</label>
                      <input type="text" name="display_name" defaultValue={selectedStudent.display_name || ""} placeholder="Apelido" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>Telefone</label>
                      <input type="text" name="phone" defaultValue={selectedStudent.phone || ""} placeholder="(00) 00000-0000" />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>CPF</label>
                      <input type="text" name="cpf" defaultValue={selectedStudent.cpf || ""} placeholder="000.000.000-00" />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>Data de Nascimento</label>
                      <input type="date" name="birth_date" defaultValue={selectedStudent.birth_date || ""} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>Nível Técnico</label>
                    <select name="level" defaultValue={selectedStudent.level}>
                      <option value="iniciante">Iniciante</option>
                      <option value="scale">Scale</option>
                      <option value="intermediario">Intermediário</option>
                      <option value="rx">RX</option>
                      <option value="elite">Elite</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>Gênero</label>
                    <select name="gender" defaultValue={selectedStudent.gender || ""}>
                      <option value="">Selecione...</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#666", marginBottom: 8, display: "block" }}>Biografia / Notas Médicas</label>
                    <textarea name="bio" defaultValue={selectedStudent.bio || ""} rows={4} placeholder="Informações relevantes sobre o atleta..." style={{ width: "100%", padding: "12px", border: "2px solid #000", fontWeight: 500 }} />
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                    <button type="submit" disabled={loading} className="admin-btn admin-btn-primary" style={{ flex: 1 }}>
                      {loading ? "Salvando..." : "Salvar Alterações"}
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="admin-btn admin-btn-ghost" style={{ flex: 1 }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {/* Info Cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="admin-card" style={{ padding: 16, background: "#F9FAFB" }}>
                      <Calendar size={16} style={{ marginBottom: 8, color: "#666" }} />
                      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", fontWeight: 700 }}>Membro desde</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{formatDate(selectedStudent.created_at)}</div>
                    </div>
                    <div className="admin-card" style={{ padding: 16, background: "#F9FAFB" }}>
                      <Info size={16} style={{ marginBottom: 8, color: "#666" }} />
                      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase", fontWeight: 700 }}>Pontuação XP</div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedStudent.xp.toLocaleString()} XP</div>
                    </div>
                  </div>

                  {/* Contact section */}
                  <div>
                    <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <Phone size={14} /> Contato e Registro
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "#666" }}>Telefone:</span>
                        <span style={{ fontWeight: 600 }}>{selectedStudent.phone || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "#666" }}>CPF:</span>
                        <span style={{ fontWeight: 600 }}>{selectedStudent.cpf || "—"}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                        <span style={{ color: "#666" }}>Nascimento:</span>
                        <span style={{ fontWeight: 600 }}>{selectedStudent.birth_date ? new Date(selectedStudent.birth_date).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio section */}
                  {selectedStudent.bio && (
                    <div>
                      <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#666", marginBottom: 12 }}>Biografia / Notas</h4>
                      <p style={{ fontSize: 14, lineHeight: "1.6", color: "#333", background: "#FFFBEB", padding: 16, borderLeft: "4px solid #F59E0B", margin: 0 }}>
                        {selectedStudent.bio}
                      </p>
                    </div>
                  )}

                  <div style={{ marginTop: "auto", paddingTop: 24, borderTop: "1px solid var(--admin-border)" }}>
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="admin-btn admin-btn-primary" 
                      style={{ width: "100%" }}
                    >
                      <Pencil size={16} /> Editar Perfil Completo
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedStudent.id)}
                      className="admin-btn admin-btn-ghost" 
                      style={{ width: "100%", marginTop: 12, color: "#DC2626" }}
                    >
                      <Trash2 size={16} /> Excluir Aluno do Sistema
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
