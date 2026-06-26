import React, { useState } from 'react';
import { Database, Download, Upload, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getUserRoleFlags } from '../utils/roles';

export function DatabasePage() {
  const { userProfile } = useAuth();
  const { isOwner } = getUserRoleFlags(userProfile);
  const [isBlankModalOpen, setIsBlankModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleBackup() {
    try {
      setLoading(true);
      setMessage(null);

      const tables = ['products', 'clients', 'account_movements', 'transactions', 'transaction_items', 'orders'];
      const backup: Record<string, Record<string, unknown>[]> = {};

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*');

        if (error) throw error;
        backup[table] = data || [];
      }

      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Backup descargado correctamente' });
    } catch (error) {
      console.error('Error en backup:', error);
      setMessage({ type: 'error', text: 'Error al realizar el backup' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setMessage(null);

      const text = await file.text();
      const backup = JSON.parse(text) as Record<string, unknown>;

      for (const [table, records] of Object.entries(backup)) {
        if (Array.isArray(records) && records.length > 0) {
          const { error } = await supabase.from(table).upsert(records as Record<string, unknown>[]);

          if (error) {
            console.error(`Error restaurando ${table}:`, error);
          }
        }
      }

      setMessage({ type: 'success', text: 'Base de datos restaurada correctamente' });
    } catch (error) {
      console.error('Error en restore:', error);
      setMessage({ type: 'error', text: 'Error al restaurar la base de datos' });
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  }

  async function handleBlankDatabase() {
    try {
      setLoading(true);
      setMessage(null);

      const tables = ['transaction_items', 'account_movements', 'transactions', 'orders', 'clients', 'products'];

      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
          console.error(`Error blanqueando ${table}:`, error);
        }
      }

      setMessage({ type: 'success', text: 'Base de datos blanqueada correctamente' });
      setIsBlankModalOpen(false);
    } catch (error) {
      console.error('Error blanqueando base de datos:', error);
      setMessage({ type: 'error', text: 'Error al blanquear la base de datos' });
    } finally {
      setLoading(false);
    }
  }

  if (!isOwner) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="py-10 text-center">
            <Database className="mx-auto mb-4 text-gray-400" size={48} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Acceso restringido
            </h2>
            <p className="text-gray-600">
              Solo el propietario del negocio puede acceder al módulo de base de datos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-10">
        <h1 className="text-5xl font-serif font-bold bg-gradient-to-r from-pink-600 via-pink-500 to-pink-400 bg-clip-text text-transparent mb-3">
          Base de Datos
        </h1>
        <p className="text-gray-600 uppercase tracking-widest text-sm font-medium">Gestión y mantenimiento</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <Download size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Backup</h2>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Descarga una copia de seguridad de todos los datos de la base de datos en formato JSON.
            </p>
            <Button
              onClick={handleBackup}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {loading ? 'Procesando...' : 'Descargar Backup'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                <Upload size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Restore</h2>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Restaura los datos desde un archivo de backup previamente descargado.
            </p>
            <label className="w-full cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={handleRestore}
                disabled={loading}
                className="hidden"
              />
              <div className={`font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl px-5 py-2.5 text-base w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}>
                {loading ? 'Procesando...' : 'Cargar Backup'}
              </div>
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-lg">
                <Trash2 size={24} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Blanquear</h2>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Elimina todos los datos de la base de datos. Esta acción no se puede deshacer.
            </p>
            <Button
              onClick={() => setIsBlankModalOpen(true)}
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
            >
              Blanquear Base de Datos
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-l-4 border-yellow-500">
        <CardContent className="flex items-start gap-4 py-6">
          <AlertTriangle className="text-yellow-500 flex-shrink-0" size={24} />
          <div>
            <h3 className="font-bold text-gray-900 mb-2">Precauciones Importantes</h3>
            <ul className="text-gray-600 space-y-1 text-sm">
              <li>• Realiza backups regularmente para proteger tus datos</li>
              <li>• Guarda los archivos de backup en un lugar seguro</li>
              <li>• Verifica que el archivo de backup sea correcto antes de restaurar</li>
              <li>• La operación de blanquear es irreversible - usa con extrema precaución</li>
              <li>• Se recomienda hacer un backup antes de blanquear la base de datos</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={isBlankModalOpen}
        onClose={() => setIsBlankModalOpen(false)}
        title="Confirmar Blanqueo de Base de Datos"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={20} />
            <div className="text-sm text-red-800">
              <p className="font-bold mb-2">¡ADVERTENCIA!</p>
              <p>Esta acción eliminará permanentemente todos los datos de la base de datos:</p>
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>Todos los productos</li>
                <li>Todos los clientes</li>
                <li>Todos los pedidos</li>
                <li>Todas las transacciones y sus items</li>
                <li>Todos los movimientos de cuenta corriente</li>
              </ul>
              <p className="mt-2 font-bold">Esta operación NO se puede deshacer.</p>
            </div>
          </div>

          <p className="text-gray-700">
            ¿Estás completamente seguro de que deseas continuar?
          </p>

          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => setIsBlankModalOpen(false)}
              variant="secondary"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBlankDatabase}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
              disabled={loading}
            >
              {loading ? 'Blanqueando...' : 'Sí, Blanquear Todo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
