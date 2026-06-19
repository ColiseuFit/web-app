"use client";

import { useState } from "react";
import { CreditCard, Plus, ShieldCheck, Lock, Trash2, CheckCircle2 } from "lucide-react";
import { addCreditCardFromToken } from "@/lib/actions/pagarme-actions";

export default function WalletClient({
  studentId,
  paymentMethods
}: {
  studentId: string;
  paymentMethods: any[];
}) {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  async function handleMockAddCard(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Em produção, aqui você chamaria o Pagar.me Checkout SDK
    // PagarMeCheckout.generateToken({ card_number: "...", ... })
    // e receberia o token_id.
    
    const formData = new FormData(e.currentTarget);
    const mockToken = "tk_mock_" + Math.random().toString(36).substring(7);
    
    // Identificar a bandeira (Mock simples)
    const cardNumber = formData.get("card_number") as string;
    const isVisa = cardNumber.startsWith("4");
    const brand = isVisa ? "Visa" : "Mastercard";
    const lastFour = cardNumber.slice(-4);

    const result = await addCreditCardFromToken(studentId, mockToken, brand, lastFour);

    if (result.success) {
      setMessage({ type: "success", text: result.message || "Cartão adicionado com sucesso!" });
      setTimeout(() => {
        setIsAddingCard(false);
        window.location.reload();
      }, 2000);
    } else {
      setMessage({ type: "error", text: result.error || "Erro ao adicionar cartão." });
    }

    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6" style={{ paddingBottom: "100px" }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", color: "#FFF", margin: 0 }}>
            Minha Carteira
          </h1>
          <p style={{ fontSize: 13, color: "#A1A1AA", marginTop: 4 }}>
            Gerencie seus cartões para mensalidades e compras
          </p>
        </div>
        {!isAddingCard && (
          <button 
            onClick={() => setIsAddingCard(true)}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "#FFF", color: "#000", padding: "10px 16px", borderRadius: 8, fontWeight: 800, fontSize: 12, textTransform: "uppercase" }}
          >
            <Plus size={16} /> Novo Cartão
          </button>
        )}
      </div>

      {isAddingCard ? (
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 10, background: "rgba(255,255,255,0.1)", borderRadius: "50%" }}>
              <Lock size={20} color="#FFF" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#FFF", margin: 0 }}>Adicionar Cartão de Crédito</h2>
              <p style={{ fontSize: 11, color: "#A1A1AA" }}>Seus dados são criptografados de ponta a ponta (PCI DSS).</p>
            </div>
          </div>

          <form onSubmit={handleMockAddCard} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#A1A1AA", textTransform: "uppercase", marginBottom: 6 }}>
                Número do Cartão
              </label>
              <input 
                type="text" 
                name="card_number"
                placeholder="0000 0000 0000 0000" 
                maxLength={19}
                style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", padding: 14, borderRadius: 8, color: "#FFF", fontSize: 16, outline: "none", letterSpacing: "2px" }} 
                required 
              />
            </div>
            
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#A1A1AA", textTransform: "uppercase", marginBottom: 6 }}>
                Nome Impresso no Cartão
              </label>
              <input 
                type="text" 
                name="card_holder"
                placeholder="EX: JOAO DA SILVA" 
                style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", padding: 14, borderRadius: 8, color: "#FFF", fontSize: 14, outline: "none", textTransform: "uppercase" }} 
                required 
              />
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#A1A1AA", textTransform: "uppercase", marginBottom: 6 }}>
                  Validade
                </label>
                <input 
                  type="text" 
                  name="expiration"
                  placeholder="MM/AA" 
                  maxLength={5}
                  style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", padding: 14, borderRadius: 8, color: "#FFF", fontSize: 14, outline: "none", textAlign: "center" }} 
                  required 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#A1A1AA", textTransform: "uppercase", marginBottom: 6 }}>
                  CVC
                </label>
                <input 
                  type="text" 
                  name="cvc"
                  placeholder="123" 
                  maxLength={4}
                  style={{ width: "100%", background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", padding: 14, borderRadius: 8, color: "#FFF", fontSize: 14, outline: "none", textAlign: "center" }} 
                  required 
                />
              </div>
            </div>

            {message && (
              <div style={{ padding: "12px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: message.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", color: message.type === "error" ? "#FCA5A5" : "#86EFAC", border: `1px solid ${message.type === "error" ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}` }}>
                {message.text}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button 
                type="button" 
                onClick={() => setIsAddingCard(false)} 
                style={{ flex: 1, padding: 14, background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#FFF", fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading}
                style={{ flex: 1, padding: 14, background: "#FFF", border: "none", borderRadius: 8, color: "#000", fontWeight: 800, fontSize: 12, textTransform: "uppercase", display: "flex", justifyContent: "center", alignItems: "center" }}
              >
                {loading ? "Processando..." : "Salvar Cartão Seguramente"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {paymentMethods.length === 0 ? (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 16, padding: 32, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ padding: 16, background: "rgba(255,255,255,0.05)", borderRadius: "50%" }}>
                <CreditCard size={32} color="#A1A1AA" />
              </div>
              <div>
                <p style={{ color: "#FFF", fontWeight: 700, fontSize: 14, margin: 0 }}>Nenhum cartão cadastrado</p>
                <p style={{ color: "#A1A1AA", fontSize: 12, marginTop: 4 }}>Adicione um cartão para evitar interrupção nos seus treinos.</p>
              </div>
            </div>
          ) : (
            paymentMethods.map(card => (
              <div key={card.id} style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, opacity: 0.1 }}>
                  <CreditCard size={120} />
                </div>
                <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#FFF", fontWeight: 900, fontSize: 16, textTransform: "uppercase", letterSpacing: "1px" }}>
                        {card.brand || "CARTÃO"}
                      </span>
                      {card.is_default && (
                        <span style={{ background: "#22C55E", color: "#FFF", fontSize: 9, fontWeight: 900, padding: "2px 6px", borderRadius: 4, textTransform: "uppercase" }}>Principal</span>
                      )}
                    </div>
                    <button style={{ background: "transparent", border: "none", color: "#EF4444", padding: 4, cursor: "pointer" }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: "#FFF", fontSize: 24, letterSpacing: "2px" }}>••••</span>
                    <span style={{ color: "#FFF", fontSize: 24, letterSpacing: "2px" }}>••••</span>
                    <span style={{ color: "#FFF", fontSize: 24, letterSpacing: "2px" }}>••••</span>
                    <span style={{ color: "#FFF", fontSize: 16, fontWeight: 700 }}>{card.last_four}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 16, opacity: 0.5 }}>
            <ShieldCheck size={14} color="#FFF" />
            <span style={{ fontSize: 10, color: "#FFF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>Pagamentos Seguros por Stone / Pagar.me</span>
          </div>
        </div>
      )}
    </div>
  );
}
