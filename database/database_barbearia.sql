create database barbearia;
use barbearia;

create table clientes(
id int auto_increment primary key,
nome varchar(255),
email varchar(255),
telefone varchar(30)
);

create table barbeiros (
id int auto_increment primary key,
nome varchar(255),
foto varchar(255)
);

create table servicos (
id int auto_increment primary key,
nome varchar(255),
preco decimal(10,2),
duraco_minutos int
);

create table expediente (
id int auto_increment primary key,
profissional_id int,
dia_semana int,
inicio_expediente timestamp default current_timestamp,
inicio_almoco timestamp default current_timestamp,
fim_almoco timestamp default current_timestamp,
fim_expediente timestamp default current_timestamp,
constraint fk_profissionais
        foreign key (profissional_id)
        references profissionais(id),
constraint fk_clientes
        foreign key (cliente_id)
        references clientes(id)
);

create table agendamentos (
id int auto_increment primary key,
cliente_id int,
profissional_id int,
servico_id int,
data_hora_inicio datetime,
data_hora_fim datetime,
constraint fk_profissionais
        foreign key (profissional_id)
        references profissionais(id),
constraint fk_clientes
        foreign key (cliente_id)
        references clientes(id),
constraint fk_servicos
        foreign key (servico_id)
        references servicos(id)
);