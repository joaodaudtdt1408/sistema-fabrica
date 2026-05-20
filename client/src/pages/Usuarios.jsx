import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, X, UserCog, Crown, Shield, User, Eye, EyeOff, Key, Search } from 'lucide-react';

const setores = [
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'extrusao', label: 'Extrusão' },
  { value: 'impressao', label: 'Impressão' },
  { value: 'corte_e_solda', label: 'Corte e Solda' },
  { value: 'expedicao', label: 'Expedição' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'secretaria', label: 'Secretaria' },
];

const permissoes = [
  { value: 'usuario', label: 'Usuário', icon: User },
  { value: 'supervisor_extrusao', label: 'Supervisor Extrusão', icon: Shield },
  { value: 'supervisor_impressao', label: 'Supervisor Impressão', icon: Shield },
  { value: 'supervisor_corte_solda', label: 'Supervisor Corte e Solda', icon: Shield },
  { value: 'admin', label: 'Administrador', icon: Shield },
  { value: 'admin_master', label: 'Admin Master', icon: Crown },
];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSenha, setShowSenha] = useState(false);
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const { isAdmin, isAdminMaster, isSupervisor, user: currentUser } = useAuth();

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    setor: 'extrusao',
    permissao: 'usuario'
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const response = await axios.get('/api/usuarios');
      setUsuarios(response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Se for admin_master criando admin, usa endpoint especial
      if (formData.permissao === 'admin' && isAdminMaster()) {
        await axios.post('/api/usuarios/admin', formData);
      } else {
        await axios.post('/api/usuarios', formData);
      }
      setShowModal(false);
      fetchUsuarios();
      setFormData({ nome: '', email: '', senha: '', setor: 'extrusao', permissao: 'usuario' });
    } catch (error) {
      alert('Erro ao criar usuário: ' + error.response?.data?.error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    
    try {
      await axios.delete(`/api/usuarios/${id}`);
      fetchUsuarios();
    } catch (error) {
      alert('Erro ao remover usuário: ' + error.response?.data?.error);
    }
  };

  const handleAlterarSenha = async () => {
    if (!novaSenha || novaSenha.length < 4) {
      alert('A senha deve ter pelo menos 4 caracteres');
      return;
    }
    
    try {
      await axios.put(`/api/usuarios/${usuarioSelecionado.id}/senha`, {
        nova_senha: novaSenha
      });
      alert('Senha alterada com sucesso!');
      setShowSenhaModal(false);
      setNovaSenha('');
      setUsuarioSelecionado(null);
    } catch (error) {
      alert('Erro ao alterar senha: ' + error.response?.data?.error);
    }
  };

  const abrirModalSenha = (usuario) => {
    setUsuarioSelecionado(usuario);
    setNovaSenha('');
    setShowSenhaModal(true);
  };

  const getPermissaoBadge = (permissao) => {
    const styles = {
      usuario: 'bg-gray-100 text-gray-800',
      supervisor_extrusao: 'bg-yellow-100 text-yellow-800',
      supervisor_impressao: 'bg-yellow-100 text-yellow-800',
      supervisor_corte_solda: 'bg-yellow-100 text-yellow-800',
      admin: 'bg-blue-100 text-blue-800',
      admin_master: 'bg-purple-100 text-purple-800'
    };
    const labels = {
      usuario: 'Usuário',
      supervisor_extrusao: 'Sup. Extrusão',
      supervisor_impressao: 'Sup. Impressão',
      supervisor_corte_solda: 'Sup. Corte e Solda',
      admin: 'Admin',
      admin_master: 'Admin Master'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[permissao] || 'bg-gray-100'}`}>
        {labels[permissao] || permissao}
      </span>
    );
  };

  const getPermissoesDisponiveis = () => {
    if (isAdminMaster()) return permissoes;
    if (isAdmin()) return permissoes.filter(p => p.value !== 'admin_master');
    return [];
  };

  // Filtrar usuários
  const usuariosFiltrados = usuarios.filter(usuario => {
    if (!filtroBusca) return true;
    const termo = filtroBusca.toLowerCase();
    return (
      usuario.nome?.toLowerCase().includes(termo) ||
      usuario.email?.toLowerCase().includes(termo) ||
      usuario.setor?.toLowerCase().includes(termo) ||
      usuario.permissao?.toLowerCase().includes(termo)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Acesso restrito a administradores</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <p className="text-gray-500">
            {isAdminMaster() 
              ? 'Você pode criar administradores e usuários' 
              : 'Você pode criar apenas usuários comuns'}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Novo Usuário
        </button>
      </div>

      {/* Campo de busca */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            placeholder="Buscar por nome, email, setor ou permissão..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>

      {/* Lista de Usuários */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {usuariosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {filtroBusca ? 'Nenhum usuário encontrado para esta busca' : 'Nenhum usuário cadastrado'}
            </div>
          ) : (
            usuariosFiltrados.map((usuario) => (
              <div key={usuario.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-lg font-medium text-primary-700">
                          {usuario.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{usuario.nome}</h3>
                        <p className="text-sm text-gray-500">{usuario.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      {getPermissaoBadge(usuario.permissao)}
                      <span className="text-sm text-gray-600 capitalize">
                        Setor: {usuario.setor.replace(/_/g, ' ')}
                      </span>
                      {usuario.criado_por_nome && (
                        <span className="text-sm text-gray-500">
                          Criado por: {usuario.criado_por_nome}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botão alterar senha - apenas admins podem alterar senha de outros */}
                  {isAdmin() && usuario.id !== currentUser?.id && (
                    <button
                      onClick={() => abrirModalSenha(usuario)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Alterar senha"
                    >
                      <Key size={18} />
                    </button>
                  )}

                  {/* Só pode excluir se for admin_master ou se criou o usuário */}
                  {(isAdminMaster() || usuario.criado_por === currentUser?.id) && usuario.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDelete(usuario.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover usuário"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Novo Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-2">
                <UserCog className="text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Novo Usuário</h2>
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuário/Email *</label>
                <input
                  type="text"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="vidaembalagens"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    required
                    value={formData.senha}
                    onChange={(e) => setFormData({...formData, senha: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Setor *</label>
                  <select
                    required
                    value={formData.setor}
                    onChange={(e) => setFormData({...formData, setor: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {setores.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permissão *</label>
                  <select
                    required
                    value={formData.permissao}
                    onChange={(e) => setFormData({...formData, permissao: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    {getPermissoesDisponiveis().map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.permissao === 'admin' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Administrador:</strong> Pode criar usuários, cadastrar clientes, produtos, 
                    máquinas e gerenciar estoque.
                  </p>
                </div>
              )}

              {formData.permissao === 'admin_master' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>Admin Master:</strong> Acesso total incluindo criação de administradores, 
                    configurações de backup e acesso remoto.
                  </p>
                </div>
              )}

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
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alterar Senha */}
      {showSenhaModal && usuarioSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Alterar Senha</h2>
              <button 
                onClick={() => setShowSenhaModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                Usuário: <strong>{usuarioSelecionado.nome}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-primary-500 outline-none"
                    autoFocus
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
                  A senha deve ter pelo menos 4 caracteres.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSenhaModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAlterarSenha}
                  disabled={!novaSenha || novaSenha.length < 4}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Salvar Nova Senha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
