/**
 * DrawerProfile: Exibe e permite edição dos Dados Cadastrais do aluno.
 * 
 * @architecture
 * - Componente Visual Puro: Recebe estado e handlers do Orquestrador (`AlunosClient`).
 * - Dois modos: Leitura (cards informativos) e Edição (formulário com ViaCEP).
 * - Nenhuma Server Action é importada diretamente; tudo via props.
 */
"use client";

import { useRef } from "react";
import { Pencil, Trash2, Phone, User, Calendar, Tag, Activity, Zap } from "lucide-react";
import { getLevelInfo } from "@/lib/constants/levels";
import { getMembershipLabel, MEMBERSHIP_TYPES } from "@/lib/constants/membership";
import { RUNNING_LEVELS } from "@/lib/constants/running";
import { maskCPF, maskPhone, maskCEP } from "@/lib/utils/masks";
import type { DrawerProfileProps } from "./types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "America/Sao_Paulo"
  });
}

export default function DrawerProfile({
  selectedStudent,
  isEditing,
  setIsEditing,
  loading,
  handleUpdate,
  handleDelete,
  editFormRef,
  levelsList,
  dynamicLevels,
  handleCEPBlur,
  isFetchingCEP
}: DrawerProfileProps) {
  return (
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
              <input 
                type="text" 
                name="phone" 
                defaultValue={selectedStudent.phone || ""} 
                onChange={(e) => { e.target.value = maskPhone(e.target.value); }}
                style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} 
              />
            </div>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>CPF</label>
              <input 
                type="text" 
                name="cpf" 
                defaultValue={selectedStudent.cpf || ""} 
                onChange={(e) => { e.target.value = maskCPF(e.target.value); }}
                style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} 
              />
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
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Tipo de Acesso</label>
            <select name="membership_type" defaultValue={selectedStudent.membership_type || "club"} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }}>
              {MEMBERSHIP_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          <div style={{ background: "#000", color: "#FFF", padding: "2px 20px", display: "inline-block", width: "fit-content", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Contato de Emergência
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Nome do Contato</label>
              <input type="text" name="emergency_contact_name" defaultValue={selectedStudent.emergency_contact_name || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Telefone do Contato</label>
              <input 
                type="text" 
                name="emergency_contact_phone" 
                defaultValue={selectedStudent.emergency_contact_phone || ""} 
                onChange={(e) => { e.target.value = maskPhone(e.target.value); }}
                style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} 
              />
            </div>
          </div>

          <div style={{ background: "#000", color: "#FFF", padding: "2px 20px", display: "inline-block", width: "fit-content", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Endereço
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>
                CEP {isFetchingCEP && <span style={{ color: "#EAB308", fontSize: 10 }}>...BUSCANDO</span>}
              </label>
              <input 
                type="text" 
                name="address_zip_code" 
                defaultValue={selectedStudent.address_zip_code || ""} 
                onBlur={handleCEPBlur}
                onChange={(e) => { e.target.value = maskCEP(e.target.value); }}
                placeholder="00000-000"
                style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} 
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Rua / Logradouro</label>
              <input type="text" name="address_street" defaultValue={selectedStudent.address_street || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Número</label>
              <input type="text" name="address_number" defaultValue={selectedStudent.address_number || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Bairro</label>
              <input type="text" name="address_neighborhood" defaultValue={selectedStudent.address_neighborhood || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Complemento</label>
              <input type="text" name="address_complement" defaultValue={selectedStudent.address_complement || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Cidade</label>
              <input type="text" name="address_city" defaultValue={selectedStudent.address_city || ""} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>UF (Estado)</label>
              <input type="text" name="address_state" defaultValue={selectedStudent.address_state || ""} maxLength={2} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none" }} />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", color: "#666" }}>Bio / Notas Gerais</label>
            <textarea name="bio" defaultValue={selectedStudent.bio || ""} rows={4} maxLength={500} style={{ width: "100%", padding: 14, border: "3px solid #000", fontWeight: 800, outline: "none", resize: "none" }} />
          </div>

          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            <button type="submit" disabled={loading} className="admin-btn admin-btn-primary" style={{ flex: 1, height: 56 }}>{loading ? "Salvando..." : "SALVAR ALTERAÇÕES"}</button>
            <button type="button" onClick={() => setIsEditing(false)} className="admin-btn admin-btn-ghost" style={{ flex: 1, height: 56 }}>CANCELAR</button>
          </div>
        </form>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div className="admin-card" style={{ padding: "20px 24px", border: "3px solid #000", background: "#F9FAFB", boxShadow: "4px 4px 0px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#666", marginBottom: 8 }}>
                <Calendar size={14} />
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Matriculado</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>{formatDate(selectedStudent.created_at)}</div>
            </div>
            <div className="admin-card" style={{ padding: "20px 24px", border: "3px solid #000", background: "#F9FAFB", boxShadow: "4px 4px 0px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#666", marginBottom: 8 }}>
                <Tag size={14} />
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Acesso</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: getMembershipLabel(selectedStudent.membership_type).includes("Pass") ? "#DC2626" : "#000" }}>
                {getMembershipLabel(selectedStudent.membership_type)}
              </div>
            </div>
            <div className="admin-card" style={{ padding: "20px 24px", border: "3px solid #000", background: "#F9FAFB", boxShadow: "4px 4px 0px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#666", marginBottom: 8 }}>
                <Activity size={14} />
                <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" }}>Pontuação</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>{selectedStudent.points.toLocaleString()} <span style={{ fontSize: 11, color: "#666" }}>PTS</span></div>
            </div>
          </div>

          <div style={{ background: "#000", color: "#FFF", padding: "2px 20px", display: "inline-block", width: "fit-content", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Dados Cadastrais
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: 24, background: "#FFF", padding: 20, border: "1px solid #EEE" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>WhatsApp</p>
              <p style={{ fontSize: 14, fontWeight: 900, margin: 0 }}>{selectedStudent.phone || "---"}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>CPF</p>
              <p style={{ fontSize: 14, fontWeight: 900, margin: 0 }}>{selectedStudent.cpf || "---"}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>E-mail de Acesso</p>
              <p style={{ fontSize: 14, fontWeight: 900, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedStudent.email || "---"}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Nascimento</p>
              <p style={{ fontSize: 14, fontWeight: 900, margin: 0 }}>{selectedStudent.birth_date ? new Date(selectedStudent.birth_date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "---"}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Gênero</p>
              <p style={{ fontSize: 14, fontWeight: 900, margin: 0 }}>{selectedStudent.gender || "---"}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Identidade Corrida</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <Zap size={14} style={{ color: RUNNING_LEVELS[selectedStudent.running_level as keyof typeof RUNNING_LEVELS]?.color || "#333" }} />
                <p style={{ fontSize: 14, fontWeight: 900, margin: 0 }}>
                  {RUNNING_LEVELS[selectedStudent.running_level as keyof typeof RUNNING_LEVELS]?.label || "NÃO DEFINIDO"}
                </p>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Status do Aluno</p>
              <p style={{ fontSize: 14, fontWeight: 900, margin: 0, color: "#059669" }}>ATIVO</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: "0 20px" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Phone size={12} /> Emergência
              </p>
              <div style={{ padding: "12px 16px", border: "1px solid #EEE", borderRadius: 4 }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>{selectedStudent.emergency_contact_name || "---"}</div>
                <div style={{ fontWeight: 700, fontSize: 11, color: "#666", marginTop: 2 }}>{selectedStudent.emergency_contact_phone || "---"}</div>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <User size={12} /> Endereço Residencial
              </p>
              <div style={{ padding: "12px 16px", border: "1px solid #EEE", borderRadius: 4 }}>
                <div style={{ fontWeight: 900, fontSize: 12, lineHeight: 1.4 }}>
                  {selectedStudent.address_street ? `${selectedStudent.address_street}, ${selectedStudent.address_number}` : "---"}
                  {selectedStudent.address_complement && <span style={{ fontWeight: 600, color: "#666" }}> ({selectedStudent.address_complement})</span>}
                </div>
                <div style={{ fontWeight: 700, fontSize: 10, color: "#666", marginTop: 2, textTransform: "uppercase" }}>
                  {selectedStudent.address_neighborhood} {selectedStudent.address_neighborhood && "•"} {selectedStudent.address_city}-{selectedStudent.address_state} {selectedStudent.address_zip_code && `[${selectedStudent.address_zip_code}]`}
                </div>
              </div>
            </div>
          </div>

          {selectedStudent.bio && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#666", textTransform: "uppercase", marginBottom: 8 }}>Bio / Observações de Performance</p>
              <div style={{ padding: 20, border: "2px solid #EEE", fontSize: 13, fontWeight: 600, color: "#444", background: "#F9FAFB", lineHeight: 1.5 }}>
                {selectedStudent.bio}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
            <button onClick={() => setIsEditing(true)} className="admin-btn admin-btn-primary" style={{ flex: 1, height: 56 }}>
              <Pencil size={18} /> EDITAR PERFIL
            </button>
            <button onClick={() => handleDelete(selectedStudent.id)} className="admin-btn admin-btn-ghost" style={{ flex: 1, height: 56, color: "#DC2626" }}>
              <Trash2 size={18} /> EXCLUIR ALUNO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
