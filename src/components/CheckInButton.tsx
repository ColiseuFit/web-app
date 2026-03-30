"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Edit3, Dumbbell } from "lucide-react";
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
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle size={16} color="#4CAF50" />
                <span style={{ fontSize: "10px", fontWeight: 800, letterSpacing: "0.15em", color: "#4CAF50", textTransform: "uppercase" }}>
                  CHECK-IN REALIZADO
                </span>
              </div>
              <span style={{ fontSize: "8px", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.05em", marginTop: "2px" }}>
                Aguardando validação do Coach para ganhar XP
              </span>
            </div>
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
          <Edit3 size={16} />
          ALTERAR HORÁRIO
        </button>

        {showConfirm && (
          <ConfirmModal
            title="CANCELAR CHECK-IN?"
            message="Você perderá sua vaga nesta turma. Tem certeza que deseja cancelar sua sinalização?"
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
        <Dumbbell size={20} />
        FAZER CHECK-IN
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
