import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

export function ClientsPage() {
  const { user } = useAuth();
  const { showToast, showConfirm } = useNotification();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    const filtered = clients.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  async function loadClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      showToast('No hay usuario autenticado', 'error');
      return;
    }

    try {
      const clientData = { ...formData, user_id: user.id };

      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update(clientData)
          .eq('id', editingClient.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([clientData]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingClient(null);
      resetForm();
      loadClients();
      showToast(editingClient ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente', 'success');
    } catch (error) {
      console.error('Error saving client:', error);
      showToast('Error al guardar el cliente', 'error');
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await showConfirm({
      title: 'Eliminar Cliente',
      message: '¿Estás segura de que deseas eliminar este cliente? Esta acción no se puede deshacer.',
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Cliente eliminado correctamente', 'success');
      loadClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      showToast('Error al eliminar el cliente', 'error');
    }
  }

  function openEditModal(client: Client) {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setIsModalOpen(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: ''
    });
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-pink-700 mb-2">Clientes</h1>
          <p className="text-gray-600">Administra tu base de datos de clientes</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingClient(null); setIsModalOpen(true); }}>
          <Plus size={20} />
          Nuevo Cliente
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Cliente</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Teléfono</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ubicación</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-900 font-medium">{client.name}</td>
                <td className="px-6 py-4 text-gray-600">{client.email || '-'}</td>
                <td className="px-6 py-4 text-gray-600">{client.phone || '-'}</td>
                <td className="px-6 py-4 text-gray-600">{client.address || '-'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(client)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(client.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredClients.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron clientes
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingClient(null); resetForm(); }}
        title={editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre Completo / Razón Social"
            placeholder="Ej. María García"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="ejemplo@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            <Input
              label="Teléfono"
              type="tel"
              placeholder="11-1234-5678"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <Input
            label="Dirección"
            placeholder="Calle 123, Ciudad"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notas (Opcional)
            </label>
            <textarea
              placeholder="Preferencias, etc."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsModalOpen(false); setEditingClient(null); resetForm(); }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Crear Cliente
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
