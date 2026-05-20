import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (email, senha) => {
    try {
      const response = await axios.post('/api/login', { email, senha });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erro ao fazer login' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const isAdmin = () => user?.permissao === 'admin' || user?.permissao === 'admin_master';
  const isAdminMaster = () => user?.permissao === 'admin_master';
  const isSupervisor = () => user?.permissao?.startsWith('supervisor_') || isAdmin();
  const isSupervisorOf = (setor) => {
    if (isAdmin()) return true;
    const map = {
      'impressao': 'supervisor_impressao',
      'extrusao': 'supervisor_extrusao',
      'corte_e_solda': 'supervisor_corte_solda'
    };
    return user?.permissao === map[setor];
  };
  const hasAccess = (setor) => isAdmin() || isSupervisor() || user?.setor === setor;

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isAdminMaster, isSupervisor, isSupervisorOf, hasAccess, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
