"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { getInitials } from "@/lib/identity-utils";

interface AthleteAvatarProps {
  profile?: {
    avatar_url?: string | null;
    display_name?: string | null;
    full_name?: string | null;
    [key: string]: any;
  } | null;
  url?: string | null;
  name?: string | null;
  size?: number;
  borderWidth?: number;
  shadowSize?: number;
  rounded?: boolean;
}

/**
 * AthleteAvatar Component (Iron Monolith SSoT)
 * 
 * Centraliza o design Neo-Brutalista de avatares com fallback automático.
 */
export default function AthleteAvatar({ 
  profile,
  url, 
  name, 
  size = 40,
  borderWidth = 2,
  shadowSize = 2,
  rounded = false
}: AthleteAvatarProps) {
  const [error, setError] = useState(false);
  const effectiveUrl = url || profile?.avatar_url;
  const effectiveName = name || profile?.display_name || profile?.full_name || "";
  const initials = getInitials(effectiveName);

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    background: "#F9F9F9",
    border: `${borderWidth}px solid #000`,
    boxShadow: shadowSize > 0 ? `${shadowSize}px ${shadowSize}px 0px #000` : "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: rounded ? "50%" : "0px",
    position: "relative" as const,
  };

  // Se não tem URL ou deu erro, mostra iniciais ou ícone
  if (!effectiveUrl || error) {
    return (
      <div style={containerStyle} title={effectiveName || "Atleta"}>
        {effectiveName ? (
          <span style={{ 
            fontSize: `${size / 2.5}px`, 
            fontWeight: 900, 
            color: "#000",
            letterSpacing: "-0.02em"
          }}>
            {initials}
          </span>
        ) : (
          <User size={size * 0.5} style={{ color: "#CCC" }} />
        )}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <img
        src={effectiveUrl}
        alt={effectiveName || "Avatar"}
        onError={() => setError(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover" as const,
          filter: "grayscale(100%) contrast(1.1)",
        }}
      />
    </div>
  );
}
