"use client";

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
