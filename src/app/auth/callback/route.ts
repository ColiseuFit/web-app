import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Rota de Callback de Autenticação (ponte).
 * 
 * @security
 * - Esta rota é o endpoint para troca de tokens de uso único (PKCE) por sessões persistentes.
 * - Suporta fluxos de Convite, Recuperação de Senha e Magic Links.
 * - Redireciona o usuário para o destino final após a autenticação bem-sucedida.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Se houver um parâmetro 'next', usamos ele, caso contrário vamos para o dashboard
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Redireciona para a URL de destino preservando o domínio original
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Em caso de erro, redireciona para a página de login com uma mensagem
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
