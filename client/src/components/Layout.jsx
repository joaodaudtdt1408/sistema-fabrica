import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import {
  LayoutDashboard,
  ClipboardList,
  Factory,
  Settings,
  Users,
  Wrench,
  Menu,
  X,
  LogOut,
  Building2,
  Package,
  Warehouse,
  UserCog,
  ShoppingCart,
  Cog
} from 'lucide-react';

const permissaoLabel = (p) => {
  const map = { admin_master: 'Admin Master', admin: 'Administrador', usuario: 'Usuário' };
  if (map[p]) return map[p];
  if (p?.startsWith('supervisor_')) return 'Supervisor';
  return p || 'Usuário';
};

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
          navigate('/login');
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/ordens-servico', icon: ClipboardList, label: 'Ordens de Serviço' },
    { path: '/producao', icon: Factory, label: 'Produção' },
    { path: '/os-afazeres', icon: Wrench, label: 'OS Afazeres' },
  ];

  const adminItems = [
    { path: '/pedidos', icon: ShoppingCart, label: 'Pedidos' },
    { path: '/clientes', icon: Building2, label: 'Clientes' },
    { path: '/produtos', icon: Package, label: 'Produtos' },
    { path: '/estoque', icon: Warehouse, label: 'Estoque' },
    { path: '/maquinas', icon: Settings, label: 'Máquinas' },
    { path: '/funcionarios', icon: Users, label: 'Funcionários' },
    { path: '/usuarios', icon: UserCog, label: 'Usuários' },
    { path: '/configuracoes', icon: Cog, label: 'Configurações' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary-700">Sistema Fábrica</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out`}
        >
          <div className="p-4 border-b hidden lg:block">
            <h1 className="text-xl font-bold text-primary-700">Sistema Fábrica</h1>
          </div>

          <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {isAdmin() && (
              <div className="pt-4 mt-4 border-t">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Administrativo
                </p>
                {adminItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={20} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </nav>

          {/* User Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.nome}</p>
                <p className="text-xs text-gray-400">{permissaoLabel(user?.permissao)}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.setor?.replace(/_/g, ' ')}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-hidden">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
