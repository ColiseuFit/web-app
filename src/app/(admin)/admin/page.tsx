"use client";

import { useState, useRef } from "react";
import { createStudent } from "../actions";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);
    const result = await createStudent(formData);
    
    if (result?.error) {
      setMessage({ type: "error", text: result.error });
    } else if (result?.success) {
      setMessage({ type: "success", text: "Aluno matriculado com sucesso!" });
      formRef.current?.reset();
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans selection:bg-[var(--red-glow)] selection:text-white pb-24">
      {/* HEADER TÁTICO ADMIN */}
      <header className="sticky top-0 z-50 bg-[var(--surface)]/90 border-b border-[var(--border)] backdrop-blur-xl">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white/5 border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] font-display font-black text-xl leading-none">
              A
            </div>
            <div>
              <div className="font-display text-lg font-black uppercase tracking-tighter leading-none text-[var(--text-dim)]">
                COLISEU <span className="text-[var(--text-muted)]">ADMIN</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-bold text-[var(--text-muted)] tracking-[0.2em] border border-[var(--border)] px-3 py-1 bg-[var(--surface-lowest)] uppercase">
            BALCÃO RECEPÇÃO
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="p-10 max-w-4xl mx-auto">
        <h1 className="font-display text-4xl font-black uppercase tracking-tighter mb-8 flex items-center gap-4">
          <span className="w-2 h-8 bg-[var(--red)]"></span>
          Matricular <span className="text-[var(--red)]">Aluno</span>
        </h1>
        
        <div className="bg-[var(--surface-lowest)] border border-[var(--border)] relative overflow-hidden group">
          {/* Edge line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-[var(--surface-highest)]"></div>
          
          <div className="p-10">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--text-muted)] mb-8 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-white/40"></span> Dados de Acesso e Perfil
            </h2>
            
            <form ref={formRef} action={handleSubmit} className="flex flex-col gap-6">
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">Nome Completo *</label>
                  <input 
                    type="text" 
                    name="full_name" 
                    required 
                    placeholder="Ex: João da Silva" 
                    className="w-full bg-[var(--surface-low)] border border-[var(--border-strong)] p-4 text-[var(--text)] focus:border-[var(--red)] focus:bg-[var(--red-tint)] transition-colors rounded-none outline-none font-medium placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">Nível Inicial do Aluno *</label>
                  <select 
                    name="level" 
                    required 
                    className="w-full bg-[var(--surface-low)] border border-[var(--border-strong)] p-4 text-[var(--text)] focus:border-[var(--red)] focus:bg-[var(--red-tint)] transition-colors rounded-none outline-none font-medium appearance-none"
                  >
                    <option value="Iniciante">INICIANTE</option>
                    <option value="Intermediário">INTERMEDIÁRIO</option>
                    <option value="Avançado">AVANÇADO</option>
                    <option value="Elite">ELITE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">E-mail de Login *</label>
                  <input 
                    type="email" 
                    name="email" 
                    required 
                    placeholder="aluno@email.com" 
                    className="w-full bg-[var(--surface-low)] border border-[var(--border-strong)] p-4 text-[var(--text)] focus:border-[var(--red)] focus:bg-[var(--red-tint)] transition-colors rounded-none outline-none font-medium placeholder:text-[var(--text-muted)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-2">Senha Inicial Temporária *</label>
                  <input 
                    type="text" 
                    name="password" 
                    required 
                    placeholder="Ex: coliseu123" 
                    defaultValue="coliseu123" 
                    className="w-full bg-[var(--surface-low)] border border-[var(--border-strong)] p-4 text-[var(--text)] focus:border-[var(--red)] focus:bg-[var(--red-tint)] transition-colors rounded-none outline-none font-medium placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <hr className="border-t border-[var(--border)] my-4" />

              <div className="flex justify-end items-center">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn-primary w-auto"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 px-8">
                    {loading ? "MATRICULANDO..." : "MATRICULAR ALUNO ➔"}
                  </span>
                </button>
              </div>
            </form>

            {message && (
              <div className={`mt-8 p-5 border flex items-center gap-3 ${
                message.type === "error" 
                  ? "bg-[var(--red-tint)] border-[rgba(227,27,35,0.3)] text-[var(--red)]" 
                  : "bg-green-900/10 border-green-500/30 text-green-500"
              }`}>
                <span className="text-lg leading-none">{message.type === "error" ? "⚠️" : "✅"}</span>
                <span className="text-sm font-bold tracking-wide">{message.text}</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
