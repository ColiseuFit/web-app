import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Root Landing Page (V2).
 * 
 * @logic
 * - If user session exists: Redirect to student dashboard (/app).
 * - Otherwise: Redirect to authentication portal (/login).
 */
export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  redirect("/login");
}
