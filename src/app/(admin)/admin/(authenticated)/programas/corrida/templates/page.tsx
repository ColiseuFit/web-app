import React from "react";
import { createClient , getAuthUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import TemplatesClient from "./TemplatesClient"; // Componente cliente para gerenciar os forms

export default async function RunningTemplatesPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

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
    <div className="admin-page-fill" style={{ padding: "40px", background: "#F9F9F9", minHeight: "100vh" }}>
      <TemplatesClient initialTemplates={templates || []} />
    </div>
  );
}
