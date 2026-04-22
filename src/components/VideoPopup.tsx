"use client";

import { useEffect, useState } from "react";
import { X, PlayCircle } from "lucide-react";

/**
 * VIDEO POPUP COMPONENT (Neo-Brutalist)
 * 
 * @architecture
 * - Iron Monolith Style: 4px black borders, solid shadows, bold typography.
 * - Responsive: Adapts to mobile screens with auto-height video.
 * - State Management: Uses localStorage to track if a specific video has been seen.
 */

interface VideoPopupProps {
  videoId: string; // Used for localStorage key tracking
  videoUrl: string; // Supports YouTube/Vimeo embed or direct MP4
  title?: string;
  autoPlay?: boolean;
  onClose?: () => void;
}

export default function VideoPopup({
  videoId,
  videoUrl,
  title = "CONTEÚDO EXCLUSIVO",
  autoPlay = false,
  onClose
}: VideoPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check if video was already seen
  useEffect(() => {
    const hasSeen = localStorage.getItem(`video_seen_${videoId}`);
    if (!hasSeen) {
      // Small delay to show after initial dashboard animations
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [videoId]);

  // Lock scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(`video_seen_${videoId}`, "true");
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  // Determine if it's an embed or direct link
  const isEmbed = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") || videoUrl.includes("vimeo.com");
  
  // Format YouTube URL for embed if needed
  let finalUrl = videoUrl;
  if (videoUrl.includes("youtube.com/watch?v=")) {
    finalUrl = videoUrl.replace("watch?v=", "embed/");
  } else if (videoUrl.includes("youtu.be/")) {
    finalUrl = videoUrl.replace("youtu.be/", "youtube.com/embed/");
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(10px)",
      zIndex: 4000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      animation: "fadeIn 0.3s ease-out forwards"
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}} />

      <div style={{
        backgroundColor: "#FFFFFF",
        border: "4px solid #000000",
        width: "100%",
        maxWidth: "400px", // Otimizado para vertical
        position: "relative",
        boxShadow: "16px 16px 0px 0px rgba(0,0,0,1)",
        animation: "scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        display: "flex",
        flexDirection: "column",
        maxHeight: "90vh"
      }}>
        
        {/* Close Button Flutuante (Minimalista) */}
        <button 
          onClick={handleClose}
          style={{
            position: "absolute",
            top: "-20px",
            right: "-20px",
            background: "#E31B23",
            border: "4px solid #000",
            color: "#FFF",
            cursor: "pointer",
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            boxShadow: "4px 4px 0px #000",
            transition: "transform 0.1s"
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1) rotate(90deg)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1) rotate(0deg)"}
        >
          <X size={24} strokeWidth={3} />
        </button>

        {/* Video Container (Vertical 9:16) */}
        <div style={{
          width: "100%",
          backgroundColor: "#000",
          aspectRatio: "9 / 16",
          position: "relative",
          overflow: "hidden"
        }}>
          {!isLoaded && (
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "12px",
              color: "#666"
            }}>
              <div style={{ 
                width: "40px", 
                height: "40px", 
                border: "4px solid #333", 
                borderTopColor: "#E31B23", 
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
              <span style={{ fontSize: "10px", fontWeight: 900, letterSpacing: "0.1em" }}>CARREGANDO VÍDEO...</span>
            </div>
          )}
          
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}} />

          {isEmbed ? (
            <iframe
              src={`${finalUrl}${finalUrl.includes('?') ? '&' : '?'}autoplay=${autoPlay ? 1 : 0}&modestbranding=1`}
              style={{ width: "100%", height: "100%", border: "none" }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={() => setIsLoaded(true)}
            />
          ) : (
            <video
              src={videoUrl}
              autoPlay={autoPlay}
              controls
              style={{ width: "100%", height: "100%" }}
              onLoadedData={() => setIsLoaded(true)}
            />
          )}
        </div>

        {/* Footer / Action */}
        <div style={{ padding: "24px", background: "#F9F9F9" }}>
          <button
            onClick={handleClose}
            style={{
              width: "100%",
              padding: "16px",
              background: "#000",
              color: "#FFF",
              border: "3px solid #000",
              fontWeight: 900,
              fontSize: "13px",
              letterSpacing: "0.1em",
              cursor: "pointer",
              textTransform: "uppercase",
              boxShadow: "4px 4px 0px #E31B23",
              transition: "all 0.1s"
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translate(-2px, -2px)";
              e.currentTarget.style.boxShadow = "6px 6px 0px #E31B23";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "4px 4px 0px #E31B23";
            }}
          >
            ENTENDI, VAMOS TREINAR!
          </button>
        </div>
      </div>
    </div>
  );
}
