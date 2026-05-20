import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Settings, X } from 'lucide-react';

const setores = [
  { value: 'extrusao', label: 'Extrusão' },
  { value: 'impressao', label: 'Impressão' },
  { value: 'corte_e_solda', label: 'Corte e Solda' },
  { value: 'expedicao', label: 'Expedição' },
];

export default function Maquinas() {
  const [maquinas, setMaquinas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    setor: ''
  });

  useEffect(() => {
    fetchMaquinas();
  }, []);

  const fetchMaquinas = async () => {
    try {
      const response = await axios.get('/api/maquinas');
      setMaquinas(response.data);
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/maquinas', formData);
      setShowModal(false);
      fetchMaquinas();
      setFormData({ codigo: '', nome: '', setor: '' });
    } catch (error) {
      alert('Erro ao cadastrar máquina: ' + error.response?.data?.error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja remover esta máquina?')) return;
    
    try {
      await axios.delete(`/api/maquinas/${id}`);
      fetchMaquinas();
    } catch (error) {
      alert('Erro ao remover máquina: ' + error.response?.data?.error);
    }
  };

  const maquinasPorSetor = setores.map(setor => ({
    ...setor,
    maquinas: maquinas.filter(m => m.setor === setor.value)
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
        <h1 className="text-2xl font-bold text-gray-900">Cadastro de Máquinas</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nova Máquina
        </button>
      </div>

      {/* Máquinas por Setor */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {maquinasPorSetor.map((setor) => (
          <div key={setor.value} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-900">{setor.label}</h2>
              <p className="text-sm text-gray-500">{setor.maquinas.length} máquina(s)</p>
            </div>
            <div className="divide-y divide-gray-100">
              {setor.maquinas.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Nenhuma máquina cadastrada
                </div>
              ) : (
                setor.maquinas.map((maquina) => (
                  <div key={maquina.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{maquina.nome}</p>
                      <p className="text-sm text-gray-500">Código: {maquina.codigo}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(maquina.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover máquina"
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

      {/* Modal Nova Máquina */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Nova Máquina</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input
                  type="text"
                  required
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ex: EXT-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Ex: Extrusora 1"
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
