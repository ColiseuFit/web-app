"use client";

import { useState } from "react";
import { setupPassword } from "../actions";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";

export default function SetupPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await setupPassword(formData);
      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      }
      // O redirecionamento é feito via Server Action em caso de sucesso
    } catch (err) {
      setError("Ocorreu um erro inesperado. Tente novamente.");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-[var(--nb-red)] border-[2px] border-black text-white text-[10px] font-black p-3 shadow-[var(--nb-shadow-sm)] text-center uppercase tracking-widest">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-1">Nova Senha</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
            className="w-full bg-white border-[3px] border-black px-5 py-4 text-black placeholder:text-gray-400 focus:outline-none focus:bg-[var(--nb-surface-low)] transition-all font-bold"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-black hover:text-[var(--nb-red)] transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black text-black uppercase tracking-[0.2em] ml-1">Confirmar Senha</label>
        <input
          type={showPassword ? "text" : "password"}
          name="confirm_password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita sua senha"
          required
          className="w-full bg-white border-[3px] border-black px-5 py-4 text-black placeholder:text-gray-400 focus:outline-none focus:bg-[var(--nb-surface-low)] transition-all font-bold"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || password.length < 8}
        className="w-full h-16 bg-[var(--nb-red)] text-white border-[3px] border-black shadow-[var(--nb-shadow)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 uppercase font-black text-sm tracking-[0.2em] mt-2 group"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            ATIVAR MINHA CONTA
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </>
        )}
      </button>
    </form>
  );
}
