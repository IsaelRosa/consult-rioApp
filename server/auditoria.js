// Trilha de auditoria (LGPD). Cada alteração relevante fica registrada com
// quem fez, em qual clínica, o que mudou e quando.
//
// Requisito: só guardar dados pessoais estritamente necessários. Por isso
// registramos o identificador e campos pontuais, nunca o prontuário inteiro.

import { query } from './db.js';

let buffer = [];
let timer = null;

const registrar = async (registro) => {
  const linha = {
    clinica_id: registro.clinicaId ?? null,
    usuario_id: registro.usuarioId ?? null,
    acao: registro.acao,
    tabela: registro.tabela ?? null,
    registro_id: registro.registroId ?? null,
    dados: registro.dados ? JSON.stringify(registro.dados).slice(0, 2000) : null,
    ip: registro.ip ?? null,
    criado_em: new Date(),
  };

  try {
    await query(
      `INSERT INTO auditoria
         (clinica_id, usuario_id, acao, tabela, registro_id, dados, ip, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [linha.clinica_id, linha.usuario_id, linha.acao, linha.tabela, linha.registro_id, linha.dados, linha.ip, linha.criado_em],
    );
  } catch (error) {
    // Auditoria nunca pode derrubar a operação principal.
    console.warn('[auditoria] falha ao gravar:', error.message);
  }
};

// Agrupa escritas em lote para não haver uma query por alteração.
export const auditar = (registro) => {
  buffer.push(registro);
  if (!timer) {
    timer = setTimeout(async () => {
      const lote = buffer;
      buffer = [];
      timer = null;
      for (const item of lote) await registrar(item);
    }, 200);
    timer.unref?.();
  }
};

export const auditarAgora = async (registro) => {
  await registrar(registro);
};

// Atalho a partir do req populado pelo middleware de token.
export const auditarReq = (req, acao, tabela, registroId, dados) =>
  auditar({
    clinicaId: req.usuario?.clinica_id ?? null,
    usuarioId: req.usuario?.sub ?? null,
    acao,
    tabela,
    registroId,
    dados,
    ip: req.ip,
  });

export default { auditar, auditarAgora, auditarReq };