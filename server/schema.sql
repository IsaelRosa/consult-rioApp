-- ============================================================================
--  Instalação completa do zero. Não precisa rodar nenhum outro script.
--  Banco já existente? Use server/migrate.sql e server/migrate-multitenancy.sql.
-- ============================================================================

-- Multi-tenant: uma base compartilhada entre várias clínicas.
-- Toda tabela de negócio tem clinica_id; perfis é global (catálogo de cargos).
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

CREATE TABLE IF NOT EXISTS perfis (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) PRIMARY KEY,
  clinica_id INT NOT NULL DEFAULT 1,
  auth_id VARCHAR(255) NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  perfil_id INT NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  token_version INT NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (perfil_id) REFERENCES perfis(id)
);

CREATE TABLE IF NOT EXISTS pacientes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(20) NULL,
  telefone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  data_nascimento DATE NULL,
  sexo VARCHAR(20) NULL,
  endereco TEXT NULL,
  cidade VARCHAR(150) NULL,
  estado VARCHAR(2) NULL,
  cep VARCHAR(20) NULL,
  convenio VARCHAR(150) NULL,
  numero_carteirinha VARCHAR(100) NULL,
  alergias TEXT NULL,
  medicamentos TEXT NULL,
  observacoes TEXT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dentistas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  nome VARCHAR(255) NOT NULL,
  cro VARCHAR(100) NULL,
  especialidade VARCHAR(200) NULL,
  telefone VARCHAR(50) NULL,
  email VARCHAR(255) NULL,
  cor_agenda VARCHAR(20) NULL,
  ativo BOOLEAN DEFAULT TRUE,
  usuario_id CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procedimentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) NULL,
  categoria VARCHAR(150) NULL,
  valor_padrao DECIMAL(10,2) DEFAULT 0,
  tempo_estimado_min INT DEFAULT 30,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS consultas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  paciente_id INT NOT NULL,
  dentista_id INT NOT NULL,
  data_hora_inicio DATETIME NOT NULL,
  data_hora_fim DATETIME NULL,
  status VARCHAR(30) DEFAULT 'agendado',
  tipo VARCHAR(100) NULL,
  observacoes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (dentista_id) REFERENCES dentistas(id)
);

CREATE TABLE IF NOT EXISTS consulta_procedimentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  consulta_id INT NOT NULL,
  procedimento_id INT NOT NULL,
  quantidade INT DEFAULT 1,
  valor_cobrado DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pendente',
  FOREIGN KEY (consulta_id) REFERENCES consultas(id),
  FOREIGN KEY (procedimento_id) REFERENCES procedimentos(id)
);

CREATE TABLE IF NOT EXISTS tratamentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  paciente_id INT NOT NULL,
  dentista_id INT NOT NULL,
  descricao TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'em andamento',
  data_inicio DATETIME NULL,
  data_fim DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (dentista_id) REFERENCES dentistas(id)
);

CREATE TABLE IF NOT EXISTS tratamento_procedimentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  tratamento_id INT NOT NULL,
  procedimento_id INT NOT NULL,
  dente VARCHAR(20) NULL,
  quantidade INT DEFAULT 1,
  valor_cobrado DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pendente',
  FOREIGN KEY (tratamento_id) REFERENCES tratamentos(id),
  FOREIGN KEY (procedimento_id) REFERENCES procedimentos(id)
);

CREATE TABLE IF NOT EXISTS orcamentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  paciente_id INT NOT NULL,
  dentista_id INT NOT NULL,
  status VARCHAR(30) DEFAULT 'pendente',
  valor_total DECIMAL(10,2) DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  observacoes TEXT NULL,
  validade_dias INT DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (dentista_id) REFERENCES dentistas(id)
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  orcamento_id INT NOT NULL,
  procedimento_id INT NOT NULL,
  dente VARCHAR(20) NULL,
  quantidade INT DEFAULT 1,
  valor_unitario DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (orcamento_id) REFERENCES orcamentos(id),
  FOREIGN KEY (procedimento_id) REFERENCES procedimentos(id)
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  paciente_id INT NOT NULL,
  orcamento_id INT NULL,
  consulta_id INT NULL,
  valor DECIMAL(10,2) DEFAULT 0,
  forma_pagamento VARCHAR(50) DEFAULT 'dinheiro',
  status VARCHAR(30) DEFAULT 'pendente',
  data_pagamento DATETIME NULL,
  observacoes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
);

CREATE TABLE IF NOT EXISTS despesas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  descricao VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) NULL,
  valor DECIMAL(10,2) DEFAULT 0,
  data_despesa DATETIME NOT NULL,
  forma_pagamento VARCHAR(50) NULL,
  status VARCHAR(30) DEFAULT 'pendente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS odontograma (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL DEFAULT 1,
  paciente_id INT NOT NULL,
  dente INT NOT NULL,
  face VARCHAR(50) NULL,
  condicao VARCHAR(30) DEFAULT 'saudavel',
  procedimento_id INT NULL,
  observacoes TEXT NULL,
  data_registro DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (procedimento_id) REFERENCES procedimentos(id)
);

-- Assinatura (cobrança recorrente). `referencia` é o identificador que o
-- gateway devolve no webhook para localizar a assinatura.
CREATE TABLE IF NOT EXISTS assinaturas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  clinica_id INT NOT NULL,
  plano VARCHAR(40) NOT NULL DEFAULT 'essencial',
  valor_mensal DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  referencia VARCHAR(64) NULL,
  iniciada_em DATETIME NULL,
  renovada_em DATETIME NULL,
  cancelada_em DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_assinatura_referencia (referencia),
  INDEX idx_assinaturas_clinica (clinica_id, status),
  CONSTRAINT fk_assinaturas_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
);

-- Trilha de auditoria (LGPD)
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
  CONSTRAINT fk_auditoria_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Recuperação de senha: guarda apenas o SHA-256 do token.
-- Sem ENGINE/CHARSET: herda o padrão do banco, como todas as outras tabelas
-- deste arquivo. Fixar utf8mb4 aqui quebraria a FK para usuarios(id CHAR(36))
-- em bancos criados fora deste script (erro 150).
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
);

INSERT INTO clinicas (id, nome, slug, plano, ativo)
VALUES (1, 'Clínica Principal', 'clinica-principal', 'essencial', TRUE)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO perfis (id, nome, slug) VALUES
  (1, 'Administrador', 'admin'),
  (2, 'Recepcionista', 'recepcionista'),
  (3, 'Dentista', 'dentista'),
  (4, 'Financeiro', 'financeiro')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), slug = VALUES(slug);

INSERT INTO usuarios (id, auth_id, email, nome, perfil_id, password_hash, clinica_id, ativo)
VALUES
  ('demo-admin', 'demo-admin', 'admin@odonto.com', 'Administrador', 1, '123456', 1, TRUE),
  ('demo-recepcionista', 'demo-recepcionista', 'recep@odonto.com', 'Recepcionista', 2, '123456', 1, TRUE),
  ('demo-dentista', 'demo-dentista', 'dentista@odonto.com', 'Dentista', 3, '123456', 1, TRUE),
  ('demo-financeiro', 'demo-financeiro', 'financeiro@odonto.com', 'Financeiro', 4, '123456', 1, TRUE)
ON DUPLICATE KEY UPDATE nome = VALUES(nome), perfil_id = VALUES(perfil_id), password_hash = VALUES(password_hash), ativo = VALUES(ativo);

-- Dentistas são exigidos pelas chaves estrangeiras de consultas e orçamentos.
INSERT INTO dentistas (clinica_id, id, nome, cro, especialidade, telefone, email, cor_agenda, ativo) VALUES
  (1, 1, 'Dr. Carlos Mendes', 'SP-12345', 'Ortodontia', '(11) 97777-3333', 'carlos@clinica.com', '#3B82F6', TRUE),
  (1, 2, 'Dra. Patrícia Rocha', 'SP-23456', 'Clínica geral', '(11) 96666-4444', 'patricia@clinica.com', '#10B981', TRUE),
  (1, 3, 'Dr. Bruno Lima', 'SP-34567', 'Endodontia', '(11) 95555-5555', 'bruno@clinica.com', '#F59E0B', TRUE)
ON DUPLICATE KEY UPDATE nome = VALUES(nome), cro = VALUES(cro), especialidade = VALUES(especialidade), ativo = VALUES(ativo);

-- Catálogo de procedimentos, para o dropdown não ficar vazio
INSERT IGNORE INTO procedimentos (clinica_id, id, nome, codigo, categoria, valor_padrao, tempo_estimado_min, ativo) VALUES
  (1, 1,  'Limpeza (Profilaxia)',            'LIM',  'Higiene',         120,  30,  TRUE),
  (1, 2,  'Restauração em resina',           'RES',  'Odontologia',     220,  45,  TRUE),
  (1, 3,  'Tratamento de canal',             'CAN',  'Endodontia',      680,  75,  TRUE),
  (1, 4,  'Raspagem periodontal',            'RAS',  'Higiene',         180,  40,  TRUE),
  (1, 5,  'Aplicação de flúor',              'FLU',  'Higiene',          80,  20,  TRUE),
  (1, 6,  'Selante de fossas',               'SEL',  'Odontologia',      90,  25,  TRUE),
  (1, 7,  'Restauração em amalgama',         'AMA',  'Odontologia',     160,  40,  TRUE),
  (1, 8,  'Obturação',                       'OBT',  'Endodontia',      320,  60,  TRUE),
  (1, 9,  'Tratamento de canal (molar)',     'CANM', 'Endodontia',      980, 110,  TRUE),
  (1, 10, 'Cunha de cerâmica (endodôntica)', 'CU1',  'Endodontia',      450,  60,  TRUE),
  (1, 11, 'Extração simples',                'EXS',  'Cirurgia',        180,  30,  TRUE),
  (1, 12, 'Extração cirúrgica',              'EXC',  'Cirurgia',        420,  60,  TRUE),
  (1, 13, 'Extração de siso incluso',         'EXI',  'Cirurgia',        650,  90,  TRUE),
  (1, 14, 'Cirurgia periodontal',            'PER',  'Periodontia',     780,  90,  TRUE),
  (1, 15, 'Curetagem',                       'CUR',  'Periodontia',     260,  40,  TRUE),
  (1, 16, 'Coroa em porcelana',              'COR',  'Prótese',        1250, 120,  TRUE),
  (1, 17, 'Prótese fixa (3 dentes)',         'PF3',  'Prótese',        3400, 180,  TRUE),
  (1, 18, 'Prótese total (dentadura)',       'PTD',  'Prótese',        2900, 150,  TRUE),
  (1, 19, 'Prótese parcial removível',       'PPR',  'Prótese',        1600, 120,  TRUE),
  (1, 20, 'Instalação de aparelho ortodôntico', 'ORT', 'Ortodontia',    2800, 120,  TRUE),
  (1, 21, 'Manutenção ortodôntica',          'MNT',  'Ortodontia',      180,  30,  TRUE),
  (1, 22, 'Retirada de aparelho',            'RTO',  'Ortodontia',      220,  45,  TRUE),
  (1, 23, 'Atendimento infantil',            'INF',  'Odontopediatria', 150,  30,  TRUE),
  (1, 24, 'Clareamento dentário',            'CLA',  'Estética',        650,  75,  TRUE),
  (1, 25, 'Faceta de porcelana',             'FAC',  'Estética',       1800, 120,  TRUE),
  (1, 26, 'Contorno adicionado em resina',   'CAR',  'Estética',        380,  60,  TRUE),
  (1, 27, 'Consulta de avaliação',           'AVS',  'Consulta',          0,  20,  TRUE),
  (1, 28, 'Radiografia panorâmica',          'RXS',  'Diagnóstico',     140,  15,  TRUE);

ALTER TABLE usuarios                ADD CONSTRAINT fk_usuarios_clinica   FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE pacientes               ADD CONSTRAINT fk_pacientes_clinica  FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE dentistas               ADD CONSTRAINT fk_dentistas_clinica  FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE procedimentos           ADD CONSTRAINT fk_procedimentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE consultas               ADD CONSTRAINT fk_consultas_clinica  FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE consulta_procedimentos  ADD CONSTRAINT fk_cp_clinica         FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE tratamentos             ADD CONSTRAINT fk_tratamentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE tratamento_procedimentos ADD CONSTRAINT fk_tp_clinica        FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE orcamentos              ADD CONSTRAINT fk_orcamentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE orcamento_itens         ADD CONSTRAINT fk_oi_clinica         FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE pagamentos              ADD CONSTRAINT fk_pagamentos_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE despesas                ADD CONSTRAINT fk_despesas_clinica   FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
ALTER TABLE odontograma             ADD CONSTRAINT fk_odontograma_clinica FOREIGN KEY (clinica_id) REFERENCES clinicas(id);
