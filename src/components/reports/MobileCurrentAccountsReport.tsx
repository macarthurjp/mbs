import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Smartphone } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { supabase } from '../../lib/supabase';
import { generateMobileClientAccountPDF } from '../../utils/pdfGenerators';
import { formatArgentinaDate } from '../../utils/dateHelpers';

interface AccountData {
  client_id: string;
  client_name: string;
  total_debt: number;
  oldest_debt_date: string;
  days_overdue: number;
  total_payments: number;
  last_payment_date: string | null;
  payment_behavior: string;
}

interface ClientMovement {
  id: string;
  date: string;
  type: string;
  amount: number;
  description: string;
  balance: number;
}

interface Props {
  onClose: () => void;
}

export default function MobileCurrentAccountsReport({ onClose }: Props) {
  const [accountsData, setAccountsData] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientMovements, setClientMovements] = useState<ClientMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [selectedClient, setSelectedClient] = useState<AccountData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadClientData(selectedClientId);
    }
  }, [selectedClientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_current_accounts_status');

      if (error) throw error;
      setAccountsData(data || []);
    } catch (error) {
      console.error('Error loading accounts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientData = async (clientId: string) => {
    setLoadingMovements(true);
    const clientData = accountsData.find((a) => a.client_id === clientId);
    setSelectedClient(clientData || null);

    try {
      const { data, error } = await supabase
        .from('account_movements')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      let balance = 0;
      const movements = (data || []).map((m) => {
        if (m.type === 'charge') {
          balance += m.amount;
        } else if (m.type === 'payment') {
          balance += m.amount;
        }

        return {
          id: m.id,
          date: m.created_at,
          type: m.type === 'charge' ? 'Cargo' : 'Pago',
          amount: Math.abs(m.amount),
          description: m.description || '',
          balance: balance,
        };
      });

      setClientMovements(movements);
    } catch (error) {
      console.error('Error loading client movements:', error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedClient) return;

    await generateMobileClientAccountPDF({
      client: selectedClient,
      movements: clientMovements,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onClose} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Smartphone className="w-8 h-8 text-blue-600" />
              Cuenta Corriente para Móviles
            </h1>
            <p className="text-gray-600 mt-1">Reporte simplificado optimizado para WhatsApp</p>
          </div>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <Smartphone className="w-12 h-12 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Reporte Optimizado para Móviles</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>Diseño compacto y fácil de leer en celulares</li>
                <li>Perfecto para enviar por WhatsApp</li>
                <li>Incluye solo la información esencial</li>
                <li>Tamaño de archivo reducido</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Seleccionar Cliente</h2>
          <p className="text-gray-600 mb-6">
            Selecciona un cliente para generar su reporte de cuenta corriente optimizado para móviles
          </p>

          <div className="flex flex-col gap-4">
            <Select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">Seleccionar cliente...</option>
              {loading ? (
                <option disabled>Cargando clientes...</option>
              ) : (
                accountsData.map((account) => (
                  <option key={account.client_id} value={account.client_id}>
                    {account.client_name} - ${Number(account.total_debt).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </option>
                ))
              )}
            </Select>

            {selectedClient && !loadingMovements && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Cliente</p>
                    <p className="text-lg font-bold text-gray-900">{selectedClient.client_name}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-red-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Deuda Total</p>
                    <p className="text-2xl font-bold text-red-700">
                      ${Number(selectedClient.total_debt).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Días Vencido</p>
                    <p className="text-2xl font-bold text-orange-700">{selectedClient.days_overdue}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    Movimientos ({clientMovements.length})
                  </h4>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      {clientMovements.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          No hay movimientos registrados
                        </div>
                      ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Monto</th>
                              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Saldo</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {clientMovements.map((movement) => (
                              <tr key={movement.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-sm text-gray-900">
                                  {formatArgentinaDate(movement.date)}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`text-xs font-medium ${
                                    movement.type === 'Cargo' ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {movement.type}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-right font-semibold">
                                  <span className={movement.type === 'Cargo' ? 'text-red-600' : 'text-green-600'}>
                                    ${movement.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-sm text-right font-bold text-gray-900">
                                  ${movement.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleExportPDF}
                  variant="primary"
                  className="w-full"
                  disabled={clientMovements.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF para WhatsApp
                </Button>
              </div>
            )}

            {loadingMovements && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 mt-3">Cargando datos del cliente...</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
