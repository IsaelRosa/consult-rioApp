# OdontoClinic

Aplicação de gestão para clínica odontológica com frontend em React, backend em Node.js e estrutura preparada para MySQL.

## Requisitos

- Node.js 18+
- MySQL 8+
- GitHub
- Hostinger VPS (recomendado) ou outro ambiente com Node.js e MySQL

## Instalação local

```bash
npm install
cp .env.example .env
npm run server
```

Em outro terminal:

```bash
npm run dev
```

A API local fica em:

- http://localhost:3001/api

O frontend fica em:

- http://localhost:4173

## Variáveis de ambiente

Arquivo .env:

```env
VITE_API_URL=http://localhost:3001/api
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_NAME=odontoclinic
DB_USER=root
DB_PASSWORD=
```

## Banco MySQL

O arquivo [server/schema.sql](server/schema.sql) contém a estrutura inicial das tabelas.

Para criar o banco local:

```sql
CREATE DATABASE odontoclinic;
USE odontoclinic;
SOURCE server/schema.sql;
```

## GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

## Deploy no Hostinger

Recomendado:

- VPS com Node.js
- MySQL no painel do Hostinger
- build do frontend em pasta dist
- backend rodando com PM2

### Backend

```bash
npm install
npm run build
npm run start
```

### PM2

```bash
npm install -g pm2
pm2 start server/index.js --name odontoclinic-api
pm2 save
```

### Frontend

Build do React:

```bash
npm run build
```

Suba a pasta `dist` para o servidor web estático do Hostinger, ou publique em outra plataforma como Vercel/Netlify.

## Observação

A aplicação está preparada para usar MySQL quando as variáveis de conexão estiverem preenchidas. Enquanto isso, ela usa um modo de demonstração para continuar funcionando sem banco real.
