export type PerfilSlug = 'admin' | 'recepcionista' | 'dentista' | 'financeiro';

export interface Perfil {
  id: number;
  nome: string;
  slug: PerfilSlug;
}

export interface Usuario {
  id: string;
  auth_id?: string;
  email: string;
  nome: string;
  perfil_id: number;
  perfil?: Perfil;
  ativo: boolean;
  created_at?: string;
}

export interface Paciente {
  id: number;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  sexo?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  convenio?: string;
  numero_carteirinha?: string;
  alergias?: string;
  medicamentos?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Dentista {
  id: number;
  nome: string;
  cro?: string;
  especialidade?: string;
  telefone?: string;
  email?: string;
  cor_agenda?: string;
  ativo: boolean;
  usuario_id?: string;
  created_at?: string;
}

export interface Procedimento {
  id: number;
  nome: string;
  codigo?: string;
  categoria?: string;
  valor_padrao?: number;
  tempo_estimado_min?: number;
  ativo: boolean;
}

export interface Consulta {
  id: number;
  paciente_id: number;
  dentista_id: number;
  data_hora_inicio: string;
  data_hora_fim?: string;
  status: 'agendado' | 'confirmado' | 'atendimento' | 'concluido' | 'cancelado' | 'faltou';
  tipo?: string;
  observacoes?: string;
  paciente?: Paciente;
  dentista?: Dentista;
  created_at?: string;
  updated_at?: string;
}

export interface TratamentoProcedimento {
  id: number;
  tratamento_id: number;
  procedimento_id: number;
  procedimento?: Procedimento;
  dente?: string;
  quantidade: number;
  valor_cobrado: number;
  status: 'pendente' | 'realizado' | 'cancelado';
}

export interface Tratamento {
  id: number;
  paciente_id: number;
  dentista_id: number;
  paciente?: Paciente;
  dentista?: Dentista;
  descricao: string;
  status: 'em andamento' | 'concluido' | 'cancelado';
  data_inicio?: string;
  data_fim?: string;
  procedimentos?: TratamentoProcedimento[];
  created_at?: string;
}

export interface OrcamentoItem {
  id: number;
  orcamento_id: number;
  procedimento_id: number;
  procedimento?: Procedimento;
  dente?: string;
  quantidade: number;
  valor_unitario: number;
}

export interface Orcamento {
  id: number;
  paciente_id: number;
  dentista_id: number;
  paciente?: Paciente;
  dentista?: Dentista;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'expirado';
  valor_total: number;
  desconto: number;
  observacoes?: string;
  validade_dias: number;
  itens?: OrcamentoItem[];
  created_at?: string;
  updated_at?: string;
}

export interface Pagamento {
  id: number;
  paciente_id: number;
  orcamento_id?: number | null;
  consulta_id?: number | null;
  paciente?: Paciente;
  valor: number;
  forma_pagamento: string;
  status: 'pago' | 'pendente' | 'cancelado';
  data_pagamento?: string;
  observacoes?: string;
  created_at?: string;
}

export interface Despesa {
  id: number;
  descricao: string;
  categoria: string;
  valor: number;
  data_despesa: string;
  forma_pagamento?: string;
  status: 'pago' | 'pendente';
  created_at?: string;
}

export interface Odontograma {
  id: number;
  paciente_id: number;
  dente: number;
  face?: string;
  condicao: 'saudavel' | 'carie' | 'tratado' | 'extracao' | 'pendente' | 'observacao';
  procedimento_id?: number | null;
  procedimento?: Procedimento;
  observacoes?: string;
  data_registro?: string;
  created_at?: string;
}

export interface DashboardStats {
  consultasHoje: number;
  consultasSemana: number;
  pacientesAtivos: number;
  faturamentoMes: number;
  despesasMes: number;
  saldoMes: number;
  consultasPorStatus: { status: string; total: number }[];
  faturamentoUltimosMeses: { mes: string; receitas: number; despesas: number }[];
  proximasConsultas: Consulta[];
}
