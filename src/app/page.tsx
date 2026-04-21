import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRedirectPath } from "@/lib/auth-redirection";

/**
 * Root Landing Page (V2).
 * 
 * @logic
 * - If user session exists: Redirect to their corresponding portal (Admin/Coach/Student).
 * - Otherwise: Redirect to authentication portal (/login).
 */
export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const redirectPath = await getRedirectPath(supabase);
    redirect(redirectPath);
  }

  redirect("/login");
}
