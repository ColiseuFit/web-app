"use client";

/**
 * AddCoachDrawer: Modal de Onboarding de Equipe Técnica.
 *
 * @architecture
 * Extraído do ProfessoresClient.tsx para conformidade Anti-Monolith (< 500 linhas).
 * Contém duas abas:
 * 1. Buscar Aluno: Promove um aluno existente a Coach.
 * 2. Novo Cadastro: Cria credenciais + perfil + role de Coach em transação atômica.
 *
 * @lifecycle
 * Utiliza Server Actions (`searchUsersForCoach`, `createNewCoach`) para operações de IAM.
 */

import React, { useState, useTransition, useRef, useEffect } from "react";
import { Search, Plus, UserPlus, Loader2, X, Check } from "lucide-react";
import { searchUsersForCoach, createNewCoach, getCoaches } from "./actions";
import AthleteIdentity from "@/components/Identity/AthleteIdentity";

type Mode = "search" | "create";

interface AddCoachDrawerProps {
  coaches: { user_id: string }[];
  onClose: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
  onRefresh: (coaches: any[]) => void;
  onPromote: (userId: string) => void;
}

export default function AddCoachDrawer({ coaches, onClose, onToast, onRefresh, onPromote }: AddCoachDrawerProps) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("search");

  // Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Create State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  // Real-time search for candidates
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (searchTerm.trim().length < 3) {
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
  }, [searchTerm]);

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return onToast("Preencha os campos obrigatórios", "error");

    const res = await createNewCoach(newName, newEmail, newPhone);
    if (res.success) {
      onToast("Professor cadastrado com sucesso!", "success");
      setCreatedPassword(res.tempPassword || null);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      const updated = await getCoaches();
      if (updated.data) onRefresh(updated.data);
    } else {
      onToast(res.error || "Erro ao cadastrar", "error");
    }
  };

  return (
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
        onClick={onClose} 
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
            onClick={onClose} 
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
                          onClick={() => onPromote(user.id)}
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
  );
}
