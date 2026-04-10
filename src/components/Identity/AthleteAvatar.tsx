"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { getInitials } from "@/lib/identity-utils";

interface AthleteAvatarProps {
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
  url, 
  name, 
  size = 40,
  borderWidth = 2,
  shadowSize = 2,
  rounded = false
}: AthleteAvatarProps) {
  const [error, setError] = useState(false);
  const initials = getInitials(name || "");

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
  if (!url || error) {
    return (
      <div style={containerStyle} title={name || "Atleta"}>
        {name ? (
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
        src={url}
        alt={name || "Avatar"}
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
