import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query, testConnection } from './db.js';
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

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const mysqlReady = await testConnection();

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

app.get('/api/consultas', async (_req, res) => {
  const pacienteId = Number(_req.query.paciente_id || 0);
  if (mysqlReady) {
    const rows = await fetchFromDb(
      pacienteId
        ? 'SELECT * FROM consultas WHERE paciente_id = ? ORDER BY data_hora_inicio ASC'
        : 'SELECT * FROM consultas ORDER BY data_hora_inicio ASC',
      pacienteId ? [pacienteId] : [],
      demoConsultas,
    );
    return res.json(rows);
  }
  const data = pacienteId ? demoConsultas.filter((item) => item.paciente_id === pacienteId) : demoConsultas;
  return res.json(data);
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

app.get('/api/consultas/:id', async (_req, res) => {
  const id = Number(_req.params.id);
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM consultas WHERE id = ? LIMIT 1', [id], demoConsultas);
    const consulta = Array.isArray(rows) ? rows[0] : null;
    if (!consulta) return res.status(404).json({ error: 'Consulta não encontrada' });
    return res.json(consulta);
  }
  const consulta = demoConsultas.find((item) => item.id === id);
  if (!consulta) return res.status(404).json({ error: 'Consulta não encontrada' });
  return res.json(consulta);
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

app.listen(port, () => {
  console.log(`✅ API running on http://localhost:${port}`);
  console.log(mysqlReady ? '📦 MySQL connected' : '🧪 Demo mode active');
});
