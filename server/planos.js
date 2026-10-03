// Planos de assinatura.
//
// Escopo definido: clínica pequena (1-5 dentistas) e foco odontológico.
// Os limites são contados no banco a cada operação relevante; são uma
// salvaguarda comercial, não um mecanismo de segurança.
//
// OBS: não há cobrança integrada ainda. O campo `plano` em `clinicas` guarda
// a assinatura atual; ligar um provedor (Mercado Pago, Stripe, Pagar.me) é o
// passo seguinte e deve morar aqui, junto da definição dos planos.

export const PLANOS = {
  essencial: {
    slug: 'essencial',
    nome: 'Essencial',
    max_dentistas: 1,
    max_usuarios: 3,
    preco_mensal: 149,
    recursos: ['Agenda', 'Cadastro de pacientes', 'Financeiro', 'Odontograma'],
  },
  profissional: {
    slug: 'profissional',
    nome: 'Profissional',
    max_dentistas: 3,
    max_usuarios: 10,
    preco_mensal: 279,
    recursos: ['Tudo do Essencial', 'Prontuário completo', 'Anexos e exames', 'Relatórios'],
  },
  clinica: {
    slug: 'clinica',
    nome: 'Clínica',
    max_dentistas: 5,
    max_usuarios: 25,
    preco_mensal: 449,
    recursos: ['Tudo do Profissional', 'Múltiplos dentistas', 'Indicadores gerenciais'],
  },
};

export const PLANO_PADRAO = 'essencial';

export const obterPlano = (slug) => PLANOS[slug] ?? PLANOS[PLANO_PADRAO];

// Conta os registros da clínica. Se a coluna clinica_id ainda não existir
// (banco sem a migração), cai para Infinity para não bloquear o cliente.
export const contar = async (tabela, clinicaId) => {
  try {
    const [{ total }] = await import('./db.js').then(({ query }) =>
      query(`SELECT COUNT(*) AS total FROM ${tabela} WHERE clinica_id = ?`, [clinicaId]),
    );
    return Number(total);
  } catch (error) {
    console.warn(`[planos] contagem em ${tabela} indisponível:`, error.message);
    return Number.POSITIVE_INFINITY;
  }
};

export const verificarLimite = async (planoSlug, clinicaId, recurso, adicional = 1) => {
  const plano = obterPlano(planoSlug);
  const teto = recurso === 'dentistas' ? plano.max_dentistas : plano.max_usuarios;

  if (!Number.isFinite(teto)) return { ok: true };

  const atual = await contar(recurso, clinicaId);
  if (atual + adicional > teto) {
    return {
      ok: false,
      limite: teto,
      atual,
      mensagem: `O plano ${plano.nome} permite até ${teto} ${recurso}. Faça upgrade para continuar.`,
    };
  }

  return { ok: true, limite: teto, atual };
};

export default { PLANOS, PLANO_PADRAO, obterPlano, verificarLimite };