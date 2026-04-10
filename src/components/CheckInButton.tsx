"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Edit3, Dumbbell, AlertTriangle, Trophy } from "lucide-react";
import Link from "next/link";
import CheckInModal from "./CheckInModal";
import ConfirmModal from "./ConfirmModal";
import AlertModal from "./AlertModal";
import { cancelCheckIn } from "@/app/(student)/actions";
import { EvalGateLink } from "./EvalRequestButton";

interface CheckInButtonProps {
  wodId: string;
  date: string;
  alreadyChecked: boolean;
  status?: string;
  result?: string | null;
  isClassFinished?: boolean;
  holiday?: any;
  time?: string | null;
  membershipType?: string | null;
  upgradeLink?: string | null;
}

/**
 * CheckInButton: O ponto focal de interação do Aluno com o Box.
 * Implementa lógica visual complexa para refletir o estado de frequência em tempo real.
 * 
 * @design
 * - Neo-Brutalist Light (Iron Monolith): Bordas de 3px, sombras duras e cores vibrantes.
 * - Estados Feedback: "FAZER CHECKIN" (Azul), "CONFIRMADO" (Verde), "AULA CONCLUÍDA" (Preto/Cinza).
 * 
 * @logic-ssot
 * - Se `checkin.isClassFinished` for true: O botão entra em estado "AULA CONCLUÍDA" e bloqueia alterações de horário.
 * - Caso contrário: Aluno pode alterar horário através do `CheckInModal`.
 * 
 * @param {CheckInButtonProps} props - Dados de estado local e handlers de ação.
 */
export default function CheckInButton({ wodId, date, alreadyChecked, status, result, isClassFinished, holiday, time, membershipType, upgradeLink }: CheckInButtonProps) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(alreadyChecked);
  const [loading, setLoading] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

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
      setAlertMsg(result.error || "Erro ao cancelar check-in. Tente novamente.");
    }
  };

  if (holiday) {
    return (
      <div style={{
        width: "100%",
        padding: "18px 24px",
        background: "#0a0a0a",
        borderTop: "1px solid rgba(220, 38, 38, 0.4)",
        color: "#666",
        fontSize: "11px",
        fontWeight: 900,
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        cursor: "not-allowed",
        fontFamily: "var(--font-display)"
      }}>
        <AlertTriangle size={20} color="#DC2626" />
        {holiday.description ? holiday.description.toUpperCase() : "BOX FECHADO"}
      </div>
    );
  }

  if (done) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderTop: "3px solid #000",
        padding: "24px",
        gap: "16px"
      }}>
        {/* Status Card */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "20px",
          background: isClassFinished ? "rgba(184, 134, 11, 0.05)" : "rgba(76, 175, 80, 0.05)",
          border: "2px solid #000",
          boxShadow: "4px 4px 0px #000",
          position: "relative",
          overflow: "hidden"
        }}>
          {/* Marca d'água discreta de fundo */}
          <div style={{
            position: "absolute",
            right: "-10px",
            bottom: "-10px",
            opacity: 0.05,
            transform: "rotate(-15deg)"
          }}>
            <Dumbbell size={80} color="#000" />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: isClassFinished ? "#B8860B" : "#4CAF50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #000"
              }}>
                <CheckCircle size={18} color="#fff" />
              </div>
              <span style={{ 
                fontSize: "14px", 
                fontWeight: 900, 
                letterSpacing: "0.1em", 
                color: "#000", 
                textTransform: "uppercase",
                fontFamily: "var(--font-display)"
              }}>
                {isClassFinished ? "AULA CONCLUÍDA" : `CHECKIN PARA AS ${time || "--:--"}`}
              </span>
            </div>

            {!isClassFinished && (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={loading}
                style={{
                  background: "#000",
                  border: "none",
                  color: "#fff",
                  fontSize: "9px",
                  fontWeight: 900,
                  padding: "6px 12px",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  fontFamily: "var(--font-display)"
                }}
              >
                {loading ? "..." : "CANCELAR"}
              </button>
            )}
          </div>
          
          <div style={{ 
            fontSize: "10px", 
            fontWeight: 700, 
            color: "#444", 
            lineHeight: "1.4",
            maxWidth: "80%"
          }}>
            {isClassFinished 
              ? (result 
                  ? "Score registrado! Veja seu histórico e evolução na aba de Atividades."
                  : "Aula finalizada! Clique no botão abaixo para lançar seu desempenho.")
              : `Sua vaga está garantida para a aula das ${time || "--:--"}. Você pode alterar seu horário até o início da aula.`}
          </div>
        </div>

        {/* Botão de Ação Principal (Mudar Horário ou Registrar Resultado) */}
        {isClassFinished && !result && (
          <EvalGateLink
            href="/treinos"
            isClubPass={membershipType === 'club_pass'}
            upgradeLink={upgradeLink}
            style={{ width: "100%", textDecoration: "none" }}
          >
            <div
              style={{
                width: "100%",
                padding: "20px",
                background: "var(--nb-yellow, #FFEF61)",
                border: "2px solid #000",
                boxShadow: "6px 6px 0px #000",
                color: "#000",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                transition: "transform 0.1s ease, box-shadow 0.1s ease",
                fontFamily: "var(--font-display)",
                marginTop: "8px"
              }}
            >
              <Trophy size={18} />
              REGISTRAR MEU RESULTADO
            </div>
          </EvalGateLink>
        )}

        {isClassFinished && result && (
           <EvalGateLink
            href="/treinos"
            isClubPass={membershipType === 'club_pass'}
            upgradeLink={upgradeLink}
            style={{ width: "100%", textDecoration: "none" }}
          >
            <div
              style={{
                width: "100%",
                padding: "20px",
                background: "#FFF",
                border: "2px solid #000",
                boxShadow: "6px 6px 0px #000",
                color: "#000",
                fontSize: "13px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "12px",
                fontFamily: "var(--font-display)",
                marginTop: "8px"
              }}
            >
              <Trophy size={18} color="#B8860B" strokeWidth={3} />
              <span>MEU SCORE: <strong style={{ color: "var(--nb-red, #E31B23)" }}>{result}</strong></span>
            </div>
          </EvalGateLink>
        )}
        {!isClassFinished && (
          <button
            onClick={() => setOpen(true)}
            style={{
              width: "100%",
              padding: "20px",
              background: "#fff",
              border: "2px solid #000",
              boxShadow: "6px 6px 0px #000",
              color: "#000",
              fontSize: "13px",
              fontWeight: 900,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              transition: "transform 0.1s ease, box-shadow 0.1s ease",
              fontFamily: "var(--font-display)",
              marginTop: "8px"
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = "translate(2px, 2px)";
              e.currentTarget.style.boxShadow = "4px 4px 0px #000";
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "translate(0, 0)";
              e.currentTarget.style.boxShadow = "6px 6px 0px #000";
            }}
          >
            <Edit3 size={18} />
            MUDAR MEU HORÁRIO
          </button>
        )}

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

        {alertMsg && (
          <AlertModal
            type="error"
            title="AÇÃO BLOQUEADA"
            message={alertMsg}
            buttonLabel="ENTENDI"
            onClose={() => setAlertMsg(null)}
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

      {alertMsg && (
        <AlertModal
          type="error"
          title="CHECK-IN BLOQUEADO"
          message={alertMsg}
          buttonLabel="ENTENDI"
          onClose={() => setAlertMsg(null)}
        />
      )}
    </>
  );
}
