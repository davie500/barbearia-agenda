-- Migração complementar para o schema descrito em database_barbearia.sql.
-- Preserva os registros existentes. Faça uma cópia de segurança antes da execução.
-- Execute no banco barbearia; não recria nem apaga o banco.

USE barbearia;

DELIMITER $$
DROP PROCEDURE IF EXISTS migrar_barberapp_001$$
CREATE PROCEDURE migrar_barberapp_001()
BEGIN
    DECLARE quantidade INT DEFAULT 0;

    -- Corrige o nome do campo sem substituir seus dados.
    SELECT COUNT(*) INTO quantidade
      FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'servicos'
       AND column_name = 'duraco_minutos';
    IF quantidade > 0 THEN
        SELECT COUNT(*) INTO quantidade
          FROM information_schema.columns
         WHERE table_schema = DATABASE()
           AND table_name = 'servicos'
           AND column_name = 'duracao_minutos';
        IF quantidade = 0 THEN
            ALTER TABLE servicos CHANGE COLUMN duraco_minutos duracao_minutos INT;
        END IF;
    END IF;

    -- Converte os campos do expediente para hora do dia, mantendo os valores.
    ALTER TABLE expediente
        MODIFY COLUMN inicio_expediente TIME NULL DEFAULT NULL,
        MODIFY COLUMN inicio_almoco TIME NULL DEFAULT NULL,
        MODIFY COLUMN fim_almoco TIME NULL DEFAULT NULL,
        MODIFY COLUMN fim_expediente TIME NULL DEFAULT NULL;

    -- Remove referências antigas inválidas, se a instalação as tiver criado.
    SELECT COUNT(*) INTO quantidade
      FROM information_schema.table_constraints
     WHERE constraint_schema = DATABASE()
       AND table_name = 'expediente'
       AND constraint_name = 'fk_profissionais';
    IF quantidade > 0 THEN
        ALTER TABLE expediente DROP FOREIGN KEY fk_profissionais;
    END IF;

    SELECT COUNT(*) INTO quantidade
      FROM information_schema.table_constraints
     WHERE constraint_schema = DATABASE()
       AND table_name = 'agendamentos'
       AND constraint_name = 'fk_profissionais';
    IF quantidade > 0 THEN
        ALTER TABLE agendamentos DROP FOREIGN KEY fk_profissionais;
    END IF;

    SELECT COUNT(*) INTO quantidade
      FROM information_schema.table_constraints
     WHERE constraint_schema = DATABASE()
       AND table_name = 'expediente'
       AND constraint_name = 'fk_clientes';
    IF quantidade > 0 THEN
        ALTER TABLE expediente DROP FOREIGN KEY fk_clientes;
    END IF;

    -- Falha com uma mensagem clara se houver IDs órfãos em vez de descartar dados.
    SELECT COUNT(*) INTO quantidade
      FROM expediente e
      LEFT JOIN barbeiros b ON b.id = e.profissional_id
     WHERE e.profissional_id IS NOT NULL AND b.id IS NULL;
    IF quantidade > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Há expediente.profissional_id sem barbeiro correspondente; corrija esses IDs antes da migração.';
    END IF;

    SELECT COUNT(*) INTO quantidade
      FROM agendamentos a
      LEFT JOIN barbeiros b ON b.id = a.profissional_id
     WHERE a.profissional_id IS NOT NULL AND b.id IS NULL;
    IF quantidade > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Há agendamentos.profissional_id sem barbeiro correspondente; corrija esses IDs antes da migração.';
    END IF;

    SELECT COUNT(*) INTO quantidade
      FROM information_schema.table_constraints
     WHERE constraint_schema = DATABASE()
       AND table_name = 'expediente'
       AND constraint_name = 'fk_expediente_barbeiros';
    IF quantidade = 0 THEN
        ALTER TABLE expediente
            ADD CONSTRAINT fk_expediente_barbeiros
            FOREIGN KEY (profissional_id) REFERENCES barbeiros(id);
    END IF;

    SELECT COUNT(*) INTO quantidade
      FROM information_schema.table_constraints
     WHERE constraint_schema = DATABASE()
       AND table_name = 'agendamentos'
       AND constraint_name = 'fk_agendamentos_barbeiros';
    IF quantidade = 0 THEN
        ALTER TABLE agendamentos
            ADD CONSTRAINT fk_agendamentos_barbeiros
            FOREIGN KEY (profissional_id) REFERENCES barbeiros(id);
    END IF;

    -- Novos agendamentos recebem status; os existentes passam a Agendado.
    SELECT COUNT(*) INTO quantidade
      FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = 'agendamentos'
       AND column_name = 'status';
    IF quantidade = 0 THEN
        ALTER TABLE agendamentos
            ADD COLUMN status ENUM(
                'Agendado', 'Confirmado', 'Em atendimento', 'Finalizado', 'Cancelado'
            ) NOT NULL DEFAULT 'Agendado';
    END IF;

    CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        senha VARCHAR(255) NOT NULL,
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
    );
END$$
DELIMITER ;

CALL migrar_barberapp_001();
DROP PROCEDURE migrar_barberapp_001;
