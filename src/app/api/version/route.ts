import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/constants/version";

/**
 * API de Verificação de Versão
 * 
 * Utilizada pelo cliente para detectar se há uma nova versão disponível no servidor.
 * Retorna apenas a string da versão para minimizar o payload.
 */
export async function GET() {
  return NextResponse.json({ version: APP_VERSION });
}
