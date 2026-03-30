import React, { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Shield, ShoppingBag, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { formatArgentinaDate } from '../utils/dateHelpers';

export function UsersPage() {
  const { showToast, showConfirm } = useNotification();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'seller' as 'admin' | 'seller',
    is_active: true
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      showToast('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormData({
      username: '',
      full_name: '',
      password: '',
      role: 'seller',
      is_active: true
    });
    setIsModalOpen(true);
  }

  function openEditModal(user: UserProfile) {
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      password: '',
      role: user.role,
      is_active: user.is_active
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (editingUser) {
        await updateUser(editingUser.id);
      } else {
        await createUser();
      }
    } catch (error: any) {
      console.error('Error:', error);
      showToast(error.message || 'Error al guardar usuario', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function createUser() {
    const { data, error } = await supabase.rpc('create_user_account', {
      p_username: formData.username,
      p_full_name: formData.full_name,
      p_password: formData.password,
      p_role: formData.role,
      p_is_active: formData.is_active
    });

    if (error) throw error;

    showToast('Usuario creado exitosamente', 'success');
    setIsModalOpen(false);
    loadUsers();
  }

  async function updateUser(userId: string) {
    const { error: nameError } = await supabase
      .from('user_profiles')
      .update({ full_name: formData.full_name })
      .eq('id', userId);

    if (nameError) throw nameError;

    if (formData.role !== editingUser?.role) {
      const { error: roleError } = await supabase.rpc('update_user_role', {
        p_user_id: userId,
        p_role: formData.role
      });

      if (roleError) throw roleError;
    }

    if (formData.is_active !== editingUser?.is_active) {
      const { error: statusError } = await supabase.rpc('update_user_status', {
        p_user_id: userId,
        p_is_active: formData.is_active
      });

      if (statusError) throw statusError;
    }

    if (formData.password) {
      const { error: passwordError } = await supabase.rpc('update_user_password', {
        p_user_id: userId,
        p_new_password: formData.password
      });

      if (passwordError) throw passwordError;
    }

    showToast('Usuario actualizado exitosamente', 'success');
    setIsModalOpen(false);
    loadUsers();
  }

  async function handleDelete(userId: string, username: string) {
    const confirmed = await showConfirm({
      title: 'Eliminar Usuario',
      message: `¿Estás seguro de que deseas eliminar al usuario "${username}"? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      showToast('Usuario eliminado exitosamente', 'success');
      loadUsers();
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      showToast('Error al eliminar usuario', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-5xl font-serif font-bold bg-gradient-to-r from-pink-600 via-pink-500 to-pink-400 bg-clip-text text-transparent mb-3">
            Usuarios
          </h1>
          <p className="text-gray-600 uppercase tracking-widest text-sm font-medium">Gestión de usuarios del sistema</p>
        </div>
        <Button onClick={openCreateModal}>
          <UserPlus size={20} />
          Nuevo Usuario
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <Card>
        <CardContent>
          {loading && users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Cargando usuarios...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Usuario</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Nombre Completo</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Rol</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Estado</th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">Creado</th>
                    <th className="text-right py-4 px-4 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-900">{user.username}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-gray-700">{user.full_name}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {user.role === 'admin' ? (
                            <>
                              <Shield size={16} className="text-pink-600" />
                              <span className="px-2.5 py-1 bg-pink-100 text-pink-700 rounded-lg text-sm font-medium">
                                Administrador
                              </span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag size={16} className="text-blue-600" />
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                                Vendedor
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {user.is_active ? (
                          <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                            Activo
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">
                        {formatArgentinaDate(user.created_at)}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.username)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Usuario"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            disabled={!!editingUser}
            placeholder="usuario123"
          />

          <Input
            label="Nombre Completo"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
            placeholder="Juan Pérez"
          />

          <div className="relative">
            <Input
              label={editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <Select
            label="Rol"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'seller' })}
            required
          >
            <option value="seller">Vendedor</option>
            <option value="admin">Administrador</option>
          </Select>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-pink-600 border-gray-300 rounded focus:ring-pink-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
              Usuario activo
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              onClick={() => setIsModalOpen(false)}
              variant="secondary"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
