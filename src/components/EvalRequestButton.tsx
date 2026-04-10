"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import AccessGate from "./AccessGate";

/**
 * EvalRequestButton
 *
 * Botão de solicitação de avaliação física com suporte a gatekeeping de plano.
 *
 * @behavior
 * - `club_pass`: exibe o botão normalmente, mas ao clicar mostra o AccessGate.
 * - `club_premium`: abre o link do WhatsApp diretamente (comportamento original).
 *
 * @security
 * - `isClubPass`, `whatsappLink` e `upgradeLink` são fornecidos pelo Server Component pai.
 */
interface EvalRequestButtonProps {
  whatsappLink: string;
  upgradeLink: string | null | undefined;
  isClubPass: boolean;
  label?: string;
  size?: number;
}

export function EvalRequestButton({ 
  whatsappLink, 
  upgradeLink, 
  isClubPass, 
  label = "SOLICITAR AVALIAÇÃO", 
  size = 12 
}: EvalRequestButtonProps) {
  const [showGate, setShowGate] = useState(false);

  if (!isClubPass) {
    return (
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-btn"
        style={{ marginTop: "12px" }}
      >
        <MessageCircle size={size} strokeWidth={3} />
        {label}
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowGate(true)}
        className="whatsapp-btn"
        style={{ marginTop: "12px", cursor: "pointer", border: "none" }}
      >
        <MessageCircle size={size} strokeWidth={3} />
        {label}
      </button>

      {showGate && (
        <AccessGate
          isModal
          message="A SOLICITAÇÃO DE AVALIAÇÃO FÍSICA É EXCLUSIVA PARA ATLETAS COM VÍNCULO CLUBE PREMIUM."
          upgradeLink={upgradeLink}
          onClose={() => setShowGate(false)}
        />
      )}
    </>
  );
}

/**
 * EvalGateLink
 *
 * Link estilizado que, para membros `club_pass`, intercepta a navegação e exibe
 * o AccessGate em vez de redirecionar para a página de avaliações.
 */
interface EvalGateLinkProps {
  href: string;
  upgradeLink: string | null | undefined;
  isClubPass: boolean;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function EvalGateLink({ href, upgradeLink, isClubPass, style, children }: EvalGateLinkProps) {
  const [showGate, setShowGate] = useState(false);

  if (!isClubPass) {
    return (
      <a href={href} style={style}>
        {children}
      </a>
    );
  }

  return (
    <>
      <div
        onClick={() => setShowGate(true)}
        style={{ ...style, cursor: "pointer" }}
      >
        {children}
      </div>

      {showGate && (
        <AccessGate
          isModal
          message="O HISTÓRICO DE AVALIAÇÕES FÍSICAS É EXCLUSIVO PARA ATLETAS COM VÍNCULO CLUBE PREMIUM."
          upgradeLink={upgradeLink}
          onClose={() => setShowGate(false)}
        />
      )}
    </>
  );
}

export default EvalRequestButton;
