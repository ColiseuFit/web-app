import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Global Authentication & Session Proxy (Next.js 16).
 * 
 * @standards
 * - Migrated from `middleware` to `proxy` per Next.js 16 standards.
 * - Updates Supabase sessions and handles protected route redirects.
 * - Consolidates logic to avoid external dependency issues.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This is required for Server Components to have the correct user session
  const { data: { user } } = await supabase.auth.getUser();

  const hostname = request.headers.get("host") || "";
  const path = request.nextUrl.pathname;
  const url = request.nextUrl.clone();
  let isRewritten = false;

  // 1. DOMAIN ROUTING: Admin
  if (hostname.startsWith('admin.coliseufit.com') || hostname.startsWith('admin.localhost')) {
    if (path === '/login') {
      url.pathname = '/admin-portal';
      isRewritten = true;
    } else if (path === '/') {
      url.pathname = '/admin';
      isRewritten = true;
    } else if (
      !path.startsWith('/admin') && 
      !path.startsWith('/admin-portal') && 
      !path.startsWith('/coach') && 
      !path.startsWith('/coach-portal')
    ) {
      url.pathname = `/admin${path}`;
      isRewritten = true;
    }
  }

  // 2. DOMAIN ROUTING: Student (Clube)
  if (hostname.startsWith('clube.coliseufit.com') || hostname.startsWith('clube.localhost')) {
    if (path.startsWith('/admin') || path.startsWith('/admin-portal')) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      return NextResponse.redirect(redirectUrl);
    }
  }

  // PATH de intenção: avalia o que o usuário quer acessar de fato
  const targetPath = isRewritten ? url.pathname : path;
  
  const isAuthPage = 
    targetPath.startsWith("/login") || 
    targetPath.startsWith("/admin-portal") || 
    targetPath.startsWith("/coach-portal");
  // O index real do app student (apontado na base domain clude/) é publico por enquanto, 
  // mas o index do admin (/) é reescrito pra /admin (que é restrito).
  const isPublicPath = isAuthPage || (targetPath === "/" && !hostname.startsWith('admin'));

  // Redirect to login if user is not authenticated
  if (!user && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone();
    
    const isAdminRoute = targetPath.startsWith("/admin") || targetPath.startsWith("/admin-portal");
    const isCoachRoute = targetPath.startsWith("/coach") || targetPath.startsWith("/coach-portal");

    if (isAdminRoute) {
      redirectUrl.pathname = "/admin-portal";
    } else if (isCoachRoute) {
      redirectUrl.pathname = "/coach-portal";
    } else {
      redirectUrl.pathname = "/login";
    }
    
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if authenticated user tries to access login
  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone();
    const isAdminDomain = hostname.startsWith('admin');
    redirectUrl.pathname = isAdminDomain ? "/admin" : "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  if (isRewritten) {
    // Retorna a reescrita preservando os cookies potencialmente alterados pelo Supabase SSR
    const finalResponse = NextResponse.rewrite(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie);
    });
    return finalResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Protected routes matcher.
     * Excludes static assets and public icons.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.json|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
