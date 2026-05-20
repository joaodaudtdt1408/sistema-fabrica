import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, ArrowDown, ArrowUp, History, X } from 'lucide-react';
import { format } from 'date-fns';

export default function Estoque() {
  const [estoque, setEstoque] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [movForm, setMovForm] = useState({
    tipo: 'entrada',
    quantidade: '',
    origem: 'producao',
    observacoes: ''
  });

  useEffect(() => {
    fetchEstoque();
  }, []);

  const fetchEstoque = async () => {
    try {
      const response = await axios.get('/api/estoque');
      setEstoque(response.data);
    } catch (error) {
      console.error('Erro ao carregar estoque:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovimentacoes = async (produtoId) => {
    try {
      const response = await axios.get(`/api/estoque/movimentacoes/${produtoId}`);
      setMovimentacoes(response.data);
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error);
    }
  };

  const handleMovimentacao = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/estoque/movimentacao', {
        produto_id: selectedItem.produto_id,
        tipo_movimentacao: movForm.tipo,
        quantidade: parseFloat(movForm.quantidade),
        origem: movForm.origem,
        observacoes: movForm.observacoes
      });
      setShowMovimentacaoModal(false);
      fetchEstoque();
      setMovForm({ tipo: 'entrada', quantidade: '', origem: 'producao', observacoes: '' });
    } catch (error) {
      alert('Erro ao registrar movimentação: ' + error.response?.data?.error);
    }
  };

  const openMovimentacao = (item, tipo) => {
    setSelectedItem(item);
    setMovForm({ ...movForm, tipo });
    setShowMovimentacaoModal(true);
  };

  const openHistorico = async (item) => {
    setSelectedItem(item);
    await fetchMovimentacoes(item.produto_id);
    setShowHistoricoModal(true);
  };

  const getTipoBadge = (tipo) => {
    const styles = {
      entrada: 'bg-green-100 text-green-800',
      saida: 'bg-red-100 text-red-800',
      ajuste: 'bg-yellow-100 text-yellow-800'
    };
    return styles[tipo] || 'bg-gray-100 text-gray-800';
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
        <p className="text-gray-500">Gerencie o estoque de produtos acabados</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Itens</p>
              <p className="text-2xl font-bold text-gray-900">{estoque.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <ArrowDown className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Entradas (7 dias)</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <ArrowUp className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Saídas (7 dias)</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Estoque */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reservado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disponível</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localização</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estoque.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    Nenhum item no estoque
                  </td>
                </tr>
              ) : (
                estoque.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{item.produto_nome}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.codigo}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {item.quantidade} {item.unidade_medida || 'kg'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.quantidade_reservada || 0}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      {(item.quantidade - (item.quantidade_reservada || 0)).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.localizacao || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openMovimentacao(item, 'entrada')}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Entrada"
                        >
                          <ArrowDown size={18} />
                        </button>
                        <button
                          onClick={() => openMovimentacao(item, 'saida')}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Saída"
                        >
                          <ArrowUp size={18} />
                        </button>
                        <button
                          onClick={() => openHistorico(item)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg"
                          title="Histórico"
                        >
                          <History size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Movimentação */}
      {showMovimentacaoModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                {movForm.tipo === 'entrada' ? 'Entrada' : 'Saída'} de Estoque
              </h2>
              <button onClick={() => setShowMovimentacaoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleMovimentacao} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                <p className="font-medium text-gray-900">{selectedItem.produto_nome}</p>
                <p className="text-sm text-gray-500">Estoque atual: {selectedItem.quantidade} {selectedItem.unidade_medida || 'kg'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={movForm.quantidade}
                  onChange={(e) => setMovForm({...movForm, quantidade: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Origem/Destino</label>
                <select
                  value={movForm.origem}
                  onChange={(e) => setMovForm({...movForm, origem: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  {movForm.tipo === 'entrada' ? (
                    <>
                      <option value="producao">Produção</option>
                      <option value="devolucao">Devolução Cliente</option>
                      <option value="ajuste">Ajuste de Inventário</option>
                    </>
                  ) : (
                    <>
                      <option value="venda">Venda</option>
                      <option value="transferencia">Transferência</option>
                      <option value="perda">Perda/Avaria</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea
                  rows="2"
                  value={movForm.observacoes}
                  onChange={(e) => setMovForm({...movForm, observacoes: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMovimentacaoModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded-lg ${
                    movForm.tipo === 'entrada' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Registrar {movForm.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Histórico */}
      {showHistoricoModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Histórico de Movimentações</h2>
                <p className="text-sm text-gray-500">{selectedItem.produto_nome}</p>
              </div>
              <button onClick={() => setShowHistoricoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh]">
              {movimentacoes.length === 0 ? (
                <p className="text-center text-gray-500">Nenhuma movimentação registrada</p>
              ) : (
                <div className="space-y-3">
                  {movimentacoes.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoBadge(mov.tipo_movimentacao)}`}>
                          {mov.tipo_movimentacao === 'entrada' ? 'Entrada' : mov.tipo_movimentacao === 'saida' ? 'Saída' : 'Ajuste'}
                        </span>
                        <span className="font-medium">{mov.quantidade} {selectedItem.unidade_medida || 'kg'}</span>
                        <span className="text-sm text-gray-500">{mov.origem}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{mov.usuario_nome}</p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(mov.data_movimentacao), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowHistoricoModal(false)}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
