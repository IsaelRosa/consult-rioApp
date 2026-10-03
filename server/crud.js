// CRUD genérico para as entidades que o front grava via POST/PUT/DELETE.
//
// Identificadores de coluna não podem ser enviados como parâmetros do SQL,
// então cada entidade declara explicitamente os campos aceitos (allowlist).
// Tudo que não estiver na lista é descartado — isso também evita injeção
// via nome de coluna.

import express from 'express';

// Campos graváveis por entidade, espelhando server/schema.sql.
export const ENTIDADES = {
  pacientes: {
    tabela: 'pacientes',
    demo: 'demoPacientes',
    campos: [
      'nome', 'cpf', 'telefone', 'email', 'data_nascimento', 'sexo',
      'endereco', 'cidade', 'estado', 'cep', 'convenio', 'numero_carteirinha',
      'alergias', 'medicamentos', 'observacoes', 'ativo',
    ],
  },
  dentistas: {
    tabela: 'dentistas',
    demo: 'demoDentistas',
    campos: ['nome', 'cro', 'especialidade', 'telefone', 'email', 'cor_agenda', 'ativo'],
  },
  consultas: {
    tabela: 'consultas',
    demo: 'demoConsultas',
    campos: ['paciente_id', 'dentista_id', 'data_hora_inicio', 'data_hora_fim', 'status', 'tipo', 'observacoes'],
  },
  orcamentos: {
    tabela: 'orcamentos',
    demo: 'demoOrcamentos',
    campos: ['paciente_id', 'dentista_id', 'status', 'valor_total', 'desconto', 'observacoes', 'validade_dias'],
  },
  pagamentos: {
    tabela: 'pagamentos',
    demo: 'demoPagamentos',
    campos: ['paciente_id', 'orcamento_id', 'consulta_id', 'valor', 'forma_pagamento', 'status', 'data_pagamento', 'observacoes'],
  },
  despesas: {
    tabela: 'despesas',
    demo: 'demoDespesas',
    campos: ['descricao', 'categoria', 'valor', 'data_despesa', 'forma_pagamento', 'status'],
  },
  odontograma: {
    tabela: 'odontograma',
    demo: 'demoOdontograma',
    campos: ['paciente_id', 'dente', 'face', 'condicao', 'procedimento_id', 'observacoes', 'data_registro'],
  },
  procedimentos: {
    tabela: 'procedimentos',
    demo: 'demoProcedimentos',
    campos: ['nome', 'codigo', 'categoria', 'valor_padrao', 'tempo_estimado_min', 'ativo'],
  },
  tratamentos: {
    tabela: 'tratamentos',
    demo: 'demoTratamentos',
    campos: ['paciente_id', 'dentista_id', 'descricao', 'status', 'data_inicio', 'data_fim'],
  },
};

// Descarta chaves desconhecidas e valores vazios, mantendo só campos válidos.
const filtrarCampos = (corpo, campos) => {
  const dados = {};
  for (const campo of campos) {
    if (Object.hasOwn(corpo ?? {}, campo)) {
      const valor = corpo[campo];
      dados[campo] = valor === undefined ? null : valor;
    }
  }
  return dados;
};

const comTimestamp = (dados) => ({ ...dados, updated_at: new Date() });

export const registerCrud = (app, { query, isMysqlReady, dadosDemo }) => {
  const erro = (res, status, mensagem) => res.status(status).json({ error: mensagem });

  for (const [rota, entidade] of Object.entries(ENTIDADES)) {
    const { tabela, campos, demo } = entidade;
    // Referência ao array de demonstração (mutável em memória).
    const fallback = () => dadosDemo[demo];

    app.post(`/api/${rota}`, async (req, res) => {
      const dados = filtrarCampos(req.body, campos);
      if (!Object.keys(dados).length) return erro(res, 400, 'Nenhum campo válido enviado.');

      if (!isMysqlReady()) {
        const lista = fallback();
        const novo = {
          id: (lista[0]?.id ?? 0) + 1 + lista.length,
          ...dados,
          created_at: new Date().toISOString(),
        };
        lista.unshift(novo);
        return res.status(201).json(novo);
      }

      try {
        const colunas = Object.keys(dados);
        const marcadores = colunas.map(() => '?').join(', ');
        const criado = await query(
          `INSERT INTO ${tabela} (${colunas.join(', ')}) VALUES (${marcadores})`,
          colunas.map((c) => dados[c]),
        );
        const id = criado.insertId;
        const [linha] = await query(`SELECT * FROM ${tabela} WHERE id = ? LIMIT 1`, [id]);
        return res.status(201).json(linha);
      } catch (error) {
        console.warn(`[crud:${rota}] insert falhou:`, error.message);
        return erro(res, 500, 'Não foi possível salvar.');
      }
    });

    app.put(`/api/${rota}/:id`, async (req, res) => {
      const id = Number(req.params.id);
      const dados = comTimestamp(filtrarCampos(req.body, campos));
      if (!Number.isInteger(id)) return erro(res, 400, 'ID inválido.');
      if (!Object.keys(dados).length) return erro(res, 400, 'Nenhum campo válido enviado.');

      if (!isMysqlReady()) {
        const lista = fallback();
        const alvo = lista.find((item) => Number(item.id) === id);
        if (!alvo) return erro(res, 404, 'Registro não encontrado.');
        Object.assign(alvo, dados);
        return res.json(alvo);
      }

      try {
        const colunas = Object.keys(dados);
        const atribuicoes = colunas.map((c) => `${c} = ?`).join(', ');
        const resultado = await query(
          `UPDATE ${tabela} SET ${atribuicoes} WHERE id = ?`,
          [...colunas.map((c) => dados[c]), id],
        );
        if (!resultado.affectedRows) return erro(res, 404, 'Registro não encontrado.');
        const [linha] = await query(`SELECT * FROM ${tabela} WHERE id = ? LIMIT 1`, [id]);
        return res.json(linha);
      } catch (error) {
        console.warn(`[crud:${rota}] update falhou:`, error.message);
        return erro(res, 500, 'Não foi possível atualizar.');
      }
    });

    app.get(`/api/${rota}/:id`, async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return erro(res, 400, 'ID inválido.');

      if (!isMysqlReady()) {
        const item = fallback().find((registro) => Number(registro.id) === id);
        if (!item) return erro(res, 404, 'Registro não encontrado.');
        return res.json(item);
      }

      try {
        const [linha] = await query(`SELECT * FROM ${tabela} WHERE id = ? LIMIT 1`, [id]);
        if (!linha) return erro(res, 404, 'Registro não encontrado.');
        return res.json(linha);
      } catch (error) {
        console.warn(`[crud:${rota}] select falhou:`, error.message);
        return erro(res, 500, 'Não foi possível consultar.');
      }
    });

    app.delete(`/api/${rota}/:id`, async (req, res) => {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) return erro(res, 400, 'ID inválido.');

      if (!isMysqlReady()) {
        const lista = fallback();
        const indice = lista.findIndex((item) => Number(item.id) === id);
        if (indice === -1) return erro(res, 404, 'Registro não encontrado.');
        lista.splice(indice, 1);
        return res.json({ ok: true });
      }

      try {
        const resultado = await query(`DELETE FROM ${tabela} WHERE id = ?`, [id]);
        if (!resultado.affectedRows) return erro(res, 404, 'Registro não encontrado.');
        return res.json({ ok: true });
      } catch (error) {
        console.warn(`[crud:${rota}] delete falhou:`, error.message);
        return erro(res, 500, 'Não foi possível excluir.');
      }
    });
  }
};

export default registerCrud;