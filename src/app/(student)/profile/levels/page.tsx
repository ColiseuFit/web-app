import { Metadata } from "next";
import LevelsGalleryClient from "./LevelsGalleryClient";

export const metadata: Metadata = {
  title: "Níveis Técnicos",
  description: "Conheça a jornada de progresso e os critérios de nível da Coliseu.",
};

/**
 * Galeria de Níveis (Coliseu Levels).
 * Server component responsável por metadados.
 */
export default function LevelsPage() {
  return <LevelsGalleryClient />;
}
