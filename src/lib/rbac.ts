export type Perfil = 'admin' | 'recepcionista' | 'dentista' | 'financeiro';

export const PERFIS: Record<Perfil, { nome: string; permissoes: string[] }> = {
  admin: {
    nome: 'Administrador',
    permissoes: ['*'],
  },
  recepcionista: {
    nome: 'Recepcionista',
    permissoes: [
      'pacientes',
      'consultas',
      'agenda',
      'dashboard',
      'prontuario:view',
      'orcamentos:view',
      'pagamentos:view',
    ],
  },
  dentista: {
    nome: 'Dentista',
    permissoes: [
      'dashboard',
      'consultas',
      'prontuario',
      'procedimentos',
      'tratamentos',
      'odontograma',
      'orcamentos',
      'pacientes:view',
    ],
  },
  financeiro: {
    nome: 'Financeiro',
    permissoes: ['dashboard', 'financeiro', 'pagamentos', 'orcamentos:view', 'relatorios'],
  },
};

export function pode(perfil: Perfil | null | undefined, permissao: string) {
  if (!perfil) return false;
  const p = PERFIS[perfil];
  if (!p) return false;
  if (p.permissoes.includes('*')) return true;
  if (p.permissoes.includes(permissao)) return true;
  const wildcard = permissao.split(':')[0] + ':*';
  return p.permissoes.includes(wildcard);
}
