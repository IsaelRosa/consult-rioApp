export const demoUsers = [
  {
    id: 'demo-admin',
    auth_id: 'demo-admin',
    email: 'admin@odonto.com',
    nome: 'Administrador',
    perfil_id: 1,
    ativo: true,
    perfil: { id: 1, nome: 'Administrador', slug: 'admin' },
  },
  {
    id: 'demo-recepcionista',
    auth_id: 'demo-recepcionista',
    email: 'recep@odonto.com',
    nome: 'Recepcionista',
    perfil_id: 2,
    ativo: true,
    perfil: { id: 2, nome: 'Recepcionista', slug: 'recepcionista' },
  },
  {
    id: 'demo-dentista',
    auth_id: 'demo-dentista',
    email: 'dentista@odonto.com',
    nome: 'Dentista',
    perfil_id: 3,
    ativo: true,
    perfil: { id: 3, nome: 'Dentista', slug: 'dentista' },
  },
  {
    id: 'demo-financeiro',
    auth_id: 'demo-financeiro',
    email: 'financeiro@odonto.com',
    nome: 'Financeiro',
    perfil_id: 4,
    ativo: true,
    perfil: { id: 4, nome: 'Financeiro', slug: 'financeiro' },
  },
];

export const demoPerfis = [
  { id: 1, nome: 'Administrador', slug: 'admin' },
  { id: 2, nome: 'Recepcionista', slug: 'recepcionista' },
  { id: 3, nome: 'Dentista', slug: 'dentista' },
  { id: 4, nome: 'Financeiro', slug: 'financeiro' },
];

export const demoPacientes = [
  { id: 1, nome: 'Ana Souza', cpf: '12345678901', telefone: '(11) 99999-1111', email: 'ana@email.com', data_nascimento: '1990-03-12', sexo: 'F', endereco: 'Rua A, 100', cidade: 'São Paulo', estado: 'SP', cep: '01000-000', convenio: 'Unimed', numero_carteirinha: 'U-001', alergias: 'Nenhuma', medicamentos: 'Nenhum', observacoes: 'Paciente regular', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 2, nome: 'Bruno Lima', cpf: '98765432100', telefone: '(11) 98888-2222', email: 'bruno@email.com', data_nascimento: '1988-07-22', sexo: 'M', endereco: 'Rua B, 200', cidade: 'Campinas', estado: 'SP', cep: '13000-000', convenio: 'Amil', numero_carteirinha: 'A-002', alergias: 'Nenhuma', medicamentos: 'Nenhum', observacoes: 'Em acompanhamento', created_at: '2024-01-11T00:00:00Z', updated_at: '2024-01-11T00:00:00Z' },
];

export const demoDentistas = [
  { id: 1, nome: 'Dr. Carlos Mendes', cro: 'SP-12345', especialidade: 'Ortodontia', telefone: '(11) 97777-3333', email: 'carlos@clinica.com', cor_agenda: '#3B82F6', ativo: true, usuario_id: 'demo-dentista', created_at: '2024-01-02T00:00:00Z' },
  { id: 2, nome: 'Dra. Patricia Rocha', cro: 'SP-67890', especialidade: 'Implantodontia', telefone: '(11) 96666-4444', email: 'patricia@clinica.com', cor_agenda: '#10B981', ativo: true, usuario_id: 'demo-admin', created_at: '2024-01-03T00:00:00Z' },
];

export const demoProcedimentos = [
  { id: 1, nome: 'Limpeza', codigo: 'LIM', categoria: 'Higiene', valor_padrao: 120, tempo_estimado_min: 30, ativo: true },
  { id: 2, nome: 'Restauração', codigo: 'RES', categoria: 'Odontologia', valor_padrao: 220, tempo_estimado_min: 45, ativo: true },
  { id: 3, nome: 'Canal', codigo: 'CAN', categoria: 'Endodontia', valor_padrao: 680, tempo_estimado_min: 75, ativo: true },
];

export const demoConsultas = [
  { id: 1, paciente_id: 1, dentista_id: 1, data_hora_inicio: '2026-10-02T09:00:00Z', data_hora_fim: '2026-10-02T09:45:00Z', status: 'confirmado', tipo: 'Consulta', observacoes: 'Avaliação inicial', paciente: demoPacientes[0], dentista: demoDentistas[0], created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' },
  { id: 2, paciente_id: 2, dentista_id: 2, data_hora_inicio: '2026-10-03T14:00:00Z', data_hora_fim: '2026-10-03T14:50:00Z', status: 'agendado', tipo: 'Retorno', observacoes: 'Ajustes', paciente: demoPacientes[1], dentista: demoDentistas[1], created_at: '2026-10-01T01:00:00Z', updated_at: '2026-10-01T01:00:00Z' },
];

export const demoTratamentos = [
  { id: 1, paciente_id: 1, dentista_id: 1, descricao: 'Ortodontia inicial', status: 'em andamento', data_inicio: '2026-09-01T00:00:00Z', data_fim: null, paciente: demoPacientes[0], dentista: demoDentistas[0], procedimentos: [], created_at: '2026-09-01T00:00:00Z' },
];

export const demoOrcamentos = [
  { id: 1, paciente_id: 1, dentista_id: 1, status: 'pendente', valor_total: 320, desconto: 10, observacoes: 'Orçamento para limpeza e restauração', validade_dias: 15, paciente: demoPacientes[0], dentista: demoDentistas[0], itens: [], created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' },
];

export const demoPagamentos = [
  { id: 1, paciente_id: 1, orcamento_id: 1, consulta_id: 1, paciente: demoPacientes[0], valor: 320, forma_pagamento: 'Cartão', status: 'pago', data_pagamento: '2026-10-01T00:00:00Z', observacoes: 'Pagamento confirmado', created_at: '2026-10-01T00:00:00Z' },
];

export const demoDespesas = [
  { id: 1, descricao: 'Aluguel', categoria: 'Operacional', valor: 2300, data_despesa: '2026-09-15T00:00:00Z', forma_pagamento: 'Transferência', status: 'pago', created_at: '2026-09-15T00:00:00Z' },
];

export const demoOdontograma = [
  { id: 1, paciente_id: 1, dente: 11, face: 'vestibular', condicao: 'saudavel', procedimento_id: 1, procedimento: demoProcedimentos[0], observacoes: 'Sem alterações', data_registro: '2026-09-20T00:00:00Z', created_at: '2026-09-20T00:00:00Z' },
];

export const dashboardData = {
  consultasHoje: 1,
  consultasSemana: 3,
  pacientesAtivos: 18,
  faturamentoMes: 8200,
  despesasMes: 2300,
  saldoMes: 5900,
  consultasPorStatus: [
    { status: 'agendado', total: 1 },
    { status: 'confirmado', total: 1 },
  ],
  faturamentoUltimosMeses: [
    { mes: 'Ago', receitas: 7800, despesas: 2200 },
    { mes: 'Set', receitas: 9200, despesas: 2500 },
    { mes: 'Out', receitas: 8200, despesas: 2300 },
  ],
  proximasConsultas: demoConsultas,
};
