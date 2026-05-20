import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Filter, Eye, Play, CheckCircle, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';

const setores = [
  { value: 'extrusao', label: 'Extrusão' },
  { value: 'impressao', label: 'Impressão' },
  { value: 'corte_e_solda', label: 'Corte e Solda' },
  { value: 'expedicao', label: 'Expedição' },
];

const statusList = [
  { value: 'pendente', label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'em_producao', label: 'Em Produção', color: 'bg-blue-100 text-blue-800' },
  { value: 'concluida_setor', label: 'Concluída pelo Setor', color: 'bg-orange-100 text-orange-800' },
  { value: 'concluida', label: 'Concluída', color: 'bg-green-100 text-green-800' },
];

const tabsList = [
  { value: 'todas', label: 'Todas' },
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'concluidas_setor', label: 'Concluídas pelo Setor' },
  { value: 'concluidas', label: 'Concluídas' },
];

export default function OrdensServico() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOS, setSelectedOS] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroSetor, setFiltroSetor] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('todas');
  const { isAdmin, isSupervisor, hasAccess, user } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [pedidos, setPedidos] = useState([]);

  const [formData, setFormData] = useState({
    numero_os: '',
    cliente_id: '',
    produto_id: '',
    pedido_id: '',
    pedido_cliente: '',
    peso_total: '',
    metragem_total: '',
    espessura: '',
    cor: '',
    largura: '',
    data_entrega: '',
    setor_destino: '',
    prioridade: 'normal',
    observacoes: ''
  });

  useEffect(() => {
    fetchOrdens();
    fetchClientes();
    fetchPedidos();
  }, [filtroStatus, filtroSetor]);

  useEffect(() => {
    if (formData.cliente_id) {
      fetchProdutos(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  const fetchClientes = async () => {
    try {
      const response = await axios.get('/api/clientes');
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const fetchProdutos = async (clienteId) => {
    try {
      const response = await axios.get('/api/clientes/' + clienteId + '/produtos');
      setProdutos(response.data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const fetchPedidos = async () => {
    try {
      const response = await axios.get('/api/pedidos');
      setPedidos(response.data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    }
  };

  // Funções de aprovação em duas etapas
  const concluirOS = async (osId) => {
    if (!confirm('Marcar esta ordem como concluída pelo setor?')) return;
    try {
      await axios.put(`/api/ordens-servico/${osId}/concluir-setor`);
      alert('Ordem marcada como concluída pelo setor!');
      fetchOrdens();
    } catch (error) {
      alert('Erro: ' + error.response?.data?.error);
    }
  };

  const aprovarOS = async (osId) => {
    if (!confirm('Aprovar conclusão desta ordem?')) return;
    try {
      await axios.put(`/api/ordens-servico/${osId}/concluir-admin`);
      alert('Ordem aprovada e concluída!');
      fetchOrdens();
    } catch (error) {
      alert('Erro: ' + error.response?.data?.error);
    }
  };

  const fetchOrdens = async () => {
    try {
      const params = {};
      if (filtroStatus) params.status = filtroStatus;
      if (filtroSetor && isAdmin()) params.setor = filtroSetor;

      const response = await axios.get('/api/ordens-servico', { params });
      setOrdens(response.data);
    } catch (error) {
      console.error('Erro ao carregar ordens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/ordens-servico', formData);
      setShowModal(false);
      fetchOrdens();
      setFormData({
        numero_os: '',
        cliente_id: '',
        produto_id: '',
        pedido_id: '',
        pedido_cliente: '',
        peso_total: '',
        metragem_total: '',
        espessura: '',
        cor: '',
        largura: '',
        data_entrega: '',
        setor_destino: '',
        prioridade: 'normal',
        observacoes: ''
      });
      setProdutos([]);
    } catch (error) {
      alert('Erro ao criar ordem de serviço: ' + error.response?.data?.error);
    }
  };

  const iniciarProducao = async (os) => {
    try {
      await axios.put(`/api/ordens-servico/${os.id}/iniciar`, { maquina_id: null });
      fetchOrdens();
    } catch (error) {
      alert('Erro ao iniciar produção: ' + error.response?.data?.error);
    }
  };

  const finalizarOS = async (os) => {
    try {
      await axios.put(`/api/ordens-servico/${os.id}/finalizar`);
      fetchOrdens();
    } catch (error) {
      alert('Erro ao finalizar OS: ' + error.response?.data?.error);
    }
  };

  const openDetail = (os) => {
    setSelectedOS(os);
    setShowDetailModal(true);
  };

  const getStatusStyle = (status) => {
    const item = statusList.find(s => s.value === status);
    return item?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status, statusSetor) => {
    // Se status geral é pendente mas status_setor é concluida
    if (status === 'pendente' && statusSetor === 'concluida') {
      return 'Concluída pelo Setor';
    }
    const item = statusList.find(s => s.value === status);
    return item?.label || status;
  };

  // Filtrar ordens baseado na aba ativa
  const ordensFiltradas = ordens.filter(os => {
    switch (abaAtiva) {
      case 'pendentes':
        return os.status === 'pendente' && os.status_setor !== 'concluida';
      case 'em_producao':
        return os.status === 'em_producao';
      case 'concluidas_setor':
        return os.status_setor === 'concluida' && os.status !== 'concluida';
      case 'concluidas':
        return os.status === 'concluida';
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
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
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">Todos os status</option>
            {statusList.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {isAdmin() && (
          <select
            value={filtroSetor}
            onChange={(e) => setFiltroSetor(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">Todos os setores</option>
            {setores.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}

        {(filtroStatus || filtroSetor) && (
          <button
            onClick={() => { setFiltroStatus(''); setFiltroSetor(''); }}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Abas de filtro */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
        <div className="flex flex-wrap gap-1">
          {tabsList.map(tab => (
            <button
              key={tab.value}
              onClick={() => setAbaAtiva(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                abaAtiva === tab.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              <span className="ml-2 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                {ordens.filter(os => {
                  switch (tab.value) {
                    case 'pendentes': return os.status === 'pendente' && os.status_setor !== 'concluida';
                    case 'em_producao': return os.status === 'em_producao';
                    case 'concluidas_setor': return os.status_setor === 'concluida' && os.status !== 'concluida';
                    case 'concluidas': return os.status === 'concluida';
                    default: return true;
                  }
                }).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Setor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrega</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ordensFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Nenhuma ordem de serviço encontrada
                  </td>
                </tr>
              ) : (
                ordensFiltradas.map((os) => (
                  <tr key={os.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{os.numero_os}</span>
                      {os.pedido_numero && (
                        <span className="block text-xs text-gray-500">Pedido: {os.pedido_numero}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{os.cliente_nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{os.produto_nome}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm capitalize">{os.setor_destino?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(os.status)}`}>
                        {getStatusLabel(os.status, os.status_setor)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {os.data_entrega ? format(new Date(os.data_entrega), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetail(os)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                          title="Ver detalhes"
                        >
                          <Eye size={18} />
                        </button>

                        {hasAccess(os.setor_destino) && os.status === 'pendente' && (
                          <button
                            onClick={() => iniciarProducao(os)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Iniciar produção"
                          >
                            <Play size={18} />
                          </button>
                        )}

                        {hasAccess(os.setor_destino) && os.status === 'em_producao' && (
                          <button
                            onClick={() => concluirOS(os.id)}
                            className="p-1.5 text-gray-400 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                            title="Marcar como concluída pelo setor"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}

                        {/* Botão de aprovação do admin - só aparece quando setor marcou como concluída */}
                        {isAdmin() && os.status_setor === 'concluida' && os.status !== 'concluida' && (
                          <button
                            onClick={() => aprovarOS(os.id)}
                            className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50"
                            title="Aprovar e concluir OS"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova OS */}
      {showModal && isAdmin() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Nova Ordem de Serviço</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número OS *</label>
                  <input
                    type="text"
                    required
                    value={formData.numero_os}
                    onChange={(e) => setFormData({...formData, numero_os: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="OS-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vincular a Pedido</label>
                  <select
                    value={formData.pedido_id}
                    onChange={(e) => setFormData({...formData, pedido_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Selecione um pedido (opcional)...</option>
                    {pedidos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.numero_pedido} - {p.cliente_nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pedido Cliente (código externo)</label>
                  <input
                    type="text"
                    value={formData.pedido_cliente}
                    onChange={(e) => setFormData({...formData, pedido_cliente: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <select
                    required
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({...formData, cliente_id: e.target.value, produto_id: ''})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produto *</label>
                  <select
                    required
                    value={formData.produto_id}
                    onChange={(e) => setFormData({...formData, produto_id: e.target.value})}
                    disabled={!formData.cliente_id || produtos.length === 0}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                  >
                    <option value="">
                      {!formData.cliente_id 
                        ? 'Selecione um cliente primeiro' 
                        : produtos.length === 0 
                          ? 'Nenhum produto vinculado' 
                          : 'Selecione um produto...'}
                    </option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>
                    ))}
                  </select>
                  {produtos.length === 0 && formData.cliente_id && (
                    <p className="text-xs text-red-500 mt-1">
                      Este cliente não tem produtos vinculados. Vincule produtos na página de Produtos primeiro.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso Total (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.peso_total}
                    onChange={(e) => setFormData({...formData, peso_total: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metragem Total (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.metragem_total}
                    onChange={(e) => setFormData({...formData, metragem_total: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Espessura</label>
                  <input
                    type="text"
                    value={formData.espessura}
                    onChange={(e) => setFormData({...formData, espessura: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                  <input
                    type="text"
                    value={formData.cor}
                    onChange={(e) => setFormData({...formData, cor: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Largura</label>
                  <input
                    type="text"
                    value={formData.largura}
                    onChange={(e) => setFormData({...formData, largura: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Entrega</label>
                  <input
                    type="date"
                    value={formData.data_entrega}
                    onChange={(e) => setFormData({...formData, data_entrega: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Setor Destino *</label>
                  <select
                    required
                    value={formData.setor_destino}
                    onChange={(e) => setFormData({...formData, setor_destino: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {setores.map(s => (
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
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  rows="3"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
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

      {/* Modal Detalhes */}
      {showDetailModal && selectedOS && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Detalhes da OS</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Número OS</p>
                  <p className="font-medium">{selectedOS.numero_os}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(selectedOS.status)}`}>
                    {getStatusLabel(selectedOS.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{selectedOS.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Produto</p>
                  <p className="font-medium">{selectedOS.produto_nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Setor</p>
                  <p className="font-medium capitalize">{selectedOS.setor_destino?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prioridade</p>
                  <p className="font-medium capitalize">{selectedOS.prioridade}</p>
                </div>
                {selectedOS.peso_total && (
                  <div>
                    <p className="text-sm text-gray-500">Peso Total</p>
                    <p className="font-medium">{selectedOS.peso_total} kg</p>
                  </div>
                )}
                {selectedOS.metragem_total && (
                  <div>
                    <p className="text-sm text-gray-500">Metragem Total</p>
                    <p className="font-medium">{selectedOS.metragem_total} m</p>
                  </div>
                )}
                {selectedOS.data_entrega && (
                  <div>
                    <p className="text-sm text-gray-500">Data Entrega</p>
                    <p className="font-medium">{format(new Date(selectedOS.data_entrega), 'dd/MM/yyyy')}</p>
                  </div>
                )}
              </div>

              {selectedOS.observacoes && (
                <div>
                  <p className="text-sm text-gray-500">Observações</p>
                  <p className="text-gray-700">{selectedOS.observacoes}</p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
