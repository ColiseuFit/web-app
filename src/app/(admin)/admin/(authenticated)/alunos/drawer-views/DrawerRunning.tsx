/**
 * DrawerRunning: Renderiza o editor de Identidade Corrida dentro do Drawer do aluno.
 *
 * @architecture
 * - Wrapper fino: Apenas posiciona o componente `RunningIdentityEditor` (que já existe)
 *   dentro do layout do Drawer, passando as props necessárias.
 * - A lógica de persistência continua 100% dentro do `RunningIdentityEditor` e
 *   da Server Action `updateStudent`.
 */
"use client";

import RunningIdentityEditor from "../RunningIdentityEditor";
import type { DrawerRunningProps } from "./types";

export default function DrawerRunning({
  selectedStudent,
  setMessage,
  updateStudentAction
}: DrawerRunningProps) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
      <RunningIdentityEditor 
        student={selectedStudent} 
        onUpdate={() => {
          setMessage({ type: "success", text: "Perfil de corrida atualizado!" });
        }} 
        updateStudentAction={updateStudentAction} 
      />
    </div>
  );
}
