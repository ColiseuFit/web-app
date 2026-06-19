/**
 * @file index.ts
 * @description Ponto de entrada unificado e exportador nomeado das Server Actions Financeiras.
 * @module Financeiro
 */

export { getInvoices, createInvoice, payInvoice, cancelInvoice, getActiveStudents } from "./finance-actions";
