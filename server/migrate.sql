-- Migrações para bancos já existentes.
-- O schema.sql usa CREATE TABLE IF NOT EXISTS, que é ignorado quando a
-- tabela já existe. Aqui vão os ALTERs necessários.

-- A coluna `ativo` é usada pelo dashboard (pacientes ativos) e pela API,
-- mas não existia na tabela original.
--
-- `ADD COLUMN IF NOT EXISTS` existe no MariaDB, mas NÃO no MySQL (testado no
-- 8.4: erro 1064). A forma abaixo funciona nos dois: consulta o
-- information_schema e só executa o ALTER se a coluna ainda não existir.
SET @coluna_ativa := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'ativo'
);

SET @sql := IF(@coluna_ativa = 0,
  'ALTER TABLE pacientes ADD COLUMN ativo BOOLEAN DEFAULT TRUE',
  'SELECT ''coluna pacientes.ativo ja existe'' AS aviso');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Catálogo de procedimentos. Sem isso o dropdown de procedimentos fica
-- vazio em produção (o modo demo usa o seed em memória).
INSERT IGNORE INTO procedimentos (id, nome, codigo, categoria, valor_padrao, tempo_estimado_min, ativo) VALUES
  (1,  'Limpeza (Profilaxia)',              'LIM',  'Higiene',         120,  30,  TRUE),
  (2,  'Restauração em resina',             'RES',  'Odontologia',     220,  45,  TRUE),
  (3,  'Tratamento de canal',               'CAN',  'Endodontia',      680,  75,  TRUE),
  (4,  'Raspagem periodontal',              'RAS',  'Higiene',         180,  40,  TRUE),
  (5,  'Aplicação de flúor',                'FLU',  'Higiene',          80,  20,  TRUE),
  (6,  'Selante de fossas',                 'SEL',  'Odontologia',      90,  25,  TRUE),
  (7,  'Restauração em amalgama',           'AMA',  'Odontologia',     160,  40,  TRUE),
  (8,  'Obturação',                         'OBT',  'Endodontia',      320,  60,  TRUE),
  (9,  'Tratamento de canal (molar)',       'CANM', 'Endodontia',      980, 110,  TRUE),
  (10, 'Cunha de cerâmica (endodôntica)',   'CU1',  'Endodontia',      450,  60,  TRUE),
  (11, 'Extração simples',                  'EXS',  'Cirurgia',        180,  30,  TRUE),
  (12, 'Extração cirúrgica',                'EXC',  'Cirurgia',        420,  60,  TRUE),
  (13, 'Extração de siso incluso',           'EXI',  'Cirurgia',        650,  90,  TRUE),
  (14, 'Cirurgia periodontal',              'PER',  'Periodontia',     780,  90,  TRUE),
  (15, 'Curetagem',                         'CUR',  'Periodontia',     260,  40,  TRUE),
  (16, 'Coroa em porcelana',                'COR',  'Prótese',        1250, 120,  TRUE),
  (17, 'Prótese fixa (3 dentes)',           'PF3',  'Prótese',        3400, 180,  TRUE),
  (18, 'Prótese total (dentadura)',         'PTD',  'Prótese',        2900, 150,  TRUE),
  (19, 'Prótese parcial removível',         'PPR',  'Prótese',        1600, 120,  TRUE),
  (20, 'Instalação de aparelho ortodôntico', 'ORT',  'Ortodontia',     2800, 120,  TRUE),
  (21, 'Manutenção ortodôntica',            'MNT',  'Ortodontia',      180,  30,  TRUE),
  (22, 'Retirada de aparelho',              'RTO',  'Ortodontia',      220,  45,  TRUE),
  (23, 'Atendimento infantil',              'INF',  'Odontopediatria', 150,  30,  TRUE),
  (24, 'Clareamento dentário',              'CLA',  'Estética',        650,  75,  TRUE),
  (25, 'Faceta de porcelana',               'FAC',  'Estética',       1800, 120,  TRUE),
  (26, 'Contorno adicionado em resina',     'CAR',  'Estética',        380,  60,  TRUE),
  (27, 'Consulta de avaliação',             'AVS',  'Consulta',          0,  20,  TRUE),
  (28, 'Radiografia panorâmica',            'RXS',  'Diagnóstico',     140,  15,  TRUE);

-- Dentistas: consultas e orçamentos têm chave estrangeira para dentistas,
-- então sem eles nenhum agendamento pode ser salvo.
INSERT IGNORE INTO dentistas (id, nome, cro, especialidade, telefone, email, cor_agenda, ativo) VALUES
  (1, 'Dr. Carlos Mendes',     'SP-12345', 'Ortodontia',    '(11) 97777-3333', 'carlos@clinica.com',   '#3B82F6', TRUE),
  (2, 'Dra. Patrícia Rocha',  'SP-23456', 'Clínica geral', '(11) 96666-4444', 'patricia@clinica.com', '#10B981', TRUE),
  (3, 'Dr. Bruno Lima',        'SP-34567', 'Endodontia',    '(11) 95555-5555', 'bruno@clinica.com',    '#F59E0B', TRUE);