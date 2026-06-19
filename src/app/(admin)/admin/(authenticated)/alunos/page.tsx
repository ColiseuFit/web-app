import { redirect } from "next/navigation";

export default function AlunosRootPage() {
  redirect("/admin/alunos/lista");
}
