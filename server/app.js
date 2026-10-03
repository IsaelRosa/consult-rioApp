import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { query, testConnection } from './db.js';
import { registerCrud } from './crud.js';
import { demoConsultaProcedimentos } from './consultaProcedimentos.js';
import {
  dashboardData,
  demoConsultas,
  demoDentistas,
  demoDespesas,
  demoOdontograma,
  demoOrcamentos,
  demoPagamentos,
  demoPacientes,
  demoPerfis,
  demoProcedimentos,
  demoTratamentos,
  demoUsers,
} from './demoData.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// O .env é carregado por ./db.js com caminho absoluto — não depende
// do process.cwd(), que no Hostinger pode não ser a raiz do projeto.

export const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// A sonda do MySQL NÃO segura o boot. O app começa a escutar na hora e a
// conexão é testada em segundo plano: se o banco estiver inacessível, o
// processo continua no ar (modo demo) em vez de derrubar o proxy com 503.
export let mysqlReady = false;

const DB_PROBE_TIMEOUT_MS = 5000;

export const probeDatabase = async () => {
  const ok = await Promise.race([
    testConnection(),
    new Promise((resolve) => setTimeout(() => resolve(false), DB_PROBE_TIMEOUT_MS)),
  ]).catch(() => false);

  mysqlReady = ok;
  console.log(`[boot] banco: ${mysqlReady ? 'conectado' : 'indisponível (modo demo)'}`);
  return mysqlReady;
};

const fetchFromDb = async (sql, params = [], fallback) => {
  if (!mysqlReady) return fallback;
  try {
    return await query(sql, params);
  } catch (error) {
    console.warn('[api:mysql-fallback]', error.message);
    return fallback;
  }
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mysql: mysqlReady, mode: mysqlReady ? 'mysql' : 'demo' });
});

// ---------- Consultas: paciente e dentista embutidos ----------
// O front (Agenda e tela de Consulta) lê `consulta.paciente.nome`. Sem o
// join, o nome aparece em branco — especialmente em registros criados
// via POST, que vêm como linha crua.

const SELECT_CONSULTAS = `
  SELECT c.*,
         p.nome AS paciente_nome, p.telefone AS paciente_telefone,
         p.email AS paciente_email, p.convenio AS paciente_convenio,
         p.cpf AS paciente_cpf, p.data_nascimento AS paciente_data_nascimento,
         d.nome AS dentista_nome, d.cro AS dentista_cro
  FROM consultas c
  LEFT JOIN pacientes p ON p.id = c.paciente_id
  LEFT JOIN dentistas d ON d.id = c.dentista_id
`;

// Achata as colunas do join em objetos `paciente` / `dentista`.
const comPaciente = (linha) => {
  const { paciente_nome, paciente_telefone, paciente_email, paciente_convenio, paciente_cpf, paciente_data_nascimento, dentista_nome, dentista_cro, ...resto } = linha;

  return {
    ...resto,
    paciente: paciente_nome
      ? {
          id: resto.paciente_id,
          nome: paciente_nome,
          telefone: paciente_telefone,
          email: paciente_email,
          convenio: paciente_convenio,
          cpf: paciente_cpf,
          data_nascimento: paciente_data_nascimento,
        }
      : null,
    dentista: dentista_nome
      ? { id: resto.dentista_id, nome: dentista_nome, cro: dentista_cro }
      : null,
  };
};

// No modo demo, as linhas podem já vir sem `paciente` (ex.: as do seed),
// então preenchemos por lookup em vez de depender do join do MySQL.
const enriquecerDemo = (consulta) => {
  const paciente = consulta.paciente ?? demoPacientes.find((p) => Number(p.id) === Number(consulta.paciente_id));
  const dentista = consulta.dentista ?? demoDentistas.find((d) => Number(d.id) === Number(consulta.dentista_id));
  return {
    ...consulta,
    paciente: paciente ?? null,
    dentista: dentista ?? null,
    procedimentos: consulta.procedimentos ?? demoConsultaProcedimentos
      .filter((cp) => Number(cp.consulta_id) === Number(consulta.id))
      .map((cp) => ({
        ...cp,
        procedimento: demoProcedimentos.find((p) => Number(p.id) === Number(cp.procedimento_id)) ?? null,
      })),
  };
};

const comProcedimentos = async (consulta) => {
  if (!consulta) return consulta;
  if (consulta.procedimentos?.length) return consulta;

  if (mysqlReady) {
    try {
      const linhas = await query(
        `SELECT cp.*, pr.nome AS procedimento_nome, pr.codigo AS procedimento_codigo,
                pr.categoria AS procedimento_categoria, pr.valor_padrao AS procedimento_valor_padrao
         FROM consulta_procedimentos cp
         LEFT JOIN procedimentos pr ON pr.id = cp.procedimento_id
         WHERE cp.consulta_id = ?
         ORDER BY cp.id`,
        [consulta.id],
      );
      return {
        ...consulta,
        procedimentos: linhas.map(({ procedimento_nome, procedimento_codigo, procedimento_categoria, procedimento_valor_padrao, ...cp }) => ({
          ...cp,
          procedimento: procedimento_nome
            ? { id: cp.procedimento_id, nome: procedimento_nome, codigo: procedimento_codigo, categoria: procedimento_categoria, valor_padrao: procedimento_valor_padrao }
            : null,
        })),
      };
    } catch (error) {
      console.warn('[api:consultas] procedimentos:', error.message);
    }
  }

  return enriquecerDemo(consulta);
};

app.get('/api/consultas', async (_req, res) => {
  const pacienteId = Number(_req.query.paciente_id || 0);

  if (mysqlReady) {
    const linhas = await fetchFromDb(
      pacienteId
        ? `${SELECT_CONSULTAS} WHERE c.paciente_id = ? ORDER BY c.data_hora_inicio ASC`
        : `${SELECT_CONSULTAS} ORDER BY c.data_hora_inicio ASC`,
      pacienteId ? [pacienteId] : [],
      demoConsultas,
    );
    return res.json(linhas.map(comPaciente));
  }

  const lista = pacienteId
    ? demoConsultas.filter((item) => Number(item.paciente_id) === pacienteId)
    : demoConsultas;
  return res.json(lista.map(enriquecerDemo));
});

app.get('/api/consultas/:id', async (_req, res) => {
  const id = Number(_req.params.id);

  if (mysqlReady) {
    const linhas = await fetchFromDb(`${SELECT_CONSULTAS} WHERE c.id = ? LIMIT 1`, [id], []);
    const consulta = Array.isArray(linhas) ? linhas[0] : null;
    if (!consulta) return res.status(404).json({ error: 'Consulta não encontrada' });
    return res.json(await comProcedimentos(comPaciente(consulta)));
  }

  const consulta = demoConsultas.find((item) => Number(item.id) === id);
  if (!consulta) return res.status(404).json({ error: 'Consulta não encontrada' });
  return res.json(enriquecerDemo(consulta));
});

// Procedimentos lançados numa consulta (o front usa este POST para adicionar).
app.post('/api/procedimentos-consulta', async (req, res) => {
  const { consulta_id, procedimento_id, dente, quantidade, valor_cobrado } = req.body || {};

  const consultaId = Number(consulta_id);
  const procedimentoId = Number(procedimento_id);
  if (!Number.isInteger(consultaId) || !Number.isInteger(procedimentoId)) {
    return res.status(400).json({ error: 'Consulta e procedimento são obrigatórios.' });
  }

  const registro = {
    id: demoConsultaProcedimentos.length + 1,
    consulta_id: consultaId,
    procedimento_id: procedimentoId,
    dente: dente ?? null,
    quantidade: quantidade ?? 1,
    valor_cobrado: valor_cobrado ?? 0,
    status: 'pendente',
    created_at: new Date().toISOString(),
  };

  if (mysqlReady) {
    try {
      await query(
        `INSERT INTO consulta_procedimentos (consulta_id, procedimento_id, quantidade, valor_cobrado)
         VALUES (?, ?, ?, ?)`,
        [consultaId, procedimentoId, registro.quantidade, registro.valor_cobrado],
      );
      const [linha] = await query('SELECT * FROM consulta_procedimentos WHERE id = ? LIMIT 1', [registro.id]);
      const procedimento = demoProcedimentos.find((p) => Number(p.id) === procedimentoId) ?? null;
      return res.status(201).json({ ...(linha ?? registro), procedimento });
    } catch (error) {
      console.warn('[api:procedimentos-consulta] insert:', error.message);
      return res.status(500).json({ error: 'Não foi possível lançar o procedimento.' });
    }
  }

  demoConsultaProcedimentos.push(registro);
  const procedimento = demoProcedimentos.find((p) => Number(p.id) === procedimentoId) ?? null;
  return res.status(201).json({ ...registro, procedimento });
});

app.get('/api/dashboard', async (_req, res) => {
  if (mysqlReady) {
    const data = await fetchFromDb(
      `SELECT
        (SELECT COUNT(*) FROM consultas WHERE DATE(data_hora_inicio) = CURDATE()) AS consultasHoje,
        (SELECT COUNT(*) FROM consultas WHERE DATE(data_hora_inicio) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()) AS consultasSemana,
        (SELECT COUNT(*) FROM pacientes WHERE ativo = 1) AS pacientesAtivos,
        (SELECT COALESCE(SUM(valor), 0) FROM pagamentos WHERE status = 'pago' AND DATE(data_pagamento) BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND LAST_DAY(CURDATE())) AS faturamentoMes,
        (SELECT COALESCE(SUM(valor), 0) FROM despesas WHERE status = 'pago' AND DATE(data_despesa) BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND LAST_DAY(CURDATE())) AS despesasMes,
        (SELECT COALESCE((SELECT SUM(valor) FROM pagamentos WHERE status = 'pago' AND DATE(data_pagamento) BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND LAST_DAY(CURDATE())) - (SELECT SUM(valor) FROM despesas WHERE status = 'pago' AND DATE(data_despesa) BETWEEN DATE_FORMAT(CURDATE(), '%Y-%m-01') AND LAST_DAY(CURDATE())), 0)) AS saldoMes`,
      [],
      dashboardData,
    );

    const row = Array.isArray(data) && data[0] ? data[0] : dashboardData;
    const payload = {
      ...dashboardData,
      consultasHoje: Number(row.consultasHoje || 0),
      consultasSemana: Number(row.consultasSemana || 0),
      pacientesAtivos: Number(row.pacientesAtivos || 0),
      faturamentoMes: Number(row.faturamentoMes || 0),
      despesasMes: Number(row.despesasMes || 0),
      saldoMes: Number(row.saldoMes || 0),
      consultasPorStatus: [],
      faturamentoUltimosMeses: [],
      proximasConsultas: demoConsultas,
    };
    return res.json(payload);
  }

  return res.json(dashboardData);
});

app.get('/api/perfis', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM perfis ORDER BY id', [], demoPerfis);
    return res.json(rows);
  }
  return res.json(demoPerfis);
});

app.get('/api/pacientes', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM pacientes ORDER BY nome', [], demoPacientes);
    return res.json(rows);
  }
  return res.json(demoPacientes);
});

app.get('/api/dentistas', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM dentistas ORDER BY nome', [], demoDentistas);
    return res.json(rows);
  }
  return res.json(demoDentistas);
});


app.get('/api/procedimentos', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM procedimentos WHERE ativo = 1 ORDER BY nome', [], demoProcedimentos);
    return res.json(rows);
  }
  return res.json(demoProcedimentos);
});

app.get('/api/tratamentos', async (_req, res) => {
  const pacienteId = Number(_req.query.paciente_id || 0);
  if (mysqlReady) {
    const rows = await fetchFromDb(
      pacienteId
        ? 'SELECT * FROM tratamentos WHERE paciente_id = ? ORDER BY created_at DESC'
        : 'SELECT * FROM tratamentos ORDER BY created_at DESC',
      pacienteId ? [pacienteId] : [],
      demoTratamentos,
    );
    return res.json(rows);
  }
  const data = pacienteId ? demoTratamentos.filter((item) => item.paciente_id === pacienteId) : demoTratamentos;
  return res.json(data);
});

app.get('/api/orcamentos', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM orcamentos ORDER BY created_at DESC', [], demoOrcamentos);
    return res.json(rows);
  }
  return res.json(demoOrcamentos);
});

app.get('/api/pagamentos', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM pagamentos ORDER BY data_pagamento DESC', [], demoPagamentos);
    return res.json(rows);
  }
  return res.json(demoPagamentos);
});

app.get('/api/despesas', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM despesas ORDER BY data_despesa DESC', [], demoDespesas);
    return res.json(rows);
  }
  return res.json(demoDespesas);
});

app.get('/api/usuarios', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb(
      `SELECT u.*, p.nome AS perfil_nome, p.slug AS perfil_slug
       FROM usuarios u
       LEFT JOIN perfis p ON p.id = u.perfil_id
       ORDER BY u.nome`,
      [],
      demoUsers,
    );
    return res.json(rows);
  }
  return res.json(demoUsers);
});

app.get('/api/odontograma', async (_req, res) => {
  const pacienteId = Number(_req.query.paciente_id || 0);
  if (mysqlReady) {
    const rows = await fetchFromDb(
      pacienteId
        ? 'SELECT * FROM odontograma WHERE paciente_id = ? ORDER BY dente ASC'
        : 'SELECT * FROM odontograma ORDER BY dente ASC',
      pacienteId ? [pacienteId] : [],
      demoOdontograma,
    );
    return res.json(rows);
  }
  const data = pacienteId ? demoOdontograma.filter((item) => item.paciente_id === pacienteId) : demoOdontograma;
  return res.json(data);
});

app.get('/api/usuarios/me', async (_req, res) => {
  const authId = _req.query.auth_id || 'demo-admin';

  if (mysqlReady) {
    const rows = await fetchFromDb(
      `SELECT u.*, p.nome AS perfil_nome, p.slug AS perfil_slug
       FROM usuarios u
       LEFT JOIN perfis p ON p.id = u.perfil_id
       WHERE u.auth_id = ? OR u.email = ? LIMIT 1`,
      [authId, authId],
      demoUsers,
    );
    const match = Array.isArray(rows) ? rows[0] : null;
    if (!match) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(match);
  }

  const match = demoUsers.find((usuario) => usuario.auth_id === authId || usuario.email === authId);
  if (!match) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.json(match);
});

app.post('/api/usuarios/login', async (_req, res) => {
  const { email, password } = _req.body || {};

  if (mysqlReady) {
    const rows = await fetchFromDb(
      `SELECT u.*, p.slug AS perfil_slug, p.nome AS perfil_nome
       FROM usuarios u
       LEFT JOIN perfis p ON p.id = u.perfil_id
       WHERE u.email = ? AND u.ativo = 1 LIMIT 1`,
      [email],
      demoUsers,
    );
    const user = Array.isArray(rows) ? rows[0] : null;
    if (!user || user.password_hash !== String(password)) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    return res.json({ user, token: 'mysql-token' });
  }

  const user = demoUsers.find((item) => item.email === email && password === '123456');

  if (!user) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });

  return res.json({ user, token: 'demo-token' });
});


app.get('/api/dentistas/:id', async (_req, res) => {
  const id = Number(_req.params.id);
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM dentistas WHERE id = ? LIMIT 1', [id], demoDentistas);
    const dentista = Array.isArray(rows) ? rows[0] : null;
    if (!dentista) return res.status(404).json({ error: 'Dentista não encontrado' });
    return res.json(dentista);
  }
  const dentista = demoDentistas.find((item) => item.id === id);
  if (!dentista) return res.status(404).json({ error: 'Dentista não encontrado' });
  return res.json(dentista);
});

app.put('/api/consultas/:id/status', async (_req, res) => {
  const { status } = _req.body || {};
  const id = Number(_req.params.id);
  if (mysqlReady) {
    const rows = await fetchFromDb('UPDATE consultas SET status = ? WHERE id = ? LIMIT 1', [status, id], demoConsultas);
    const consulta = Array.isArray(rows) ? rows[0] : null;
    if (!consulta) return res.status(404).json({ error: 'Consulta não encontrada' });
    return res.json(consulta);
  }
  const consulta = demoConsultas.find((item) => item.id === id);
  if (!consulta) return res.status(404).json({ error: 'Consulta não encontrada' });
  consulta.status = status;
  return res.json(consulta);
});

app.put('/api/orcamentos/:id/status', async (_req, res) => {
  const { status } = _req.body || {};
  const id = Number(_req.params.id);
  if (mysqlReady) {
    const rows = await fetchFromDb('UPDATE orcamentos SET status = ? WHERE id = ? LIMIT 1', [status, id], demoOrcamentos);
    const orcamento = Array.isArray(rows) ? rows[0] : null;
    if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
    return res.json(orcamento);
  }
  const orcamento = demoOrcamentos.find((item) => item.id === id);
  if (!orcamento) return res.status(404).json({ error: 'Orçamento não encontrado' });
  orcamento.status = status;
  return res.json(orcamento);
});

app.post('/api/using-mysql', (_req, res) => {
  res.json({
    message: 'MySQL ready mode is prepared. Configure DB_HOST, DB_USER, DB_PASSWORD and DB_NAME in your environment to enable real database queries.',
    mysqlReady,
  });
});

// ---------- Rotas de escrita (POST/PUT/DELETE) ----------
// Precisa vir antes do fallback SPA, senão as rotas /api caem nele.
registerCrud(app, {
  query,
  isMysqlReady: () => mysqlReady,
  dadosDemo: {
    demoPacientes,
    demoDentistas,
    demoConsultas,
    demoOrcamentos,
    demoPagamentos,
    demoDespesas,
    demoOdontograma,
    demoProcedimentos,
    demoTratamentos,
  },
});

// ---------- Front-end (Vite build) ----------
const indexHtml = path.join(DIST, 'index.html');

app.use(express.static(DIST, { index: false, maxAge: '1h' }));

// SPA fallback: qualquer rota que não seja /api devolve o index.html
app.get(/^\/(?!api\/).*/, (_req, res, next) => {
  if (!fs.existsSync(indexHtml)) {
    return res
      .status(503)
      .type('text/plain')
      .send('dist/index.html not found. Run `npm run build` before starting the server.');
  }
  res.sendFile(indexHtml);
});

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

app.use((err, _req, res, _next) => {
  // erros de parse do body já trazem um status (ex.: 400); não mascarar como 500
  const status = Number(err?.status || err?.statusCode) || 500;
  if (status >= 500) console.error('[api:error]', err);
  else console.warn('[api] requisição inválida:', err?.message);
  res.status(status).json({ error: status >= 500 ? 'Erro interno do servidor' : 'Requisição inválida.' });
});
