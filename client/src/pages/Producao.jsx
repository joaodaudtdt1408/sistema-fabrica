import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Eye, X, Scale, Ruler, Clock, Package, User } from 'lucide-react';
import { format } from 'date-fns';

export default function Producao() {
  const [ordens, setOrdens] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [selectedOS, setSelectedOS] = useState(null);
  const [producao, setProducao] = useState([]);
  const [showProducaoModal, setShowProducaoModal] = useState(false);
  const [showTurnoModal, setShowTurnoModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, hasAccess } = useAuth();

  const [bobinaForm, setBobinaForm] = useState({
    numero_bobina: 1,
    peso: '',
    metragem: '',
    espessura: '',
    hora_inicio: '',
    operador_id: ''
  });

  const [turnoForm, setTurnoForm] = useState({
    funcionario_id: '',
    data: '',
    hora_inicio: '',
    hora_fim: '',
    pacotes_produzidos: '',
    senha_funcionario: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordensRes, maquinasRes, funcRes] = await Promise.all([
        axios.get('/api/ordens-servico', { params: { status: 'em_producao' } }),
        axios.get('/api/maquinas', { params: { setor: user?.setor } }),
        axios.get('/api/funcionarios', { params: { setor: user?.setor } })
      ]);
      setOrdens(ordensRes.data);
      setMaquinas(maquinasRes.data);
      setFuncionarios(funcRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducao = async (osId, setor) => {
    try {
      const endpoint = setor === 'corte_e_solda' ? '/api/producao/turnos/' : '/api/producao/bobinas/';
      const response = await axios.get(`${endpoint}${osId}`);
      setProducao(response.data);
    } catch (error) {
      console.error('Erro ao carregar produção:', error);
    }
  };

  const openProducao = async (os) => {
    setSelectedOS(os);
    await fetchProducao(os.id, os.setor_destino);
    
    if (os.setor_destino === 'corte_e_solda') {
      setShowTurnoModal(true);
    } else {
      // Extrusão ou Impressão - calcular próximo número de bobina
      const response = await axios.get(`/api/producao/bobinas/${os.id}`);
      const bobinas = response.data;
      const nextNumero = bobinas.length > 0 ? Math.max(...bobinas.map(b => b.numero_bobina)) + 1 : 1;
      
      setBobinaForm(prev => ({
        ...prev,
        numero_bobina: nextNumero,
        hora_inicio: new Date().toISOString().slice(0, 16)
      }));
      setShowProducaoModal(true);
    }
  };

  const registrarBobina = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/producao/bobinas', {
        os_id: selectedOS.id,
        maquina_id: selectedOS.maquina_id,
        ...bobinaForm,
        hora_inicio: new Date(bobinaForm.hora_inicio).toISOString()
      });
      
      fetchProducao(selectedOS.id, selectedOS.setor_destino);
      setBobinaForm(prev => ({
        ...prev,
        numero_bobina: prev.numero_bobina + 1,
        peso: '',
        metragem: '',
        espessura: ''
      }));
    } catch (error) {
      alert('Erro ao registrar bobina: ' + error.response?.data?.error);
    }
  };

  const finalizarBobina = async (bobinaId) => {
    try {
      await axios.put(`/api/producao/bobinas/${bobinaId}/finalizar`, {
        hora_fim: new Date().toISOString()
      });
      fetchProducao(selectedOS.id, selectedOS.setor_destino);
    } catch (error) {
      alert('Erro ao finalizar bobina: ' + error.response?.data?.error);
    }
  };

  const registrarTurno = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/producao/turnos', {
        os_id: selectedOS.id,
        maquina_id: selectedOS.maquina_id,
        funcionario_id: turnoForm.funcionario_id,
        data: turnoForm.data,
        hora_inicio: turnoForm.hora_inicio
      });
      
      fetchProducao(selectedOS.id, selectedOS.setor_destino);
      setTurnoForm({ funcionario_id: '', data: '', hora_inicio: '', hora_fim: '', pacotes_produzidos: '', senha_funcionario: '' });
    } catch (error) {
      alert('Erro ao registrar turno: ' + error.response?.data?.error);
    }
  };

  const finalizarTurno = async (turnoId) => {
    try {
      await axios.put(`/api/producao/turnos/${turnoId}/finalizar`, {
        hora_fim: turnoForm.hora_fim,
        pacotes_produzidos: turnoForm.pacotes_produzidos,
        senha_funcionario: turnoForm.senha_funcionario
      });
      
      fetchProducao(selectedOS.id, selectedOS.setor_destino);
      setTurnoForm({ funcionario_id: '', data: '', hora_inicio: '', hora_fim: '', pacotes_produzidos: '', senha_funcionario: '' });
    } catch (error) {
      alert('Erro ao finalizar turno: ' + error.response?.data?.error);
    }
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
      <h1 className="text-2xl font-bold text-gray-900">Produção</h1>

      {/* Lista de OS em Produção */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Ordens de Serviço em Produção</h2>
          <p className="text-sm text-gray-500">Selecione uma OS para lançar produção</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {ordens.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhuma ordem de serviço em produção no momento
            </div>
          ) : (
            ordens.map((os) => (
              <div key={os.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{os.numero_os}</span>
                    <span className="text-sm text-gray-500">{os.cliente}</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {os.setor_destino === 'corte_e_solda' ? 'Corte e Solda' : os.setor_destino}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{os.produto}</p>
                  {os.maquina_nome && (
                    <p className="text-sm text-gray-500">Máquina: {os.maquina_nome}</p>
                  )}
                </div>
                <button
                  onClick={() => openProducao(os)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                >
                  <Plus size={18} />
                  Lançar
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Produção Bobinas (Extrusão/Impressão) */}
      {showProducaoModal && selectedOS && selectedOS.setor_destino !== 'corte_e_solda' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Lançar Produção - Bobina</h2>
                <p className="text-sm text-gray-500">OS: {selectedOS.numero_os}</p>
              </div>
              <button onClick={() => setShowProducaoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Histórico de Bobinas */}
            {producao.length > 0 && (
              <div className="p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Bobinas Produzidas</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {producao.map((bobina) => (
                    <div key={bobina.id} className="bg-white p-3 rounded-lg border flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-medium">Bobina #{bobina.numero_bobina}</span>
                        <span className="text-sm text-gray-600">{bobina.peso} kg</span>
                        <span className="text-sm text-gray-600">{bobina.metragem} m</span>
                        {!bobina.hora_fim && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            Em andamento
                          </span>
                        )}
                      </div>
                      {!bobina.hora_fim && (
                        <button
                          onClick={() => finalizarBobina(bobina.id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                        >
                          Finalizar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Nova Bobina */}
            <form onSubmit={registrarBobina} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número Bobina</label>
                  <input
                    type="number"
                    value={bobinaForm.numero_bobina}
                    onChange={(e) => setBobinaForm({...bobinaForm, numero_bobina: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora Início</label>
                  <input
                    type="datetime-local"
                    required
                    value={bobinaForm.hora_inicio}
                    onChange={(e) => setBobinaForm({...bobinaForm, hora_inicio: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={bobinaForm.peso}
                    onChange={(e) => setBobinaForm({...bobinaForm, peso: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metragem (m) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={bobinaForm.metragem}
                    onChange={(e) => setBobinaForm({...bobinaForm, metragem: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Espessura</label>
                  <input
                    type="text"
                    value={bobinaForm.espessura}
                    onChange={(e) => setBobinaForm({...bobinaForm, espessura: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operador</label>
                  <select
                    value={bobinaForm.operador_id}
                    onChange={(e) => setBobinaForm({...bobinaForm, operador_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {funcionarios.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProducaoModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                >
                  Registrar Bobina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Produção Turnos (Corte e Solda) */}
      {showTurnoModal && selectedOS && selectedOS.setor_destino === 'corte_e_solda' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Lançar Produção - Turno</h2>
                <p className="text-sm text-gray-500">OS: {selectedOS.numero_os} - Corte e Solda</p>
              </div>
              <button onClick={() => setShowTurnoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Histórico de Turnos */}
            {producao.length > 0 && (
              <div className="p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Turnos Registrados</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {producao.map((turno) => (
                    <div key={turno.id} className="bg-white p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User size={16} className="text-gray-400" />
                          <span className="font-medium">{turno.funcionario_nome}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(turno.data), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        {turno.confirmado ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            {turno.pacotes_produzidos} pacotes
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                            Em andamento
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {turno.hora_inicio} - {turno.hora_fim || '...'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Form Novo Turno ou Finalizar */}
            <div className="p-6">
              {/* Verificar se há turno em aberto */}
              {producao.some(t => !t.confirmado) ? (
                /* Form Finalizar Turno */
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Finalizar Turno Aberto</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fim</label>
                      <input
                        type="time"
                        value={turnoForm.hora_fim}
                        onChange={(e) => setTurnoForm({...turnoForm, hora_fim: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pacotes Produzidos</label>
                      <input
                        type="number"
                        value={turnoForm.pacotes_produzidos}
                        onChange={(e) => setTurnoForm({...turnoForm, pacotes_produzidos: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Senha do Funcionário *</label>
                    <input
                      type="password"
                      required
                      value={turnoForm.senha_funcionario}
                      onChange={(e) => setTurnoForm({...turnoForm, senha_funcionario: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Senha para confirmar"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowTurnoModal(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      Fechar
                    </button>
                    <button
                      onClick={() => finalizarTurno(producao.find(t => !t.confirmado).id)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                      Finalizar Turno
                    </button>
                  </div>
                </div>
              ) : (
                /* Form Iniciar Novo Turno */
                <form onSubmit={registrarTurno} className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Iniciar Novo Turno</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário *</label>
                      <select
                        required
                        value={turnoForm.funcionario_id}
                        onChange={(e) => setTurnoForm({...turnoForm, funcionario_id: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                      >
                        <option value="">Selecione...</option>
                        {funcionarios.map((f) => (
                          <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                      <input
                        type="date"
                        required
                        value={turnoForm.data}
                        onChange={(e) => setTurnoForm({...turnoForm, data: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hora Início *</label>
                      <input
                        type="time"
                        required
                        value={turnoForm.hora_inicio}
                        onChange={(e) => setTurnoForm({...turnoForm, hora_inicio: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowTurnoModal(false)}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      Fechar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
                    >
                      Iniciar Turno
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
