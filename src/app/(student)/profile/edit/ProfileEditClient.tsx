"use client";

/**
 * @coordinator ProfileEditClient
 * 
 * Este componente atua como o 'Single Source of Truth' para o estado de edição.
 * Ele coordena o fluxo entre o cabeçalho de navegação (EditHeader) e o formulário
 * principal (ProfileForm).
 * 
 * @logic
 * - isDirty: Estado compartilhado que detecta alterações pendentes.
 * - Navigation Guard: Intercepta tentativas de saída para evitar perda de dados.
 */
import { useState } from "react";
import EditHeader from "./EditHeader";
import ProfileForm from "../ProfileForm";
import BottomNav from "@/components/BottomNav";

interface ProfileEditClientProps {
  user: any;
  profile: any;
}

export default function ProfileEditClient({ user, profile }: ProfileEditClientProps) {
  const [isDirty, setIsDirty] = useState(false);

  return (
    <div style={{ backgroundColor: "var(--bg)", color: "var(--text)", fontFamily: "'Inter', sans-serif", minHeight: "100vh", paddingBottom: "100px" }}>
      <EditHeader isDirty={isDirty} />

      <main style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "24px 16px",
      }}>
        <ProfileForm 
          user={user} 
          profile={profile} 
          onDirtyChange={setIsDirty}
        />
      </main>

      <BottomNav />
    </div>
  );
}
