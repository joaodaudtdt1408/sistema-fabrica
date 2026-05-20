# Sistema Fábrica - Gestão de Produção

Sistema web para gestão de produção em fábrica, com suporte a múltiplos setores e dispositivos.

## Funcionalidades

- **Autenticação por Setor**: Cada usuário acessa apenas as funções do seu setor
- **Ordens de Serviço**: Criação e acompanhamento de OS
- **Produção Extrusão/Impressão**: Lançamento de bobinas com peso, metragem, espessura
- **Produção Corte e Solda**: Lançamento por turnos com confirmação por senha
- **Cadastro de Máquinas**: Administrativo gerencia máquinas por setor
- **Cadastro de Funcionários**: Com senha para confirmação de lançamentos
- **OS Afazeres**: Tarefas para Manutenção e Secretaria
- **Dashboard**: Visão geral da produção

## Setores

- Administrativo (acesso total)
- Extrusão
- Impressão
- Corte e Solda
- Expedição
- Manutenção
- Secretaria

## Instalação

### 1. Instalar dependências do backend

```bash
npm install
```

### 2. Instalar dependências do frontend

```bash
cd client
npm install
cd ..
```

### 3. Iniciar o sistema

Modo desenvolvimento (backend + frontend separados):
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

Ou iniciar apenas o backend (frontend já buildado):
```bash
npm start
```

## Acesso

- Local: http://localhost:3000
- Rede interna: http://[IP_DA_MAQUINA]:3000

### Login padrão
- Email: admin@fabrica.com
- Senha: admin123

## Estrutura do Projeto

```
├── server.js              # Servidor Express
├── database.js            # Configuração SQLite
├── routes.js              # API endpoints
├── package.json           # Dependências backend
├── fabrica.db             # Banco de dados SQLite
└── client/
    ├── src/
    │   ├── pages/         # Páginas React
    │   ├── components/    # Componentes
    │   └── contexts/      # Contexts (Auth)
    └── dist/              # Build do frontend
```

## Produção

Para deploy em produção:

```bash
# Build do frontend
cd client
npm run build
cd ..

# Iniciar servidor
npm start
```

O servidor vai rodar na porta 3000 e servir o frontend automaticamente.

## Configuração Rede Interna

Para acessar de outros dispositivos na rede:

1. Descubra o IP da máquina servidor:
   - Windows: `ipconfig`
   - Linux/Mac: `ifconfig` ou `ip addr`

2. Acesse via: `http://[IP]:3000`

3. Certifique-se que o firewall permite conexões na porta 3000.

## Banco de Dados

O sistema usa SQLite. O arquivo `fabrica.db` é criado automaticamente na primeira execução.

Para backup, basta copiar o arquivo `fabrica.db`.

## Suporte

Para dúvidas ou problemas, verifique:
1. Console do navegador (F12)
2. Logs do servidor no terminal
3. Permissões do banco de dados
