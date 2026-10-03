// Autenticação local contra a tabela `usuarios` do MySQL.
// Substitui o Supabase Auth. Sem dependências externas: hash com scrypt
// (node:crypto) e token assinado com HMAC.

import crypto from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

// Segredo usado para assinar o token. Em produção defina SESSION_SECRET no
// painel; sem isso geramos um efêmero (tokens caem a cada reinício).
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('[auth] SESSION_SECRET não definido — sessões caem a cada reinício do processo.');
}

// ---------- Senhas ----------

export const gerarHashSenha = (senha) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(senha, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p }).toString('hex');
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt}$${derived}`;
};

export const verificarSenha = (senha, armazenado) => {
  if (!armazenado) return false;

  const partes = String(armazenado).split('$');
  if (partes.length !== 6 || partes[0] !== 'scrypt') {
    // Senha em texto puro (seed antigo). Aceita e re-hasheia no login.
    return senha === String(armazenado);
  }

  const [, N, r, p, salt, esperado] = partes;
  try {
    const derived = crypto
      .scryptSync(senha, salt, Number(esperado.length / 2), { N: Number(N), r: Number(r), p: Number(p) })
      .toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(esperado, 'hex'));
  } catch {
    return false;
  }
};

const precisaRehash = (armazenado) => !String(armazenado || '').startsWith('scrypt$');

// ---------- Token de sessão (HMAC) ----------

const base64url = (buf) => Buffer.from(buf).toString('base64url');

const assinar = (conteudo) => crypto.createHmac('sha256', SECRET).update(conteudo).digest('base64url');

export const gerarToken = (usuario, validadeHoras = 12) => {
  const exp = Date.now() + validadeHoras * 3600 * 1000;
  const payload = base64url(JSON.stringify({ sub: usuario.id, email: usuario.email, exp }));
  return `${payload}.${assinar(payload)}`;
};

export const lerToken = (token) => {
  if (!token || typeof token !== 'string') return null;
  const [payload, assinatura] = token.split('.');
  if (!payload || !assinatura) return null;

  const esperada = assinar(payload);
  // Compara em tamanho fixo para não vazar informação por timing.
  if (assinatura.length !== esperada.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada))) return null;

  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!dados.exp || Date.now() > dados.exp) return null;
    return dados;
  } catch {
    return null;
  }
};

// Middleware: exige Authorization: Bearer <token> válido.
// Libera /api/health e o login.
export const exigirToken = (req, res, next) => {
  if (req.path === '/health' || req.path === '/usuarios/login') return next();

  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : req.query.token;

  const dados = lerToken(String(token || ''));
  if (!dados) return res.status(401).json({ error: 'Não autenticado ou sessão expirada.' });

  req.usuario = dados;
  return next();
};

export default { gerarHashSenha, verificarSenha, gerarToken, lerToken, exigirToken };