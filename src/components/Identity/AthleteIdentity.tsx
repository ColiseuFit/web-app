"use client";

import AthleteAvatar from "./AthleteAvatar";
import { getDisplayName } from "@/lib/identity-utils";

interface AthleteIdentityProps {
  profile: {
    full_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    [key: string]: any;
  } | null;
  mode?: "full" | "avatar" | "compact";
  avatarSize?: number;
  showSubtitle?: boolean;
  subtitle?: string;
}

/**
 * AthleteIdentity Component (Iron Monolith SSoT)
 * 
 * Única fonte de verdade para exibição de identidade de atletas na plataforma.
 */
export default function AthleteIdentity({ 
  profile, 
  mode = "full", 
  avatarSize = 32,
  showSubtitle = false,
  subtitle
}: AthleteIdentityProps) {
  const name = getDisplayName(profile);

  if (mode === "avatar") {
    return <AthleteAvatar url={profile?.avatar_url} name={name} size={avatarSize} />;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <AthleteAvatar url={profile?.avatar_url} name={name} size={avatarSize} />
      
      {mode !== "compact" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ 
            fontSize: "13px", 
            fontWeight: 800, 
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
            lineHeight: 1
          }}>
            {name}
          </span>
          
          {(showSubtitle || subtitle) && (
            <span style={{ 
              fontSize: "10px", 
              fontWeight: 600, 
              color: "#666", 
              textTransform: "uppercase",
              marginTop: "4px"
            }}>
              {subtitle || profile?.email || "Atleta"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
