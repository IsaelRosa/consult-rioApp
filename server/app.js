import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { query, testConnection } from './db.js';
import { registerCrud } from './crud.js';
import { auditarReq } from './auditoria.js';
import { TENANT_TABLES } from './tenant.js';
import { limite } from './ratelimit.js';
import { registrarClinica } from './cadastro.js';
import { verificarLimite, PLANOS, obterPlano } from './planos.js';
import { enviar, smtpConfigurado } from './mailer.js';
import { solicitarRecuperacao, consumirToken, marcarUsado, VALIDADE as VALIDADE_RECOVERACAO } from './recuperacao.js';
import { assinar, assinaturaVigente, historico, aplicarWebhook, provedorConfigurado, gerarReferencia } from './assinaturas.js';
import { boasVindas as enviarBoasVindas, testarConfiguracao as testarEmail, urlsConfiguradas } from './emails.js';
import { iniciarRotinas, cobrarVencimentos, suspenderInadimplentes } from './rotinas.js';
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

// Rotas públicas: o cadastro de clínica é a porta de entrada do SaaS e por
// isso tem rate limit próprio. O resto exige sessão.
app.post(
  '/api/plataforma/registrar',
  limite({ janelaMs: 3_600_000, max: 5, mensagem: 'Muitas tentativas de cadastro deste IP. Tente mais tarde.' }),
  async (req, res) => {
    if (!mysqlReady) {
      return res.status(503).json({ error: 'Cadastro indisponível: o banco de dados não está configurado.' });
    }

    try {
      const resultado = await registrarClinica(req.body);
      if (resultado.erro) return res.status(resultado.erro.status).json({ error: resultado.erro.error });

      console.log(`[plataforma] nova clínica #${resultado.clinica.id} — ${resultado.clinica.nome} (${resultado.plano})`);

      // Boas-vindas. Não bloqueia o cadastro se falhar: a conta já existe e
      // o cliente pode pedir o reenvio depois.
      enviarBoasVindas({
        nome: resultado.admin.nome,
        email: resultado.admin.email,
        clinica: resultado.clinica.nome,
        plano: resultado.plano,
        preco: resultado.preco,
        origem: `${req.protocol}://${req.get('host')}`,
      }).catch((erro) => console.warn('[email:boas-vindas]', erro?.message));

      // Devolve só o necessário para o usuário logar; nada de token aqui.
      return res.status(201).json({
        clinica: { nome: resultado.clinica.nome, slug: resultado.clinica.slug },
        plano: resultado.plano,
        admin: { email: resultado.admin.email },
      });
    } catch (error) {
      console.warn('[plataforma:registrar]', error.code || '', error.message);
      const mapeado = erroDeBanco(error);
      return res.status(mapeado.status).json({ error: mapeado.error });
    }
  },
);

app.get('/api/plataforma/planos', (_req, res) => {
  res.json(Object.values(PLANOS).map(({ slug, nome, max_dentistas, max_usuarios, preco_mensal, recursos }) => ({
    slug,
    nome,
    max_dentistas,
    max_usuarios,
    preco_mensal,
    recursos,
  })));
});

app.post(
  '/api/plataforma/recuperar-senha',
  limite({ janelaMs: 900_000, max: 5, mensagem: 'Muitas tentativas. Aguarde alguns minutos.' }),
  async (req, res) => {
    if (!mysqlReady) return res.status(503).json({ error: 'Indisponível no momento.' });

    try {
      const resultado = await solicitarRecuperacao(req.body?.email);
      const origem = req.headers.origin || `${req.protocol}://${req.get('host')}`;
      const link = resultado.criado ? `${origem}/redefinir-senha?token=${resultado.token}` : null;

      if (resultado.criado) {
        const envio = await enviar({
          para: resultado.email,
          assunto: 'Redefinição de senha',
          texto: [
            `Olá, ${resultado.nome}.`,
            '',
            'Recebemos um pedido para redefinir a senha da sua conta.',
            `Use o link abaixo em até ${VALIDADE_RECOVERACAO} horas:`,
            link,
            '',
            'Se não foi você, ignore esta mensagem: nada muda na sua conta.',
          ].join('\n'),
        });

        // Sem SMTP não há como entregar o link. Dizer isso é melhor que
        // fingir que o e-mail foi enviado.
        if (!envio.entregue) {
          return res.status(503).json({
            error: 'O envio de e-mail está indisponível. Fale com o suporte para redefinir sua senha.',
          });
        }
      }

      // Resposta idêntica exista ou não a conta.
      return res.json({ ok: true, mensagem: 'Se o e-mail existir, você receberá o link em instantes.' });
    } catch (error) {
      console.warn('[recuperacao]', error.message);
      return res.status(500).json({ error: 'Não foi possível processar o pedido.' });
    }
  },
);

app.post(
  '/api/plataforma/redefinir-senha',
  limite({ janelaMs: 900_000, max: 10, mensagem: 'Muitas tentativas. Aguarde alguns minutos.' }),
  async (req, res) => {
    if (!mysqlReady) return res.status(503).json({ error: 'Indisponível no momento.' });

    const { token, senha } = req.body || {};

    try {
      const { registro, erro } = await consumirToken(token, senha);
      if (erro) return res.status(erro.status).json({ error: erro.error });

      await query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [
        gerarHashSenha(String(senha)),
        registro.usuario_id,
      ]);

      // Invalida sessões abertas: quem esqueceu a senha pode estar com o
      // antigo token em outro dispositivo.
      await query('UPDATE usuarios SET token_version = token_version + 1 WHERE id = ?', [registro.usuario_id]);
      await marcarUsado(registro.id);

      console.log(`[recuperacao] senha redefinida para o usuário ${registro.usuario_id}`);
      return res.json({ ok: true });
    } catch (error) {
      console.warn('[recuperacao:redefinir]', error.message);
      const mapeado = erroDeBanco(error);
      return res.status(mapeado.status).json({ error: mapeado.error });
    }
  },
);

// Confirmação de pagamento vinda do gateway. Público por natureza, mas
// autenticado pelo segredo compartilhado — sem isso qualquer um ativaria
// planos de graça.
app.post('/api/plataforma/webhook-pagamento', async (req, res) => {
  const segredo = req.get('X-Assinatura-Secreta') || req.query.segredo;
  try {
    const resultado = await aplicarWebhook(req.body, segredo);
    if (resultado.erro) return res.status(resultado.erro.status).json({ error: resultado.erro.error });
    console.log(`[assinatura] webhook aplicado: ${resultado.assinatura} -> ${resultado.status}`);
    return res.json({ ok: true });
  } catch (error) {
    console.warn('[assinatura:webhook]', error.message);
    return res.status(500).json({ error: 'Não foi possível processar o webhook.' });
  }
});

// Diagnóstico de e-mail: o admin confere se o envio está funcionando.
app.get('/api/plataforma/email/status', async (req, res) => {
  res.json({ configurado: smtpConfigurado(), urls: urlsConfiguradas() });
});

app.post('/api/plataforma/email/testar', async (req, res) => {
  const destino = String(req.body?.email || '').trim();
  if (!destino) return res.status(400).json({ error: 'Informe o e-mail de destino.' });

  const resultado = await testarEmail(destino);
  if (!resultado.entregue) {
    return res.status(503).json({
      error: 'O envio não funcionou. Verifique as variáveis SMTP_* no painel.',
      motivo: resultado.motivo,
    });
  }
  return res.json({ ok: true });
});

// Dispara as rotinas na hora, sem esperar o horário agendado.
app.post('/api/plataforma/rotinas/executar', async (_req, res) => {
  try {
    const avisos = await cobrarVencimentos();
    const suspensos = await suspenderInadimplentes();
    return res.json({ ok: true, avisos, suspensos });
  } catch (error) {
    console.warn('[rotinas:manual]', error.message);
    return res.status(500).json({ error: 'As rotinas falharam. Veja o log.' });
  }
});

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

// Tabelas cuja quantidade é limitada pelo plano contratado.
const LIMITADOS_POR_PLANO = ['dentistas'];

// Clínica da requisição, vem do token assinado (ver server/auth.js e tenant.js).
const clinica = (req) => {
  const id = Number(req.usuario?.clinica_id);
  if (!Number.isInteger(id) || id <= 0) {
    const erro = new Error('Usuário não vinculado a nenhuma clínica.');
    erro.status = 403;
    throw erro;
  }
  return id;
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
         WHERE cp.clinica_id = ? AND cp.consulta_id = ?
         ORDER BY cp.id`,
        [consulta.clinica_id ?? 1, consulta.id],
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

app.get('/api/consultas', async (req, res) => {
  const pacienteId = Number(req.query.paciente_id || 0);
  const cid = clinica(req);

  if (mysqlReady) {
    const linhas = await fetchFromDb(
      pacienteId
        ? `${SELECT_CONSULTAS} WHERE c.clinica_id = ? AND c.paciente_id = ? ORDER BY c.data_hora_inicio ASC`
        : `${SELECT_CONSULTAS} WHERE c.clinica_id = ? ORDER BY c.data_hora_inicio ASC`,
      pacienteId ? [cid, pacienteId] : [cid],
      demoConsultas,
    );
    return res.json(linhas.map(comPaciente));
  }

  const lista = pacienteId
    ? demoConsultas.filter((item) => Number(item.paciente_id) === pacienteId)
    : demoConsultas;
  return res.json(lista.map(enriquecerDemo));
});

app.get('/api/consultas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const cid = clinica(req);

  if (mysqlReady) {
    const linhas = await fetchFromDb(`${SELECT_CONSULTAS} WHERE c.clinica_id = ? AND c.id = ? LIMIT 1`, [cid, id], []);
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
    const cid = clinica(req);
    try {
      // A consulta precisa pertencer à clínica do token, senão dava para
      // lançar procedimento em atendimento de outra clínica.
      const [dono] = await query('SELECT id FROM consultas WHERE id = ? AND clinica_id = ? LIMIT 1', [consultaId, cid]);
      if (!dono) return res.status(404).json({ error: 'Consulta não encontrada.' });

      const criado = await query(
        `INSERT INTO consulta_procedimentos
           (clinica_id, consulta_id, procedimento_id, quantidade, valor_cobrado)
         VALUES (?, ?, ?, ?, ?)`,
        [cid, consultaId, procedimentoId, registro.quantidade, registro.valor_cobrado],
      );
      const [linha] = await query(
        'SELECT * FROM consulta_procedimentos WHERE id = ? AND clinica_id = ? LIMIT 1',
        [criado.insertId, cid],
      );
      auditarReq(req, 'criar', 'consulta_procedimentos', criado.insertId, registro);
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

app.get('/api/dashboard', async (req, res) => {
  const cid = clinica(req);
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
      'SELECT COUNT(*) AS total FROM consultas WHERE clinica_id = ? AND DATE(data_hora_inicio) = CURDATE()',
      [cid],
      { total: 0 },
    );

    const consultasSemana = await seguro(
      `SELECT COUNT(*) AS total FROM consultas
       WHERE clinica_id = ?
         AND DATE(data_hora_inicio) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()`,
      [cid],
      { total: 0 },
    );

    // Tenta com `ativo`; se a coluna não existir (banco antigo), conta todos.
    let pacientesAtivos;
    try {
      pacientesAtivos = await query('SELECT COUNT(*) AS total FROM pacientes WHERE clinica_id = ? AND ativo = 1', [cid]);
    } catch {
      console.warn('[api:dashboard] coluna pacientes.ativo ausente — rode server/migrate.sql');
      pacientesAtivos = await query('SELECT COUNT(*) AS total FROM pacientes WHERE clinica_id = ?', [cid]).catch(() => []);
    }

    const faturamento = await seguro(
      `SELECT COALESCE(SUM(valor), 0) AS total FROM pagamentos
       WHERE clinica_id = ? AND status = 'pago'
         AND DATE(data_pagamento) BETWEEN ${INICIO_MES} AND ${FIM_MES}`,
      [cid],
      { total: 0 },
    );

    const despesas = await seguro(
      `SELECT COALESCE(SUM(valor), 0) AS total FROM despesas
       WHERE clinica_id = ? AND status = 'pago'
         AND DATE(data_despesa) BETWEEN ${INICIO_MES} AND ${FIM_MES}`,
      [cid],
      { total: 0 },
    );

    const status = await seguroLista(
      'SELECT status, COUNT(*) AS total FROM consultas WHERE clinica_id = ? GROUP BY status',
      [cid],
    );

    const meses = await seguroLista(
      `SELECT
         DATE_FORMAT(data_pagamento, '%Y-%m') AS mes,
         COALESCE(SUM(valor), 0) AS receitas
       FROM pagamentos
       WHERE clinica_id = ? AND status = 'pago'
         AND data_pagamento >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY mes`,
      [cid],
    );

    const despesasPorMes = await seguroLista(
      `SELECT
         DATE_FORMAT(data_despesa, '%Y-%m') AS mes,
         COALESCE(SUM(valor), 0) AS despesas
       FROM despesas
       WHERE clinica_id = ? AND status = 'pago'
         AND data_despesa >= DATE_SUB(CURDATE(), INTERVAL 5 MONTH)
       GROUP BY mes`,
      [cid],
    );

    const proximas = await seguroLista(
      `${SELECT_CONSULTAS}
       WHERE c.clinica_id = ?
         AND c.data_hora_inicio >= NOW()
         AND c.status NOT IN ('cancelado', 'concluido')
       ORDER BY c.data_hora_inicio ASC
       LIMIT 5`,
      [cid],
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

app.get('/api/pacientes', async (req, res) => {
  const cid = clinica(req);
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM pacientes WHERE clinica_id = ? ORDER BY nome', [cid], demoPacientes);
    return res.json(rows);
  }
  return res.json(demoPacientes);
});

app.get('/api/dentistas', async (req, res) => {
  const cid = clinica(req);
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM dentistas WHERE clinica_id = ? ORDER BY nome', [cid], demoDentistas);
    return res.json(rows);
  }
  return res.json(demoDentistas);
});


app.get('/api/procedimentos', async (req, res) => {
  const cid = clinica(req);
  if (mysqlReady) {
    const rows = await fetchFromDb(
      'SELECT * FROM procedimentos WHERE clinica_id = ? AND ativo = 1 ORDER BY nome',
      [cid],
      demoProcedimentos,
    );
    return res.json(rows);
  }
  return res.json(demoProcedimentos);
});

app.get('/api/tratamentos', async (req, res) => {
  const pacienteId = Number(req.query.paciente_id || 0);
  const cid = clinica(req);
  if (mysqlReady) {
    const rows = await fetchFromDb(
      pacienteId
        ? 'SELECT * FROM tratamentos WHERE clinica_id = ? AND paciente_id = ? ORDER BY created_at DESC'
        : 'SELECT * FROM tratamentos WHERE clinica_id = ? ORDER BY created_at DESC',
      pacienteId ? [cid, pacienteId] : [cid],
      demoTratamentos,
    );
    return res.json(rows);
  }
  const data = pacienteId ? demoTratamentos.filter((item) => item.paciente_id === pacienteId) : demoTratamentos;
  return res.json(data);
});

app.get('/api/orcamentos', async (req, res) => {
  const cid = clinica(req);
  if (mysqlReady) {
    const rows = await fetchFromDb(
      `${SELECT_ORCAMENTOS} WHERE o.clinica_id = ? ORDER BY o.created_at DESC`,
      [cid],
      demoOrcamentos,
    );
    return res.json(rows.map(comPacienteDentista));
  }
  return res.json(enriquecerOrcamentos(demoOrcamentos));
});

app.get('/api/pagamentos', async (req, res) => {
  const cid = clinica(req);
  if (mysqlReady) {
    const rows = await fetchFromDb(
      `${SELECT_PAGAMENTOS} WHERE pg.clinica_id = ? ORDER BY pg.data_pagamento DESC`,
      [cid],
      demoPagamentos,
    );
    return res.json(rows.map(comPacienteDentista));
  }
  return res.json(enriquecerPagamentos(demoPagamentos));
});

app.get('/api/despesas', async (req, res) => {
  const cid = clinica(req);
  if (mysqlReady) {
    const rows = await fetchFromDb(
      'SELECT * FROM despesas WHERE clinica_id = ? ORDER BY data_despesa DESC',
      [cid],
      demoDespesas,
    );
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
    `SELECT u.id, u.email, u.nome, u.perfil_id, u.ativo, u.password_hash, u.clinica_id, u.token_version,
            c.nome AS clinica_nome, c.slug AS clinica_slug, c.ativo AS clinica_ativa,
            p.nome AS perfil_nome, p.slug AS perfil_slug
     FROM usuarios u
     LEFT JOIN perfis p ON p.id = u.perfil_id
     LEFT JOIN clinicas c ON c.id = u.clinica_id
     WHERE u.email = ? LIMIT 1`,
    [email],
  );

  const linha = rows[0];
  if (!linha || !linha.ativo || !verificarSenha(senha, linha.password_hash)) {
    return { erro: { status: 401, error: 'E-mail ou senha inválidos.' } };
  }

  if (!linha.clinica_id) {
    return { erro: { status: 403, error: 'Usuário não vinculado a uma clínica. Fale com o suporte.' } };
  }
  if (linha.clinica_ativa === 0 || linha.clinica_ativa === false) {
    return { erro: { status: 403, error: 'A clínica está inativa. Regularize a assinatura.' } };
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

// Barreira comercial: o plano define quantos dentistas a clínica pode ter.
// Só faz sentido com o MySQL configurado — no modo demo não há limite.
app.post('/api/plataforma/limite/:recurso', async (req, res) => {
  const recurso = req.params.recurso;
  if (!['dentistas', 'usuarios'].includes(recurso)) {
    return res.status(400).json({ error: 'Recurso inválido.' });
  }

  const cid = clinica(req);

  if (!mysqlReady) return res.json({ ok: true });

  try {
    const [clinicaRow] = await query('SELECT plano FROM clinicas WHERE id = ? LIMIT 1', [cid]);
    const resultado = await verificarLimite(clinicaRow?.plano, cid, recurso, 1);

    if (!resultado.ok) return res.status(402).json({ error: resultado.mensagem, limite: resultado.limite });
    return res.json({ ok: true, limite: resultado.limite });
  } catch (error) {
    console.warn('[planos:limite]', error.message);
    return res.status(500).json({ error: 'Não foi possível verificar o limite do plano.' });
  }
});

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
  const cid = clinica(req);

  if (mysqlReady) {
    try {
      // E-mail é único por clínica: duas clínicas podem ter o mesmo e-mail.
      const existentes = await query(
        'SELECT id FROM usuarios WHERE email = ? AND clinica_id = ? LIMIT 1',
        [emailNormalizado, cid],
      );
      if (existentes[0]) return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });

      await query(
        `INSERT INTO usuarios (id, auth_id, email, nome, perfil_id, password_hash, clinica_id, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [id, id, emailNormalizado, String(nome).trim(), Number(perfil_id) || 1, gerarHashSenha(String(senha)), cid],
      );

      const linhas = await query(`${SELECT_USUARIOS} WHERE u.id = ? AND u.clinica_id = ? LIMIT 1`, [id, cid]);
      auditarReq(req, 'criar', 'usuarios', id, { email: emailNormalizado, perfil_id });
      return res.status(201).json(moldarUsuario(linhas[0]));
    } catch (error) {
      console.warn('[api:usuarios]', error.message);
      const mapeado = erroDeBanco(error);
      return res.status(mapeado.status).json({ error: mapeado.error });
    }
  }

  const novo = {
    id,
    email: emailNormalizado,
    nome: String(nome).trim(),
    perfil_id: Number(perfil_id) || 1,
    clinica_id: cid,
    ativo: true,
  };
  demoUsers.push({ ...novo, password_hash: gerarHashSenha(String(senha)) });
  return res.status(201).json(novo);
});

app.put('/api/usuarios/:id/ativo', async (req, res) => {
  const id = req.params.id;
  const ativo = req.body?.ativo ? 1 : 0;
  const cid = clinica(req);

  if (mysqlReady) {
    try {
      const resultado = await query(
        'UPDATE usuarios SET ativo = ? WHERE id = ? AND clinica_id = ?',
        [ativo, id, cid],
      );
      if (!resultado.affectedRows) return res.status(404).json({ error: 'Usuário não encontrado' });
      const linhas = await query(`${SELECT_USUARIOS} WHERE u.id = ? AND u.clinica_id = ? LIMIT 1`, [id, cid]);
      auditarReq(req, 'atualizar', 'usuarios', id, { ativo: Boolean(ativo) });
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

app.get('/api/usuarios', async (req, res) => {
  const cid = clinica(req);
  if (mysqlReady) {
    // Só usuários da própria clínica: a tela de usuários de uma clínica não
    // pode listar staff de outra.
    const rows = await fetchFromDb(`${SELECT_USUARIOS} WHERE u.clinica_id = ? ORDER BY u.nome`, [cid], []);
    return res.json(rows.map(moldarUsuario));
  }
  return res.json(demoUsers.map(({ password_hash, ...u }) => u));
});

app.get('/api/odontograma', async (req, res) => {
  const pacienteId = Number(req.query.paciente_id || 0);
  const cid = clinica(req);
  if (mysqlReady) {
    const rows = await fetchFromDb(
      pacienteId
        ? 'SELECT * FROM odontograma WHERE clinica_id = ? AND paciente_id = ? ORDER BY dente ASC'
        : 'SELECT * FROM odontograma WHERE clinica_id = ? ORDER BY dente ASC',
      pacienteId ? [cid, pacienteId] : [cid],
      demoOdontograma,
    );
    return res.json(rows);
  }
  const data = pacienteId ? demoOdontograma.filter((item) => item.paciente_id === pacienteId) : demoOdontograma;
  return res.json(data);
});

// Usuário da sessão atual, resolvido pelo token (id em `req.usuario`).
const SELECT_USUARIOS = `
  SELECT u.id, u.email, u.nome, u.perfil_id, u.ativo, u.clinica_id, u.token_version,
         c.nome AS clinica_nome, c.slug AS clinica_slug,
         p.nome AS perfil_nome, p.slug AS perfil_slug
  FROM usuarios u
  LEFT JOIN perfis p ON p.id = u.perfil_id
  LEFT JOIN clinicas c ON c.id = u.clinica_id
`;

const moldarUsuario = (linha) => {
  if (!linha) return null;
  const { perfil_nome, perfil_slug, password_hash, clinica_nome, clinica_slug, ...resto } = linha;
  // token_version é interno de sessão; não faz parte do perfil do cliente.
  delete resto.token_version;
  return {
    ...resto,
    perfil: perfil_nome ? { id: resto.perfil_id, nome: perfil_nome, slug: perfil_slug } : null,
    clinica: resto.clinica_id ? { id: resto.clinica_id, nome: clinica_nome, slug: clinica_slug } : null,
  };
};

// Revogação de sessão: incrementa token_version, invalidando todos os tokens
// já emitidos para aquele usuário (equivale a "sair de todos os dispositivos").
app.post('/api/usuarios/logout', async (req, res) => {
  const id = req.usuario?.sub;
  if (!id) return res.json({ ok: true });

  if (mysqlReady) {
    try {
      await query('UPDATE usuarios SET token_version = token_version + 1 WHERE id = ?', [id]);
      auditarReq(req, 'logout', 'usuarios', id);
    } catch (error) {
      console.warn('[auth:logout]', error.message);
    }
  }

  return res.json({ ok: true });
});

// ---------- Assinatura e cobrança ----------

// Situação atual da assinatura da clínica logada.
app.get('/api/assinatura', async (req, res) => {
  const cid = clinica(req);

  if (!mysqlReady) {
    return res.json({ assinatura: null, plano: obterPlano('essencial'), provedor: false });
  }

  try {
    const [clinicaRow] = await query('SELECT nome, slug, plano, ativo FROM clinicas WHERE id = ? LIMIT 1', [cid]);
    const assinatura = await assinaturaVigente(cid);

    return res.json({
      clinica: clinicaRow ?? null,
      assinatura,
      plano: obterPlano(clinicaRow?.plano),
      provedor: provedorConfigurado(),
    });
  } catch (error) {
    console.warn('[api:assinatura]', error.message);
    return res.status(500).json({ error: 'Não foi possível carregar a assinatura.' });
  }
});

// Inicia (ou troca) a assinatura de um plano.
app.post('/api/assinatura/assinar', async (req, res) => {
  const cid = clinica(req);
  const plano = String(req.body?.plano || '');

  if (!PLANOS[plano]) {
    return res.status(400).json({ error: 'Plano inválido.' });
  }

  // Sem gateway não há como cobrar. Dizer isso é melhor que devolver uma
  // assinatura "ativa" que ninguém pagou.
  if (!provedorConfigurado()) {
    return res.status(503).json({
      error: 'O pagamento ainda não está disponível. Fale com a gente para ativar sua assinatura.',
      provedor: false,
    });
  }

  try {
    const resultado = await assinar(cid, plano);
    auditarReq(req, 'assinar', 'assinaturas', resultado.assinaturaId ?? null, { plano });

    if (resultado.jaAssinante) {
      return res.json({ ok: true, jaAssinante: true, plano });
    }

    const referencia = gerarReferencia();
    await query('UPDATE assinaturas SET referencia = ? WHERE id = ?', [referencia, resultado.assinaturaId]);

    // O checkout é montado pelo gateway (Mercado Pago/Stripe). O ponto de
    // entrada fica em 'checkout'; ajuste ao integrar.
    return res.status(201).json({
      ok: true,
      referencia,
      plano,
      valor: resultado.valor,
      checkout: {
        metodo: 'redirect',
        // Substitua pelo link/SDK do provedor na hora da integração.
        url: null,
        observacao: 'Integração com o gateway pendente: defina PAGAMENTO_PROVEDOR e PAGAMENTO_CHAVE.',
      },
    });
  } catch (error) {
    console.warn('[api:assinatura:assinar]', error.message);
    const mapeado = erroDeBanco(error);
    return res.status(mapeado.status).json({ error: mapeado.error });
  }
});

app.get('/api/assinatura/historico', async (req, res) => {
  const cid = clinica(req);
  if (!mysqlReady) return res.json({ historico: [] });

  try {
    return res.json({ historico: await historico(cid) });
  } catch (error) {
    console.warn('[api:assinatura/historico]', error.message);
    return res.status(500).json({ error: 'Não foi possível carregar o histórico.' });
  }
});

// Plano da clínica e uso atual — a tela de configurações mostra isso ao cliente.
app.get('/api/plano', async (req, res) => {
  const cid = clinica(req);

  if (!mysqlReady) {
    const plano = obterPlano('essencial');
    return res.json({ plano, uso: { dentistas: 0, usuarios: demoUsers.length } });
  }

  try {
    const [linha] = await query('SELECT nome, slug, plano, ativo FROM clinicas WHERE id = ? LIMIT 1', [cid]);
    if (!linha) return res.status(404).json({ error: 'Clínica não encontrada.' });

    const [[{ total: dentistas }], [{ total: usuarios }]] = await Promise.all([
      query('SELECT COUNT(*) AS total FROM dentistas WHERE clinica_id = ?', [cid]),
      query('SELECT COUNT(*) AS total FROM usuarios WHERE clinica_id = ?', [cid]),
    ]);

    return res.json({
      clinica: linha,
      plano: obterPlano(linha.plano),
      uso: { dentistas: Number(dentistas), usuarios: Number(usuarios) },
    });
  } catch (error) {
    console.warn('[api:plano]', error.message);
    return res.status(500).json({ error: 'Não foi possível carregar o plano.' });
  }
});

app.get('/api/usuarios/me', async (req, res) => {
  const id = req.usuario?.sub;

  if (mysqlReady && id) {
    // Filtra pela clínica do token: o usuário não consegue ler o perfil de
    // outra clínica mesmo que mande outro id.
    const rows = await query(
      `${SELECT_USUARIOS} WHERE u.clinica_id = ? AND (u.id = ? OR u.email = ?) LIMIT 1`,
      [clinica(req), id, id],
    );

    // token_version mudou depois da emissão? A sessão foi revogada.
    if (rows[0] && Number(rows[0].token_version || 0) !== Number(req.usuario?.tv || 0)) {
      return res.status(401).json({ error: 'Sessão encerrada. Faça login novamente.' });
    }
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


app.get('/api/dentistas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const cid = clinica(req);
  if (mysqlReady) {
    const rows = await fetchFromDb('SELECT * FROM dentistas WHERE clinica_id = ? AND id = ? LIMIT 1', [cid, id], demoDentistas);
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
  clinicaDe: (req) => req.usuario?.clinica_id,
  auditarReq,
  // Aplica o limite do plano no servidor, dentro do próprio CRUD.
  antesDeCriar: async (rota, req) => {
    if (!mysqlReady || !LIMITADOS_POR_PLANO.includes(rota)) return null;

    const cid = clinica(req);
    const [clinicaRow] = await query('SELECT plano FROM clinicas WHERE id = ? LIMIT 1', [cid]);
    if (!clinicaRow) return null;

    const resultado = await verificarLimite(clinicaRow.plano, cid, rota, 1);
    if (resultado.ok) return null;

    return { status: 402, error: resultado.mensagem, limite: resultado.limite };
  },
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
