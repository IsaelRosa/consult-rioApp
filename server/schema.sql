CREATE TABLE IF NOT EXISTS perfis (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) PRIMARY KEY,
  auth_id VARCHAR(255) NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  nome VARCHAR(255) NOT NULL,
  perfil_id INT NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (perfil_id) REFERENCES perfis(id)
);

CREATE TABLE IF NOT EXISTS pacientes (
  id INT PRIMARY KEY AUTO_INCREMENT,
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
  nome VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) NULL,
  categoria VARCHAR(150) NULL,
  valor_padrao DECIMAL(10,2) DEFAULT 0,
  tempo_estimado_min INT DEFAULT 30,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS consultas (
  id INT PRIMARY KEY AUTO_INCREMENT,
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

INSERT INTO perfis (id, nome, slug) VALUES
  (1, 'Administrador', 'admin'),
  (2, 'Recepcionista', 'recepcionista'),
  (3, 'Dentista', 'dentista'),
  (4, 'Financeiro', 'financeiro')
ON DUPLICATE KEY UPDATE nome = VALUES(nome), slug = VALUES(slug);

INSERT INTO usuarios (id, auth_id, email, nome, perfil_id, password_hash, ativo)
VALUES
  ('demo-admin', 'demo-admin', 'admin@odonto.com', 'Administrador', 1, '123456', TRUE),
  ('demo-recepcionista', 'demo-recepcionista', 'recep@odonto.com', 'Recepcionista', 2, '123456', TRUE),
  ('demo-dentista', 'demo-dentista', 'dentista@odonto.com', 'Dentista', 3, '123456', TRUE),
  ('demo-financeiro', 'demo-financeiro', 'financeiro@odonto.com', 'Financeiro', 4, '123456', TRUE)
ON DUPLICATE KEY UPDATE nome = VALUES(nome), perfil_id = VALUES(perfil_id), password_hash = VALUES(password_hash), ativo = VALUES(ativo);
