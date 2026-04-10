"use client";

/**
 * @component EditHeader
 *
 * Cabeçalho defensivo para a página de edição.
 * Implementa UX de confirmação assistida para prevenir navegação acidental.
 *
 * @security (Navigation Guard — BUG FIX)
 * - Substituímos <Link> por <button onClick={router.push()}>.
 * - No Next.js App Router, e.preventDefault() num onClick de <Link> NÃO cancela
 *   a rota — o Link já despachou a navegação antes do handler ser executado.
 * - Solução correta: controlar toda a navegação via router.push() e só disparar
 *   após obter confirmação explícita do usuário.
 */
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";

interface EditHeaderProps {
  isDirty?: boolean;
}

export default function EditHeader({ isDirty }: EditHeaderProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);

  /**
   * Intercepta a tentativa de voltar para o Perfil.
   * Se houver alterações pendentes (isDirty), exibe o ConfirmModal personalizado.
   */
  const handleBack = () => {
    if (isDirty) {
      setShowConfirm(true);
      return;
    }
    router.push("/profile");
  };

  const onConfirmExit = () => {
    setShowConfirm(false);
    router.push("/profile");
  };

  return (
    <header
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          aria-label="Voltar ao Perfil"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--text-dim)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronLeft size={24} />
        </button>

        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: "16px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}
        >
          EDITAR <span style={{ color: "var(--red)" }}>PERFIL</span>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          title="ALTERAÇÕES NÃO SALVAS"
          message="SE VOCÊ SAIR AGORA, TODAS AS ALTERAÇÕES NO SEU PERFIL SERÃO PERDIDAS. DESEJA CONTINUAR?"
          confirmLabel="SAIR MESMO ASSIM"
          cancelLabel="VOLTAR E SALVAR"
          onConfirm={onConfirmExit}
          onCancel={() => setShowConfirm(false)}
          isDanger={true}
        />
      )}
    </header>
  );
}
