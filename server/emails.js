// E-mails transacionais.
//
// Templates em HTML com versão texto. Ficam aqui, e não espalhados pelas
// rotas, porque a identidade visual da mensagem é o que o cliente associa
// à marca — e porque todos passam pelo mesmo caminho de envio.
//
// Todo envio passa por `enviar`, que registra no log quando não há SMTP.
// Um e-mail que não sai não pode aparecer como se tivesse saído.

import { enviar, smtpConfigurado } from './mailer.js';

// Os links das mensagens precisam de domínio absoluto. Preferimos a origem da
// requisição (funciona em qualquer host, sem configurar nada) e caímos no
// APP_URL do ambiente.
const base = (origem) => {
  const url = (origem || process.env.APP_URL || '').trim().replace(/\/$/, '');
  if (!url || !/^https?:\/\//i.test(url)) return '';
  return url;
};

export const urlsConfiguradas = () => Boolean(base());

const COR = {
  fundo: '#f1f5f9',
  cartao: '#ffffff',
  titulo: '#0f172a',
  texto: '#475569',
  destaque: '#0284c7',
  rodape: '#94a3b8',
  borda: '#e2e8f0',
};

const marca = () => `
  <div style="background:${COR.fundo};padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:${COR.cartao};border-radius:14px;border:1px solid ${COR.borda};overflow:hidden;">
      <div style="background:linear-gradient(135deg,#0ea5e9,#22d3ee);padding:20px 28px;">
        <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.2px;">OdontoClinic</span>
        <span style="color:#e0f2fe;font-size:13px;margin-left:8px;">Gestão para clínicas odontológicas</span>
      </div>
      <div style="padding:28px;color:${COR.texto};font-size:15px;line-height:1.6;">
`;

const pe = () => `
      </div>
      <div style="padding:18px 28px;background:#f8fafc;border-top:1px solid ${COR.borda};color:${COR.rodape};font-size:12px;">
        Esta é uma mensagem automática do OdontoClinic. Se você não esperava recebê-la, pode ignorar.
      </div>
    </div>
  </div>`;

const botao = (url, texto) => `
  <p style="margin:24px 0;">
    <a href="${url}" style="background:${COR.destaque};color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block;">${texto}</a>
  </p>
  <p style="font-size:12px;color:${COR.rodape};">Se o botão não funcionar, copie e cole no navegador:<br>${url}</p>`;

const money = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

// ---------------------------------------------------------------- boas-vindas

export const boasVindas = async ({ nome, email, clinica, plano, preco, origem }) => {
  const url = base(origem) ? `${base(origem)}/login` : '(defina APP_URL para os links funcionarem)';

  const html = `${marca()}
        <h1 style="color:${COR.titulo};font-size:22px;margin:0 0 12px;">Bem-vindo ao OdontoClinic</h1>
        <p>Olá, <strong>${nome}</strong>. A conta da clínica <strong>${clinica}</strong> está pronta.</p>
        <p>Você entrou no plano <strong>${plano}</strong> — ${money(preco)}/mês. Pode começar a cadastrar pacientes agora.</p>
        ${botao(url, 'Entrar no sistema')}
        <p style="margin-top:24px;">Algum problema para entrar? Basta responder este e-mail.</p>
      ${pe()}`;

  const texto = `Olá, ${nome}.\n\nA conta da clínica ${clinica} está pronta (plano ${plano}, ${money(preco)}/mês).\n\nEntre em: ${url}\n\nSe precisar de ajuda, responda este e-mail.`;

  return enviar({ para: email, assunto: `Bem-vindo ao OdontoClinic — ${clinica}`, texto, html });
};

// --------------------------------------------------------- assinatura ativa

export const assinaturaAtiva = async ({ email, nome, clinica, plano, preco, origem }) => {
  const url = base(origem) ? `${base(origem)}/planos` : '(defina APP_URL para os links funcionarem)';

  const html = `${marca()}
        <h1 style="color:${COR.titulo};font-size:22px;margin:0 0 12px;">Assinatura confirmada</h1>
        <p>Olá, <strong>${nome}</strong>. Recebemos o pagamento do plano <strong>${plano}</strong>.</p>
        <p>Valor mensal: <strong>${money(preco)}</strong>. O sistema já está liberado nos limites do seu plano.</p>
        ${botao(url, 'Ver minha assinatura')}
      ${pe()}`;

  const texto = `Olá, ${nome}.\n\nPagamento do plano ${plano} (${money(preco)}/mês) confirmado.\n\nVer assinatura: ${url}`;

  return enviar({ para: email, assunto: 'Assinatura confirmada', texto, html });
};

// --------------------------------------------------------------- vencimento

export const avisoVencimento = async ({ email, nome, clinica, plano, preco, dias, origem }) => {
  const url = base(origem) ? `${base(origem)}/planos` : '(defina APP_URL para os links funcionarem)';
  const quando = dias <= 1 ? 'amanhã' : `em ${dias} dias`;
  const daClinica = clinica ? ` da clínica <strong>${clinica}</strong>` : '';

  const html = `${marca()}
        <h1 style="color:${COR.titulo};font-size:22px;margin:0 0 12px;">Sua assinatura vence ${quando}</h1>
        <p>Olá, <strong>${nome}</strong>. O plano <strong>${plano}</strong> (${money(preco)}/mês)${daClinica} vence ${quando}.</p>
        <p>Se a renovação não for feita, o acesso pode ser suspenso ao fim do período.</p>
        ${botao(url, 'Renovar agora')}
      ${pe()}`;

  const texto = `Olá, ${nome}.\n\nSeu plano ${plano} (${money(preco)}/mês) vence ${quando}.\n\nRenovar: ${url}`;

  return enviar({ para: email, assunto: `Sua assinatura do OdontoClinic vence ${quando}`, texto, html });
};

// ------------------------------------------------------------------ suspensão

export const avisoSuspensao = async ({ email, nome, clinica, plano, origem }) => {
  const url = base(origem) ? `${base(origem)}/planos` : '(defina APP_URL para os links funcionarem)';
  const daClinica = clinica ? ` da clínica <strong>${clinica}</strong>` : '';

  const html = `${marca()}
        <h1 style="color:${COR.titulo};font-size:22px;margin:0 0 12px;">Seu acesso foi suspenso</h1>
        <p>Olá, <strong>${nome}</strong>. A assinatura do plano <strong>${plano}</strong>${daClinica} não está ativa.</p>
        <p>Seus dados estão preservados. Regularize para voltar a usar o sistema normalmente.</p>
        ${botao(url, 'Regularizar assinatura')}
      ${pe()}`;

  const texto = `Olá, ${nome}.\n\nSeu acesso foi suspenso por assinatura inativa (plano ${plano}). Seus dados estão preservados.\n\nRegularizar: ${url}`;

  return enviar({ para: email, assunto: 'Acesso suspenso no OdontoClinic', texto, html });
};

// ---------------------------------------------------------------- diagnóstico

export const testarConfiguracao = async (destinatario) =>
  enviar({
    para: destinatario,
    assunto: 'OdontoClinic — teste de envio',
    texto: 'Se você recebeu esta mensagem, o envio de e-mail está funcionando.',
    html: `${marca()}<p style="color:${COR.titulo};font-size:18px;margin:0 0 8px;">Teste de envio</p>
      <p>Se você recebeu esta mensagem, o envio de e-mail está funcionando.</p>${pe()}`,
  });

export { smtpConfigurado };

export default {
  boasVindas,
  assinaturaAtiva,
  avisoVencimento,
  avisoSuspensao,
  testarConfiguracao,
  smtpConfigurado,
};