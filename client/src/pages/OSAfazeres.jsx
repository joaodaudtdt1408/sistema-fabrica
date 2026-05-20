import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, CheckCircle, Clock, Wrench, X, Eye, Play, AlertCircle, Filter } from 'lucide-react';
import { format } from 'date-fns';

const setores = [
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'secretaria', label: 'Secretaria' },
];

const prioridades = [
  { value: 'baixa', label: 'Baixa', color: 'bg-gray-100 text-gray-800' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-800' },
];

const statusConfig = {
  pendente:     { label: 'Pendente',      color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  em_execucao:  { label: 'Em Execução',   color: 'bg-blue-100 text-blue-700',    icon: Play },
  concluida:    { label: 'Concluída',     color: 'bg-green-100 text-green-700',  icon: CheckCircle },
};

export default function OSAfazeres() {
  const [osAfazeres, setOsAfazeres] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedOS, setSelectedOS] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const { isAdmin, user } = useAuth();

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  };

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    setor_destino: '',
    prioridade: 'normal',
    responsavel_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [osRes, funcRes] = await Promise.all([
        axios.get('/api/os-afazeres'),
        axios.get('/api/funcionarios')
      ]);
      setOsAfazeres(osRes.data);
      setFuncionarios(funcRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/os-afazeres', formData);
      setShowModal(false);
      fetchData();
      setFormData({ titulo: '', descricao: '', setor_destino: '', prioridade: 'normal', responsavel_id: '' });
      showFeedback('success', 'OS criada com sucesso!');
    } catch (error) {
      showFeedback('error', 'Erro ao criar OS: ' + (error.response?.data?.error || 'Tente novamente'));
    }
  };

  const iniciarOS = async (id) => {
    setActionLoading(true);
    try {
      await axios.put(`/api/os-afazeres/${id}/iniciar`);
      fetchData();
      if (selectedOS?.id === id) setSelectedOS(prev => ({ ...prev, status: 'em_execucao' }));
      showFeedback('success', 'OS iniciada com sucesso!');
    } catch (error) {
      showFeedback('error', 'Erro ao iniciar OS: ' + (error.response?.data?.error || 'Tente novamente'));
    } finally {
      setActionLoading(false);
    }
  };

  const concluirOS = async (id) => {
    setActionLoading(true);
    try {
      await axios.put(`/api/os-afazeres/${id}/concluir`);
      fetchData();
      if (selectedOS?.id === id) setSelectedOS(prev => ({ ...prev, status: 'concluida' }));
      showFeedback('success', 'OS concluída com sucesso!');
    } catch (error) {
      showFeedback('error', 'Erro ao concluir OS: ' + (error.response?.data?.error || 'Tente novamente'));
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = (os) => {
    setSelectedOS(os);
    setShowDetail(true);
  };

  const getPrioridadeStyle = (prioridade) => {
    return prioridades.find(p => p.value === prioridade)?.color || 'bg-gray-100 text-gray-800';
  };

  const getPrioridadeLabel = (prioridade) => {
    return prioridades.find(p => p.value === prioridade)?.label || prioridade;
  };

  const getStatusBadge = (status) => {
    const cfg = statusConfig[status] || statusConfig.pendente;
    const Icon = cfg.icon;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${cfg.color}`}>
        <Icon size={12} />
        {cfg.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const osFiltradas = filtroStatus === 'todos'
    ? osAfazeres
    : osAfazeres.filter(os => os.status === filtroStatus);

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          feedback.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {feedback.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">OS de Afazeres</h1>
          <p className="text-gray-500">Tarefas para Manutenção e Secretaria</p>
        </div>
        {isAdmin() && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Nova OS
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        {['todos', 'pendente', 'em_execucao', 'concluida'].map(s => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
              filtroStatus === s
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'todos' ? 'Todos' : statusConfig[s]?.label}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-1">{osFiltradas.length} registro{osFiltradas.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Lista de OS */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {osFiltradas.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhuma OS de afazeres registrada
            </div>
          ) : (
            osFiltradas.map((os) => (
              <div key={os.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{os.titulo}</h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getPrioridadeStyle(os.prioridade)}`}>
                        {getPrioridadeLabel(os.prioridade)}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                        {os.setor_destino}
                      </span>
                      {getStatusBadge(os.status)}
                    </div>
                    {os.descricao && (
                      <p className="text-sm text-gray-500 truncate">{os.descricao}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(os.data_criacao), 'dd/MM/yyyy HH:mm')}
                      {os.responsavel_nome && ` · Resp: ${os.responsavel_nome}`}
                    </p>
                  </div>

                  <button
                    onClick={() => openDetail(os)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg flex-shrink-0"
                    title="Ver detalhes"
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Detalhes */}
      {showDetail && selectedOS && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <Wrench className="text-primary-600" size={20} />
                <h2 className="text-xl font-semibold text-gray-900">Detalhes da OS</h2>
              </div>
              <button onClick={() => setShowDetail(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(selectedOS.status)}
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPrioridadeStyle(selectedOS.prioridade)}`}>
                  {getPrioridadeLabel(selectedOS.prioridade)}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full capitalize">
                  {selectedOS.setor_destino}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedOS.titulo}</h3>
                {selectedOS.descricao && (
                  <p className="mt-2 text-gray-600 whitespace-pre-wrap">{selectedOS.descricao}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="text-gray-500">Solicitante</p>
                  <p className="font-medium">{selectedOS.solicitante_nome || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Responsável</p>
                  <p className="font-medium">{selectedOS.responsavel_nome || '-'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Criado em</p>
                  <p className="font-medium">{format(new Date(selectedOS.data_criacao), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                {selectedOS.data_conclusao && (
                  <div>
                    <p className="text-gray-500">Concluído em</p>
                    <p className="font-medium">{format(new Date(selectedOS.data_conclusao), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                )}
              </div>

              {selectedOS.status !== 'concluida' && (
                <div className="flex gap-3 pt-2">
                  {selectedOS.status === 'pendente' && (
                    <button
                      onClick={() => iniciarOS(selectedOS.id)}
                      disabled={actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                    >
                      {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Play size={16} />}
                      Iniciar Execução
                    </button>
                  )}
                  <button
                    onClick={() => concluirOS(selectedOS.id)}
                    disabled={actionLoading}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    <CheckCircle size={16} />
                    Marcar como Concluída
                  </button>
                </div>
              )}

              {selectedOS.status === 'concluida' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle size={18} className="text-green-600" />
                  <span className="text-green-700 font-medium">Esta OS foi concluída</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova OS */}
      {showModal && isAdmin() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <Wrench className="text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Nova OS de Afazeres</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Descrição breve da tarefa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  rows="3"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Detalhes da tarefa..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Setor Destino *</label>
                  <select
                    required
                    value={formData.setor_destino}
                    onChange={(e) => setFormData({...formData, setor_destino: e.target.value, responsavel_id: ''})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {setores.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                  <select
                    value={formData.prioridade}
                    onChange={(e) => setFormData({...formData, prioridade: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {prioridades.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsável (opcional)</label>
                <select
                  value={formData.responsavel_id}
                  onChange={(e) => setFormData({...formData, responsavel_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  {funcionarios
                    .filter(f => f.setor === formData.setor_destino)
                    .map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  Criar OS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
