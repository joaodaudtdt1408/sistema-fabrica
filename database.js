const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Usar caminho configurável via variável de ambiente (para Render.com)
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'fabrica.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(DB_PATH);
  }

  init() {
    this.db.serialize(() => {
      // Tabela de usuários
      this.db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          senha TEXT NOT NULL,
          setor TEXT NOT NULL,
          permissao TEXT NOT NULL DEFAULT 'usuario',
          criado_por INTEGER,
          ativo INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (criado_por) REFERENCES usuarios(id)
        )
      `);

      // Tabela de máquinas
      this.db.run(`
        CREATE TABLE IF NOT EXISTS maquinas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo TEXT UNIQUE NOT NULL,
          nome TEXT NOT NULL,
          setor TEXT NOT NULL,
          ativa INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de funcionários
      this.db.run(`
        CREATE TABLE IF NOT EXISTS funcionarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          setor TEXT NOT NULL,
          senha TEXT NOT NULL,
          ativo INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de ordens de serviço
      this.db.run(`
        CREATE TABLE IF NOT EXISTS ordens_servico (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero_os TEXT UNIQUE NOT NULL,
          cliente_id INTEGER NOT NULL,
          produto_id INTEGER NOT NULL,
          pedido_id INTEGER,
          pedido_cliente TEXT,
          peso_total REAL,
          metragem_total REAL,
          espessura REAL,
          cor TEXT,
          largura REAL,
          data_entrega DATE,
          setor_destino TEXT NOT NULL,
          maquina_id INTEGER,
          status TEXT DEFAULT 'pendente',
          status_setor TEXT DEFAULT 'pendente',
          prioridade TEXT DEFAULT 'normal',
          observacoes TEXT,
          data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          data_inicio DATETIME,
          data_fim DATETIME,
          data_conclusao_setor DATETIME,
          FOREIGN KEY (cliente_id) REFERENCES clientes(id),
          FOREIGN KEY (produto_id) REFERENCES produtos(id),
          FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
          FOREIGN KEY (maquina_id) REFERENCES maquinas(id)
        )
      `);

      // Tabela de produção (bobinas - extrusão/impressão)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS producao_bobinas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          os_id INTEGER NOT NULL,
          maquina_id INTEGER NOT NULL,
          numero_bobina INTEGER NOT NULL,
          peso REAL NOT NULL,
          metragem REAL NOT NULL,
          espessura REAL,
          hora_inicio DATETIME NOT NULL,
          hora_fim DATETIME,
          operador_id INTEGER,
          destino TEXT DEFAULT 'cliente',
          os_destino_id INTEGER,
          produto_final_id INTEGER,
          movimentado_estoque INTEGER DEFAULT 0,
          FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
          FOREIGN KEY (maquina_id) REFERENCES maquinas(id),
          FOREIGN KEY (operador_id) REFERENCES funcionarios(id),
          FOREIGN KEY (os_destino_id) REFERENCES ordens_servico(id),
          FOREIGN KEY (produto_final_id) REFERENCES produtos(id)
        )
      `);

      // Tabela de produção (turnos - corte e solda)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS producao_turnos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          os_id INTEGER NOT NULL,
          maquina_id INTEGER NOT NULL,
          funcionario_id INTEGER NOT NULL,
          data DATE NOT NULL,
          hora_inicio TIME NOT NULL,
          hora_fim TIME,
          pacotes_produzidos INTEGER DEFAULT 0,
          confirmado INTEGER DEFAULT 0,
          FOREIGN KEY (os_id) REFERENCES ordens_servico(id),
          FOREIGN KEY (maquina_id) REFERENCES maquinas(id),
          FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id)
        )
      `);

      // Tabela de OS Manutenção/Secretaria
      this.db.run(`
        CREATE TABLE IF NOT EXISTS os_afazeres (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          titulo TEXT NOT NULL,
          descricao TEXT,
          setor_destino TEXT NOT NULL,
          prioridade TEXT DEFAULT 'normal',
          status TEXT DEFAULT 'pendente',
          solicitante_id INTEGER,
          responsavel_id INTEGER,
          data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          data_conclusao DATETIME,
          FOREIGN KEY (solicitante_id) REFERENCES usuarios(id),
          FOREIGN KEY (responsavel_id) REFERENCES funcionarios(id)
        )
      `);

      // Tabela de clientes
      this.db.run(`
        CREATE TABLE IF NOT EXISTS clientes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          cnpj_cpf TEXT,
          telefone TEXT,
          email TEXT,
          endereco TEXT,
          cidade TEXT,
          estado TEXT,
          cep TEXT,
          observacoes TEXT,
          ativo INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de produtos/itens fabricados
      this.db.run(`
        CREATE TABLE IF NOT EXISTS produtos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo TEXT UNIQUE NOT NULL,
          nome TEXT NOT NULL,
          descricao TEXT,
          tipo_produto TEXT NOT NULL,
          setor_origem TEXT NOT NULL,
          pode_ir_para_impressao INTEGER DEFAULT 0,
          pode_ir_para_corte INTEGER DEFAULT 0,
          eh_produto_final INTEGER DEFAULT 1,
          unidade_medida TEXT DEFAULT 'kg',
          ativo INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de vinculo produto-cliente
      this.db.run(`
        CREATE TABLE IF NOT EXISTS produto_cliente (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          produto_id INTEGER NOT NULL,
          cliente_id INTEGER NOT NULL,
          preco_negociado REAL,
          observacoes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (produto_id) REFERENCES produtos(id),
          FOREIGN KEY (cliente_id) REFERENCES clientes(id),
          UNIQUE(produto_id, cliente_id)
        )
      `);

      // Tabela de estoque
      this.db.run(`
        CREATE TABLE IF NOT EXISTS estoque (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          produto_id INTEGER NOT NULL,
          quantidade REAL DEFAULT 0,
          quantidade_reservada REAL DEFAULT 0,
          localizacao TEXT,
          lote TEXT,
          data_validade DATE,
          ultima_movimentacao DATETIME,
          FOREIGN KEY (produto_id) REFERENCES produtos(id)
        )
      `);

      // Tabela de vinculo produto-subproduto (bobinas que usam outras bobinas)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS produtos_subprodutos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          produto_pai_id INTEGER NOT NULL,      -- Produto que usa a bobina (ex: produto impresso)
          produto_filho_id INTEGER NOT NULL,    -- Bobina do estoque (ex: bobina da extrusão)
          quantidade_necessaria REAL DEFAULT 1, -- Quanto consome (em kg ou metros)
          ativo INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (produto_pai_id) REFERENCES produtos(id),
          FOREIGN KEY (produto_filho_id) REFERENCES produtos(id),
          UNIQUE(produto_pai_id, produto_filho_id)
        )
      `);

      // Tabela de solicitações de atenção (manutenção chamar usuários)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS solicitacoes_atencao (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          de_usuario_id INTEGER NOT NULL,
          para_usuario_id INTEGER NOT NULL,
          mensagem TEXT NOT NULL,
          status TEXT DEFAULT 'pendente',
          resposta TEXT,
          data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          data_resposta DATETIME,
          FOREIGN KEY (de_usuario_id) REFERENCES usuarios(id),
          FOREIGN KEY (para_usuario_id) REFERENCES usuarios(id)
        )
      `);

      // Tabela de solicitações de material/compra
      this.db.run(`
        CREATE TABLE IF NOT EXISTS solicitacoes_material (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          nome_item TEXT NOT NULL,
          descricao_uso TEXT,
          urgencia TEXT DEFAULT 'normal',
          status TEXT DEFAULT 'pendente',
          quantidade INTEGER DEFAULT 1,
          resposta_admin TEXT,
          data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          data_resposta DATETIME,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
      `);

      // Tabela de movimentação de estoque
      this.db.run(`
        CREATE TABLE IF NOT EXISTS movimentacao_estoque (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          produto_id INTEGER NOT NULL,
          tipo_movimentacao TEXT NOT NULL,
          quantidade REAL NOT NULL,
          origem TEXT,
          origem_id INTEGER,
          destino TEXT,
          destino_id INTEGER,
          observacoes TEXT,
          usuario_id INTEGER,
          data_movimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (produto_id) REFERENCES produtos(id),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
      `);

      // Tabela de pedidos de clientes
      this.db.run(`
        CREATE TABLE IF NOT EXISTS pedidos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero_pedido TEXT UNIQUE NOT NULL,
          cliente_id INTEGER NOT NULL,
          data_pedido DATE DEFAULT CURRENT_DATE,
          data_entrega_prevista DATE,
          status TEXT DEFAULT 'pendente',
          observacoes TEXT,
          total_itens INTEGER DEFAULT 0,
          total_quantidade REAL DEFAULT 0,
          usuario_id INTEGER,
          data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
          data_envio DATETIME,
          FOREIGN KEY (cliente_id) REFERENCES clientes(id),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
      `);

      // Tabela de itens do pedido
      this.db.run(`
        CREATE TABLE IF NOT EXISTS pedido_itens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pedido_id INTEGER NOT NULL,
          produto_id INTEGER NOT NULL,
          quantidade_solicitada REAL NOT NULL,
          quantidade_enviada REAL DEFAULT 0,
          preco_unitario REAL,
          observacoes TEXT,
          status TEXT DEFAULT 'pendente',
          os_id INTEGER,
          FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
          FOREIGN KEY (produto_id) REFERENCES produtos(id),
          FOREIGN KEY (os_id) REFERENCES ordens_servico(id)
        )
      `);

      // Tabela de configurações do sistema
      this.db.run(`
        CREATE TABLE IF NOT EXISTS configuracoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chave TEXT UNIQUE NOT NULL,
          valor TEXT,
          descricao TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabela de backups realizidos
      this.db.run(`
        CREATE TABLE IF NOT EXISTS backups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          caminho_local TEXT,
          caminho_nuvem TEXT,
          tipo_nuvem TEXT,
          status TEXT,
          tamanho_bytes INTEGER,
          data_backup DATETIME DEFAULT CURRENT_TIMESTAMP,
          mensagem_erro TEXT
        )
      `);

      // Inserir usuário admin master padrão
      const adminSenha = bcrypt.hashSync('vida123', 10);
      this.db.run(`
        INSERT OR IGNORE INTO usuarios (nome, email, senha, setor, permissao)
        VALUES ('Administrador Master', 'vidaembalagens', ?, 'administrativo', 'admin_master')
      `, [adminSenha]);

      console.log('Banco de dados inicializado com sucesso!');
    });
  }

  getDb() {
    return this.db;
  }
}

module.exports = new Database();
