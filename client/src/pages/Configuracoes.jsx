import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { 
  Save, Database, Cloud, CheckCircle, X, AlertTriangle, 
  Upload, RotateCcw, FolderOpen, Mail, Server, Shield 
} from 'lucide-react';
import { format } from 'date-fns';

export default function Configuracoes() {
  const { isAdmin, isAdminMaster } = useAuth();
  const [backups, setBackups] = useState([]);
  const [backupConfig, setBackupConfig] = useState({
    onedrive_path: '',
    email_config: null,
    intervalo_minutos: 15
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showRestaurarModal, setShowRestaurarModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [restaurando, setRestaurando] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    backup_intervalo: '15',
    alerta_os_dias: '3',
    alerta_pedido_dias: '5'
  });

  const [emailConfig, setEmailConfig] = useState({
    smtp_host: '',
    smtp_port: '587',
    smtp_secure: false,
    user: '',
    password: '',
    from: '',
    to: ''
  });

  useEffect(() => {
    fetchBackups();
    fetchConfiguracoes();
    fetchBackupConfig();
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await axios.get('/api/backup/historico');
      setBackups(response.data.slice(0, 10));
    } catch (error) {
      console.error('Erro ao carregar backups:', error);
    }
  };

  const fetchConfiguracoes = async () => {
    try {
      const response = await axios.get('/api/configuracoes');
      const configs = {};
      response.data.forEach(c => {
        configs[c.chave] = c.valor;
      });
      setFormData(prev => ({
        ...prev,
        backup_intervalo: configs.backup_intervalo || '15',
        alerta_os_dias: configs.alerta_os_dias || '3',
        alerta_pedido_dias: configs.alerta_pedido_dias || '5'
      }));
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackupConfig = async () => {
    if (!isAdminMaster()) return;
    try {
      const response = await axios.get('/api/backup/config');
      setBackupConfig(response.data);
      if (response.data.email_config) {
        setEmailConfig(response.data.email_config);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de backup:', error);
    }
  };

  const getDescricao = (chave) => {
    const descricoes = {
      backup_intervalo: 'Intervalo de backup em minutos',
      alerta_os_dias: 'Dias antes para alertar sobre OS próximas do prazo',
      alerta_pedido_dias: 'Dias antes para alertar sobre pedidos próximos do prazo'
    };
    return descricoes[chave] || '';
  };

  const handleSave = async () => {
    try {
      for (const [chave, valor] of Object.entries(formData)) {
        await axios.post('/api/configuracoes', {
          chave,
          valor: String(valor),
          descricao: getDescricao(chave)
        });
      }
      setMessage('Configurações salvas com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      alert('Erro ao salvar configurações: ' + error.response?.data?.error);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith('.db')) {
      setArquivoSelecionado(file);
    } else {
      alert('Selecione um arquivo .db válido');
    }
  };

  const handleUpload = async () => {
    if (!arquivoSelecionado) return;

    const formDataUpload = new FormData();
    formDataUpload.append('arquivo', arquivoSelecionado);

    try {
      const response = await axios.post('/api/backup/upload', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Arquivo enviado com sucesso!');
      setArquivoSelecionado(null);
      fetchBackups();
    } catch (error) {
      alert('Erro ao enviar arquivo: ' + error.response?.data?.error);
    }
  };

  const handleRestaurar = async (caminhoBackup) => {
    if (!confirm('ATENÇÃO: Isso substituirá todos os dados atuais pelos do backup. Deseja continuar?')) {
      return;
    }

    setRestaurando(true);
    try {
      const response = await axios.post('/api/backup/restaurar', { caminho_backup: caminhoBackup });
      if (response.data.sucesso) {
        alert(response.data.mensagem + '\n\nO sistema será reiniciado em alguns segundos...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 5000);
      }
    } catch (error) {
      alert('Erro ao restaurar backup: ' + error.response?.data?.error);
    } finally {
      setRestaurando(false);
      setShowRestaurarModal(false);
    }
  };

  const handleSaveBackupConfig = async () => {
    try {
      await axios.post('/api/backup/config', {
        onedrive_path: backupConfig.onedrive_path,
        intervalo_minutos: parseInt(formData.backup_intervalo)
      });
      setMessage('Configuração de backup salva!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      alert('Erro ao salvar configuração: ' + error.response?.data?.error);
    }
  };

  const handleSaveEmailConfig = async () => {
    try {
      await axios.post('/api/backup/config', {
        email_config: emailConfig
      });
      setBackupConfig(prev => ({ ...prev, email_config: emailConfig }));
      setShowEmailModal(false);
      setMessage('Configuração de email salva!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      alert('Erro ao salvar configuração de email: ' + error.response?.data?.error);
    }
  };

  const executarBackupManual = async () => {
    try {
      const response = await axios.post('/api/backup/executar');
      if (response.data.sucesso) {
        alert('Backup executado com sucesso!');
        fetchBackups();
      } else {
        alert('Erro no backup: ' + response.data.erro);
      }
    } catch (error) {
      alert('Erro ao executar backup: ' + error.response?.data?.error);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'sucesso') return <CheckCircle size={16} className="text-green-500" />;
    return <AlertTriangle size={16} className="text-red-500" />;
  };

  // Verificar se é admin
  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acesso Negado</h2>
          <p className="text-gray-600">Apenas administradores podem acessar as configurações.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500">Configure backup do sistema</p>
      </div>

      {message && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} className="text-green-600" />
          <span className="text-green-800">{message}</span>
        </div>
      )}

      {/* Configuração de Backup */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Configuração de Backup</h2>
        </div>

        <div className="space-y-4 mb-6">
          {/* Pasta OneDrive */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pasta do OneDrive para Backup
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={backupConfig.onedrive_path}
                onChange={(e) => setBackupConfig({...backupConfig, onedrive_path: e.target.value})}
                placeholder="C:\Users\SeuUsuario\OneDrive"
                disabled={!isAdminMaster()}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
              />
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.webkitdirectory = true;
                  input.onchange = (e) => {
                    if (e.target.files.length > 0) {
                      const path = e.target.files[0].path;
                      const oneDrivePath = path.split('OneDrive')[0] + 'OneDrive';
                      setBackupConfig({...backupConfig, onedrive_path: oneDrivePath});
                    }
                  };
                  input.click();
                }}
                disabled={!isAdminMaster()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                <FolderOpen size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Se não configurado, o sistema tentará encontrar automaticamente
            </p>
          </div>

          {/* Intervalo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intervalo de Backup
              </label>
              <select
                value={formData.backup_intervalo}
                onChange={(e) => {
                  setFormData({...formData, backup_intervalo: e.target.value});
                  setBackupConfig({...backupConfig, intervalo_minutos: parseInt(e.target.value)});
                }}
                disabled={!isAdminMaster()}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
              >
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="60">1 hora</option>
                <option value="360">6 horas</option>
                <option value="720">12 horas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backup por Email
              </label>
              <button
                onClick={() => setShowEmailModal(true)}
                disabled={!isAdminMaster()}
                className={`w-full px-4 py-2 rounded-lg flex items-center justify-center gap-2 ${
                  backupConfig.email_config 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700'
                } disabled:opacity-50`}
              >
                <Mail size={18} />
                {backupConfig.email_config ? 'Configurado' : 'Configurar'}
              </button>
            </div>
          </div>
        </div>

        {/* Configuração de Alertas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Alertas de Prazo</h2>
              <p className="text-sm text-gray-500">Configure quantos dias antes para alertar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alerta OS (dias antes)
              </label>
              <input
                type="number"
                value={formData.alerta_os_dias}
                onChange={(e) => setFormData({...formData, alerta_os_dias: e.target.value})}
                disabled={!isAdminMaster()}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                min="1"
                max="30"
              />
              <p className="text-xs text-gray-500 mt-1">
                Dias antes da data de entrega da OS para mostrar alerta
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alerta Pedidos (dias antes)
              </label>
              <input
                type="number"
                value={formData.alerta_pedido_dias}
                onChange={(e) => setFormData({...formData, alerta_pedido_dias: e.target.value})}
                disabled={!isAdminMaster()}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                min="1"
                max="30"
              />
              <p className="text-xs text-gray-500 mt-1">
                Dias antes da data de entrega do pedido para mostrar alerta
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {isAdminMaster() && (
            <button
              onClick={handleSaveBackupConfig}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
            >
              <Save size={18} />
              Salvar Configuração
            </button>
          )}
          <button
            onClick={executarBackupManual}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
          >
            <RefreshCw size={18} />
            Backup Manual
          </button>
        </div>
      </div>

      {/* Gerenciamento de Backups */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Server className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Gerenciar Backups</h2>
        </div>

        {/* Upload de Backup */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Enviar Arquivo de Backup</h3>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".db"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!isAdminMaster()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Upload size={18} />
              {arquivoSelecionado ? arquivoSelecionado.name : 'Selecionar arquivo .db'}
            </button>
            {arquivoSelecionado && (
              <button
                onClick={handleUpload}
                disabled={!isAdminMaster()}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
              >
                Enviar
              </button>
            )}
          </div>
        </div>

        {/* Lista de Backups */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Backups Disponíveis</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {backups.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum backup registrado</p>
            ) : (
              backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(backup.status)}
                    <div>
                      <p className="text-sm font-medium">{format(new Date(backup.data_backup), 'dd/MM/yyyy HH:mm')}</p>
                      <p className="text-xs text-gray-500">
                        {backup.tamanho_bytes ? (backup.tamanho_bytes / 1024 / 1024).toFixed(2) + ' MB' : '-'}
                        {backup.tipo_nuvem && ` • ${backup.tipo_nuvem}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRestaurarModal(backup)}
                    disabled={!isAdminMaster()}
                    className="flex items-center gap-1 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    Restaurar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Aviso importante */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">O que é incluído no backup?</p>
              <p className="mt-1">O arquivo de backup (.db) contém TODAS as informações do sistema:</p>
              <ul className="list-disc ml-4 mt-1">
                <li>Usuários, senhas e permissões</li>
                <li>Clientes e produtos vinculados</li>
                <li>Pedidos e ordens de serviço</li>
                <li>Estoque e movimentações</li>
                <li>Funcionários e máquinas</li>
                <li>Histórico de produção</li>
                <li>Todas as configurações</li>
              </ul>
              <p className="mt-2 font-medium">Guarde seus backups em local seguro!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Configurar Email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Configurar Email para Backup</h2>
              <button onClick={() => setShowEmailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  O backup será enviado como anexo para o email configurado.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Servidor SMTP</label>
                <input
                  type="text"
                  value={emailConfig.smtp_host}
                  onChange={(e) => setEmailConfig({...emailConfig, smtp_host: e.target.value})}
                  placeholder="smtp.gmail.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Porta</label>
                  <input
                    type="text"
                    value={emailConfig.smtp_port}
                    onChange={(e) => setEmailConfig({...emailConfig, smtp_port: e.target.value})}
                    placeholder="587"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={emailConfig.smtp_secure}
                      onChange={(e) => setEmailConfig({...emailConfig, smtp_secure: e.target.checked})}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm">SSL/TLS</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (usuário)</label>
                <input
                  type="email"
                  value={emailConfig.user}
                  onChange={(e) => setEmailConfig({...emailConfig, user: e.target.value})}
                  placeholder="seuemail@gmail.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha/App Password</label>
                <input
                  type="password"
                  value={emailConfig.password}
                  onChange={(e) => setEmailConfig({...emailConfig, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Para Gmail, use uma "App Password" em vez da senha normal
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enviar para (destino)</label>
                <input
                  type="email"
                  value={emailConfig.to}
                  onChange={(e) => setEmailConfig({...emailConfig, to: e.target.value})}
                  placeholder="backup@empresa.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEmailConfig}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Salvar Configuração
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Restaurar Backup */}
      {showRestaurarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Restaurar Backup</h2>
              <button onClick={() => setShowRestaurarModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={20} className="text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-bold">ATENÇÃO!</p>
                    <p>Isso substituirá TODOS os dados atuais pelos do backup selecionado:</p>
                    <p className="font-mono mt-2 text-xs bg-white p-2 rounded">
                      {format(new Date(showRestaurarModal.data_backup), 'dd/MM/yyyy HH:mm')}
                    </p>
                    <p className="mt-2">O sistema será reiniciado após a restauração.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowRestaurarModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  disabled={restaurando}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleRestaurar(showRestaurarModal.caminho_local || showRestaurarModal.caminho)}
                  disabled={restaurando}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                >
                  {restaurando ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Restaurando...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={18} />
                      Confirmar Restauração
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
