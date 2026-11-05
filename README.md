# BarberApp

Aplicativo mobile para consultar serviços e barbeiros, reservar horários e acompanhar atendimentos. O app Expo usa uma API Express, autenticação JWT e MySQL.

## Apresentação do projeto

BarberApp é um sistema mobile de agendamento para barbearias. Ele reúne em um único lugar a consulta de serviços, a escolha de um barbeiro e a reserva de horários. A proposta é facilitar a organização da agenda da barbearia e permitir que clientes e equipe acompanhem os atendimentos pelo celular.

### Problema

Quando os horários são combinados manualmente por telefone ou mensagens, os dados podem ficar espalhados, ser esquecidos ou entrar em conflito. O cliente também pode ter dificuldade para saber quais serviços estão disponíveis, quanto custam e em quais horários há atendimento.

### Objetivo geral

Desenvolver uma aplicação mobile integrada a uma API e a um banco MySQL para organizar o agendamento e o gerenciamento dos serviços de uma barbearia.

### Objetivos específicos

- Exibir os serviços, preços, duração e barbeiros cadastrados.
- Permitir que clientes criem uma conta, consultem disponibilidade e reservem horários pelo aplicativo.
- Evitar reservas em horários passados, fora do expediente, durante o almoço ou em conflito com outro atendimento.
- Permitir que clientes acompanhem e cancelem seus próprios agendamentos futuros.
- Permitir que barbeiros consultem sua agenda e atualizem o andamento dos atendimentos.
- Permitir que administradores gerenciem clientes, barbeiros, serviços, usuários, expediente e agendamentos.

### Público e perfis de acesso

- **Clientes:** escolhem serviço, barbeiro, data e horário; consultam o histórico e cancelam horários futuros.
- **Barbeiros:** consultam os próprios atendimentos, informações necessárias do cliente e expediente; atualizam o status do serviço.
- **Administradores:** gerenciam os cadastros e acompanham a operação completa da barbearia.

As permissões são verificadas pela API em cada rota protegida. O aplicativo não concede acesso com base apenas na tela exibida.

### Fluxo principal

1. O cliente consulta os serviços e barbeiros cadastrados.
2. Após entrar ou criar uma conta, escolhe o serviço, o profissional e a data.
3. O app consulta a API para listar os horários disponíveis.
4. Ao confirmar, a API verifica novamente expediente, duração e conflitos antes de registrar o agendamento no MySQL.
5. Cliente, barbeiro e administrador acompanham o agendamento de acordo com suas permissões.

### Resultado esperado

Centralizar as informações da agenda, reduzir conflitos de horário e tornar mais simples o atendimento ao cliente e a rotina da equipe. A interface mobile consome dados reais da API; para executar a integração com o banco, é necessário configurar o acesso ao MySQL conforme a seção de instalação.

## Tecnologias

- App: JavaScript, React Native, Expo SDK 58, Expo Router, Fetch API e AsyncStorage.
- API: Node.js, Express 5, mysql2, bcrypt, jsonwebtoken e dotenv.
- Banco: MySQL, banco `barbearia`.

## Requisitos

- Node.js 20 ou superior e npm.
- MySQL acessível pelo computador que executa a API.
- Expo Go para desenvolvimento inicial ou EAS Build para gerar APK.

## Banco de dados

O schema anterior contém referências a `profissionais`, uma FK inválida para `cliente_id` em `expediente`, horários como `TIMESTAMP` e o nome `duraco_minutos`. O script `database/migrations/001_estrutura_barberapp.sql` corrige esses pontos, preserva registros, adiciona o status de atendimento e cria `usuarios`.

O servidor MySQL local consultado durante o desenvolvimento não contém um banco chamado `barbearia`. Configure `DB_HOST`, usuário e senha para o servidor que contém seu banco antes de executar os próximos comandos. A conexão não cria nem seleciona outro banco automaticamente.

1. Faça um backup do banco existente.
2. Copie `backend/.env.example` para `backend/.env` e preencha os dados reais da conexão. Gere um valor longo e aleatório para `JWT_SECRET`.
3. Rode `npm install` dentro de `backend/`.
4. Execute `npm run db:inspect` em `backend/` para conferir tabelas, colunas, constraints e quantidades de registros. O comando não exibe dados pessoais.
5. Abra `database/migrations/001_estrutura_barberapp.sql` no MySQL Workbench e execute contra o banco existente `barbearia`. A migração para com uma mensagem se encontrar agendamentos ou expedientes com barbeiro inexistente; corrija esses IDs antes de executá-la novamente.

`database/database_barbearia.sql` é um schema inicial para uma instalação nova. Em banco existente, use a migração complementar; não apague nem recrie o banco.

O campo `dia_semana` usa `0` para domingo e `6` para sábado. O intervalo de almoço pode ficar vazio. Revise os horários existentes após converter timestamps para `TIME`, pois o schema antigo preenchia os campos com o horário atual por padrão.

### Criar a primeira conta administrativa

Preencha `ADMINISTRADOR_NOME`, `ADMINISTRADOR_EMAIL` e `ADMINISTRADOR_SENHA` no `backend/.env`, execute `npm run admin:create` e remova a senha de bootstrap do arquivo depois. O script recusa criar outro administrador se já existir um.

## Backend

```powershell
cd backend
Copy-Item .env.example .env
# Edite .env com DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD e JWT_SECRET
npm install
npm run dev
```

A API fica em `http://localhost:3000/api`. A rota `GET /api/health` confirma a conexão com o MySQL.

## Aplicativo Expo

Na raiz do projeto:

```powershell
Copy-Item .env.example .env
# Edite EXPO_PUBLIC_API_URL no .env
npm install
npx expo start
```

Defina `EXPO_PUBLIC_API_URL` como a URL acessível pelo celular, por exemplo `http://192.168.0.20:3000/api`. Descubra o IP local do computador e mantenha computador e celular na mesma rede. Em aparelho físico, `localhost` aponta para o próprio celular, não para o computador.

Após alterar `.env`, reinicie o Metro. O endereço da API é público no bundle do app; não coloque senhas ou segredos de servidor em variáveis `EXPO_PUBLIC_*`.

## Cadastro, login e permissões

- Cadastro público cria cliente e conta de usuário em uma transação; a senha é armazenada com bcrypt.
- Login retorna JWT. O app persiste o token em AsyncStorage e envia `Authorization: Bearer <token>` em rotas protegidas.
- O middleware valida o token e consulta o usuário atual no banco para aplicar o papel e o vínculo corretos. A interface não é a fronteira de segurança.
- `ADMINISTRADOR`: gerencia cadastros, expediente, usuários e agendamentos.
- `BARBEIRO`: consulta expediente e próprios atendimentos; pode confirmar, iniciar e finalizar os atendimentos atribuídos a ele.
- `CLIENTE`: consulta e cancela seus agendamentos futuros.

## API REST

Todos os endpoints usam o prefixo `/api`.

| Grupo | Rotas |
| --- | --- |
| Autenticação | `POST /auth/cadastro`, `POST /auth/login`, `GET /auth/perfil` |
| Clientes | `GET /clientes`, `GET /clientes/:id`, `POST /clientes`, `PUT /clientes/:id`, `DELETE /clientes/:id` |
| Barbeiros | `GET /barbeiros`, `GET /barbeiros/:id`, `POST /barbeiros`, `PUT /barbeiros/:id`, `DELETE /barbeiros/:id` |
| Serviços | `GET /servicos`, `GET /servicos/:id`, `POST /servicos`, `PUT /servicos/:id`, `DELETE /servicos/:id` |
| Expediente | `GET /expediente/:barbeiroId`, `POST /expediente`, `PUT /expediente/:id`, `DELETE /expediente/:id` |
| Agendamentos | `GET /agendamentos`, `GET /agendamentos/:id`, `GET /agendamentos/cliente/:clienteId`, `GET /agendamentos/barbeiro/:barbeiroId`, `GET /agendamentos/disponibilidade`, `POST /agendamentos`, `PUT /agendamentos/:id`, `DELETE /agendamentos/:id` |
| Usuários | `GET /usuarios`, `POST /usuarios`, `PUT /usuarios/:id`, `DELETE /usuarios/:id` |
| Saúde | `GET /health` |

Listar serviços e barbeiros é público. As demais rotas exigem o papel indicado pelo backend. Disponibilidade recebe `barbeiro_id`, `servico_id` e `data=AAAA-MM-DD`; a criação usa `barbeiro_id`, `servico_id`, `data` e `horario=HH:mm`. O backend recalcula duração, expediente, almoço, passado e conflitos dentro de uma transação antes de gravar.

Status válidos: `Agendado`, `Confirmado`, `Em atendimento`, `Finalizado` e `Cancelado`. Cancelamentos são mantidos no histórico com status `Cancelado`.

## APK Android com EAS Build

O perfil `preview` está configurado para gerar APK instalável. O identificador Android do app está definido em `app.json`.

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build -p android --profile preview
```

O primeiro build remoto requer uma conta Expo e credenciais Android geradas ou configuradas no EAS. O perfil `production` gera o formato padrão para publicação em loja (AAB).

## Verificações locais

```powershell
npx expo lint
npx tsc --noEmit
```

O código do aplicativo permanece em JavaScript; o TypeScript compiler está incluído apenas para validar a configuração e a análise sintática do projeto.
