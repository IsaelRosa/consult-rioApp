import { app, probeDatabase, mysqlReady } from './server/app.js';
import { iniciarRotinas } from './server/rotinas.js';
import { smtpConfigurado } from './server/mailer.js';
import { urlsConfiguradas } from './server/emails.js';

const host = process.env.HOST || '0.0.0.0';

// O Hostinger injeta PORT no ambiente. Se vier vazio/não-numérico,
// caímos em 3001 em vez de fazer listen(NaN) e derrubar o processo.
const parsedPort = Number.parseInt(process.env.PORT ?? '', 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3001;

console.log(`[boot] cwd=${process.cwd()} node=${process.version}`);
console.log(`[boot] PORT env=${JSON.stringify(process.env.PORT ?? null)} -> usando ${port}`);

const server = app.listen(port, host, () => {
  console.log(`✅ App running on http://${host}:${port}`);
  console.log('⏳ verificando banco de dados...');
});

// O listen acontece primeiro; o banco é testado depois, sem travar o boot.
probeDatabase()
  .then((conectado) => {
    console.log(conectado ? '📦 MySQL connected' : '🧪 Demo mode active');
    // Avisos de vencimento e suspensão só fazem sentido com banco.
    if (conectado) iniciarRotinas();

    // Avisos: e-mail sem APP_URL gera mensagens com link quebrado, o que
    // só é percebido pelo cliente.
    if (smtpConfigurado() && !urlsConfiguradas()) {
      console.warn('[boot] SMTP ativo mas APP_URL não definida — os links dos e-mails ficarão relativos.');
    }
  })
  .catch((err) => console.error('[boot] falha na sonda do banco:', err));

server.on('error', (err) => {
  console.error(`[boot] listen falhou em ${host}:${port} —`, err);
  process.exit(1);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`[boot] ${signal} recebido, encerrando...`);
    server.close(() => process.exit(0));
  });
}