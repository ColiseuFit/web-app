"use client";

import { useState } from "react";
import { setupPassword } from "../actions";
import { Eye, EyeOff, Loader2, ArrowRight, AlertTriangle } from "lucide-react";

/**
 * Formulário de definição de senha com design premium Neo-Brutalist.
 * 
 * @description
 * Utiliza inline styles para garantir paridade visual 1:1 e evitar conflitos
 * com o CSS global (Iron Monolith Pattern).
 */
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

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await setupPassword(formData);
      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
      setIsLoading(false);
    }
  }

  // Helper styles
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#000",
    marginBottom: "10px",
    marginLeft: "4px"
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    backgroundColor: "#fff",
    border: "3px solid #000",
    padding: "16px 20px",
    fontSize: "16px",
    fontWeight: 700,
    color: "#000",
    outline: "none",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    height: "64px",
    backgroundColor: "#E31B23",
    color: "#fff",
    border: "3px solid #000",
    boxShadow: "6px 6px 0px #000",
    fontSize: "14px",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    cursor: isLoading ? "not-allowed" : "pointer",
    transition: "all 0.1s ease",
    marginTop: "12px",
    opacity: isLoading || password.length < 8 ? 0.7 : 1,
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {error && (
        <div style={{
          backgroundColor: "#fff",
          border: "3px solid #000",
          borderLeft: "8px solid #E31B23",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          boxShadow: "4px 4px 0px rgba(0,0,0,0.1)"
        }}>
          <AlertTriangle size={20} color="#E31B23" />
          <p style={{ fontSize: "12px", fontWeight: 800, color: "#000", textTransform: "uppercase", margin: 0 }}>
            {error}
          </p>
        </div>
      )}

      {/* Field: Password */}
      <div>
        <label style={labelStyle}>Nova Senha</label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={inputStyle}
            onFocus={(e) => e.currentTarget.style.boxShadow = "4px 4px 0px #000"}
            onBlur={(e) => e.currentTarget.style.boxShadow = "none"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "20px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#000",
              padding: "4px"
            }}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Field: Confirm Password */}
      <div>
        <label style={labelStyle}>Confirmar Senha</label>
        <input
          type={showPassword ? "text" : "password"}
          name="confirm_password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
          style={inputStyle}
          onFocus={(e) => e.currentTarget.style.boxShadow = "4px 4px 0px #000"}
          onBlur={(e) => e.currentTarget.style.boxShadow = "none"}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || password.length < 8}
        style={buttonStyle}
        onMouseDown={(e) => {
          if (!isLoading) {
            e.currentTarget.style.transform = "translate(2px, 2px)";
            e.currentTarget.style.boxShadow = "2px 2px 0px #000";
          }
        }}
        onMouseUp={(e) => {
          if (!isLoading) {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "6px 6px 0px #000";
          }
        }}
      >
        {isLoading ? (
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <>
            ATIVAR MINHA CONTA
            <ArrowRight size={20} />
          </>
        )}
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </form>
  );
}
