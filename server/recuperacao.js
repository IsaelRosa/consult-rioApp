// Recuperação de senha.
//
// Regras que valem mais que o código:
//  - a resposta é sempre igual, exista ou não o e-mail (senão a rota vaza
//    quais e-mails têm conta);
//  - o token é de uso único e curto;
//  - o hash é do token, nunca o token em si.

import crypto from 'node:crypto';
import { query } from './db.js';

const VALIDADE_HORAS = 2;
const MAX_TENTATIVAS = 5;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const solicitarRecuperacao = async (email) => {
  const linhas = await query(
    'SELECT id, email, nome FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1',
    [String(email || '').trim().toLowerCase()],
  );

  const usuario = linhas[0];
  if (!usuario) {
    // Silêncio proposital: o chamador responde 200 de qualquer forma.
    return { criado: false };
  }

  // Invalida pedidos anteriores ainda abertos.
  await query('UPDATE tokens_recuperacao SET usado_em = NOW() WHERE usuario_id = ? AND usado_em IS NULL', [usuario.id]);

  const token = crypto.randomBytes(32).toString('hex');

  await query(
    `INSERT INTO tokens_recuperacao (usuario_id, token_hash, expira_em, tentativas)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), 0)`,
    [usuario.id, hashToken(token), VALIDADE_HORAS],
  );

  return { criado: true, token, email: usuario.email, nome: usuario.nome };
};

export const consumirToken = async (token, novaSenha) => {
  if (!token || typeof token !== 'string') return { erro: { status: 400, error: 'Token inválido.' } };
  if (!novaSenha || String(novaSenha).length < 6) {
    return { erro: { status: 400, error: 'A senha deve ter ao menos 6 caracteres.' } };
  }

  const linhas = await query(
    `SELECT id, usuario_id, expira_em, tentativas, usado_em
     FROM tokens_recuperacao
     WHERE token_hash = ?
     ORDER BY id DESC
     LIMIT 1`,
    [hashToken(token)],
  );

  const registro = linhas[0];
  if (!registro || registro.usado_em) return { erro: { status: 400, error: 'Token inválido ou já utilizado.' } };
  if (new Date(registro.expira_em) < new Date()) {
    return { erro: { status: 400, error: 'Link expirado. Solicite um novo.' } };
  }
  if (Number(registro.tentativas) >= MAX_TENTATIVAS) {
    return { erro: { status: 429, error: 'Muitas tentativas. Solicite um novo link.' } };
  }

  return { registro };
};

// Consumido pela rota depois de gravar a nova senha.
export const marcarUsado = async (registroId) => {
  await query('UPDATE tokens_recuperacao SET usado_em = NOW() WHERE id = ?', [registroId]);
};

export const registrarTentativa = async (registroId) => {
  await query('UPDATE tokens_recuperacao SET tentativas = tentativas + 1 WHERE id = ?', [registroId]);
};

export const hashPara = hashToken;
export const VALIDADE = VALIDADE_HORAS;

export default { solicitarRecuperacao, consumirToken, marcarUsado, registrarTentativa, hashPara };