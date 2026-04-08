import { ShieldCheck, Dumbbell } from "lucide-react";
import VerifyButton from "./VerifyButton";

export const metadata = {
  title: "Ativar Conta | Coliseu",
  description: "Ative sua conta para começar seus treinos no Coliseu.",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  const { link } = await searchParams;

  if (!link) {
    return (
    <main style={{
      minHeight: "100dvh",
      backgroundColor: "#f5f5f5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{
          backgroundColor: "#ffffff",
          border: "3px solid #000000",
          boxShadow: "10px 10px 0px #000000",
          overflow: "hidden",
        }}>
          {/* Header preto */}
          <div style={{
            backgroundColor: "#000000",
            padding: "36px 40px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}>
            <div style={{
              width: "72px", height: "72px",
              backgroundColor: "#E31B23",
              border: "3px solid #fff",
              boxShadow: "5px 5px 0px rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: "rotate(-3deg)",
            }}>
              <ShieldCheck size={36} color="#fff" />
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "42px", fontWeight: 900, color: "#fff", letterSpacing: "-2px", lineHeight: 0.9, textTransform: "uppercase" }}>LINK</div>
              <div style={{ fontSize: "42px", fontWeight: 900, color: "#E31B23", letterSpacing: "-2px", lineHeight: 0.95, textTransform: "uppercase" }}>INVÁLIDO</div>
            </div>
          </div>
          {/* Corpo */}
          <div style={{ padding: "36px 40px 40px" }}>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#333", lineHeight: 1.6, marginBottom: "12px" }}>
              Acesse através do botão enviado no seu e-mail de boas-vindas.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#888", marginTop: "24px" }}>
              <ShieldCheck size={14} />
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>Verificação Protegida</span>
            </div>
          </div>
        </div>
        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#999" }}>
          Coliseu Fitness &amp; Performance © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
  }

  return (
    <main style={{
      minHeight: "100dvh",
      backgroundColor: "#f5f5f5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "'Outfit', 'Inter', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>

        {/* Card Principal */}
        <div style={{
          backgroundColor: "#ffffff",
          border: "3px solid #000000",
          boxShadow: "10px 10px 0px #000000",
          overflow: "hidden",
        }}>

          {/* Topo colorido */}
          <div style={{
            backgroundColor: "#000000",
            padding: "36px 40px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}>
            {/* Badge do ícone */}
            <div style={{
              width: "72px", height: "72px",
              backgroundColor: "#E31B23",
              border: "3px solid #fff",
              boxShadow: "5px 5px 0px rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: "rotate(-3deg)",
            }}>
              <Dumbbell size={36} color="#fff" />
            </div>

            {/* Título */}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: "48px",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-2px",
                lineHeight: 0.9,
                textTransform: "uppercase",
              }}>
                QUASE
              </div>
              <div style={{
                fontSize: "56px",
                fontWeight: 900,
                color: "#E31B23",
                letterSpacing: "-2px",
                lineHeight: 0.9,
                textTransform: "uppercase",
              }}>
                LÁ!
              </div>
            </div>
          </div>

          {/* Corpo do card */}
          <div style={{ padding: "36px 40px 40px" }}>
            <p style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#333333",
              lineHeight: 1.6,
              marginBottom: "32px",
            }}>
              Você foi aprovado no Coliseu! Clique abaixo para ativar sua conta e definir sua senha de acesso.
            </p>

            <VerifyButton link={link} />

            {/* Badge de segurança */}
            <div style={{
              marginTop: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "#888",
            }}>
              <ShieldCheck size={14} />
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Verificação Protegida
              </span>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <p style={{
          textAlign: "center",
          marginTop: "24px",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#999",
        }}>
          Coliseu Fitness &amp; Performance © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
