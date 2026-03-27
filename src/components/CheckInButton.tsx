"use client";

import { useState, useEffect } from "react";
import CheckInModal from "./CheckInModal";
import ConfirmModal from "./ConfirmModal";
import { cancelCheckIn } from "@/app/(student)/actions";

interface CheckInButtonProps {
  wodId: string;
  date: string;
  alreadyChecked: boolean;
}

/**
 * Botão de Check-in que abre o modal de seleção de turma.
 * Suporta cancelamento e alteração de horário com modais customizados.
 */
export default function CheckInButton({ wodId, date, alreadyChecked }: CheckInButtonProps) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(alreadyChecked);
  const [loading, setLoading] = useState(false);

  // Sincroniza o estado interno se a prop mudar
  useEffect(() => {
    setDone(alreadyChecked);
  }, [alreadyChecked, wodId]);

  const handleCancel = async () => {
    setShowConfirm(false);
    setLoading(true);
    const result = await cancelCheckIn(wodId);
    setLoading(false);

    if (result.success) {
      setDone(false);
    } else {
      alert(result.error);
    }
  };

  if (done) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.02)",
        borderTop: "1px solid var(--border-glow)",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="material-symbols-outlined" style={{ color: "#4CAF50", fontSize: "20px" }}>check_circle</span>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", color: "#4CAF50", textTransform: "uppercase" }}>
              PRESENÇA CONFIRMADA
            </span>
          </div>
          
          <button
            onClick={() => setShowConfirm(true)}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "9px",
              fontWeight: 700,
              textDecoration: "underline",
              padding: "4px 8px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
              textTransform: "uppercase",
              letterSpacing: "0.1em"
            }}
          >
            {loading ? "CANCELANDO..." : "CANCELAR"}
          </button>
        </div>

        <button
          onClick={() => setOpen(true)}
          style={{
            width: "100%",
            padding: "14px 20px",
            background: "rgba(255,255,255,0.05)",
            border: "none",
            borderTop: "1px solid var(--border-glow)",
            color: "var(--text)",
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>edit</span>
          ALTERAR HORÁRIO
        </button>

        {showConfirm && (
          <ConfirmModal
            title="CANCELAR RESERVA?"
            message="Você perderá sua vaga nesta turma. Tem certeza que deseja cancelar sua presença?"
            confirmLabel="SIM, CANCELAR"
            cancelLabel="VOLTAR"
            onConfirm={handleCancel}
            onCancel={() => setShowConfirm(false)}
            isDanger={true}
          />
        )}

        {open && (
           <CheckInModal
             wodId={wodId}
             date={date}
             onClose={() => setOpen(false)}
             onSuccess={() => {
               setOpen(false);
               setDone(true);
             }}
           />
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "18px 24px",
          background: "var(--red)",
          border: "none",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 900,
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          fontFamily: "var(--font-display)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          boxShadow: "0 0 30px rgba(227,27,35,0.3)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>fitness_center</span>
        RESERVAR TURMA
      </button>

      {open && (
        <CheckInModal
          wodId={wodId}
          date={date}
          onClose={() => setOpen(false)}
          onSuccess={() => {
            setOpen(false);
            setDone(true);
          }}
        />
      )}
    </>
  );
}
