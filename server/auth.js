// Autenticação local contra a tabela `usuarios` do MySQL.
// Substitui o Supabase Auth. Sem dependências externas: hash com scrypt
// (node:crypto) e token assinado com HMAC.

import crypto from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

// Segredo usado para assinar o token.
//
// Ordem de preferência:
//  1. SESSION_SECRET do ambiente (recomendado);
//  2. derivado das credenciais do banco — estável entre reinícios, já que o
//     Hostinger reinicia o processo a cada deploy e um segredo aleatório
//     derrubaria todas as sessões;
//  3. aleatório — último recurso, só funciona enquanto o processo viver.
const segredoDoAmbiente = process.env.SESSION_SECRET?.trim();

const segredoDerivadoDoBanco = (() => {
  const { DB_HOST, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_PASSWORD) return '';
  return crypto
    .createHash('sha256')
    .update(`odontoclinic:${DB_HOST}:${DB_NAME}:${DB_USER}:${DB_PASSWORD}`)
    .digest('hex');
})();

const SECRET = segredoDoAmbiente || segredoDerivadoDoBanco || crypto.randomBytes(32).toString('hex');

if (segredoDoAmbiente) {
  console.log('[auth] SESSION_SECRET definido.');
} else if (segredoDerivadoDoBanco) {
  console.log('[auth] SESSION_SECRET ausente — usando segredo derivado do banco (estável).');
} else {
  console.warn('[auth] ATENÇÃO: sem SESSION_SECRET e sem DB_PASSWORD. O segredo é aleatório:');
  console.warn('[auth] as sessões serão invalidadas a cada reinício do processo. Defina SESSION_SECRET.');
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

// Indica se a senha está em texto puro e deve ser migrada para scrypt.
export const precisaRehash = (armazenado) => !String(armazenado || '').startsWith('scrypt$');

// ---------- Token de sessão (HMAC) ----------

const base64url = (buf) => Buffer.from(buf).toString('base64url');

const assinar = (conteudo) => crypto.createHmac('sha256', SECRET).update(conteudo).digest('base64url');

export const gerarToken = (usuario, validadeHoras = 12) => {
  const exp = Date.now() + validadeHoras * 3600 * 1000;
  // clinica_id entra no token assinado: a API não aceita o cliente escolher
  // a clínica, então o isolamento é aplicado no servidor e não confia no front.
  const payload = base64url(
    JSON.stringify({
      sub: usuario.id,
      email: usuario.email,
      clinica_id: usuario.clinica_id ?? null,
      tv: Number(usuario.token_version || 0),
      exp,
    }),
  );
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
// Libera /api/health, /api/plataforma/* (cadastro público) e o login.
export const exigirToken = (req, res, next) => {
  const caminho = req.path;

  const publicas = [
    '/health',
    '/usuarios/login',
    '/plataforma/registrar',
    '/plataforma/planos',
    '/plataforma/recuperar-senha',
    '/plataforma/redefinir-senha',
  ];
  if (publicas.includes(caminho) || caminho.startsWith('/plataforma/')) return next();

  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : req.query.token;

  const dados = lerToken(String(token || ''));
  if (!dados) return res.status(401).json({ error: 'Não autenticado ou sessão expirada.' });

  req.usuario = dados;
  return next();
};

export default { gerarHashSenha, verificarSenha, gerarToken, lerToken, exigirToken };