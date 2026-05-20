import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrdensServico from './pages/OrdensServico';
import Producao from './pages/Producao';
import Maquinas from './pages/Maquinas';
import Funcionarios from './pages/Funcionarios';
import OSAfazeres from './pages/OSAfazeres';
import Clientes from './pages/Clientes';
import Produtos from './pages/Produtos';
import Estoque from './pages/Estoque';
import Pedidos from './pages/Pedidos';
import Configuracoes from './pages/Configuracoes';
import Usuarios from './pages/Usuarios';
import { useAuth } from './contexts/AuthContext';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/ordens-servico" element={<OrdensServico />} />
                    <Route path="/producao" element={<Producao />} />
                    <Route path="/maquinas" element={<Maquinas />} />
                    <Route path="/funcionarios" element={<Funcionarios />} />
                    <Route path="/os-afazeres" element={<OSAfazeres />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/produtos" element={<Produtos />} />
                    <Route path="/estoque" element={<Estoque />} />
                    <Route path="/pedidos" element={<Pedidos />} />
                    <Route path="/configuracoes" element={<Configuracoes />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
