import { Metadata } from "next";
import ClubeClient from "./ClubeClient";

export const metadata: Metadata = {
  title: "Comunidade",
  description: "Ranking de XP e Feed de Atividades da Comunidade Coliseu.",
};

/**
 * Página do Clube (Comunidade).
 * Server component responsável por metadados e renderização do cliente.
 */
export default function ClubePage() {
  return <ClubeClient />;
}
