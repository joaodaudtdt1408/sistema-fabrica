import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Eye, Truck, Factory, CheckCircle, X, Package, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

export default function Pedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEnvioModal, setShowEnvioModal] = useState(false);
  const [showOSModal, setShowOSModal] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    numero_pedido: '',
    cliente_id: '',
    data_entrega_prevista: '',
    observacoes: '',
    itens: []
  });

  const [itemForm, setItemForm] = useState({
    produto_id: '',
    quantidade: '',
    preco_unitario: '',
    observacoes: ''
  });

  const [envioForm, setEnvioForm] = useState({
    quantidade_enviada: ''
  });

  const [osForm, setOsForm] = useState({
    setor_destino: '',
    maquina_id: '',
    prioridade: 'normal'
  });

  useEffect(() => {
    fetchPedidos();
    fetchClientes();
    fetchMaquinas();
  }, []);

  useEffect(() => {
    if (formData.cliente_id) {
      fetchProdutos(formData.cliente_id);
    }
  }, [formData.cliente_id]);

  const fetchPedidos = async () => {
    try {
      const response = await axios.get('/api/pedidos');
      setPedidos(response.data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

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
      const response = await axios.get(`/api/clientes/${clienteId}/produtos`);
      setProdutos(response.data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  };

  const fetchMaquinas = async () => {
    try {
      const response = await axios.get('/api/maquinas');
      setMaquinas(response.data);
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
    }
  };

  const openDetail = async (pedido) => {
    try {
      const response = await axios.get(`/api/pedidos/${pedido.id}`);
      setSelectedPedido(response.data);
      setShowDetailModal(true);
    } catch (error) {
      alert('Erro ao carregar detalhes do pedido');
    }
  };

  const handleAddItem = () => {
    if (!itemForm.produto_id || !itemForm.quantidade) {
      alert('Selecione um produto e informe a quantidade');
      return;
    }
    
    const produto = produtos.find(p => p.id == itemForm.produto_id);
    const novoItem = {
      ...itemForm,
      produto_nome: produto.nome,
      produto_codigo: produto.codigo
    };
    
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, novoItem]
    }));
    
    setItemForm({ produto_id: '', quantidade: '', preco_unitario: '', observacoes: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.itens.length === 0) {
      alert('Adicione pelo menos um item ao pedido');
      return;
    }

    try {
      await axios.post('/api/pedidos', formData);
      setShowModal(false);
      fetchPedidos();
      setFormData({
        numero_pedido: '',
        cliente_id: '',
        data_entrega_prevista: '',
        observacoes: '',
        itens: []
      });
    } catch (error) {
      alert('Erro ao criar pedido: ' + error.response?.data?.error);
    }
  };

  const handleEnviar = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/pedidos/${selectedPedido.id}/enviar`, {
        item_id: selectedItem.id,
        quantidade_enviada: envioForm.quantidade_enviada
      });
      setShowEnvioModal(false);
      openDetail(selectedPedido);
      fetchPedidos();
      setEnvioForm({ quantidade_enviada: '' });
    } catch (error) {
      alert('Erro ao registrar envio: ' + error.response?.data?.error);
    }
  };

  const handleGerarOS = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/pedidos/${selectedPedido.id}/gerar-os`, {
        item_id: selectedItem.id,
        ...osForm
      });
      setShowOSModal(false);
      openDetail(selectedPedido);
      fetchPedidos();
      setOsForm({ setor_destino: '', maquina_id: '', prioridade: 'normal' });
    } catch (error) {
      alert('Erro ao gerar OS: ' + error.response?.data?.error);
    }
  };

  const openEnvioModal = (item) => {
    setSelectedItem(item);
    setEnvioForm({ quantidade_enviada: item.quantidade_solicitada - (item.quantidade_enviada || 0) });
    setShowEnvioModal(true);
  };

  const openOSModal = (item) => {
    setSelectedItem(item);
    setOsForm({ setor_destino: item.setor_origem || 'extrusao', maquina_id: '', prioridade: 'normal' });
    setShowOSModal(true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pendente: 'bg-yellow-100 text-yellow-800',
      em_producao: 'bg-blue-100 text-blue-800',
      parcial: 'bg-orange-100 text-orange-800',
      enviado: 'bg-green-100 text-green-800'
    };
    const labels = {
      pendente: 'Pendente',
      em_producao: 'Em Produção',
      parcial: 'Parcial',
      enviado: 'Enviado'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-gray-500">Gerencie pedidos de clientes</p>
        </div>
        {isAdmin() && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Novo Pedido
          </button>
        )}
      </div>

      {/* Lista de Pedidos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nº Pedido</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Itens</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entrega</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pedidos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Nenhum pedido registrado
                  </td>
                </tr>
              ) : (
                pedidos.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{pedido.numero_pedido}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{pedido.cliente_nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {pedido.total_itens} itens ({pedido.total_quantidade} total)
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(pedido.status)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(new Date(pedido.data_pedido), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {pedido.data_entrega_prevista ? format(new Date(pedido.data_entrega_prevista), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(pedido)}
                        className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50"
                        title="Ver detalhes"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Pedido */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Novo Pedido</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número Pedido *</label>
                  <input
                    type="text"
                    required
                    value={formData.numero_pedido}
                    onChange={(e) => setFormData({...formData, numero_pedido: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="PED-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                  <select
                    required
                    value={formData.cliente_id}
                    onChange={(e) => setFormData({...formData, cliente_id: e.target.value, itens: []})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Entrega Prevista</label>
                  <input
                    type="date"
                    value={formData.data_entrega_prevista}
                    onChange={(e) => setFormData({...formData, data_entrega_prevista: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  rows="2"
                  value={formData.observacoes}
                  onChange={(e) => setFormData({...formData, observacoes: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              {/* Adicionar Itens */}
              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Itens do Pedido</h3>
                
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div className="col-span-2">
                    <select
                      value={itemForm.produto_id}
                      onChange={(e) => setItemForm({...itemForm, produto_id: e.target.value})}
                      disabled={!formData.cliente_id}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100"
                    >
                      <option value="">Selecione o produto...</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>{p.nome} ({p.codigo})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Quantidade"
                      value={itemForm.quantidade}
                      onChange={(e) => setItemForm({...itemForm, quantidade: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* Lista de Itens Adicionados */}
                {formData.itens.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {formData.itens.map((item, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-2 rounded">
                        <span className="text-sm">{item.produto_nome} - {item.quantidade} un</span>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            itens: prev.itens.filter((_, i) => i !== index)
                          }))}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Criar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {showDetailModal && selectedPedido && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Pedido {selectedPedido.numero_pedido}</h2>
                <p className="text-sm text-gray-500">{selectedPedido.cliente_nome}</p>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(selectedPedido.status)}
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Info do Cliente */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Cliente</p>
                  <p className="font-medium">{selectedPedido.cliente_nome}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CNPJ/CPF</p>
                  <p className="font-medium">{selectedPedido.cliente_cnpj || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Data Pedido</p>
                  <p className="font-medium">{format(new Date(selectedPedido.data_pedido), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Entrega Prevista</p>
                  <p className="font-medium">
                    {selectedPedido.data_entrega_prevista 
                      ? format(new Date(selectedPedido.data_entrega_prevista), 'dd/MM/yyyy') 
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Itens do Pedido</h3>
                <div className="space-y-2">
                  {selectedPedido.itens?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{item.produto_nome}</span>
                          <span className="text-sm text-gray-500">({item.produto_codigo})</span>
                          {item.numero_os && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                              OS: {item.numero_os}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Solicitado: {item.quantidade_solicitada} | 
                          Enviado: {item.quantidade_enviada || 0} | 
                          Status: {getStatusBadge(item.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status === 'pendente' && isAdmin() && (
                          <button
                            onClick={() => openOSModal(item)}
                            className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                          >
                            <Factory size={14} />
                            Gerar OS
                          </button>
                        )}
                        {(item.status === 'pendente' || item.status === 'em_producao' || item.status === 'parcial') && isAdmin() && (
                          <button
                            onClick={() => openEnvioModal(item)}
                            disabled={item.quantidade_enviada >= item.quantidade_solicitada}
                            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg disabled:opacity-50"
                          >
                            <Truck size={14} />
                            Enviar
                          </button>
                        )}
                        {item.status === 'enviado' && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={16} />
                            Enviado
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Envio */}
      {showEnvioModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Registrar Envio</h2>
              <button onClick={() => setShowEnvioModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEnviar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                <p className="font-medium">{selectedItem.produto_nome}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Solicitado</p>
                  <p className="font-medium">{selectedItem.quantidade_solicitada}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Já Enviado</p>
                  <p className="font-medium">{selectedItem.quantidade_enviada || 0}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade a Enviar *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedItem.quantidade_solicitada - (selectedItem.quantidade_enviada || 0)}
                  value={envioForm.quantidade_enviada}
                  onChange={(e) => setEnvioForm({...envioForm, quantidade_enviada: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Disponível: {(selectedItem.quantidade_solicitada - (selectedItem.quantidade_enviada || 0)).toFixed(2)}
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEnvioModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Confirmar Envio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerar OS */}
      {showOSModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Gerar Ordem de Serviço</h2>
              <button onClick={() => setShowOSModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGerarOS} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                <p className="font-medium">{selectedItem.produto_nome}</p>
                <p className="text-sm text-gray-500">Quantidade: {selectedItem.quantidade_solicitada}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor Destino *</label>
                <select
                  required
                  value={osForm.setor_destino}
                  onChange={(e) => setOsForm({...osForm, setor_destino: e.target.value, maquina_id: ''})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="extrusao">Extrusão</option>
                  <option value="impressao">Impressão</option>
                  <option value="corte_e_solda">Corte e Solda</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Máquina</label>
                <select
                  value={osForm.maquina_id}
                  onChange={(e) => setOsForm({...osForm, maquina_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  {maquinas.filter(m => m.setor === osForm.setor_destino).map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                <select
                  value={osForm.prioridade}
                  onChange={(e) => setOsForm({...osForm, prioridade: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOSModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Gerar OS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
