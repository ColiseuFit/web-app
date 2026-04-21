import { SupabaseClient } from "@supabase/supabase-js";
import { USER_ROLES } from "./constants/roles";

/**
 * Determines the default dashboard route for a given user role.
 * 
 * @param role The role name from user_roles table.
 * @returns The target path string.
 */
export function getDefaultRouteForRole(role: string | null | undefined): string {
  if (!role) return "/dashboard"; // Default to student

  switch (role.toLowerCase()) {
    case USER_ROLES.ADMIN:
    case USER_ROLES.RECEPTION:
      return "/admin";
    case USER_ROLES.COACH:
      return "/coach";
    case USER_ROLES.STUDENT:
    default:
      return "/dashboard";
  }
}

/**
 * Server-side utility to fetch the current user's role and its corresponding redirect path.
 * Recommended for use in Server Actions and Route Handlers.
 * 
 * @param supabase The authenticated Supabase server client.
 * @returns {Promise<string>} The path the user should be redirected to.
 */
export async function getRedirectPath(supabase: SupabaseClient): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return "/login";

  // Fetch role from user_roles table
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  return getDefaultRouteForRole(roleData?.role);
}
