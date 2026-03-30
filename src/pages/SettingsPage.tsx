import { useState } from 'react';
import { Settings, Package, AlertTriangle, Database, Bell, Shield } from 'lucide-react';
import Card, { CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export default function SettingsPage() {
  const { showToast } = useNotification();
  const [isResetStockModalOpen, setIsResetStockModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  async function handleResetAllStock() {
    setIsResetting(true);
    try {
      const { error } = await supabase
        .from('products')
        .update({ stock: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;

      showToast('Stock de todos los productos reseteado a 0', 'success');
      setIsResetStockModalOpen(false);
    } catch (error) {
      console.error('Error resetting stock:', error);
      showToast('Error al resetear el stock', 'error');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-gray-700" />
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Package size={24} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Gestión de Inventario
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Opciones para administrar el stock de productos
                </p>
                <div className="space-y-3">
                  <Button
                    onClick={() => setIsResetStockModalOpen(true)}
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                  >
                    <AlertTriangle size={18} />
                    Resetear Todo el Stock a 0
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Database size={24} className="text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Base de Datos
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Mantenimiento y respaldo de datos
                </p>
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled
                  >
                    Próximamente
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Bell size={24} className="text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Notificaciones
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configurar alertas y notificaciones del sistema
                </p>
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled
                  >
                    Próximamente
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield size={24} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Seguridad
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Administrar permisos y seguridad del sistema
                </p>
                <div className="space-y-3">
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled
                  >
                    Próximamente
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        isOpen={isResetStockModalOpen}
        onCancel={() => setIsResetStockModalOpen(false)}
        onConfirm={handleResetAllStock}
        title="Resetear Todo el Stock"
        message="Esta acción pondrá el stock de TODOS los productos en 0. Esta operación no se puede deshacer. ¿Estás seguro de continuar?"
        confirmText={isResetting ? 'Reseteando...' : 'Sí, Resetear Todo'}
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}