// Cadastro público de nova clínica.
//
// É a porta de entrada do SaaS: sem isso, cada cliente novo exigiria
// intervenção manual. Por ser público, é a superfície mais atacada do
// sistema — daí o rate limit, a validação estrita e o hash da senha.

import crypto from 'node:crypto';
import { query } from './db.js';
import { gerarHashSenha } from './auth.js';
import { PLANOS, PLANO_PADRAO } from './planos.js';

// "Clínica da Mouth" -> "clinica-da-mouth"
// "Clinica da Mouth" -> "clinica-da-mouth"
export const gerarSlug = (nome) =>
  String(nome)
.normalize('NFD')
    // U+0300..U+036F = marcas combinantes de acento. Escrito com escapes
    // explicitos: colar os caracteres literais aqui corrompe o intervalo e
    // acaba apagando a letra base ("Clinica" virava "cl-nica").
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'clinica';

const slugUnico = async (base) => {
  let slug = base;
  for (let tentativa = 1; tentativa < 50; tentativa += 1) {
    const existentes = await query('SELECT id FROM clinicas WHERE slug = ? LIMIT 1', [slug]);
    if (!existentes[0]) return slug;
    slug = `${base}-${tentativa}`;
  }
  return `${base}-${crypto.randomBytes(3).toString('hex')}`;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const registrarClinica = async (corpo) => {
  const clinica = corpo?.clinica ?? {};
  const admin = corpo?.admin ?? {};

  const nome = String(clinica.nome || '').trim();
  const email = String(admin.email || '').trim().toLowerCase();
  const senha = String(admin.senha || '');
  const nomeAdmin = String(admin.nome || '').trim();
  const plano = PLANOS[corpo?.plano] ? corpo.plano : PLANO_PADRAO;

  if (nome.length < 3) {
    return { erro: { status: 400, error: 'Informe o nome da clínica (mínimo 3 caracteres).' } };
  }
  if (nomeAdmin.length < 3) {
    return { erro: { status: 400, error: 'Informe o nome do responsável.' } };
  }
  if (!EMAIL_RE.test(email)) {
    return { erro: { status: 400, error: 'E-mail inválido.' } };
  }
  if (senha.length < 6) {
    return { erro: { status: 400, error: 'A senha deve ter ao menos 6 caracteres.' } };
  }

  // Um e-mail não pode ser administrador de duas clínicas: isso quebraria o
  // login, que resolve a clínica pelo e-mail.
  const dono = await query('SELECT id FROM usuarios WHERE email = ? LIMIT 1', [email]);
  if (dono[0]) {
    return { erro: { status: 409, error: 'Este e-mail já está cadastrado. Fale com o suporte se não reconhece.' } };
  }

  const slug = await slugUnico(await gerarSlug(nome));
  const cnpj = String(clinica.cnpj || '').replace(/\D/g, '').slice(0, 14) || null;
  const telefone = String(clinica.telefone || '').trim() || null;

  const novaClinica = await query(
    `INSERT INTO clinicas (nome, slug, cnpj, telefone, email, plano, ativo)
     VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
    [nome, slug, cnpj, telefone, email, plano],
  );

  const adminId = crypto.randomUUID();
  await query(
    `INSERT INTO usuarios (id, auth_id, email, nome, perfil_id, password_hash, clinica_id, token_version, ativo)
     VALUES (?, ?, ?, ?, 1, ?, ?, 0, TRUE)`,
    [adminId, adminId, email, nomeAdmin, gerarHashSenha(senha), novaClinica.insertId],
  );

  // Perfil administrativo: já existe pelo seed, mas um banco novo pode não ter.
  const perfil = await query('SELECT id FROM perfis WHERE slug = ? LIMIT 1', ['admin']);
  if (perfil[0] && Number(perfil[0].id) !== 1) {
    await query('UPDATE usuarios SET perfil_id = ? WHERE id = ?', [perfil[0].id, adminId]);
  }

  const dentistas = await query(
    `INSERT INTO dentistas (clinica_id, nome, cro, especialidade, cor_agenda, ativo)
     VALUES (?, ?, NULL, 'Odontologia geral', '#3B82F6', TRUE)`,
    [novaClinica.insertId, nomeAdmin],
  );

  return {
    clinica: { id: novaClinica.insertId, nome, slug, plano },
    admin: { id: adminId, email, nome: nomeAdmin },
    dentistaPadrao: dentistas.insertId,
    plano,
  };
};

export default { registrarClinica, gerarSlug };
