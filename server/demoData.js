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
  // Higiene / prevention
  { id: 1, nome: 'Limpeza (Profilaxia)', codigo: 'LIM', categoria: 'Higiene', valor_padrao: 120, tempo_estimado_min: 30, ativo: true },
  { id: 2, nome: 'Restauração em resina', codigo: 'RES', categoria: 'Odontologia', valor_padrao: 220, tempo_estimado_min: 45, ativo: true },
  { id: 3, nome: 'Tratamento de canal', codigo: 'CAN', categoria: 'Endodontia', valor_padrao: 680, tempo_estimado_min: 75, ativo: true },
  { id: 4, nome: 'Raspagem periodontal', codigo: 'RAS', categoria: 'Higiene', valor_padrao: 180, tempo_estimado_min: 40, ativo: true },
  { id: 5, nome: 'Aplicação de flúor', codigo: 'FLU', categoria: 'Higiene', valor_padrao: 80, tempo_estimado_min: 20, ativo: true },
  { id: 6, nome: 'Selante de fossas', codigo: 'SEL', categoria: 'Odontologia', valor_padrao: 90, tempo_estimado_min: 25, ativo: true },

  // Odontologia geral
  { id: 7, nome: 'Restauração em amalgama', codigo: 'AMA', categoria: 'Odontologia', valor_padrao: 160, tempo_estimado_min: 40, ativo: true },
  { id: 8, nome: 'Obturação', codigo: 'OBT', categoria: 'Endodontia', valor_padrao: 320, tempo_estimado_min: 60, ativo: true },
  { id: 9, nome: 'Tratamento de canal (molar)', codigo: 'CANM', categoria: 'Endodontia', valor_padrao: 980, tempo_estimado_min: 110, ativo: true },
  { id: 10, nome: 'Cunha de cerâmica (endodôntica)', codigo: 'CU1', categoria: 'Endodontia', valor_padrao: 450, tempo_estimado_min: 60, ativo: true },

  // Cirurgia
  { id: 11, nome: 'Extração simples', codigo: 'EXS', categoria: 'Cirurgia', valor_padrao: 180, tempo_estimado_min: 30, ativo: true },
  { id: 12, nome: 'Extração cirúrgica', codigo: 'EXC', categoria: 'Cirurgia', valor_padrao: 420, tempo_estimado_min: 60, ativo: true },
  { id: 13, nome: 'Extração de siso incluso', codigo: 'EXI', categoria: 'Cirurgia', valor_padrao: 650, tempo_estimado_min: 90, ativo: true },

  // Periodontia
  { id: 14, nome: 'Cirurgia periodontal', codigo: 'PER', categoria: 'Periodontia', valor_padrao: 780, tempo_estimado_min: 90, ativo: true },
  { id: 15, nome: 'Curetagem', codigo: 'CUR', categoria: 'Periodontia', valor_padrao: 260, tempo_estimado_min: 40, ativo: true },

  // Prótese
  { id: 16, nome: 'Coroa em porcelana', codigo: 'COR', categoria: 'Prótese', valor_padrao: 1250, tempo_estimado_min: 120, ativo: true },
  { id: 17, nome: 'Prótese fixa (3 dentes)', codigo: 'PF3', categoria: 'Prótese', valor_padrao: 3400, tempo_estimado_min: 180, ativo: true },
  { id: 18, nome: 'Prótese total (dentadura)', codigo: 'PTD', categoria: 'Prótese', valor_padrao: 2900, tempo_estimado_min: 150, ativo: true },
  { id: 19, nome: 'Prótese parcial removível', codigo: 'PPR', categoria: 'Prótese', valor_padrao: 1600, tempo_estimado_min: 120, ativo: true },

  // Ortodontia
  { id: 20, nome: 'Instalação de aparelho ortodôntico', codigo: 'ORT', categoria: 'Ortodontia', valor_padrao: 2800, tempo_estimado_min: 120, ativo: true },
  { id: 21, nome: 'Manutenção ortodôntica', codigo: 'MNT', categoria: 'Ortodontia', valor_padrao: 180, tempo_estimado_min: 30, ativo: true },
  { id: 22, nome: 'Retirada de aparelho', codigo: 'RTO', categoria: 'Ortodontia', valor_padrao: 220, tempo_estimado_min: 45, ativo: true },

  // Odontopediatria e estética
  { id: 23, nome: 'Atendimento infantil', codigo: 'INF', categoria: 'Odontopediatria', valor_padrao: 150, tempo_estimado_min: 30, ativo: true },
  { id: 24, nome: 'Clareamento dentário', codigo: 'CLA', categoria: 'Estética', valor_padrao: 650, tempo_estimado_min: 75, ativo: true },
  { id: 25, nome: 'Faceta de porcelana', codigo: 'FAC', categoria: 'Estética', valor_padrao: 1800, tempo_estimado_min: 120, ativo: true },
  { id: 26, nome: 'Contorno adicionado em resina', codigo: 'CAR', categoria: 'Estética', valor_padrao: 380, tempo_estimado_min: 60, ativo: true },
  { id: 27, nome: 'Consulta de avaliação', codigo: 'AVS', categoria: 'Consulta', valor_padrao: 0, tempo_estimado_min: 20, ativo: true },
  { id: 28, nome: 'Radiografia panorâmica', codigo: 'RXS', categoria: 'Diagnóstico', valor_padrao: 140, tempo_estimado_min: 15, ativo: true },
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
