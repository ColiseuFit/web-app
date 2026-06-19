/**
 * @module pagarme-v5
 * @description
 * Cliente HTTP puro para integração com a API da Stone / Pagar.me V5.
 * 
 * Esta camada não interage com o banco de dados (Supabase) nem possui estado.
 * É estritamente responsável por formatar payloads e processar as requisições
 * REST usando as credenciais injetadas.
 * 
 * @documentation https://docs.pagar.me/reference/v5-endpoints
 */

const API_BASE_URL = "https://api.pagar.me/core/v5";

export interface PagarmeCredentials {
  secretKey: string;
}

export interface PagarmeCustomerPayload {
  name: string;
  email: string;
  document: string;
  document_type: "CPF" | "CNPJ";
  type: "individual" | "company";
  phones: {
    mobile_phone: {
      country_code: string;
      area_code: string;
      number: string;
    };
  };
}

export interface PagarmeCardPayload {
  customer_id: string;
  token: string; // Token gerado no front-end pelo SDK/Checkout da Pagar.me
  billing_address?: any; 
}

export interface PagarmeOrderPayload {
  customer_id: string;
  items: Array<{
    amount: number; // Em centavos (ex: R$ 10,00 = 1000)
    description: string;
    quantity: number;
  }>;
  payments: Array<{
    payment_method: "credit_card" | "pix" | "boleto";
    credit_card?: {
      card_id?: string;
      card_token?: string;
      installments: number;
      statement_descriptor: string;
    };
    pix?: {
      expires_in: number;
    };
    amount: number; // Centavos
  }>;
}

/**
 * Monta o header de autenticação Basic exigido pela Pagar.me.
 */
function getHeaders(credentials: PagarmeCredentials) {
  // Pagar.me V5 usa Basic Auth com SecretKey em base64 com dois pontos no final (sk_xxx:)
  const token = Buffer.from(`${credentials.secretKey}:`).toString("base64");
  return {
    "Content-Type": "application/json",
    "Authorization": `Basic ${token}`,
  };
}

/**
 * Cria ou atualiza um Customer na Pagar.me
 */
export async function createPagarmeCustomer(credentials: PagarmeCredentials, payload: PagarmeCustomerPayload) {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: "POST",
      headers: getHeaders(credentials),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[Pagar.me] Error creating customer:", data);
      throw new Error(data.message || "Falha ao cadastrar cliente na operadora.");
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Vincula um Cartão de Crédito (tokenizado) a um Customer existente
 */
export async function createPagarmeCard(credentials: PagarmeCredentials, payload: PagarmeCardPayload) {
  try {
    // Rota: POST /customers/{customer_id}/cards
    const response = await fetch(`${API_BASE_URL}/customers/${payload.customer_id}/cards`, {
      method: "POST",
      headers: getHeaders(credentials),
      body: JSON.stringify({
        token: payload.token,
        options: { verify_card: true } // A Pagar.me fará uma autorização de R$ 0,00 para checar o limite/validação
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[Pagar.me] Error creating card:", data);
      throw new Error(data.message || "Falha ao vincular cartão de crédito.");
    }

    return data; // Retorna o card_id gerado pela Stone
  } catch (error: any) {
    throw new Error(error.message);
  }
}

/**
 * Cria um Pedido (Order) que engatilha a cobrança
 */
export async function createPagarmeOrder(credentials: PagarmeCredentials, payload: PagarmeOrderPayload) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: getHeaders(credentials),
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[Pagar.me] Error creating order:", data);
      throw new Error(data.message || "Falha ao processar cobrança na operadora.");
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message);
  }
}
