-- ============================================================================
--  MULTI-TENANCY — migração de bancos JÁ EXISTENTES
--
--  Seguro para rodar no phpMyAdmin: não usa DELIMITER nem stored procedure.
--  Aditivo e idempotente: cria o que falta, nunca apaga dados.
--
--  Antes de rodar, faça backup:
--    mysqldump -u USUARIO -p NOME_DO_BANCO > backup.sql
--
--  Instalação NOVA? Não precisa deste arquivo: use só server/schema.sql,
--  que já vem com clinicas e clinica_id.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Clínicas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinicas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(200) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  cnpj VARCHAR(20) NULL,
  telefone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  plano VARCHAR(40) DEFAULT 'essencial',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO clinicas (id, nome, slug, plano, ativo)
VALUES (1, 'Clínica Principal', 'clinica-principal', 'essencial', TRUE)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

-- ---------------------------------------------------------------------------
-- 2. Auditoria (LGPD)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NULL,
  usuario_id CHAR(36) NULL,
  acao VARCHAR(40) NOT NULL,
  tabela VARCHAR(60) NULL,
  registro_id VARCHAR(64) NULL,
  dados TEXT NULL,
  ip VARCHAR(64) NULL,
  criado_em DATETIME NOT NULL,
  INDEX idx_auditoria_clinica (clinica_id, criado_em),
  INDEX idx_auditoria_usuario (usuario_id),
  CONSTRAINT fk_auditoria_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 3. Recuperação de senha
--    Guarda apenas o SHA-256 do token: se o banco vazar, os tokens não são
--    recuperáveis por quem leu a tabela.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tokens_recuperacao (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expira_em DATETIME NOT NULL,
  tentativas INT NOT NULL DEFAULT 0,
  usado_em DATETIME NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token_hash (token_hash),
  INDEX idx_recuperacao_usuario (usuario_id),
  CONSTRAINT fk_recuperacao_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- 4. clinica_id em cada tabela de negócio
--    Cada bloco só executa o ALTER se a coluna ainda não existir.
--    'perfis' NÃO entra: é um catálogo global de cargos.
-- ---------------------------------------------------------------------------

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='usuarios' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE usuarios ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='pacientes' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE pacientes ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='dentistas' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE dentistas ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='procedimentos' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE procedimentos ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='consultas' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE consultas ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='consulta_procedimentos' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE consulta_procedimentos ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='tratamentos' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE tratamentos ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='tratamento_procedimentos' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE tratamento_procedimentos ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='orcamentos' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE orcamentos ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='orcamento_itens' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE orcamento_itens ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='pagamentos' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE pagamentos ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='despesas' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE despesas ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='odontograma' AND COLUMN_NAME='clinica_id');
SET @s := IF(@c = 0, 'ALTER TABLE odontograma ADD COLUMN clinica_id INT NULL', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- token_version: invalida tokens antigos (logout, redefinição de senha)
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='usuarios' AND COLUMN_NAME='token_version');
SET @s := IF(@c = 0, 'ALTER TABLE usuarios ADD COLUMN token_version INT NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------------
-- 5. Backfill: tudo que já existe pertence à clínica 1
-- ---------------------------------------------------------------------------
UPDATE usuarios                SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE pacientes               SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE dentistas               SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE procedimentos           SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE consultas               SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE consulta_procedimentos  SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE tratamentos             SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE tratamento_procedimentos SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE orcamentos              SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE orcamento_itens         SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE pagamentos              SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE despesas                SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE odontograma             SET clinica_id = 1 WHERE clinica_id IS NULL;

-- ---------------------------------------------------------------------------
-- 6. NOT NULL + chaves estrangeiras
--    O MySQL exige NOT NULL em colunas de FK.
-- ---------------------------------------------------------------------------
ALTER TABLE usuarios                MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE pacientes               MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE dentistas               MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE procedimentos           MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE consultas               MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE consulta_procedimentos  MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE tratamentos             MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE tratamento_procedimentos MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE orcamentos              MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE orcamento_itens         MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE pagamentos              MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE despesas                MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE odontograma             MODIFY clinica_id INT NOT NULL DEFAULT 1;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='usuarios' AND CONSTRAINT_NAME='fk_usuarios_clinica');
SET @s := IF(@fk = 0, 'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='pacientes' AND CONSTRAINT_NAME='fk_pacientes_clinica');
SET @s := IF(@fk = 0, 'ALTER TABLE pacientes ADD CONSTRAINT fk_pacientes_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='dentistas' AND CONSTRAINT_NAME='fk_dentistas_clinica');
SET @s := IF(@fk = 0, 'ALTER TABLE dentistas ADD CONSTRAINT fk_dentistas_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='consultas' AND CONSTRAINT_NAME='fk_consultas_clinica');
SET @s := IF(@fk = 0, 'ALTER TABLE consultas ADD CONSTRAINT fk_consultas_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='orcamentos' AND CONSTRAINT_NAME='fk_orcamentos_clinica');
SET @s := IF(@fk = 0, 'ALTER TABLE orcamentos ADD CONSTRAINT fk_orcamentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='pagamentos' AND CONSTRAINT_NAME='fk_pagamentos_clinica');
SET @s := IF(@fk = 0, 'ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='despesas' AND CONSTRAINT_NAME='fk_despesas_clinica');
SET @s := IF(@fk = 0, 'ALTER TABLE despesas ADD CONSTRAINT fk_despesas_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)', 'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SELECT 'multi-tenancy aplicada' AS ok, COUNT(*) AS clinicas FROM clinicas;