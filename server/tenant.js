// Multi-tenancy: todas as tabelas de negócio pertencem a uma clínica.
// O requisito vem do token de sessão (assinado no login), então não há
// como o cliente escolher a clínica pela URL — só a plataforma pode.

import { query } from './db.js';

// Tabelas que carregam clinica_id. Perfis é global (catálogo de cargos).
export const TENANT_TABLES = [
  'usuarios',
  'pacientes',
  'dentistas',
  'consultas',
  'consulta_procedimentos',
  'tratamentos',
  'tratamento_procedimentos',
  'orcamentos',
  'orcamento_itens',
  'pagamentos',
  'despesas',
  'odontograma',
  'procedimentos',
];

// Resolve a clínica da requisição e bloqueia o acesso entre clínicas.
export const resolverClinica = (req) => {
  const clinicaId = req.usuario?.clinica_id;

  if (!clinicaId) {
    // Só a plataforma (sem clinica_id no token) chega aqui.
    const erro = new Error('Usuário não vinculado a nenhuma clínica.');
    erro.status = 403;
    throw erro;
  }

  return Number(clinicaId);
};

// WHERE reutilizável para consultas simples (uma tabela, sem join).
export const escopo = (clinicaId) => ({ where: 'clinica_id = ?', params: [clinicaId] });

// Valida que uma linha pertence à clínica antes de alterar/excluir.
export const pertenceAClinic = async (tabela, id, clinicaId) => {
  const linhas = await query(`SELECT id FROM ${tabela} WHERE id = ? AND clinica_id = ? LIMIT 1`, [id, clinicaId]);
  return Boolean(linhas[0]);
};

export default { TENANT_TABLES, resolverClinica, escopo, pertenceAClinic };