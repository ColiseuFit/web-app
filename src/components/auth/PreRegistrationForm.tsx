"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { createPreRegistration } from "@/app/(auth)/actions";

interface PreRegistrationFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function PreRegistrationForm({ onBack, onSuccess }: PreRegistrationFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [phone, setPhone] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    // Mask: (00) 00000-0000
    if (value.length > 7) {
      value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
      value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
      value = `(${value}`;
    }
    setPhone(value);
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await createPreRegistration(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setLoading(false);
      setIsSuccess(true);
      // Wait a bit before calling external success
      setTimeout(() => {
        onSuccess();
      }, 5000);
    }
  }

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "40px 20px",
          gap: "24px",
          height: "100%"
        }}
      >
        <div style={{
          width: "64px",
          height: "64px",
          background: "#E31B23",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(45deg)",
          marginBottom: "12px"
        }}>
          <ShieldCheck size={32} color="white" style={{ transform: "rotate(-45deg)" }} />
        </div>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>
            Solicitação Enviada!
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: "1.6", maxWidth: "280px", margin: "0 auto" }}>
            Recebemos seu pré-cadastro. Nossa equipe entrará em contato via WhatsApp em breve para finalizar sua matrícula.
          </p>
        </div>
        <div style={{ marginTop: "20px" }}>
          <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Redirecionando...
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="pre-register-form"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col flex-1"
    >
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="group"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "rgba(255,255,255,0.6)",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          marginBottom: "24px",
          padding: 0,
          transition: "color 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = "white"}
        onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        VOLTAR
      </button>

      <form action={handleSubmit} className="flex flex-col flex-1" style={{ gap: "20px" }}>
        
        <div style={{ padding: "0 0 8px 0" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 900, fontFamily: "Outfit, sans-serif", color: "white", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" }}>Primeiro Acesso</h2>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", margin: 0 }}>Preencha seus dados para iniciar.</p>
        </div>

        {/* Nome */}
        <div>
          <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
            Nome Completo *
          </label>
          <input
            type="text"
            name="full_name"
            required
            autoFocus
            maxLength={100}
            placeholder="Seu nome"
            style={{
              width: "100%",
              background: "#0A0A0A",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "16px",
              fontSize: "16px",
              color: "white",
              outline: "none",
              fontFamily: "Inter, sans-serif",
              transition: "border-color 0.3s",
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "#E31B23"}
            onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        </div>

        {/* E-mail & Phone Row */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
              E-mail *
            </label>
            <input
              type="email"
              name="email"
              required
              maxLength={150}
              placeholder="seu@email.com"
              style={{
                width: "100%",
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "16px",
                fontSize: "16px",
                color: "white",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                transition: "border-color 0.3s",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#E31B23"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
            />
          </div>
          <div className="flex-1">
            <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
              WhatsApp *
            </label>
            <input
              type="tel"
              name="phone"
              required
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              style={{
                width: "100%",
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "16px",
                fontSize: "16px",
                color: "white",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                transition: "border-color 0.3s",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#E31B23"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
            />
          </div>
        </div>

        {/* CPF & Nascimento */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
              CPF (Opcional)
            </label>
            <input
              type="text"
              name="cpf"
              maxLength={14}
              placeholder="000.000.000-00"
              style={{
                width: "100%",
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "16px",
                fontSize: "16px",
                color: "white",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                transition: "border-color 0.3s",
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = "#E31B23"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
            />
          </div>
          <div className="flex-1">
            <label style={{ display: "block", fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.7)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "8px" }}>
              Nascimento
            </label>
            <input
              type="date"
              name="birth_date"
              style={{
                width: "100%",
                background: "#0A0A0A",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "16px",
                fontSize: "16px",
                color: "white",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                transition: "border-color 0.3s",
              }}
              className="appearance-none"
              onFocus={(e) => e.currentTarget.style.borderColor = "#E31B23"}
              onBlur={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
            />
          </div>
        </div>


        {/* Error */}
        {error && (
          <div style={{ padding: "10px 14px", borderLeft: "2px solid #E31B23", background: "rgba(227,27,35,0.05)", color: "#E31B23", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {error}
          </div>
        )}
        
        <div className="flex-1" />

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="group relative overflow-hidden"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "white",
            color: "#050505",
            border: "none",
            fontSize: "12px",
            fontFamily: "Outfit, sans-serif",
            fontWeight: 900,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.5 : 1,
            transition: "all 0.2s",
            marginTop: "12px",
          }}
          onMouseEnter={(e) => { 
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.background = "#E31B23"; 
              (e.currentTarget as HTMLButtonElement).style.color = "white"; 
            }
          }}
          onMouseLeave={(e) => { 
            (e.currentTarget as HTMLButtonElement).style.background = "white";
            (e.currentTarget as HTMLButtonElement).style.color = "#050505";
          }}
        >
          <span className="relative z-10">{loading ? "ENVIANDO..." : "ENVIAR PRÉ-CADASTRO"}</span>
          <ArrowRight size={18} className="relative z-10" />
        </button>
      </form>
    </motion.div>
  );
}
