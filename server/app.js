import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { query, testConnection } from './db.js';
import { registerCrud } from './crud.js';
import { gerarHashSenha, verificarSenha, precisaRehash, gerarToken, exigirToken } from './auth.js';
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

// Toda a API exige sessão, exceto /api/health e o login. Antes estas rotas
// eram abertas — qualquer pessoa com a URL podia ler e alterar dados.
app.use('/api', exigirToken);

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
    // Cada métrica é buscada por conta própria: se uma falhar (por exemplo,
    // a coluna `ativo` ainda não existir em `pacientes`), as outras continuam
    // reais em vez de o painel inteiro cair nos dados de demonstração.
    const seguro = async (sql, params, padrao) => {
      try {
        const linhas = await query(sql, params);
        return Array.isArray(linhas) && linhas[0] !== undefined ? linhas[0] : padrao;
      } catch (error) {
        console.warn('[api:dashboard]', error.message);
        return padrao;
      }
    };

    // Para GROUP BY: devolve todas as linhas. Usar `seguro` aqui truncava a
    // lista na primeira linha e quebrava o gráfico com TypeError.
    const seguroLista = async (sql, params) => {
      try {
        const linhas = await query(sql, params);
        return Array.isArray(linhas) ? linhas : [];
      } catch (error) {
        console.warn('[api:dashboard]', error.message);
        return [];
      }
    };

    const INICIO_MES = "DATE_FORMAT(CURDATE(), '%Y-%m-01')";
    const FIM_MES = 'LAST_DAY(CURDATE())';

    const consultasHoje = await seguro(
      'SELECT COUNT(*) AS total FROM consultas WHERE DATE(data_hora_inicio) = CURDATE()',
      [],
      { total: 0 },
    );

    const consultasSemana = await seguro(
      `SELECT COUNT(*) AS total FROM consultas
       WHERE DATE(data_hora_inicio) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()`,
      [],
      { total: 0 },
    );

    // Tenta com `ativo`; se a coluna não existir (banco antigo), conta todos.
    let pacientesAtivos;
    try {
      pacientesAtivos = await query('SELECT COUNT(*) AS total FROM pacientes WHERE ativo = 1');
    } catch {
      console.warn('[api:dashboard] coluna pacientes.ativo ausente — rode server/migrate.sql');
      pacientesAtivos = await query('SELECT COUNT(*) AS total FROM pacientes').catch(() => []);
    }

    const faturamento = await seguro(
      `SELECT COALESCE(SUM(valor), 0) AS total FROM pagamentos
       WHERE status = 'pago' AND DATE(data_pagamento) BETWEEN ${INICIO_MES} AND ${FIM_MES}`,
      [],
      { total: 0 },
    );

    const despesas = await seguro(
      `SELECT COALESCE(SUM(valor), 0) AS total FROM despesas
       WHERE status = 'pago' AND DATE(data_despesa) BETWEEN ${INICIO_MES} AND ${FIM_MES}`,
      [],
      { total: 0 },
    );

    const status = await seguroLista(
      'SELECT status, COUNT(*) AS total FROM consultas GROUP BY status',
      [],
    );

    const meses = await seguroLista(
      `SELECT
         DATE_FORMAT(data_pagamento, '%Y-%m') AS mes,
         COALESCE(SUM(valor), 0) AS receitas
       FROM pagamentos
       WHERE status = 'pago'
         AND data_pagamento >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY mes`,
      [],
    );

    const despesasPorMes = await seguroLista(
      `SELECT
         DATE_FORMAT(data_despesa, '%Y-%m') AS mes,
         COALESCE(SUM(valor), 0) AS despesas
       FROM despesas
       WHERE status = 'pago'
         AND data_despesa >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY mes`,
      [],
    );

    const proximas = await seguroLista(
      `${SELECT_CONSULTAS}
       WHERE c.data_hora_inicio >= NOW()
         AND c.status NOT IN ('cancelado', 'concluido')
       ORDER BY c.data_hora_inicio ASC
       LIMIT 5`,
      [],
    );

    const FATURAMENTO = Number(faturamento.total || 0);
    const DESPESAS = Number(despesas.total || 0);

    // Meses faltantes entram com zero para o gráfico não ficar com buracos.
    const meses6 = [];
    const agora = new Date();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const nome = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const receitaMes = meses.find((m) => m.mes === chave);
      const despesaMes = despesasPorMes.find((m) => m.mes === chave);
      meses6.push({
        mes: nome.charAt(0).toUpperCase() + nome.slice(1),
        chave,
        receitas: Number(receitaMes?.receitas || 0),
        despesas: Number(despesaMes?.despesas || 0),
      });
    }

    return res.json({
      consultasHoje: Number(consultasHoje.total || 0),
      consultasSemana: Number(consultasSemana.total || 0),
      pacientesAtivos: Number(pacientesAtivos[0]?.total || 0),
      faturamentoMes: FATURAMENTO,
      despesasMes: DESPESAS,
      saldoMes: FATURAMENTO - DESPESAS,
      consultasPorStatus: status.map((s) => ({ status: s.status, total: Number(s.total || 0) })),
      faturamentoUltimosMeses: meses6,
      proximasConsultas: (Array.isArray(proximas) ? proximas : []).map(comPaciente),
    });
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
    const rows = await fetchFromDb(`${SELECT_ORCAMENTOS} ORDER BY o.created_at DESC`, [], demoOrcamentos);
    return res.json(rows.map(comPacienteDentista));
  }
  return res.json(enriquecerOrcamentos(demoOrcamentos));
});

app.get('/api/pagamentos', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb(`${SELECT_PAGAMENTOS} ORDER BY pg.data_pagamento DESC`, [], demoPagamentos);
    return res.json(rows.map(comPacienteDentista));
  }
  return res.json(enriquecerPagamentos(demoPagamentos));
});

app.get('/api/despesas', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM despesas ORDER BY data_despesa DESC', [], demoDespesas);
    return res.json(rows);
  }
  return res.json(demoDespesas);
});

// Traduz erros do mysql2 em mensagens que dizem o que fazer, em vez de um
// 500 genérico que não ajuda ninguém a descobrir a causa.
const erroDeBanco = (error) => {
  const codigo = error?.code || '';
  const sqlState = error?.sqlState || '';

  if (codigo === 'ER_NO_SUCH_TABLE' || sqlState === '42S02') {
    return { status: 500, error: `Tabela não encontrada no banco. Rode server/schema.sql. (${error.sqlMessage || codigo})` };
  }
  if (codigo === 'ER_BAD_FIELD_ERROR' || sqlState === '42S22') {
    return { status: 500, error: `Coluna ausente no banco. Rode server/migrate.sql. (${error.sqlMessage || codigo})` };
  }
  if (codigo === 'ER_ACCESS_DENIED_ERROR') {
    return { status: 500, error: 'Credenciais do banco inválidas (DB_USER / DB_PASSWORD).' };
  }
  if (codigo === 'ER_NO_DB_ERROR' || /Unknown database/i.test(error?.message || '')) {
    return { status: 500, error: 'Banco de dados inexistente (DB_NAME).' };
  }
  if (codigo === 'ECONNREFUSED' || codigo === 'PROTOCOL_CONNECTION_LOST') {
    return { status: 500, error: 'Conexão com o banco recusada. Confira DB_HOST e DB_PORT.' };
  }

  return { status: 500, error: `Falha ao consultar o banco: ${error?.sqlMessage || error?.message || 'erro desconhecido'}` };
};

const loginComBanco = async (email, senha) => {
  const rows = await query(
    `SELECT u.id, u.email, u.nome, u.perfil_id, u.ativo, u.password_hash,
            p.nome AS perfil_nome, p.slug AS perfil_slug
     FROM usuarios u
     LEFT JOIN perfis p ON p.id = u.perfil_id
     WHERE u.email = ? LIMIT 1`,
    [email],
  );

  const linha = rows[0];
  if (!linha || !linha.ativo || !verificarSenha(senha, linha.password_hash)) {
    return { erro: { status: 401, error: 'E-mail ou senha inválidos.' } };
  }

  // Senha veio do seed em texto puro: re-hasheia agora (upgrade gradual).
  if (precisaRehash(linha.password_hash)) {
    await query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [gerarHashSenha(senha), linha.id]);
    console.log(`[auth] senha de ${email} migrada para scrypt`);
  }

  return { user: moldarUsuario(linha), token: gerarToken(linha) };
};

// ---------- Usuários ----------
// Fora do CRUD genérico: a senha precisa ser hasheada e o id é um UUID.

app.post('/api/usuarios', async (req, res) => {
  const { nome, email, senha, perfil_id } = req.body || {};

  if (!String(nome || '').trim() || !String(email || '').trim() || !String(senha || '')) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  }
  if (String(senha).length < 6) {
    return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres.' });
  }

  const emailNormalizado = String(email).trim().toLowerCase();
  const id = crypto.randomUUID();

  if (mysqlReady) {
    try {
      const existentes = await query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [emailNormalizado]);
      if (existentes[0]) return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });

      await query(
        `INSERT INTO usuarios (id, auth_id, email, nome, perfil_id, password_hash, ativo)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [id, id, emailNormalizado, String(nome).trim(), Number(perfil_id) || 1, gerarHashSenha(String(senha))],
      );

      const linhas = await query(`${SELECT_USUARIOS} WHERE u.id = ? LIMIT 1`, [id]);
      return res.status(201).json(moldarUsuario(linhas[0]));
    } catch (error) {
      console.warn('[api:usuarios]', error.message);
      return res.status(500).json({ error: 'Não foi possível criar o usuário.' });
    }
  }

  const novo = { id, email: emailNormalizado, nome: String(nome).trim(), perfil_id: Number(perfil_id) || 1, ativo: true };
  demoUsers.push({ ...novo, password_hash: gerarHashSenha(String(senha)) });
  return res.status(201).json(novo);
});

app.put('/api/usuarios/:id/ativo', async (req, res) => {
  const id = req.params.id;
  const ativo = req.body?.ativo ? 1 : 0;

  if (mysqlReady) {
    try {
      const resultado = await query('UPDATE usuarios SET ativo = ? WHERE id = ?', [ativo, id]);
      if (!resultado.affectedRows) return res.status(404).json({ error: 'Usuário não encontrado' });
      const linhas = await query(`${SELECT_USUARIOS} WHERE u.id = ? LIMIT 1`, [id]);
      return res.json(moldarUsuario(linhas[0]));
    } catch (error) {
      console.warn('[api:usuarios/ativo]', error.message);
      return res.status(500).json({ error: 'Não foi possível atualizar o usuário.' });
    }
  }

  const alvo = demoUsers.find((u) => String(u.id) === String(id));
  if (!alvo) return res.status(404).json({ error: 'Usuário não encontrado' });
  alvo.ativo = Boolean(ativo);
  return res.json(alvo);
});

app.get('/api/usuarios', async (_req, res) => {
  if (mysqlReady) {
    const rows = await fetchFromDb(`${SELECT_USUARIOS} ORDER BY u.nome`, [], []);
    return res.json(rows.map(moldarUsuario));
  }
  return res.json(demoUsers.map(({ password_hash, ...u }) => u));
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

// Usuário da sessão atual, resolvido pelo token (id em `req.usuario`).
const SELECT_USUARIOS = `
  SELECT u.id, u.email, u.nome, u.perfil_id, u.ativo,
         p.nome AS perfil_nome, p.slug AS perfil_slug
  FROM usuarios u
  LEFT JOIN perfis p ON p.id = u.perfil_id
`;

const moldarUsuario = (linha) => {
  if (!linha) return null;
  const { perfil_nome, perfil_slug, password_hash, ...resto } = linha;
  return {
    ...resto,
    perfil: perfil_nome ? { id: resto.perfil_id, nome: perfil_nome, slug: perfil_slug } : null,
  };
};

app.get('/api/usuarios/me', async (req, res) => {
  const id = req.usuario?.sub;

  if (mysqlReady && id) {
    const rows = await query(`${SELECT_USUARIOS} WHERE u.id = ? OR u.email = ? LIMIT 1`, [id, id]);
    const usuario = moldarUsuario(rows[0]);
    if (!usuario) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(usuario);
  }

  const match = demoUsers.find((u) => u.id === id || u.email === id) ?? null;
  if (!match) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.json(match);
});

// Login local contra a tabela usuarios (mais a sessão de demonstração,
// para o app continuar utilizável sem banco configurado).
app.post('/api/usuarios/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const senha = String(req.body?.password || '');

  if (!email || !senha) return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

  if (mysqlReady) {
    try {
      const { user, token, erro } = await loginComBanco(email, senha);
      if (erro) return res.status(erro.status).json({ error: erro.error });
      return res.json({ user, token });
    } catch (error) {
      console.warn('[auth:login]', error?.code || '', error?.message);
      const mapeado = erroDeBanco(error);
      return res.status(mapeado.status).json({ error: mapeado.error });
    }
  }

  // Modo demo: as contas do seed não têm hash; as criadas pela API têm.
  const demo = demoUsers.find((u) => u.email === email && u.ativo !== false);
  if (!demo) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });

  const senhaConfere = demo.password_hash ? verificarSenha(senha, demo.password_hash) : senha === '123456';
  if (!senhaConfere) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });

  const { password_hash, ...usuarioLimpo } = demo;
  return res.json({ user: usuarioLimpo, token: gerarToken(demo) });
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
  const { status, observacoes } = _req.body || {};
  const id = Number(_req.params.id);

  if (mysqlReady) {
    try {
      // UPDATE devolve { affectedRows, changedRows }, não a linha — então
      // consultamos de depois para devolver o registro atualizado.
      const resultado = await query('UPDATE consultas SET status = ? WHERE id = ?', [status, id]);
      if (!resultado.affectedRows) return res.status(404).json({ error: 'Consulta não encontrada' });

      if (observacoes !== undefined) {
        await query('UPDATE consultas SET observacoes = ? WHERE id = ?', [observacoes, id]);
      }

      const linhas = await query(`${SELECT_CONSULTAS} WHERE c.id = ? LIMIT 1`, [id]);
      return res.json(comPaciente(linhas[0]));
    } catch (error) {
      console.warn('[api:consultas/status]', error.message);
      return res.status(500).json({ error: 'Não foi possível atualizar a consulta.' });
    }
  }

  const consulta = demoConsultas.find((item) => Number(item.id) === id);
  if (!consulta) return res.status(404).json({ error: 'Consulta não encontrada' });
  consulta.status = status;
  if (observacoes !== undefined) consulta.observacoes = observacoes;
  return res.json(enriquecerDemo(consulta));
});

app.put('/api/orcamentos/:id/status', async (_req, res) => {
  const { status } = _req.body || {};
  const id = Number(_req.params.id);

  if (mysqlReady) {
    try {
      const resultado = await query('UPDATE orcamentos SET status = ? WHERE id = ?', [status, id]);
      if (!resultado.affectedRows) return res.status(404).json({ error: 'Orçamento não encontrado' });

      const linhas = await query(`${SELECT_ORCAMENTOS} WHERE o.id = ? LIMIT 1`, [id]);
      return res.json(comPacienteDentista(linhas[0]));
    } catch (error) {
      console.warn('[api:orcamentos/status]', error.message);
      return res.status(500).json({ error: 'Não foi possível atualizar o orçamento.' });
    }
  }

  const orcamento = demoOrcamentos.find((item) => Number(item.id) === id);
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

// ---------- Orçamentos e pagamentos: paciente/dentista embutidos ----------
// As listas do front leem `o.paciente.nome` / `o.dentista.nome`; sem o join
// as colunas saem vazias quando os dados vêm do MySQL.

const SELECT_ORCAMENTOS = `
  SELECT o.*,
         p.nome AS paciente_nome, p.telefone AS paciente_telefone,
         p.email AS paciente_email, p.convenio AS paciente_convenio,
         d.nome AS dentista_nome, d.cro AS dentista_cro
  FROM orcamentos o
  LEFT JOIN pacientes p ON p.id = o.paciente_id
  LEFT JOIN dentistas d ON d.id = o.dentista_id
`;

const SELECT_PAGAMENTOS = `
  SELECT pg.*,
         p.nome AS paciente_nome, p.telefone AS paciente_telefone,
         p.email AS paciente_email, p.convenio AS paciente_convenio
  FROM pagamentos pg
  LEFT JOIN pacientes p ON p.id = pg.paciente_id
`;

// Achata paciente_nome/dentista_nome em objetos `paciente` / `dentista`.
const comPacienteDentista = (linha) => {
  if (!linha) return linha;
  const { paciente_nome, paciente_telefone, paciente_email, paciente_convenio, dentista_nome, dentista_cro, ...resto } = linha;
  return {
    ...resto,
    paciente: paciente_nome
      ? { id: resto.paciente_id, nome: paciente_nome, telefone: paciente_telefone, email: paciente_email, convenio: paciente_convenio }
      : null,
    dentista: dentista_nome ? { id: resto.dentista_id, nome: dentista_nome, cro: dentista_cro } : null,
  };
};

// No modo demo as linhas do seed já vêm com os objetos aninhados.
const enriquecerOrcamentos = (lista) =>
  lista.map((linha) => ({
    ...linha,
    paciente: linha.paciente ?? demoPacientes.find((p) => Number(p.id) === Number(linha.paciente_id)) ?? null,
    dentista: linha.dentista ?? demoDentistas.find((d) => Number(d.id) === Number(linha.dentista_id)) ?? null,
  }));

const enriquecerPagamentos = (lista) =>
  lista.map((linha) => ({
    ...linha,
    paciente: linha.paciente ?? demoPacientes.find((p) => Number(p.id) === Number(linha.paciente_id)) ?? null,
  }));

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
