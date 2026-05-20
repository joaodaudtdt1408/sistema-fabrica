import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit2, X, Package, Link2, DollarSign, Layers } from 'lucide-react';

const setoresOrigem = [
  { value: 'extrusao', label: 'Extrusão' },
  { value: 'impressao', label: 'Impressão' },
  { value: 'corte_e_solda', label: 'Corte e Solda' },
];

const tiposProduto = [
  { value: 'bobina', label: 'Bobina' },
  { value: 'pacote', label: 'Pacote' },
  { value: 'saco', label: 'Saco' },
  { value: 'outro', label: 'Outro' },
];

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showVinculoModal, setShowVinculoModal] = useState(false);
  const [showSubprodutoModal, setShowSubprodutoModal] = useState(false);
  const [selectedProduto, setSelectedProduto] = useState(null);
  const [subprodutos, setSubprodutos] = useState([]);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState([]);
  const [subprodutoSelecionado, setSubprodutoSelecionado] = useState('');
  const [quantidadeNecessaria, setQuantidadeNecessaria] = useState(1);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    tipo_produto: 'bobina',
    setor_origem: 'extrusao',
    pode_ir_para_impressao: false,
    pode_ir_para_corte: false,
    eh_produto_final: true,
    unidade_medida: 'kg'
  });

  const [vinculoForm, setVinculoForm] = useState({
    preco_negociado: '',
    observacoes: ''
  });

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, [selectedCliente]);

  const fetchClientes = async () => {
    try {
      const response = await axios.get('/api/clientes');
      setClientes(response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const fetchProdutos = async () => {
    try {
      const params = {};
      if (selectedCliente) params.cliente_id = selectedCliente;
      const response = await axios.get('/api/produtos', { params });
      setProdutos(response.data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/produtos', formData);
      setShowModal(false);
      fetchProdutos();
      resetForm();
    } catch (error) {
      alert('Erro ao cadastrar produto: ' + error.response?.data?.error);
    }
  };

  const handleVincular = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/produtos/vincular-cliente', {
        produto_id: selectedProduto.id,
        cliente_id: selectedCliente,
        ...vinculoForm
      });
      setShowVinculoModal(false);
      fetchProdutos();
      setVinculoForm({ preco_negociado: '', observacoes: '' });
    } catch (error) {
      alert('Erro ao vincular produto: ' + error.response?.data?.error);
    }
  };

  const openVinculoModal = (produto) => {
    setSelectedProduto(produto);
    setVinculoForm({
      preco_negociado: produto.preco_negociado || '',
      observacoes: ''
    });
    setShowVinculoModal(true);
  };

  // Funções para gerenciar subprodutos
  const fetchSubprodutos = async (produtoId) => {
    try {
      const response = await axios.get(`/api/produtos/${produtoId}/subprodutos`);
      setSubprodutos(response.data);
    } catch (error) {
      console.error('Erro ao carregar subprodutos:', error);
    }
  };

  const fetchProdutosDisponiveis = async (setor) => {
    try {
      const response = await axios.get(`/api/produtos-disponiveis-subproduto/${setor}`);
      setProdutosDisponiveis(response.data);
    } catch (error) {
      console.error('Erro ao carregar produtos disponíveis:', error);
    }
  };

  const openSubprodutoModal = async (produto) => {
    setSelectedProduto(produto);
    setSubprodutoSelecionado('');
    setQuantidadeNecessaria(1);
    
    // Determinar o setor anterior baseado no setor_origem do produto
    const setorAnterior = produto.setor_origem === 'impressao' ? 'extrusao' : 
                          produto.setor_origem === 'corte_e_solda' ? 'impressao' : 
                          'extrusao';
    
    await fetchSubprodutos(produto.id);
    await fetchProdutosDisponiveis(setorAnterior);
    setShowSubprodutoModal(true);
  };

  const adicionarSubproduto = async () => {
    if (!subprodutoSelecionado) {
      alert('Selecione um produto para vincular');
      return;
    }
    
    try {
      await axios.post(`/api/produtos/${selectedProduto.id}/subprodutos`, {
        produto_filho_id: subprodutoSelecionado,
        quantidade_necessaria: quantidadeNecessaria
      });
      fetchSubprodutos(selectedProduto.id);
      setSubprodutoSelecionado('');
      setQuantidadeNecessaria(1);
      alert('Subproduto vinculado com sucesso!');
    } catch (error) {
      alert('Erro ao vincular subproduto: ' + error.response?.data?.error);
    }
  };

  const removerSubproduto = async (vinculoId) => {
    if (!confirm('Tem certeza que deseja remover este vínculo?')) return;
    
    try {
      await axios.delete(`/api/produtos/subprodutos/${vinculoId}`);
      fetchSubprodutos(selectedProduto.id);
    } catch (error) {
      alert('Erro ao remover vínculo: ' + error.response?.data?.error);
    }
  };

  const resetForm = () => {
    setFormData({
      codigo: '',
      nome: '',
      descricao: '',
      tipo_produto: 'bobina',
      setor_origem: 'extrusao',
      pode_ir_para_impressao: false,
      pode_ir_para_corte: false,
      eh_produto_final: true,
      unidade_medida: 'kg'
    });
  };

  const getFluxoLabel = (produto) => {
    const fluxos = [];
    if (produto.eh_produto_final) fluxos.push('Cliente Final');
    if (produto.pode_ir_para_impressao) fluxos.push('Para Impressão');
    if (produto.pode_ir_para_corte) fluxos.push('Para Corte e Solda');
    return fluxos.join(', ') || 'Sem fluxo definido';
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro de Produtos</h1>
          <p className="text-gray-500">Itens fabricados pela fábrica</p>
        </div>
        {isAdmin() && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Novo Produto
          </button>
        )}
      </div>

      {/* Filtro por Cliente */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filtrar por Cliente (para vincular produtos)</label>
        <select
          value={selectedCliente}
          onChange={(e) => setSelectedCliente(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
        >
          <option value="">Todos os produtos</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Lista de Produtos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {produtos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum produto cadastrado
            </div>
          ) : (
            produtos.map((produto) => (
              <div key={produto.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{produto.nome}</h3>
                        <p className="text-sm text-gray-500">Código: {produto.codigo}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                      <div>
                        <span className="text-gray-500">Tipo:</span>
                        <span className="ml-1 font-medium">{tiposProduto.find(t => t.value === produto.tipo_produto)?.label || produto.tipo_produto}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Origem:</span>
                        <span className="ml-1 font-medium capitalize">{produto.setor_origem.replace('_', ' ')}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Fluxo:</span>
                        <span className="ml-1 font-medium">{getFluxoLabel(produto)}</span>
                      </div>
                    </div>

                    {produto.descricao && (
                      <p className="mt-3 text-sm text-gray-600">{produto.descricao}</p>
                    )}

                    {selectedCliente && produto.vinculado_ao_cliente && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <span className="text-green-700 font-medium">✓ Vinculado a este cliente</span>
                        {produto.preco_negociado && (
                          <span className="ml-2 text-green-600">
                            - Preço: R$ {parseFloat(produto.preco_negociado).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Botão vincular subproduto - apenas para produtos que usam bobinas de outros setores */}
                    {isAdmin() && (produto.setor_origem === 'impressao' || produto.setor_origem === 'corte_e_solda') && (
                      <button
                        onClick={() => openSubprodutoModal(produto)}
                        className="flex items-center gap-2 px-3 py-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Vincular bobina do estoque"
                      >
                        <Layers size={18} />
                        Vincular Bobina
                      </button>
                    )}

                    {isAdmin() && selectedCliente && (
                      <button
                        onClick={() => openVinculoModal(produto)}
                        className="flex items-center gap-2 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <Link2 size={18} />
                        {produto.vinculado_ao_cliente ? 'Editar Vínculo' : 'Vincular Cliente'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Novo Produto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Novo Produto</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    value={formData.codigo}
                    onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                  <select
                    value={formData.unidade_medida}
                    onChange={(e) => setFormData({...formData, unidade_medida: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="kg">kg</option>
                    <option value="metro">metro</option>
                    <option value="unidade">unidade</option>
                    <option value="pacote">pacote</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    required
                    value={formData.tipo_produto}
                    onChange={(e) => setFormData({...formData, tipo_produto: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {tiposProduto.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Setor Origem *</label>
                  <select
                    required
                    value={formData.setor_origem}
                    onChange={(e) => setFormData({...formData, setor_origem: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {setoresOrigem.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  rows="2"
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Fluxo do Produto</label>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.eh_produto_final}
                      onChange={(e) => setFormData({...formData, eh_produto_final: e.target.checked})}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <span className="text-sm">Produto Final (vai direto para cliente)</span>
                  </label>

                  {formData.setor_origem === 'extrusao' && (
                    <>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.pode_ir_para_impressao}
                          onChange={(e) => setFormData({...formData, pode_ir_para_impressao: e.target.checked})}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className="text-sm">Para Impressão</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.pode_ir_para_corte}
                          onChange={(e) => setFormData({...formData, pode_ir_para_corte: e.target.checked})}
                          className="w-4 h-4 text-primary-600 rounded"
                        />
                        <span className="text-sm">Para Corte e Solda</span>
                      </label>
                    </>
                  )}

                  {formData.setor_origem === 'impressao' && (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.pode_ir_para_corte}
                        onChange={(e) => setFormData({...formData, pode_ir_para_corte: e.target.checked})}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="text-sm">Para Corte e Solda</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vincular Produto */}
      {showVinculoModal && selectedProduto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Vincular Produto ao Cliente</h2>
              <button onClick={() => setShowVinculoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleVincular} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                <p className="text-gray-900 font-medium">{selectedProduto.nome}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preço Negociado (R$)</label>
                <div className="relative">
                  <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={vinculoForm.preco_negociado}
                    onChange={(e) => setVinculoForm({...vinculoForm, preco_negociado: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações do Vínculo</label>
                <textarea
                  rows="2"
                  value={vinculoForm.observacoes}
                  onChange={(e) => setVinculoForm({...vinculoForm, observacoes: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Condições especiais, prazos, etc."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowVinculoModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vincular Subproduto (Bobina) */}
      {showSubprodutoModal && selectedProduto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Vincular Bobina - {selectedProduto.nome}
              </h2>
              <button onClick={() => setShowSubprodutoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Lista de subprodutos já vinculados */}
              {subprodutos.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Bobinas já vinculadas:</h3>
                  <div className="space-y-2">
                    {subprodutos.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{sub.produto_filho_nome}</p>
                          <p className="text-sm text-gray-500">Código: {sub.produto_filho_codigo}</p>
                          <p className="text-sm text-gray-500">Quantidade: {sub.quantidade_necessaria} kg</p>
                        </div>
                        <button
                          onClick={() => removerSubproduto(sub.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remover vínculo"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adicionar novo subproduto */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Adicionar nova bobina:</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bobina do Estoque
                    </label>
                    <select
                      value={subprodutoSelecionado}
                      onChange={(e) => setSubprodutoSelecionado(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">Selecione uma bobina...</option>
                      {produtosDisponiveis.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo} - {p.nome} (Estoque: {p.estoque_atual || 0} kg)
                        </option>
                      ))}
                    </select>
                    {produtosDisponiveis.length === 0 && (
                      <p className="text-sm text-amber-600 mt-1">
                        Nenhuma bobina disponível no estoque do setor anterior.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade Necessária (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={quantidadeNecessaria}
                      onChange={(e) => setQuantidadeNecessaria(parseFloat(e.target.value) || 1)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Ex: 50.5"
                    />
                  </div>

                  <button
                    onClick={adicionarSubproduto}
                    disabled={!subprodutoSelecionado}
                    className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                  >
                    <Layers size={18} className="inline mr-2" />
                    Vincular Bobina
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowSubprodutoModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
