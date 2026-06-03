import Image from "next/image";
import { Activity, Camera, Info } from "lucide-react";
import { TabFotosProps } from "./types";

export default function TabFotos({ photos, uploadingPos, handlePhotoUpload, removePhoto }: TabFotosProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "24px" }}>
        {["Frente", "Costas", "Lateral Direita", "Lateral Esquerda", "Postural"].map(pos => {
          const photo = photos.find((p: any) => p.label === pos);
          const isUploading = uploadingPos === pos;

          return (
            <div key={pos} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: "11px", fontWeight: 900, textTransform: "uppercase", color: "#666", letterSpacing: "0.05em" }}>
                {pos}
              </div>
              
              <label style={{ 
                position: "relative",
                aspectRatio: "3/4",
                background: "#F3F4F6",
                border: photo ? "3px solid #000" : "3px dashed #CCC",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                overflow: "hidden",
                transition: "all 0.2s ease"
              }}>
                <input 
                  type="file" 
                  accept="image/*,.heic,.heif" 
                  onChange={(e) => handlePhotoUpload(e, pos)} 
                  style={{ display: "none" }}
                  disabled={!!uploadingPos}
                />

                {photo ? (
                  <>
                    <Image 
                      src={photo.url} 
                      alt={pos} 
                      fill
                      unoptimized
                      style={{ objectFit: "cover" }} 
                    />
                    <div style={{ 
                      position: "absolute", inset: 0, 
                      background: "rgba(0,0,0,0.4)", 
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: 0, transition: "opacity 0.2s",
                    }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button 
                          type="button"
                          onClick={(e) => { e.preventDefault(); removePhoto(photos.indexOf(photo)); }}
                          style={{ background: "#EF4444", color: "#FFF", border: "none", padding: "8px 12px", fontSize: "10px", fontWeight: 900, cursor: "pointer", textTransform: "uppercase" }}
                        >
                          REMOVER
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, color: "#999" }}>
                    {isUploading ? (
                      <>
                        <Activity size={32} className="animate-spin" style={{ color: "#000" }} />
                        <span style={{ fontSize: "10px", fontWeight: 900, color: "#000" }}>PROCESSANDO...</span>
                      </>
                    ) : (
                      <>
                        <div style={{ background: "#FFF", borderRadius: "50%", padding: "20px", border: "2px solid #EEE" }}>
                          <Camera size={32} />
                        </div>
                        <span style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>Clique para enviar</span>
                      </>
                    )}
                  </div>
                )}
              </label>
            </div>
          );
        })}
      </div>

      <div style={{ background: "#000", padding: "20px", color: "#FFF", display: "flex", gap: 16, alignItems: "center" }}>
        <Info size={24} />
        <div style={{ fontSize: "12px", fontWeight: 500, lineHeight: 1.4 }}>
          <strong style={{ display: "block", marginBottom: 4, color: "#FFF" }}>DICA DO COACH:</strong>
          As fotos devem ser tiradas em local bem iluminado, contra um fundo neutro e mantendo a mesma distância da câmera para todas as avaliações.
        </div>
      </div>
    </div>
  );
}
