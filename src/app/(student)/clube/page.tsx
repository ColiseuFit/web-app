import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ClubeClient from "./ClubeClient";
import { getBoxSettings } from "@/lib/constants/settings_actions";

export const metadata: Metadata = {
  title: "Comunidade",
  description: "Ranking de Pontos e Feed de Atividades da Comunidade Coliseu.",
};

/**
 * Clube Page (Server Component)
 *
 * @security
 * - Acesso bloqueado (Paywall/Gate) para membros `club_pass`.
 * - A checagem é feita no servidor para evitar flash de conteúdo restrito no cliente.
 */
export default async function ClubePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // SSoT: Checagem do Tipo de Plano e Configurações
  const [
    { data: profile },
    boxSettings
  ] = await Promise.all([
    supabase.from("profiles").select("membership_type").eq("id", user.id).single(),
    getBoxSettings()
  ]);

  const isClubPass = profile?.membership_type === "club_pass";
  
  // Link de Upgrade (WhatsApp)
  const rawWhatsApp = boxSettings?.box_whatsapp || "";
  const whatsappNumber = rawWhatsApp.replace(/\D/g, "");
  const upgradeLink = whatsappNumber
    ? `https://wa.me/55${whatsappNumber}?text=${encodeURIComponent("Olá! Gostaria de saber mais sobre como fazer o upgrade para o Plano Clube Premium.")}`
    : null;

  return <ClubeClient isClubPass={isClubPass} upgradeLink={upgradeLink} />;
}
