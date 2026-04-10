"use client";

import AthleteAvatar from "./AthleteAvatar";
export { AthleteAvatar };
import { getDisplayName } from "@/lib/identity-utils";

interface AthleteIdentityProps {
  // New SSoT style
  profile?: {
    full_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    [key: string]: any;
  } | null;

  // Legacy compatibility props
  full_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  size?: number; // Legacy alias for avatarSize
  subordinateText?: string; // Legacy alias for subtitle

  mode?: "full" | "avatar" | "compact";
  avatarSize?: number;
  showSubtitle?: boolean;
  subtitle?: string;
}

/**
 * AthleteIdentity Component (Iron Monolith SSoT - Polymorphic)
 * 
 * Única fonte de verdade para exibição de identidade de atletas na plataforma.
 * Suporta tanto o novo padrão de objeto 'profile' quanto propriedades individuais legadas.
 */
export function AthleteIdentity({ 
  profile,
  full_name,
  display_name,
  avatar_url,
  size,
  subordinateText,
  mode = "full", 
  avatarSize = 32,
  showSubtitle = false,
  subtitle
}: AthleteIdentityProps) {
  // Merge to effective profile
  const effectiveProfile = profile || {
    full_name,
    display_name,
    avatar_url
  };

  const currentName = getDisplayName(effectiveProfile);
  const currentAvatarUrl = effectiveProfile?.avatar_url;
  const effectiveAvatarSize = avatarSize || size || 32;
  
  // Logic for subtitle: legacy 'subordinateText' or new 'subtitle'
  const displaySubtitle = subtitle || subordinateText || (profile ? (profile?.email || "Atleta") : "");
  const shouldShowSubtitle = showSubtitle || !!subordinateText || (!!subtitle);

  if (mode === "avatar") {
    return <AthleteAvatar url={currentAvatarUrl} name={currentName} size={effectiveAvatarSize} />;
  }

  return (
    <div style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: mode === "compact" ? "8px" : "12px" 
    }}>
      <AthleteAvatar url={currentAvatarUrl} name={currentName} size={effectiveAvatarSize} />
      
      {mode !== "avatar" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ 
            fontSize: mode === "compact" ? "11px" : "13px", 
            fontWeight: 800, 
            color: "#000",
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
            lineHeight: 1
          }}>
            {currentName}
          </span>
          
          {shouldShowSubtitle && displaySubtitle && (
            <span style={{ 
              fontSize: "10px", 
              fontWeight: 600, 
              color: "#666", 
              textTransform: "uppercase",
              marginTop: "4px"
            }}>
              {displaySubtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default AthleteIdentity;
