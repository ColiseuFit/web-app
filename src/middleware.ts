import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';
  const path = url.pathname;

  // Ignora a interceptação para arquivos públicos/estáticos (ex: .png, .svg)
  if (path.includes('.') && !path.includes('/login') && !path.includes('/admin')) {
    return NextResponse.next();
  }

  // 1. ADMIN DOMAIN ROUTING
  // Trata 'admin.coliseufit.com' em produção, ou 'admin.localhost' localmente
  if (hostname.startsWith('admin.coliseufit.com') || hostname.startsWith('admin.localhost')) {
    
    // admin.coliseufit.com/login -> Renderiza a tela de login exclusiva do Admin (/admin-portal)
    if (path === '/login') {
      return NextResponse.rewrite(new URL('/admin-portal', req.url));
    }
    
    // admin.coliseufit.com/ -> Renderiza a Home do Admin (/admin)
    if (path === '/') {
      return NextResponse.rewrite(new URL('/admin', req.url));
    }

    // Prefixar qualquer outra rota com '/admin'
    // Ex: admin.coliseufit.com/turmas -> renderiza internamente /admin/turmas
    if (!path.startsWith('/admin') && !path.startsWith('/admin-portal')) {
      return NextResponse.rewrite(new URL(`/admin${path}`, req.url));
    }

    return NextResponse.next();
  }

  // 2. CLUBE (STUDENT) DOMAIN ROUTING
  if (hostname.startsWith('clube.coliseufit.com') || hostname.startsWith('clube.localhost')) {
    // Isolamento de Segurança: Bloqueia acesso forçado na rota explícita /admin através do domínio do Aluno
    if (path.startsWith('/admin') || path.startsWith('/admin-portal')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  // 3. FALLBACK (Desenvolvimento - Localhost Padrão)
  // Se o desenvolvedor entrar em localhost:3000, tudo funciona pelo caminho de pastas original.
  return NextResponse.next();
}
