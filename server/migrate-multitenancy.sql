-- ============================================================================
--  MULTI-TENANCY: uma base compartilhada entre clínicas
--
--  IMPORTANTE
--  Este script é ADITIVO e NÃO destrutivo: cria colunas, não apaga nada.
--  Em caso de dúvida, faça dump antes: mysqldump -u USER -p NOME > backup.sql
--
--  Ele:
--   1. cria a tabela `clinicas` e a `auditoria`;
--   2. adiciona `clinica_id` nas tabelas de negócio;
--   3. cria a clínica padrão nº 1 e passa todos os dados existentes para ela;
--   4. torna a FK ativa (MySQL exige colunas NOT NULL para chaves estrangeiras).
--
--  Funciona em MySQL 5.7+ / 8.x e MariaDB.
-- ============================================================================

SET @HOJE := NOW();

-- ---------------------------------------------------------------------------
-- 1. Tabela de clínicas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinicas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(200) NOT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  cnpj VARCHAR(20) NULL,
  telefone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  plano VARCHAR(40) DEFAULT 'starter',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO clinicas (id, nome, slug, cnpj, email, plano, ativo)
VALUES (1, 'Clínica Principal', 'clinica-principal', NULL, NULL, 'starter', TRUE)
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
-- 3. clinic_id (aditivo: cada tabela recebe a coluna se ainda não tiver)
-- ---------------------------------------------------------------------------

-- perfis NÃO recebe clinica_id: é um catálogo global de cargos.

SET @tabelas := 'usuarios,pacientes,dentistas,procedimentos,consultas,consulta_procedimentos,tratamentos,tratamento_procedimentos,orcamentos,orcamento_itens,pagamentos,despesas,odontograma';

-- O MySQL não aceita DDL dinâmico direto. Uma stored procedure percorre as
-- tabelas e só executa o ALTER onde a coluna ainda não existe.
DROP PROCEDURE IF EXISTS _add_clinica_id;
DELIMITER $$
CREATE PROCEDURE _add_clinica_id()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE t VARCHAR(64);
  DECLARE cur CURSOR FOR
    SELECT 'usuarios' UNION SELECT 'pacientes' UNION SELECT 'dentistas'
    UNION SELECT 'procedimentos' UNION SELECT 'consultas'
    UNION SELECT 'consulta_procedimentos' UNION SELECT 'tratamentos'
    UNION SELECT 'tratamento_procedimentos' UNION SELECT 'orcamentos'
    UNION SELECT 'orcamento_itens' UNION SELECT 'pagamentos'
    UNION SELECT 'despesas' UNION SELECT 'odontograma';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO t;
    IF done = 1 THEN LEAVE read_loop; END IF;

    SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = t AND COLUMN_NAME = 'clinica_id');

    IF @existe = 0 THEN
      SET @s := CONCAT('ALTER TABLE `', t, '` ADD COLUMN clinica_id INT NULL');
      PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
    END IF;
  END LOOP;
  CLOSE cur;
END$$
DELIMITER ;
CALL _add_clinica_id();
DROP PROCEDURE IF EXISTS _add_clinica_id;

-- ---------------------------------------------------------------------------
-- 4. Backfill: tudo que existe vai para a clínica 1
-- ---------------------------------------------------------------------------
UPDATE usuarios             SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE pacientes            SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE dentistas            SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE procedimentos        SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE consultas            SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE consulta_procedimentos SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE tratamentos           SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE tratamento_procedimentos SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE orcamentos            SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE orcamento_itens       SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE pagamentos            SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE despesas              SET clinica_id = 1 WHERE clinica_id IS NULL;
UPDATE odontograma           SET clinica_id = 1 WHERE clinica_id IS NULL;

-- ---------------------------------------------------------------------------
-- 5. NOT NULL + chaves estrangeiras
-- ---------------------------------------------------------------------------
ALTER TABLE usuarios        MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE pacientes       MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE dentistas       MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE procedimentos   MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE consultas       MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE consulta_procedimentos MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE tratamentos      MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE tratamento_procedimentos MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE orcamentos      MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE orcamento_itens MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE pagamentos      MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE despesas        MODIFY clinica_id INT NOT NULL DEFAULT 1;
ALTER TABLE odontograma     MODIFY clinica_id INT NOT NULL DEFAULT 1;

-- FKs (o nome precisa ser único no schema; MySQL não aceita IF NOT EXISTS)
SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'
              AND CONSTRAINT_NAME = 'fk_usuarios_clinica');
SET @s := IF(@fk = 0,
  'ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)',
  'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'pacientes'
              AND CONSTRAINT_NAME = 'fk_pacientes_clinica');
SET @s := IF(@fk = 0,
  'ALTER TABLE pacientes ADD CONSTRAINT fk_pacientes_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)',
  'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'dentistas'
              AND CONSTRAINT_NAME = 'fk_dentistas_clinica');
SET @s := IF(@fk = 0,
  'ALTER TABLE dentistas ADD CONSTRAINT fk_dentistas_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)',
  'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'consultas'
              AND CONSTRAINT_NAME = 'fk_consultas_clinica');
SET @s := IF(@fk = 0,
  'ALTER TABLE consultas ADD CONSTRAINT fk_consultas_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)',
  'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'orcamentos'
              AND CONSTRAINT_NAME = 'fk_orcamentos_clinica');
SET @s := IF(@fk = 0,
  'ALTER TABLE orcamentos ADD CONSTRAINT fk_orcamentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)',
  'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'pagamentos'
              AND CONSTRAINT_NAME = 'fk_pagamentos_clinica');
SET @s := IF(@fk = 0,
  'ALTER TABLE pagamentos ADD CONSTRAINT fk_pagamentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)',
  'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @fk := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
            WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'despesas'
              AND CONSTRAINT_NAME = 'fk_despesas_clinica');
SET @s := IF(@fk = 0,
  'ALTER TABLE despesas ADD CONSTRAINT fk_despesas_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)',
  'SELECT 1');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SELECT 'multi-tenancy aplicada' AS ok, COUNT(*) AS clinicas FROM clinicas;