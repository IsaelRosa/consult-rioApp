import { app, mysqlReady } from './server/app.js';

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  console.log(`✅ App running on http://${host}:${port}`);
  console.log(mysqlReady ? '📦 MySQL connected' : '🧪 Demo mode active');
});