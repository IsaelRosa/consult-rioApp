// Compatibilidade: `npm run server` / `npm start` apontam para ./server.js.
// O app Express (rotas /api + serving de dist/) vive em server/app.js.
import '../server.js';