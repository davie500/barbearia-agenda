-- Schema inicial para uma instalação nova.
-- Em um banco existente, não use este arquivo para recriar dados: aplique
-- database/migrations/001_estrutura_barberapp.sql após fazer backup.

CREATE DATABASE IF NOT EXISTS barbearia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE barbearia;

CREATE TABLE IF NOT EXISTS clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(30) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS barbeiros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    foto VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS servicos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    preco DECIMAL(10,2) NOT NULL,
    duracao_minutos INT NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expediente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profissional_id INT NOT NULL,
    dia_semana TINYINT NOT NULL COMMENT '0 = domingo, 6 = sábado',
    inicio_expediente TIME NOT NULL,
    inicio_almoco TIME NULL,
    fim_almoco TIME NULL,
    fim_expediente TIME NOT NULL,
    CONSTRAINT fk_expediente_barbeiros
      FOREIGN KEY (profissional_id) REFERENCES barbeiros(id),
    INDEX ix_expediente_barbeiro_dia (profissional_id, dia_semana)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agendamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    profissional_id INT NOT NULL,
    servico_id INT NOT NULL,
    data_hora_inicio DATETIME NOT NULL,
    data_hora_fim DATETIME NOT NULL,
    status ENUM('Agendado', 'Confirmado', 'Em atendimento', 'Finalizado', 'Cancelado')
      NOT NULL DEFAULT 'Agendado',
    CONSTRAINT fk_agendamentos_clientes FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_agendamentos_barbeiros FOREIGN KEY (profissional_id) REFERENCES barbeiros(id),
    CONSTRAINT fk_agendamentos_servicos FOREIGN KEY (servico_id) REFERENCES servicos(id),
    INDEX ix_agendamentos_barbeiro_inicio (profissional_id, data_hora_inicio),
    INDEX ix_agendamentos_cliente_inicio (cliente_id, data_hora_inicio)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt; nunca armazenar senha em texto puro',
    tipo_usuario ENUM('ADMINISTRADOR', 'BARBEIRO', 'CLIENTE') NOT NULL,
    cliente_id INT NULL,
    barbeiro_id INT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_usuarios_email (email),
    UNIQUE KEY uq_usuarios_cliente (cliente_id),
    UNIQUE KEY uq_usuarios_barbeiro (barbeiro_id),
    CONSTRAINT fk_usuarios_clientes FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    CONSTRAINT fk_usuarios_barbeiros FOREIGN KEY (barbeiro_id) REFERENCES barbeiros(id),
    CONSTRAINT chk_usuarios_vinculo CHECK (
      (tipo_usuario = 'ADMINISTRADOR' AND cliente_id IS NULL AND barbeiro_id IS NULL)
      OR (tipo_usuario = 'CLIENTE' AND cliente_id IS NOT NULL AND barbeiro_id IS NULL)
      OR (tipo_usuario = 'BARBEIRO' AND cliente_id IS NULL AND barbeiro_id IS NOT NULL)
    )
) ENGINE=InnoDB;
