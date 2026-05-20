const fs = require('fs');
const path = require('path');
const Database = require('./database');
const nodemailer = require('nodemailer');

// Configurações de backup
const BACKUP_INTERVAL = 15 * 60 * 1000; // 15 minutos
const DB_PATH = path.join(__dirname, 'fabrica.db');

class BackupManager {
  constructor() {
    this.backupDir = path.join(__dirname, 'backups');
    this.nuvemPaths = [];
    this.config = this.carregarConfig();
    this.ensureBackupDir();
  }

  carregarConfig() {
    const configPath = path.join(__dirname, 'backup-config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    return {
      onedrive_path: '',
      email_config: null,
      intervalo_minutos: 15,
      manter_locais: 10,
      manter_nuvem: 20
    };
  }

  salvarConfig(config) {
    const configPath = path.join(__dirname, 'backup-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ ...this.config, ...config }, null, 2));
    this.config = { ...this.config, ...config };
  }

  getIntervalo() {
    return (this.config.intervalo_minutos || 15) * 60 * 1000;
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  detectarNuvem() {
    const nuvemPaths = [];
    const homeDir = require('os').homedir();

    // OneDrive configurado manualmente
    if (this.config.onedrive_path && fs.existsSync(this.config.onedrive_path)) {
      nuvemPaths.push({ tipo: 'onedrive_configurado', path: this.config.onedrive_path });
      return nuvemPaths;
    }

    // Auto-detectar OneDrive
    const onedrivePath = path.join(homeDir, 'OneDrive');
    if (fs.existsSync(onedrivePath)) {
      nuvemPaths.push({ tipo: 'onedrive', path: onedrivePath });
    }

    // OneDrive Empresarial
    const onedriveBusiness = path.join(homeDir, 'OneDrive - Vida Embalagens');
    if (fs.existsSync(onedriveBusiness)) {
      nuvemPaths.push({ tipo: 'onedrive_business', path: onedriveBusiness });
    }

    // Google Drive (File Stream)
    const gdrivePaths = [
      path.join(homeDir, 'Google Drive'),
      path.join(homeDir, 'Meu Drive'),
      'G:\\Meu Drive',
      'G:',
    ];

    for (const gPath of gdrivePaths) {
      if (fs.existsSync(gPath)) {
        nuvemPaths.push({ tipo: 'googledrive', path: gPath });
        break;
      }
    }

    return nuvemPaths;
  }

  async fazerBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `fabrica_backup_${timestamp}.db`;
    const localBackupPath = path.join(this.backupDir, backupFileName);

    try {
      // 1. Backup local
      await this.copiarArquivo(DB_PATH, localBackupPath);

      // 2. Limpar backups antigos locais
      this.limparBackupsAntigos(this.backupDir, this.config.manter_locais || 10);

      // 3. Backup para nuvem
      const resultadosNuvem = [];
      for (const nuvem of this.nuvemPaths) {
        try {
          const nuvemBackupPath = path.join(nuvem.path, 'SistemaFabrica_Backups');
          if (!fs.existsSync(nuvemBackupPath)) {
            fs.mkdirSync(nuvemBackupPath, { recursive: true });
          }

          const nuvemFilePath = path.join(nuvemBackupPath, backupFileName);
          await this.copiarArquivo(DB_PATH, nuvemFilePath);

          // Limpar backups antigos na nuvem
          this.limparBackupsAntigos(nuvemBackupPath, this.config.manter_nuvem || 20);

          resultadosNuvem.push({
            tipo: nuvem.tipo,
            caminho: nuvemFilePath,
            sucesso: true
          });
        } catch (error) {
          resultadosNuvem.push({
            tipo: nuvem.tipo,
            sucesso: false,
            erro: error.message
          });
        }
      }

      // 4. Enviar por email se configurado
      if (this.config.email_config) {
        const resultadoEmail = await this.enviarBackupPorEmail(localBackupPath, backupFileName);
        resultadosNuvem.push({
          tipo: 'email',
          sucesso: resultadoEmail.sucesso,
          erro: resultadoEmail.erro
        });
      }

      // 5. Registrar no banco de dados
      await this.registrarBackup(localBackupPath, resultadosNuvem, backupFileName);

      console.log(`[${new Date().toLocaleString()}] Backup realizado com sucesso: ${backupFileName}`);

      return {
        sucesso: true,
        arquivo: backupFileName,
        local: localBackupPath,
        nuvem: resultadosNuvem
      };

    } catch (error) {
      console.error(`[${new Date().toLocaleString()}] Erro no backup:`, error);
      await this.registrarErro(error.message);
      return {
        sucesso: false,
        erro: error.message
      };
    }
  }

  copiarArquivo(origem, destino) {
    return new Promise((resolve, reject) => {
      // Fechar conexão do banco antes de copiar
      const db = Database.getDb();
      db.run('PRAGMA wal_checkpoint(TRUNCATE)', (err) => {
        if (err) console.warn('Checkpoint warning:', err);

        fs.copyFile(origem, destino, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  limparBackupsAntigos(diretorio, manterQuantidade) {
    try {
      const arquivos = fs.readdirSync(diretorio)
        .filter(f => f.startsWith('fabrica_backup_') && f.endsWith('.db'))
        .map(f => ({
          nome: f,
          caminho: path.join(diretorio, f),
          stats: fs.statSync(path.join(diretorio, f))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);

      // Remover arquivos excedentes
      if (arquivos.length > manterQuantidade) {
        arquivos.slice(manterQuantidade).forEach(arquivo => {
          try {
            fs.unlinkSync(arquivo.caminho);
            console.log(`Backup antigo removido: ${arquivo.nome}`);
          } catch (e) {
            console.error(`Erro ao remover backup antigo ${arquivo.nome}:`, e);
          }
        });
      }
    } catch (error) {
      console.error('Erro ao limpar backups antigos:', error);
    }
  }

  registrarBackup(caminhoLocal, resultadosNuvem, arquivo) {
    return new Promise((resolve, reject) => {
      const db = Database.getDb();
      const stats = fs.statSync(caminhoLocal);

      // Registrar cada destino de nuvem
      for (const resultado of resultadosNuvem) {
        db.run(
          `INSERT INTO backups (caminho_local, caminho_nuvem, tipo_nuvem, status, tamanho_bytes, mensagem_erro)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            caminhoLocal,
            resultado.sucesso ? resultado.caminho : null,
            resultado.tipo,
            resultado.sucesso ? 'sucesso' : 'erro',
            stats.size,
            resultado.sucesso ? null : resultado.erro
          ]
        );
      }

      resolve();
    });
  }

  registrarErro(mensagem) {
    return new Promise((resolve) => {
      const db = Database.getDb();
      db.run(
        `INSERT INTO backups (status, mensagem_erro) VALUES (?, ?)`,
        ['erro_critico', mensagem],
        () => resolve()
      );
    });
  }

  iniciarBackupAutomatico() {
    // Atualizar caminhos de nuvem
    this.nuvemPaths = this.detectarNuvem();
    
    const intervalo = this.getIntervalo();
    console.log(`[Backup] Iniciando backup automático a cada ${intervalo / 60000} minutos`);
    console.log(`[Backup] Destinos: ${this.nuvemPaths.map(n => n.tipo).join(', ') || 'Local apenas'}`);
    if (this.config.email_config) {
      console.log(`[Backup] Email configurado: ${this.config.email_config.to}`);
    }

    // Fazer backup imediatamente
    this.fazerBackup();

    // Agendar backups
    setInterval(() => {
      this.fazerBackup();
    }, intervalo);

    return this;
  }

  async restaurarBackup(caminhoBackup) {
    try {
      // Verificar se arquivo existe
      if (!fs.existsSync(caminhoBackup)) {
        return { sucesso: false, erro: 'Arquivo de backup não encontrado' };
      }

      // Criar backup de segurança antes de restaurar
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupSeguranca = path.join(this.backupDir, `fabrica_backup_antes_restauracao_${timestamp}.db`);
      
      if (fs.existsSync(DB_PATH)) {
        await this.copiarArquivo(DB_PATH, backupSeguranca);
        console.log(`[Restauração] Backup de segurança criado: ${backupSeguranca}`);
      }

      // Fechar conexão com banco
      const db = Database.getDb();
      await new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Restaurar backup
      fs.copyFileSync(caminhoBackup, DB_PATH);
      
      // Reconectar ao banco
      Database.db = new (require('sqlite3').verbose().Database)(DB_PATH);

      console.log(`[Restauração] Backup restaurado com sucesso: ${caminhoBackup}`);
      
      return { 
        sucesso: true, 
        mensagem: 'Backup restaurado com sucesso. O sistema será reiniciado automaticamente.',
        backup_seguranca: backupSeguranca
      };
    } catch (error) {
      console.error('[Restauração] Erro:', error);
      return { sucesso: false, erro: error.message };
    }
  }

  listarBackups() {
    const backups = [];

    // Backups locais
    if (fs.existsSync(this.backupDir)) {
      const locais = fs.readdirSync(this.backupDir)
        .filter(f => f.startsWith('fabrica_backup_') && f.endsWith('.db'))
        .map(f => {
          const stats = fs.statSync(path.join(this.backupDir, f));
          return {
            nome: f,
            tipo: 'local',
            caminho: path.join(this.backupDir, f),
            tamanho: stats.size,
            data: stats.mtime
          };
        });
      backups.push(...locais);
    }

    return backups.sort((a, b) => b.data - a.data);
  }
}

module.exports = new BackupManager();
