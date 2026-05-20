import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  ClipboardList,
  Factory,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Cog
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800',
      em_producao: 'bg-blue-100 text-blue-800',
      concluida: 'bg-green-100 text-green-800',
      cancelada: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pendente: 'Pendente',
      em_producao: 'Em Produção',
      concluida: 'Concluída',
      cancelada: 'Cancelada'
    };
    return labels[status] || status;
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <p className="text-gray-500">
            Bem-vindo, <span className="font-medium capitalize">{user?.nome}</span>
          </p>
          {isAdmin() && (
            <button
              onClick={() => navigate('/configuracoes')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
              title="Configurações"
            >
              <Cog size={16} />
              Configurações
            </button>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">OS Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.osPorStatus?.find(s => s.status === 'pendente')?.total || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Em Produção</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.osPorStatus?.find(s => s.status === 'em_producao')?.total || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Factory className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Concluídas</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats?.osPorStatus?.find(s => s.status === 'concluida')?.total || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">OS em Atraso</p>
              <p className="text-2xl font-bold text-red-600">
                {stats?.osAtrasadas || 0}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* OS por Setor */}
      {isAdmin() && stats?.osPorSetor && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ordens de Serviço por Setor
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {['extrusao', 'impressao', 'corte_e_solda', 'expedicao', 'manutencao', 'secretaria'].map(setor => {
              const data = stats.osPorSetor.find(s => s.setor_destino === setor);
              return (
                <div key={setor} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-primary-600">{data?.total || 0}</p>
                  <p className="text-xs text-gray-500 capitalize">{setor.replace(/_/g, ' ')}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Status Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Visão Geral por Status
        </h2>
        <div className="space-y-3">
          {stats?.osPorStatus?.map((item) => (
            <div key={item.status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                  {getStatusLabel(item.status)}
                </span>
              </div>
              <span className="text-lg font-semibold text-gray-900">{item.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alertas de Prazo */}
      {(stats?.osProximasPrazo?.length > 0 || stats?.pedidosProximosPrazo?.length > 0) && (
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-lg font-semibold text-red-900">Alertas de Prazo</h2>
          </div>
          
          {stats?.osProximasPrazo?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-red-800 mb-2">OS próximas do prazo:</h3>
              <div className="space-y-2">
                {stats.osProximasPrazo.map(os => (
                  <div key={os.id} className="p-3 bg-white rounded-lg border border-red-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{os.numero_os}</p>
                        <p className="text-sm text-gray-600">{os.cliente_nome} - {os.produto_nome}</p>
                      </div>
                      <span className="text-sm text-red-600 font-medium">
                        Entrega: {new Date(os.data_entrega).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats?.pedidosProximosPrazo?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-800 mb-2">Pedidos próximos do prazo:</h3>
              <div className="space-y-2">
                {stats.pedidosProximosPrazo.map(pedido => (
                  <div key={pedido.id} className="p-3 bg-white rounded-lg border border-red-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{pedido.numero_pedido}</p>
                        <p className="text-sm text-gray-600">{pedido.cliente_nome}</p>
                      </div>
                      <span className="text-sm text-red-600 font-medium">
                        Entrega: {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
