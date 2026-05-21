import type { Metadata } from "next";
import TvClient from "./TvClient";

export const metadata: Metadata = {
  title: "Coliseu TV | Painel de Treinos e Check-ins",
  description: "Visualização em tempo real dos check-ins e treinos do dia na Arena Coliseu. Atualização contínua e dinâmica.",
};

export default function TvPage() {
  return (
    <main className="student-layout-wrapper">
      <TvClient />
    </main>
  );
}
