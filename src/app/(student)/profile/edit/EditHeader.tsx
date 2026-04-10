"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface EditHeaderProps {
  isDirty?: boolean;
}

export default function EditHeader({ isDirty }: EditHeaderProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    if (isDirty) {
      const confirm = window.confirm("VOCÊ TEM ALTERAÇÕES NÃO SALVAS. SE SAIR AGORA, ELAS SERÃO PERDIDAS. DESEJA CONTINUAR?");
      if (!confirm) {
        e.preventDefault();
        return;
      }
    }
  };

  return (
    <header style={{
      background: "var(--surface)",
      borderBottom: "1px solid var(--border)",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "16px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}>
        <Link 
          href="/profile" 
          onClick={handleBack}
          style={{ 
            textDecoration: "none",
            color: "var(--text-dim)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ChevronLeft size={24} />
        </Link>
        
        <div style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: "16px",
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: "-0.02em",
        }}>
          EDITAR <span style={{ color: "var(--red)" }}>PERFIL</span>
        </div>
      </div>
    </header>
  );
}
