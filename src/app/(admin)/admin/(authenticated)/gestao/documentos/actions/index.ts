/**
 * @file index.ts
 * @description Ponto de entrada unificado e exportador nomeado das Server Actions de Compliance e Documentos.
 * @module Compliance
 */

export { getLegalDocuments, updateLegalDocument } from "./documents";
export { getParqQuestions, addParqQuestion, updateParqQuestion, reorderParqQuestions, deleteParqQuestion } from "./parq";
