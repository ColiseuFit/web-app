import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import TemplatesClient from "./TemplatesClient"; // Componente cliente para gerenciar os forms

export default async function RunningTemplatesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verificar permissão
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!roleData || !["admin", "coach"].includes(roleData.role)) {
    redirect("/admin");
  }

  // Buscar templates base
  const { data: templates } = await supabase
    .from("running_templates")
    .select("*, running_template_workouts(*)")
    .order("created_at", { ascending: false });

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        <Link href="/admin/running" style={{ 
          padding: "8px", 
          background: "#000", 
          color: "#FFF", 
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 950, margin: 0, textTransform: "uppercase" }}>Planilhas Padrão</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#666" }}>Crie e gerencie as planilhas base de corrida que podem ser atribuídas aos alunos.</p>
        </div>
      </div>

      <TemplatesClient initialTemplates={templates || []} />
    </div>
  );
}
