// Armazenamento em memória dos procedimentos lançados em uma consulta
// (tabela consulta_procedimentos). Usado apenas no modo demo, quando não
// há MySQL configurado.

export const demoConsultaProcedimentos = [
  {
    id: 1,
    consulta_id: 1,
    procedimento_id: 1,
    dente: '36',
    quantidade: 1,
    valor_cobrado: 120,
    status: 'pendente',
    created_at: '2026-10-02T09:00:00Z',
  },
  {
    id: 2,
    consulta_id: 1,
    procedimento_id: 2,
    dente: '37',
    quantidade: 1,
    valor_cobrado: 220,
    status: 'pendente',
    created_at: '2026-10-02T09:05:00Z',
  },
];

export default demoConsultaProcedimentos;