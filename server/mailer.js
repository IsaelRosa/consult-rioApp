// Envio de e-mail.
//
// A recuperação de senha depende disso. Enquanto não houver provedor SMTP
// configurado, o link é apenas registrado no log — em produção isso é
// INSUPFICIENTE: sem SMTP_SENDER o servidor se recusa a gerar o link, em vez
// de mandar o cliente para um e-mail que nunca chegará.
//
// Para ativar: defina SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e
// SMTP_FROM no painel. O envio usa fetch contra o endpoint HTTP do provedor
// (formato compatível com gateways que aceitam JSON), sem adicionar
// dependência — troque `enviar` abaixo por Nodemailer se preferir SMTP nativo.

const CONFIG = {
  host: process.env.SMTP_HOST?.trim(),
  porta: Number(process.env.SMTP_PORTA || process.env.SMTP_PORT || 587),
  usuario: process.env.SMTP_USER?.trim(),
  senha: process.env.SMTP_PASS,
  remetente: process.env.SMTP_FROM?.trim() || process.env.SMTP_SENDER?.trim(),
  url: process.env.SMTP_URL?.trim(), // endpoint HTTP alternativo
};

export const smtpConfigurado = () => Boolean(CONFIG.host && CONFIG.remetente);

const registrar = (destinatario, assunto, texto) => {
  console.warn('[mailer] SMTP não configurado — mensagem não enviada.');
  console.warn(`[mailer] para=${destinatario} assunto="${assunto}"`);
  console.warn(`[mailer] ${texto}`);
  return { entregue: false, motivo: 'smtp-nao-configurado' };
};

// Envia. Retorna { entregue, motivo } — o chamador decide o que fazer.
export const enviar = async ({ para, assunto, texto }) => {
  if (!smtpConfigurado()) {
    registrar(para, assunto, texto);
    return { entregue: false, motivo: 'smtp-nao-configurado' };
  }

  try {
    const resposta = CONFIG.url
      ? await fetch(CONFIG.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ para, assunto, texto, remetente: CONFIG.remetente }),
        })
      : null;

    // Sem endpoint HTTP definido, usamos o transporte nativo do Node.
    if (!resposta) {
      const nodemailer = await import('nodemailer').catch(() => null);
      if (!nodemailer) {
        console.warn('[mailer] SMTP_HOST definido mas nodemailer não está instalado.');
        return { entregue: false, motivo: 'transportador-ausente' };
      }

      const transporter = nodemailer.createTransport({
        host: CONFIG.host,
        port: CONFIG.porta,
        secure: CONFIG.porta === 465,
        auth: CONFIG.usuario ? { user: CONFIG.usuario, pass: CONFIG.senha } : undefined,
      });

      await transporter.sendMail({ from: CONFIG.remetente, to: para, subject: assunto, text });
      return { entregue: true };
    }

    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return { entregue: true };
  } catch (error) {
    console.warn('[mailer] falha no envio:', error.message);
    return { entregue: false, motivo: 'falha-no-envio' };
  }
};

export default { enviar, smtpConfigurado };