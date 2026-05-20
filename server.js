const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('./database');
const routes = require('./routes');
const BackupManager = require('./backup');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check endpoint (para Render e UptimeRobot)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', routes);

// Serve static files from client build
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// Handle React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// Initialize database
Database.init();

// Iniciar backup automático (a cada 15 minutos)
BackupManager.iniciarBackupAutomatico();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
  console.log(`Backup automático: Ativado (a cada 15 minutos)`);
});
