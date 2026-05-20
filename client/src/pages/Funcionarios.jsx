import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Users, X, Eye, EyeOff } from 'lucide-react';

const setores = [
  { value: 'extrusao', label: 'Extrusão' },
  { value: 'impressao', label: 'Impressão' },
  { value: 'corte_e_solda', label: 'Corte e Solda' },
  { value: 'expedicao', label: 'Expedição' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'secretaria', label: 'Secretaria' },
];

export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSenha, setShowSenha] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    setor: '',
    senha: ''
  });

  useEffect(() => {
    fetchFuncionarios();
  }, []);

  const fetchFuncionarios = async () => {
    try {
      const response = await axios.get('/api/funcionarios');
      setFuncionarios(response.data);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/funcionarios', formData);
      setShowModal(false);
      fetchFuncionarios();
      setFormData({ nome: '', setor: '', senha: '' });
    } catch (error) {
      alert('Erro ao cadastrar funcionário: ' + error.response?.data?.error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja remover este funcionário?')) return;
    
    try {
      await axios.delete(`/api/funcionarios/${id}`);
      fetchFuncionarios();
    } catch (error) {
      alert('Erro ao remover funcionário: ' + error.response?.data?.error);
    }
  };

  const funcionariosPorSetor = setores.map(setor => ({
    ...setor,
    funcionarios: funcionarios.filter(f => f.setor === setor.value)
  }));

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
        <h1 className="text-2xl font-bold text-gray-900">Cadastro de Funcionários</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Novo Funcionário
        </button>
      </div>

      {/* Funcionários por Setor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {funcionariosPorSetor.map((setor) => (
          <div key={setor.value} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">{setor.label}</h2>
              <p className="text-sm text-gray-500">{setor.funcionarios.length} funcionário(s)</p>
            </div>
            <div className="divide-y divide-gray-100">
              {setor.funcionarios.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Nenhum funcionário cadastrado
                </div>
              ) : (
                setor.funcionarios.map((func) => (
                  <div key={func.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {func.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{func.nome}</span>
                    </div>
                    <button
                      onClick={() => handleDelete(func.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover funcionário"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo Funcionário */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <Users className="text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Novo Funcionário</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Nome do funcionário"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Setor *</label>
                <select
                  required
                  value={formData.setor}
                  onChange={(e) => setFormData({...formData, setor: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Selecione...</option>
                  {setores.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha de Confirmação *</label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    required
                    value={formData.senha}
                    onChange={(e) => setFormData({...formData, senha: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Senha para confirmar lançamentos"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Esta senha será usada para confirmar lançamentos de produção
                </p>
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
                  Cadastrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
