const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('./database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sistema-fabrica-secret-key-2024';

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

// ==================== AUTENTICAÇÃO ====================

router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const db = Database.getDb();

  db.get('SELECT * FROM usuarios WHERE email = ? AND ativo = 1', [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' });

    const validPassword = bcrypt.compareSync(senha, user.senha);
    if (!validPassword) return res.status(401).json({ error: 'Senha incorreta' });

    const token = jwt.sign(
      { id: user.id, email: user.email, setor: user.setor, permissao: user.permissao },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        setor: user.setor,
        permissao: user.permissao
      }
    });
  });
});

// Helper para verificar permissões
const isAdminMaster = (user) => user.permissao === 'admin_master';
const isAdmin = (user) => user.permissao === 'admin' || user.permissao === 'admin_master';
const isSupervisor = (user) => user.permissao?.startsWith('supervisor_') || isAdmin(user);

// ==================== USUÁRIOS ====================

router.get('/usuarios', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const db = Database.getDb();
  db.all(`
    SELECT u.id, u.nome, u.email, u.setor, u.permissao, u.ativo, u.created_at, 
           criador.nome as criado_por_nome
    FROM usuarios u
    LEFT JOIN usuarios criador ON u.criado_por = criador.id
    WHERE u.ativo = 1
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Criar usuário admin (apenas admin_master)
router.post('/usuarios/admin', authMiddleware, (req, res) => {
  if (!isAdminMaster(req.user)) {
    return res.status(403).json({ error: 'Apenas Administrador Master pode criar outros administradores' });
  }

  const { nome, email, senha, setor } = req.body;
  const hashedPassword = bcrypt.hashSync(senha, 10);

  const db = Database.getDb();
  db.run(
    'INSERT INTO usuarios (nome, email, senha, setor, permissao, criado_por) VALUES (?, ?, ?, ?, ?, ?)',
    [nome, email, hashedPassword, setor || 'administrativo', 'admin', req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Administrador criado com sucesso' });
    }
  );
});

// Criar usuário comum (admin ou admin_master)
router.post('/usuarios', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { nome, email, senha, setor, permissao } = req.body;
  
  // Se tentar criar admin, verificar se é admin_master
  if (permissao === 'admin' && !isAdminMaster(req.user)) {
    return res.status(403).json({ error: 'Apenas Administrador Master pode criar administradores' });
  }
  
  const hashedPassword = bcrypt.hashSync(senha, 10);

  const db = Database.getDb();
  db.run(
    'INSERT INTO usuarios (nome, email, senha, setor, permissao, criado_por) VALUES (?, ?, ?, ?, ?, ?)',
    [nome, email, hashedPassword, setor, permissao || 'usuario', req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Usuário criado com sucesso' });
    }
  );
});

// Alterar senha do usuário (apenas admin)
router.put('/usuarios/:id/senha', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Apenas administradores podem alterar senhas' });
  }

  const { nova_senha } = req.body;
  if (!nova_senha || nova_senha.length < 4) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 4 caracteres' });
  }

  const hashedPassword = bcrypt.hashSync(nova_senha, 10);
  const db = Database.getDb();

  db.run(
    'UPDATE usuarios SET senha = ? WHERE id = ?',
    [hashedPassword, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
      res.json({ message: 'Senha alterada com sucesso' });
    }
  );
});

// ==================== MÁQUINAS ====================

router.get('/maquinas', authMiddleware, (req, res) => {
  const db = Database.getDb();
  const { setor } = req.query;

  let query = 'SELECT * FROM maquinas WHERE ativa = 1';
  let params = [];

  if (setor) {
    query += ' AND setor = ?';
    params.push(setor);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/maquinas', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { codigo, nome, setor } = req.body;
  const db = Database.getDb();

  db.run(
    'INSERT INTO maquinas (codigo, nome, setor) VALUES (?, ?, ?)',
    [codigo, nome, setor],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Máquina cadastrada com sucesso' });
    }
  );
});

router.delete('/maquinas/:id', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const db = Database.getDb();
  db.run('UPDATE maquinas SET ativa = 0 WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Máquina removida com sucesso' });
  });
});

// ==================== FUNCIONÁRIOS ====================

router.get('/funcionarios', authMiddleware, (req, res) => {
  const db = Database.getDb();
  const { setor } = req.query;

  let query = 'SELECT id, nome, setor, ativo, created_at FROM funcionarios WHERE ativo = 1';
  let params = [];

  if (setor) {
    query += ' AND setor = ?';
    params.push(setor);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/funcionarios', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { nome, setor, senha } = req.body;
  const hashedPassword = bcrypt.hashSync(senha, 10);

  const db = Database.getDb();
  db.run(
    'INSERT INTO funcionarios (nome, setor, senha) VALUES (?, ?, ?)',
    [nome, setor, hashedPassword],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Funcionário cadastrado com sucesso' });
    }
  );
});

router.post('/funcionarios/verificar-senha', authMiddleware, (req, res) => {
  const { funcionario_id, senha } = req.body;
  const db = Database.getDb();

  db.get('SELECT senha FROM funcionarios WHERE id = ? AND ativo = 1', [funcionario_id], (err, func) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!func) return res.status(404).json({ error: 'Funcionário não encontrado' });

    const validPassword = bcrypt.compareSync(senha, func.senha);
    res.json({ valido: validPassword });
  });
});

// ==================== ORDENS DE SERVIÇO ====================

router.get('/ordens-servico', authMiddleware, (req, res) => {
  const db = Database.getDb();
  const { setor, status } = req.query;

  let query = `
    SELECT os.*, 
           m.nome as maquina_nome, m.codigo as maquina_codigo,
           c.nome as cliente_nome,
           p.nome as produto_nome, p.codigo as produto_codigo,
           ped.numero_pedido as pedido_numero
    FROM ordens_servico os
    LEFT JOIN maquinas m ON os.maquina_id = m.id
    LEFT JOIN clientes c ON os.cliente_id = c.id
    LEFT JOIN produtos p ON os.produto_id = p.id
    LEFT JOIN pedidos ped ON os.pedido_id = ped.id
    WHERE 1=1
  `;
  let params = [];

  if (req.user.setor !== 'administrativo') {
    query += ' AND os.setor_destino = ?';
    params.push(req.user.setor);
  } else if (setor) {
    query += ' AND os.setor_destino = ?';
    params.push(setor);
  }

  if (status) {
    query += ' AND os.status = ?';
    params.push(status);
  }

  query += ' ORDER BY os.data_criacao DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/ordens-servico', authMiddleware, (req, res) => {
  if (req.user.setor !== 'administrativo') {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const {
    numero_os, cliente_id, produto_id, pedido_id, pedido_cliente, peso_total, metragem_total,
    espessura, cor, largura, data_entrega, setor_destino, prioridade, observacoes
  } = req.body;

  const db = Database.getDb();
  db.run(
    `INSERT INTO ordens_servico (
      numero_os, cliente_id, produto_id, pedido_id, pedido_cliente, peso_total, metragem_total,
      espessura, cor, largura, data_entrega, setor_destino, prioridade, observacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [numero_os, cliente_id, produto_id, pedido_id, pedido_cliente, peso_total, metragem_total,
     espessura, cor, largura, data_entrega, setor_destino, prioridade, observacoes],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Ordem de serviço criada com sucesso' });
    }
  );
});

// Marcar OS como concluída pelo setor (aguardando aprovação do admin)
router.put('/ordens-servico/:id/concluir-setor', authMiddleware, (req, res) => {
  const db = Database.getDb();
  
  // Verificar se o usuário tem acesso a esta OS
  db.get('SELECT * FROM ordens_servico WHERE id = ?', [req.params.id], (err, os) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!os) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    
    // Verificar permissão: admin, supervisor do setor, ou usuário do setor
    const temAcesso = isAdmin(req.user) || 
                      isSupervisor(req.user) || 
                      req.user.setor === os.setor_destino;
    
    if (!temAcesso) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    db.run(
      `UPDATE ordens_servico 
       SET status_setor = 'concluida', data_conclusao_setor = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [req.params.id],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Ordem marcada como concluída pelo setor. Aguardando aprovação do administrador.' });
      }
    );
  });
});

// Admin aprova a conclusão da OS
router.put('/ordens-servico/:id/concluir-admin', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Apenas administradores podem aprovar conclusão' });
  }

  const db = Database.getDb();
  db.run(
    `UPDATE ordens_servico 
     SET status = 'concluida', data_fim = CURRENT_TIMESTAMP 
     WHERE id = ? AND status_setor = 'concluida'`,
    [req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(400).json({ error: 'Ordem deve ser concluída pelo setor primeiro' });
      }
      res.json({ message: 'Ordem de serviço concluída e aprovada' });
    }
  );
});

router.put('/ordens-servico/:id/iniciar', authMiddleware, (req, res) => {
  const db = Database.getDb();
  const { maquina_id } = req.body;

  db.run(
    'UPDATE ordens_servico SET status = ?, maquina_id = ?, data_inicio = CURRENT_TIMESTAMP WHERE id = ?',
    ['em_producao', maquina_id, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Produção iniciada' });
    }
  );
});

router.put('/ordens-servico/:id/finalizar', authMiddleware, (req, res) => {
  const db = Database.getDb();

  db.run(
    'UPDATE ordens_servico SET status = ?, data_fim = CURRENT_TIMESTAMP WHERE id = ?',
    ['concluida', req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Ordem de serviço finalizada' });
    }
  );
});

// ==================== PRODUÇÃO BOBINAS (Extrusão/Impressão) ====================

router.get('/producao/bobinas/:os_id', authMiddleware, (req, res) => {
  const db = Database.getDb();
  db.all(
    `SELECT pb.*, m.nome as maquina_nome, f.nome as operador_nome
     FROM producao_bobinas pb
     LEFT JOIN maquinas m ON pb.maquina_id = m.id
     LEFT JOIN funcionarios f ON pb.operador_id = f.id
     WHERE pb.os_id = ?
     ORDER BY pb.numero_bobina`,
    [req.params.os_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/producao/bobinas', authMiddleware, (req, res) => {
  const { os_id, maquina_id, numero_bobina, peso, metragem, espessura, hora_inicio, operador_id } = req.body;
  const db = Database.getDb();

  db.run(
    `INSERT INTO producao_bobinas (os_id, maquina_id, numero_bobina, peso, metragem, espessura, hora_inicio, operador_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [os_id, maquina_id, numero_bobina, peso, metragem, espessura, hora_inicio, operador_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Bobina registrada com sucesso' });
    }
  );
});

router.put('/producao/bobinas/:id/finalizar', authMiddleware, (req, res) => {
  const { hora_fim } = req.body;
  const db = Database.getDb();

  db.run(
    'UPDATE producao_bobinas SET hora_fim = ? WHERE id = ?',
    [hora_fim, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Bobina finalizada' });
    }
  );
});

// ==================== SUBPRODUTOS (VINCULO ENTRE PRODUTOS) ====================

// Listar subprodutos de um produto (bobinas que ele consome)
router.get('/produtos/:id/subprodutos', authMiddleware, (req, res) => {
  const db = Database.getDb();
  db.all(
    `SELECT ps.*, p.codigo as produto_filho_codigo, p.nome as produto_filho_nome, 
            p.setor_origem as produto_filho_setor
     FROM produtos_subprodutos ps
     JOIN produtos p ON ps.produto_filho_id = p.id
     WHERE ps.produto_pai_id = ? AND ps.ativo = 1`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Adicionar subproduto
router.post('/produtos/:id/subprodutos', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Apenas administradores podem gerenciar subprodutos' });
  }

  const { produto_filho_id, quantidade_necessaria } = req.body;
  const produto_pai_id = req.params.id;

  const db = Database.getDb();
  db.run(
    `INSERT INTO produtos_subprodutos (produto_pai_id, produto_filho_id, quantidade_necessaria) 
     VALUES (?, ?, ?)`,
    [produto_pai_id, produto_filho_id, quantidade_necessaria || 1],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Subproduto vinculado com sucesso' });
    }
  );
});

// Remover vinculo de subproduto
router.delete('/produtos/subprodutos/:id', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Apenas administradores podem gerenciar subprodutos' });
  }

  const db = Database.getDb();
  db.run(
    'UPDATE produtos_subprodutos SET ativo = 0 WHERE id = ?',
    [req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Vínculo não encontrado' });
      res.json({ message: 'Vínculo removido com sucesso' });
    }
  );
});

// Buscar produtos disponíveis como subproduto (bobinas do estoque)
router.get('/produtos-disponiveis-subproduto/:setor', authMiddleware, (req, res) => {
  const db = Database.getDb();
  const setor = req.params.setor;
  
  // Retorna produtos do setor anterior que podem ser usados como matéria-prima
  db.all(
    `SELECT p.*, e.quantidade as estoque_atual
     FROM produtos p
     LEFT JOIN estoque e ON p.id = e.produto_id
     WHERE p.setor_origem = ? 
       AND p.ativo = 1
       AND p.eh_produto_final = 0`,
    [setor],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ==================== PRODUÇÃO TURNOS (Corte e Solda) ====================

router.get('/producao/turnos/:os_id', authMiddleware, (req, res) => {
  const db = Database.getDb();
  db.all(
    `SELECT pt.*, m.nome as maquina_nome, f.nome as funcionario_nome
     FROM producao_turnos pt
     LEFT JOIN maquinas m ON pt.maquina_id = m.id
     LEFT JOIN funcionarios f ON pt.funcionario_id = f.id
     WHERE pt.os_id = ?
     ORDER BY pt.data DESC, pt.hora_inicio DESC`,
    [req.params.os_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

router.post('/producao/turnos', authMiddleware, (req, res) => {
  const { os_id, maquina_id, funcionario_id, data, hora_inicio } = req.body;
  const db = Database.getDb();

  db.run(
    `INSERT INTO producao_turnos (os_id, maquina_id, funcionario_id, data, hora_inicio)
     VALUES (?, ?, ?, ?, ?)`,
    [os_id, maquina_id, funcionario_id, data, hora_inicio],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Turno iniciado' });
    }
  );
});

router.put('/producao/turnos/:id/finalizar', authMiddleware, (req, res) => {
  const { hora_fim, pacotes_produzidos, senha_funcionario } = req.body;
  const db = Database.getDb();

  // Verificar senha do funcionário
  db.get(
    'SELECT f.senha FROM producao_turnos pt JOIN funcionarios f ON pt.funcionario_id = f.id WHERE pt.id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Turno não encontrado' });

      const validPassword = bcrypt.compareSync(senha_funcionario, row.senha);
      if (!validPassword) return res.status(401).json({ error: 'Senha do funcionário incorreta' });

      db.run(
        'UPDATE producao_turnos SET hora_fim = ?, pacotes_produzidos = ?, confirmado = 1 WHERE id = ?',
        [hora_fim, pacotes_produzidos, req.params.id],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Turno finalizado com sucesso' });
        }
      );
    }
  );
});

// ==================== OS AFAZERES (Manutenção/Secretaria) ====================

router.get('/os-afazeres', authMiddleware, (req, res) => {
  const db = Database.getDb();
  const { setor } = req.query;

  let query = `
    SELECT osa.*, u.nome as solicitante_nome, f.nome as responsavel_nome
    FROM os_afazeres osa
    LEFT JOIN usuarios u ON osa.solicitante_id = u.id
    LEFT JOIN funcionarios f ON osa.responsavel_id = f.id
    WHERE 1=1
  `;
  let params = [];

  if (req.user.setor !== 'administrativo') {
    query += ' AND osa.setor_destino = ?';
    params.push(req.user.setor);
  } else if (setor) {
    query += ' AND osa.setor_destino = ?';
    params.push(setor);
  }

  query += ' ORDER BY osa.data_criacao DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/os-afazeres', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { titulo, descricao, setor_destino, prioridade, responsavel_id } = req.body;
  const db = Database.getDb();

  db.run(
    'INSERT INTO os_afazeres (titulo, descricao, setor_destino, prioridade, solicitante_id, responsavel_id) VALUES (?, ?, ?, ?, ?, ?)',
    [titulo, descricao, setor_destino, prioridade, req.user.id, responsavel_id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'OS de afazeres criada com sucesso' });
    }
  );
});

router.put('/os-afazeres/:id/iniciar', authMiddleware, (req, res) => {
  const db = Database.getDb();

  db.run(
    'UPDATE os_afazeres SET status = ? WHERE id = ?',
    ['em_execucao', req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'OS iniciada com sucesso' });
    }
  );
});

router.put('/os-afazeres/:id/concluir', authMiddleware, (req, res) => {
  const db = Database.getDb();

  db.run(
    'UPDATE os_afazeres SET status = ?, data_conclusao = CURRENT_TIMESTAMP WHERE id = ?',
    ['concluida', req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'OS concluída com sucesso' });
    }
  );
});

// ==================== DASHBOARD ====================

router.get('/dashboard', authMiddleware, (req, res) => {
  const db = Database.getDb();
  const result = {};

  // Contagem de OS por status
  db.all(
    `SELECT status, COUNT(*) as total FROM ordens_servico GROUP BY status`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      result.osPorStatus = rows;

      // OS por setor
      db.all(
        `SELECT setor_destino, COUNT(*) as total FROM ordens_servico GROUP BY setor_destino`,
        [],
        (err, rows) => {
          if (err) return res.status(500).json({ error: err.message });
          result.osPorSetor = rows;

          // OS em atraso
          db.all(
            `SELECT COUNT(*) as total FROM ordens_servico WHERE data_entrega < DATE('now') AND status != 'concluida'`,
            [],
            (err, row) => {
              if (err) return res.status(500).json({ error: err.message });
              result.osAtrasadas = row[0].total;

              // Buscar configuração de dias de alerta
              db.all(`SELECT chave, valor FROM configuracoes WHERE chave IN ('alerta_os_dias', 'alerta_pedido_dias')`, [], (err, configs) => {
                const configMap = {};
                configs?.forEach(c => configMap[c.chave] = parseInt(c.valor) || 3);
                const alertaOSDias = configMap.alerta_os_dias || 3;
                const alertaPedidoDias = configMap.alerta_pedido_dias || 5;

                // OS próximas do prazo (pendentes e em_producao)
                db.all(
                  `SELECT os.id, os.numero_os, os.data_entrega, c.nome as cliente_nome, p.nome as produto_nome
                   FROM ordens_servico os
                   LEFT JOIN clientes c ON os.cliente_id = c.id
                   LEFT JOIN produtos p ON os.produto_id = p.id
                   WHERE os.status IN ('pendente', 'em_producao')
                     AND os.data_entrega IS NOT NULL
                     AND date(os.data_entrega) <= date('now', '+${alertaOSDias} days')
                     AND date(os.data_entrega) >= date('now')
                   ORDER BY os.data_entrega ASC
                   LIMIT 10`,
                  [],
                  (err, rows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    result.osProximasPrazo = rows;

                    // Pedidos próximos do prazo
                    db.all(
                      `SELECT ped.id, ped.numero_pedido, ped.data_entrega, c.nome as cliente_nome
                       FROM pedidos ped
                       LEFT JOIN clientes c ON ped.cliente_id = c.id
                       WHERE ped.status != 'concluido'
                         AND ped.data_entrega IS NOT NULL
                         AND date(ped.data_entrega) <= date('now', '+${alertaPedidoDias} days')
                         AND date(ped.data_entrega) >= date('now')
                       ORDER BY ped.data_entrega ASC
                       LIMIT 10`,
                      [],
                      (err, rows) => {
                        if (err) return res.status(500).json({ error: err.message });
                        result.pedidosProximosPrazo = rows;

                        res.json(result);
                      }
                    );
                  }
                );
              });
            }
          );
        }
      );
    }
  );
});

// ==================== CLIENTES ====================

router.get('/clientes', authMiddleware, (req, res) => {
  const db = Database.getDb();
  db.all('SELECT * FROM clientes WHERE ativo = 1 ORDER BY nome', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/clientes/:id', authMiddleware, (req, res) => {
  const db = Database.getDb();
  db.get('SELECT * FROM clientes WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(row);
  });
});

router.post('/clientes', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { nome, cnpj_cpf, telefone, email, endereco, cidade, estado, cep, observacoes } = req.body;
  const db = Database.getDb();

  db.run(
    `INSERT INTO clientes (nome, cnpj_cpf, telefone, email, endereco, cidade, estado, cep, observacoes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nome, cnpj_cpf, telefone, email, endereco, cidade, estado, cep, observacoes],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Cliente cadastrado com sucesso' });
    }
  );
});

router.put('/clientes/:id', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { nome, cnpj_cpf, telefone, email, endereco, cidade, estado, cep, observacoes } = req.body;
  const db = Database.getDb();

  db.run(
    `UPDATE clientes SET nome=?, cnpj_cpf=?, telefone=?, email=?, endereco=?, cidade=?, estado=?, cep=?, observacoes=?
     WHERE id=?`,
    [nome, cnpj_cpf, telefone, email, endereco, cidade, estado, cep, observacoes, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Cliente atualizado com sucesso' });
    }
  );
});

// ==================== PRODUTOS ====================

router.get('/produtos', authMiddleware, (req, res) => {
  const db = Database.getDb();
  const { cliente_id, setor } = req.query;

  let query = `
    SELECT p.*, 
           CASE WHEN pc.cliente_id IS NOT NULL THEN 1 ELSE 0 END as vinculado_ao_cliente,
           pc.preco_negociado
    FROM produtos p
    LEFT JOIN produto_cliente pc ON p.id = pc.produto_id AND pc.cliente_id = ?
    WHERE p.ativo = 1
  `;
  let params = [cliente_id || 0];

  if (setor) {
    query += ' AND p.setor_origem = ?';
    params.push(setor);
  }

  query += ' ORDER BY p.nome';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/produtos/:id', authMiddleware, (req, res) => {
  const db = Database.getDb();
  db.get('SELECT * FROM produtos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(row);
  });
});

router.post('/produtos', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { codigo, nome, descricao, tipo_produto, setor_origem, pode_ir_para_impressao, pode_ir_para_corte, eh_produto_final, unidade_medida } = req.body;
  const db = Database.getDb();

  db.run(
    `INSERT INTO produtos (codigo, nome, descricao, tipo_produto, setor_origem, pode_ir_para_impressao, pode_ir_para_corte, eh_produto_final, unidade_medida)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [codigo, nome, descricao, tipo_produto, setor_origem, pode_ir_para_impressao || 0, pode_ir_para_corte || 0, eh_produto_final || 1, unidade_medida || 'kg'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Produto cadastrado com sucesso' });
    }
  );
});

// Vincular produto a cliente
router.post('/produtos/vincular-cliente', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { produto_id, cliente_id, preco_negociado, observacoes } = req.body;
  const db = Database.getDb();

  db.run(
    `INSERT OR REPLACE INTO produto_cliente (produto_id, cliente_id, preco_negociado, observacoes)
     VALUES (?, ?, ?, ?)`,
    [produto_id, cliente_id, preco_negociado, observacoes],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Produto vinculado ao cliente com sucesso' });
    }
  );
});

// Obter produtos por cliente
router.get('/clientes/:id/produtos', authMiddleware, (req, res) => {
  const db = Database.getDb();
  db.all(`
    SELECT p.*, pc.preco_negociado, pc.observacoes as vinculo_observacoes
    FROM produtos p
    JOIN produto_cliente pc ON p.id = pc.produto_id
    WHERE pc.cliente_id = ? AND p.ativo = 1
    ORDER BY p.nome
  `, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==================== ESTOQUE ====================

router.get('/estoque', authMiddleware, (req, res) => {
  const db = Database.getDb();
  const { produto_id } = req.query;

  let query = `
    SELECT e.*, p.codigo, p.nome as produto_nome, p.tipo_produto, p.setor_origem
    FROM estoque e
    JOIN produtos p ON e.produto_id = p.id
    WHERE 1=1
  `;
  let params = [];

  if (produto_id) {
    query += ' AND e.produto_id = ?';
    params.push(produto_id);
  }

  query += ' ORDER BY p.nome';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/estoque/movimentacao', authMiddleware, (req, res) => {
  const { produto_id, tipo_movimentacao, quantidade, origem, origem_id, destino, destino_id, observacoes } = req.body;
  const db = Database.getDb();

  db.run(
    `INSERT INTO movimentacao_estoque (produto_id, tipo_movimentacao, quantidade, origem, origem_id, destino, destino_id, observacoes, usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [produto_id, tipo_movimentacao, quantidade, origem, origem_id, destino, destino_id, observacoes, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });

      // Atualizar estoque
      if (tipo_movimentacao === 'entrada') {
        db.run(
          `INSERT INTO estoque (produto_id, quantidade) VALUES (?, ?)
           ON CONFLICT(produto_id) DO UPDATE SET 
           quantidade = quantidade + ?,
           ultima_movimentacao = CURRENT_TIMESTAMP`,
          [produto_id, quantidade, quantidade]
        );
      } else if (tipo_movimentacao === 'saida') {
        db.run(
          `UPDATE estoque SET 
           quantidade = quantidade - ?,
           ultima_movimentacao = CURRENT_TIMESTAMP
           WHERE produto_id = ?`,
          [quantidade, produto_id]
        );
      }

      res.json({ id: this.lastID, message: 'Movimentação registrada com sucesso' });
    }
  );
});

router.get('/estoque/movimentacoes/:produto_id', authMiddleware, (req, res) => {
  const db = Database.getDb();
  db.all(`
    SELECT m.*, u.nome as usuario_nome
    FROM movimentacao_estoque m
    LEFT JOIN usuarios u ON m.usuario_id = u.id
    WHERE m.produto_id = ?
    ORDER BY m.data_movimentacao DESC
  `, [req.params.produto_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==================== BACKUP ====================

const BackupManager = require('./backup');

router.post('/backup/executar', authMiddleware, (req, res) => {
  if (!isAdminMaster(req.user)) {
    return res.status(403).json({ error: 'Apenas Administrador Master pode executar backup manual' });
  }

  BackupManager.fazerBackup().then(resultado => {
    res.json(resultado);
  });
});

router.get('/backup/listar', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const backups = BackupManager.listarBackups();
  res.json(backups);
});

router.get('/backup/historico', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const db = Database.getDb();
  db.all(`
    SELECT * FROM backups 
    ORDER BY data_backup DESC 
    LIMIT 50
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ==================== PEDIDOS ====================

router.get('/pedidos', authMiddleware, (req, res) => {
  const db = Database.getDb();
  const { status, cliente_id } = req.query;

  let query = `
    SELECT p.*, c.nome as cliente_nome, c.cnpj_cpf as cliente_cnpj,
           u.nome as usuario_nome
    FROM pedidos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    LEFT JOIN usuarios u ON p.usuario_id = u.id
    WHERE 1=1
  `;
  let params = [];

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }

  if (cliente_id) {
    query += ' AND p.cliente_id = ?';
    params.push(cliente_id);
  }

  query += ' ORDER BY p.data_criacao DESC';

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.get('/pedidos/:id', authMiddleware, (req, res) => {
  const db = Database.getDb();
  
  db.get(`
    SELECT p.*, c.nome as cliente_nome, c.cnpj_cpf as cliente_cnpj,
           c.endereco as cliente_endereco, c.cidade as cliente_cidade,
           c.estado as cliente_estado
    FROM pedidos p
    LEFT JOIN clientes c ON p.cliente_id = c.id
    WHERE p.id = ?
  `, [req.params.id], (err, pedido) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado' });

    // Buscar itens do pedido
    db.all(`
      SELECT pi.*, pr.nome as produto_nome, pr.codigo as produto_codigo,
             pr.setor_origem, pr.tipo_produto,
             os.numero_os
      FROM pedido_itens pi
      LEFT JOIN produtos pr ON pi.produto_id = pr.id
      LEFT JOIN ordens_servico os ON pi.os_id = os.id
      WHERE pi.pedido_id = ?
    `, [req.params.id], (err, itens) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({ ...pedido, itens });
    });
  });
});

router.post('/pedidos', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { numero_pedido, cliente_id, data_entrega_prevista, observacoes, itens } = req.body;
  const db = Database.getDb();

  db.run(
    `INSERT INTO pedidos (numero_pedido, cliente_id, data_entrega_prevista, observacoes, usuario_id)
     VALUES (?, ?, ?, ?, ?)`,
    [numero_pedido, cliente_id, data_entrega_prevista, observacoes, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const pedidoId = this.lastID;
      let totalItens = 0;
      let totalQuantidade = 0;

      // Inserir itens do pedido
      if (itens && itens.length > 0) {
        const stmt = db.prepare(`
          INSERT INTO pedido_itens (pedido_id, produto_id, quantidade_solicitada, preco_unitario, observacoes)
          VALUES (?, ?, ?, ?, ?)
        `);

        itens.forEach(item => {
          stmt.run(pedidoId, item.produto_id, item.quantidade, item.preco_unitario, item.observacoes);
          totalItens++;
          totalQuantidade += parseFloat(item.quantidade);
        });

        stmt.finalize();
      }

      // Atualizar totais do pedido
      db.run(
        'UPDATE pedidos SET total_itens = ?, total_quantidade = ? WHERE id = ?',
        [totalItens, totalQuantidade, pedidoId]
      );

      res.json({ id: pedidoId, message: 'Pedido criado com sucesso' });
    }
  );
});

router.post('/pedidos/:id/gerar-os', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { item_id, setor_destino, maquina_id, prioridade } = req.body;
  const db = Database.getDb();

  // Buscar informações do item e do pedido
  db.get(`
    SELECT pi.*, p.numero_pedido, p.cliente_id, pr.nome as produto_nome, pr.codigo as produto_codigo
    FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    JOIN produtos pr ON pi.produto_id = pr.id
    WHERE pi.id = ? AND p.id = ?
  `, [item_id, req.params.id], (err, item) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });

    // Criar OS
    const numeroOS = `OS-${Date.now()}`;
    
    db.run(
      `INSERT INTO ordens_servico (numero_os, cliente_id, produto_id, pedido_cliente, 
       peso_total, setor_destino, maquina_id, prioridade, status, data_inicio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'em_producao', CURRENT_TIMESTAMP)`,
      [numeroOS, item.cliente_id, item.produto_id, item.numero_pedido, 
       item.quantidade_solicitada, setor_destino, maquina_id, prioridade],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        const osId = this.lastID;

        // Atualizar item com referência da OS
        db.run(
          'UPDATE pedido_itens SET os_id = ?, status = ? WHERE id = ?',
          [osId, 'em_producao', item_id]
        );

        res.json({ os_id: osId, numero_os: numeroOS, message: 'OS gerada com sucesso' });
      }
    );
  });
});

router.post('/pedidos/:id/enviar', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const { item_id, quantidade_enviada } = req.body;
  const db = Database.getDb();

  db.get('SELECT * FROM pedido_itens WHERE id = ? AND pedido_id = ?', 
    [item_id, req.params.id], (err, item) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });

    const novaQuantidade = parseFloat(item.quantidade_enviada || 0) + parseFloat(quantidade_enviada);
    const status = novaQuantidade >= item.quantidade_solicitada ? 'enviado' : 'parcial';

    // Atualizar item do pedido
    db.run(
      'UPDATE pedido_itens SET quantidade_enviada = ?, status = ? WHERE id = ?',
      [novaQuantidade, status, item_id]
    );

    // Registrar saída do estoque
    db.run(
      `INSERT INTO movimentacao_estoque (produto_id, tipo_movimentacao, quantidade, 
       origem, origem_id, destino, observacoes, usuario_id)
       VALUES (?, 'saida', ?, 'pedido', ?, 'cliente', ?, ?)`,
      [item.produto_id, quantidade_enviada, req.params.id, `Envio pedido #${req.params.id}`, req.user.id]
    );

    // Atualizar estoque
    db.run(
      `UPDATE estoque SET quantidade = quantidade - ?, ultima_movimentacao = CURRENT_TIMESTAMP 
       WHERE produto_id = ?`,
      [quantidade_enviada, item.produto_id]
    );

    // Verificar se todos os itens foram enviados
    db.all('SELECT * FROM pedido_itens WHERE pedido_id = ?', [req.params.id], (err, itens) => {
      const todosEnviados = itens.every(i => i.status === 'enviado' || (i.quantidade_enviada >= i.quantidade_solicitada));
      
      if (todosEnviados) {
        db.run(
          'UPDATE pedidos SET status = ?, data_envio = CURRENT_TIMESTAMP WHERE id = ?',
          ['enviado', req.params.id]
        );
      } else {
        db.run(
          'UPDATE pedidos SET status = ? WHERE id = ?',
          ['parcial', req.params.id]
        );
      }
    });

    res.json({ message: 'Envio registrado com sucesso' });
  });
});

router.delete('/pedidos/:id', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const db = Database.getDb();
  
  // Verificar se há itens em produção
  db.get(`
    SELECT COUNT(*) as count FROM pedido_itens 
    WHERE pedido_id = ? AND status IN ('em_producao', 'enviado')
  `, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (row.count > 0) {
      return res.status(400).json({ error: 'Não é possível excluir pedido com itens em produção ou já enviados' });
    }

    // Remover itens
    db.run('DELETE FROM pedido_itens WHERE pedido_id = ?', [req.params.id]);
    
    // Remover pedido
    db.run('DELETE FROM pedidos WHERE id = ?', [req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Pedido removido com sucesso' });
    });
  });
});

// ==================== CONFIGURAÇÕES ====================

router.get('/configuracoes', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  const db = Database.getDb();
  db.all('SELECT * FROM configuracoes', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

router.post('/configuracoes', authMiddleware, (req, res) => {
  if (!isAdminMaster(req.user)) {
    return res.status(403).json({ error: 'Apenas Admin Master pode alterar configurações' });
  }

  const { chave, valor, descricao } = req.body;
  const db = Database.getDb();

  db.run(
    `INSERT INTO configuracoes (chave, valor, descricao) VALUES (?, ?, ?)
     ON CONFLICT(chave) DO UPDATE SET valor = ?, updated_at = CURRENT_TIMESTAMP`,
    [chave, valor, descricao, valor],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Configuração salva com sucesso' });
    }
  );
});

// ==================== CONFIGURAÇÃO DE BACKUP ====================

router.get('/backup/config', authMiddleware, (req, res) => {
  if (!isAdminMaster(req.user)) {
    return res.status(403).json({ error: 'Apenas Admin Master pode ver configurações de backup' });
  }

  const BackupManager = require('./backup');
  res.json(BackupManager.config);
});

router.post('/backup/config', authMiddleware, (req, res) => {
  if (!isAdminMaster(req.user)) {
    return res.status(403).json({ error: 'Apenas Admin Master pode configurar backup' });
  }

  const { onedrive_path, email_config, intervalo_minutos } = req.body;
  const BackupManager = require('./backup');

  BackupManager.salvarConfig({
    onedrive_path,
    email_config,
    intervalo_minutos
  });

  res.json({ message: 'Configuração de backup salva com sucesso' });
});

// ==================== RESTAURAR BACKUP ====================

router.post('/backup/restaurar', authMiddleware, (req, res) => {
  if (!isAdminMaster(req.user)) {
    return res.status(403).json({ error: 'Apenas Admin Master pode restaurar backup' });
  }

  const { caminho_backup } = req.body;
  const BackupManager = require('./backup');

  BackupManager.restaurarBackup(caminho_backup).then(resultado => {
    if (resultado.sucesso) {
      res.json({
        sucesso: true,
        mensagem: resultado.mensagem,
        backup_seguranca: resultado.backup_seguranca,
        reiniciar: true
      });
    } else {
      res.status(500).json({ error: resultado.erro });
    }
  });
});

// Upload de arquivo de backup
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/backup/upload', authMiddleware, upload.single('arquivo'), (req, res) => {
  if (!isAdminMaster(req.user)) {
    return res.status(403).json({ error: 'Apenas Admin Master pode fazer upload de backup' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const fs = require('fs');
  const path = require('path');
  const BackupManager = require('./backup');

  const tempPath = req.file.path;
  const backupPath = path.join(BackupManager.backupDir, req.file.originalname);

  // Mover arquivo para pasta de backups
  fs.renameSync(tempPath, backupPath);

  res.json({
    sucesso: true,
    caminho: backupPath,
    mensagem: 'Arquivo de backup enviado com sucesso'
  });
});

// ==================== SOLICITAÇÕES DE ATENÇÃO ====================

// Listar solicitações (para o usuário logado)
router.get('/solicitacoes-atencao', authMiddleware, (req, res) => {
  const db = Database.getDb();
  db.all(
    `SELECT sa.*, 
            u_de.nome as de_usuario_nome,
            u_para.nome as para_usuario_nome
     FROM solicitacoes_atencao sa
     JOIN usuarios u_de ON sa.de_usuario_id = u_de.id
     JOIN usuarios u_para ON sa.para_usuario_id = u_para.id
     WHERE sa.para_usuario_id = ? OR sa.de_usuario_id = ?
     ORDER BY sa.data_criacao DESC`,
    [req.user.id, req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Criar solicitação de atenção
router.post('/solicitacoes-atencao', authMiddleware, (req, res) => {
  const { para_usuario_id, mensagem } = req.body;
  
  if (!para_usuario_id || !mensagem) {
    return res.status(400).json({ error: 'Usuário e mensagem são obrigatórios' });
  }

  const db = Database.getDb();
  db.run(
    `INSERT INTO solicitacoes_atencao (de_usuario_id, para_usuario_id, mensagem) 
     VALUES (?, ?, ?)`,
    [req.user.id, para_usuario_id, mensagem],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Solicitação enviada com sucesso' });
    }
  );
});

// Responder solicitação
router.put('/solicitacoes-atencao/:id/responder', authMiddleware, (req, res) => {
  const { resposta, status } = req.body;
  
  const db = Database.getDb();
  db.run(
    `UPDATE solicitacoes_atencao 
     SET resposta = ?, status = ?, data_resposta = CURRENT_TIMESTAMP 
     WHERE id = ? AND para_usuario_id = ?`,
    [resposta, status, req.params.id, req.user.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(403).json({ error: 'Acesso negado' });
      res.json({ message: 'Resposta registrada' });
    }
  );
});

// ==================== SOLICITAÇÕES DE MATERIAL ====================

// Listar solicitações de material
router.get('/solicitacoes-material', authMiddleware, (req, res) => {
  const db = Database.getDb();
  
  // Admin vê todas, usuário comum vê só as suas
  let query = `
    SELECT sm.*, u.nome as usuario_nome
    FROM solicitacoes_material sm
    JOIN usuarios u ON sm.usuario_id = u.id
  `;
  let params = [];
  
  if (!isAdmin(req.user)) {
    query += ' WHERE sm.usuario_id = ?';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY sm.data_criacao DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Criar solicitação de material
router.post('/solicitacoes-material', authMiddleware, (req, res) => {
  const { nome_item, descricao_uso, urgencia, quantidade } = req.body;
  
  if (!nome_item) {
    return res.status(400).json({ error: 'Nome do item é obrigatório' });
  }

  const db = Database.getDb();
  db.run(
    `INSERT INTO solicitacoes_material (usuario_id, nome_item, descricao_uso, urgencia, quantidade) 
     VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, nome_item, descricao_uso, urgencia || 'normal', quantidade || 1],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, message: 'Solicitação de material criada' });
    }
  );
});

// Admin responde solicitação de material
router.put('/solicitacoes-material/:id/responder', authMiddleware, (req, res) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Apenas administradores podem responder' });
  }
  
  const { status, resposta_admin } = req.body;

  const db = Database.getDb();
  db.run(
    `UPDATE solicitacoes_material 
     SET status = ?, resposta_admin = ?, data_resposta = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [status, resposta_admin, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Solicitação não encontrada' });
      res.json({ message: 'Solicitação atualizada' });
    }
  );
});

module.exports = router;
