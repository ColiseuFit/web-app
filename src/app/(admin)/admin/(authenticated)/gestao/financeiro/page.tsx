import { getInvoices, getActiveStudents } from "./actions";
import FinanceiroClient from "./FinanceiroClient";

export const metadata = {
  title: "Financeiro | Arena Coliseu",
  description: "Controle de faturamento, faturas e fluxo de caixa.",
};

export default async function FinanceiroPage() {
  let invoices: any[] = [];
  let students: any[] = [];

  try {
    const [invs, studs] = await Promise.all([
      getInvoices(),
      getActiveStudents()
    ]);
    invoices = invs || [];
    students = studs || [];
  } catch (error) {
    console.error("Erro de conexão ao buscar dados do financeiro:", error);
  }

  return (
    <FinanceiroClient 
      initialInvoices={invoices} 
      students={students} 
    />
  );
}
