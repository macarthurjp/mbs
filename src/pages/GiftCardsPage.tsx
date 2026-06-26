import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Gift, Plus, Search, Copy, Download, Trash2, Image as ImageIcon } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { GiftCardPreview } from '../components/GiftCardPreview';

interface GiftCard {
  id: string;
  code: string;
  initial_amount: number;
  current_balance: number;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  issued_by: string;
  issued_at: string;
  gift_from: string | null;
  gift_to: string | null;
  client_id: string | null;
  client_name?: string;
  notes: string | null;
  created_at: string;
}

interface GiftCardTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  performed_by: string;
  notes: string | null;
  created_at: string;
}

interface GiftCardClient {
  id: string;
  name: string;
}

type GiftCardRpcResult = {
  success?: boolean;
  code?: string;
  message?: string;
};

export function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [filteredGiftCards, setFilteredGiftCards] = useState<GiftCard[]>([]);
  const [clients, setClients] = useState<GiftCardClient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(null);
  const [giftCardToDelete, setGiftCardToDelete] = useState<GiftCard | null>(null);
  const [transactions, setTransactions] = useState<GiftCardTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useNotification();
  const giftCardPreviewRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'efectivo',
    gift_from: '',
    gift_to: '',
    client_id: '',
    notes: ''
  });

  const loadGiftCards = useCallback(async () => {
    try {
      setLoading(true);
      const { data: cardsData, error: cardsError } = await supabase
        .from('gift_cards')
        .select(`
          *,
          clients (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (cardsError) throw cardsError;

      const cards = cardsData.map(card => ({
        ...card,
        client_name: card.clients?.name
      }));

      setGiftCards(cards);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast('Error al cargar gift cards: ' + message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients((data || []) as GiftCardClient[]);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  }, []);

  const filterGiftCards = useCallback(() => {
    let filtered = giftCards;

    if (searchTerm) {
      filtered = filtered.filter(gc =>
        gc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gc.client_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(gc => gc.status === statusFilter);
    }

    setFilteredGiftCards(filtered);
  }, [giftCards, searchTerm, statusFilter]);

  useEffect(() => {
    loadGiftCards();
    loadClients();
  }, [loadClients, loadGiftCards]);

  useEffect(() => {
    filterGiftCards();
  }, [filterGiftCards]);

  async function handleCreateGiftCard() {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showToast('Ingrese un monto válido', 'error');
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('create_gift_card', {
        p_amount: parseFloat(formData.amount),
        p_payment_method: formData.payment_method,
        p_gift_from: formData.gift_from || null,
        p_gift_to: formData.gift_to || null,
        p_client_id: formData.client_id || null,
        p_notes: formData.notes || null
      });

      if (error) throw error;

      const result = data as GiftCardRpcResult;

      if (result.success) {
        showToast(`Gift card ${result.code} creada exitosamente. Ingreso registrado en caja.`, 'success');
        setShowCreateModal(false);
        setFormData({
          amount: '',
          payment_method: 'efectivo',
          gift_from: '',
          gift_to: '',
          client_id: '',
          notes: ''
        });
        loadGiftCards();
      } else {
        throw new Error('Error al crear gift card');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast('Error al crear gift card: ' + message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadGiftCardDetails(giftCard: GiftCard) {
    try {
      setSelectedGiftCard(giftCard);
      setShowDetailsModal(true);

      const { data, error } = await supabase
        .from('gift_card_transactions')
        .select('*')
        .eq('gift_card_id', giftCard.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast('Error al cargar detalles: ' + message, 'error');
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    showToast('Código copiado al portapapeles', 'success');
  }

  async function downloadGiftCardImage(giftCard: GiftCard) {
    try {
      showToast('Generando imagen...', 'success');

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showToast('Error al crear el canvas', 'error');
        return;
      }
      const canvasContext = ctx;

      // Canvas size for high quality
      const width = 800;
      const height = 1100;
      canvas.width = width;
      canvas.height = height;

      // Background gradient (dark gray to black)
      const bgGradient = canvasContext.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#111827');
      bgGradient.addColorStop(0.5, '#1f2937');
      bgGradient.addColorStop(1, '#000000');
      canvasContext.fillStyle = bgGradient;
      canvasContext.fillRect(0, 0, width, height);

      // Rounded rectangle helper
      function roundRect(x: number, y: number, w: number, h: number, r: number) {
        canvasContext.beginPath();
        canvasContext.moveTo(x + r, y);
        canvasContext.lineTo(x + w - r, y);
        canvasContext.quadraticCurveTo(x + w, y, x + w, y + r);
        canvasContext.lineTo(x + w, y + h - r);
        canvasContext.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        canvasContext.lineTo(x + r, y + h);
        canvasContext.quadraticCurveTo(x, y + h, x, y + h - r);
        canvasContext.lineTo(x, y + r);
        canvasContext.quadraticCurveTo(x, y, x + r, y);
        canvasContext.closePath();
      }

      // Main title "GIFT CARD"
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 64px serif';
      ctx.textAlign = 'center';
      ctx.fillText('GIFT CARD', width / 2, 120);

      // Subtitle
      ctx.fillStyle = '#B8A080';
      ctx.font = '20px sans-serif';
      ctx.fillText('Un pequeño detalle para una persona muy especial', width / 2, 170);

      // White boxes for DE, PARA, VALE POR
      const boxWidth = 650;
      const boxHeight = 90;
      const startX = (width - boxWidth) / 2;
      let currentY = 240;

      // Box DE
      roundRect(startX, currentY, boxWidth, boxHeight, 15);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('DE:', startX + 30, currentY + 40);
      ctx.font = 'bold 36px serif';
      ctx.fillText(giftCard.gift_from || '___________', startX + 90, currentY + 50);

      currentY += 120;

      // Box PARA
      roundRect(startX, currentY, boxWidth, boxHeight, 15);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('PARA:', startX + 30, currentY + 40);
      ctx.font = 'bold 36px serif';
      ctx.fillText(giftCard.gift_to || '___________', startX + 130, currentY + 50);

      currentY += 120;

      // Box VALE POR
      roundRect(startX, currentY, boxWidth, boxHeight, 15);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('VALE POR:', startX + 30, currentY + 40);
      ctx.font = 'bold 48px serif';
      ctx.fillText(`$${giftCard.current_balance.toLocaleString('es-AR')}`, startX + 200, currentY + 55);

      // Store name "KIERO"
      currentY += 180;
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 56px serif';
      ctx.textAlign = 'center';
      ctx.fillText('KIERO', width / 2, currentY);

      // Store subtitle
      currentY += 40;
      ctx.fillStyle = '#B8A080';
      ctx.font = '18px sans-serif';
      ctx.fillText('QUE ME MIRES', width / 2, currentY);

      // Social media
      currentY += 50;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px sans-serif';
      ctx.fillText('f Kiero que me mires    📷 Kieroquememires', width / 2, currentY);

      // Website
      currentY += 30;
      ctx.fillStyle = '#6b7280';
      ctx.font = '16px sans-serif';
      ctx.fillText('www.kieroquememires.com.ar', width / 2, currentY);

      // Separator line
      currentY += 50;
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, currentY);
      ctx.lineTo(width - 100, currentY);
      ctx.stroke();

      // Code at bottom
      currentY += 40;
      ctx.fillStyle = '#6b7280';
      ctx.font = '16px sans-serif';
      ctx.fillText('Código: ', width / 2 - 80, currentY);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(giftCard.code, width / 2 + 20, currentY);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          showToast('Error al crear la imagen', 'error');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `gift-card-${giftCard.code}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        showToast('Imagen descargada. Ahora puedes compartirla por WhatsApp', 'success');
      }, 'image/png');
    } catch (error) {
      console.error('Error generating image:', error);
      showToast('Error al generar la imagen', 'error');
    }
  }

  async function handleDeleteGiftCard() {
    if (!giftCardToDelete) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_gift_card', {
        p_gift_card_id: giftCardToDelete.id
      });

      if (error) throw error;

      const result = data as GiftCardRpcResult;

      if (result.success) {
        showToast('Gift card eliminada correctamente', 'success');
        setShowDeleteModal(false);
        setGiftCardToDelete(null);
        loadGiftCards();
      } else {
        showToast(result.message || 'Error al eliminar gift card', 'error');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      showToast('Error al eliminar gift card: ' + message, 'error');
    } finally {
      setLoading(false);
    }
  }

  function confirmDelete(giftCard: GiftCard) {
    setGiftCardToDelete(giftCard);
    setShowDeleteModal(true);
  }

  function getStatusBadge(status: string) {
    const styles = {
      active: 'bg-green-100 text-green-800',
      used: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-yellow-100 text-yellow-800'
    };

    const labels = {
      active: 'Activa',
      used: 'Utilizada',
      expired: 'Vencida',
      cancelled: 'Cancelada'
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Gift className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Gift Cards</h1>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Gift Card
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Total Activas</div>
            <div className="text-2xl font-bold text-green-600">
              {giftCards.filter(gc => gc.status === 'active').length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Saldo Total</div>
            <div className="text-2xl font-bold text-blue-600">
              ${giftCards
                .filter(gc => gc.status === 'active')
                .reduce((sum, gc) => sum + gc.current_balance, 0)
                .toFixed(2)}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Utilizadas</div>
            <div className="text-2xl font-bold text-gray-600">
              {giftCards.filter(gc => gc.status === 'used').length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600 mb-1">Vencidas</div>
            <div className="text-2xl font-bold text-red-600">
              {giftCards.filter(gc => gc.status === 'expired').length}
            </div>
        </Card>
      </div>

      <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar por código o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activas</option>
              <option value="used">Utilizadas</option>
              <option value="expired">Vencidas</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : filteredGiftCards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron gift cards
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Código</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">De</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Para</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Monto Inicial</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Saldo Actual</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Estado</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGiftCards.map((giftCard) => (
                    <tr key={giftCard.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">{giftCard.code}</span>
                          <button
                            onClick={() => copyToClipboard(giftCard.code)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Copiar código"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">{giftCard.gift_from || '-'}</td>
                      <td className="py-3 px-4">{giftCard.gift_to || '-'}</td>
                      <td className="py-3 px-4 text-right font-semibold">
                        ${giftCard.initial_amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-blue-600">
                        ${giftCard.current_balance.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(giftCard.status)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => loadGiftCardDetails(giftCard)}
                            className="text-xs"
                          >
                            Ver Detalles
                          </Button>
                          {giftCard.status === 'active' && (
                            <>
                              <Button
                                variant="primary"
                                onClick={() => {
                                  setSelectedGiftCard(giftCard);
                                  setTimeout(() => downloadGiftCardImage(giftCard), 100);
                                }}
                                className="text-xs"
                              >
                                <ImageIcon className="w-3 h-3 mr-1" />
                                Descargar
                              </Button>
                              <button
                                onClick={() => confirmDelete(giftCard)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar gift card"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Nueva Gift Card"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto *
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Método de Pago *
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta_debito">Tarjeta de Débito</option>
              <option value="tarjeta_credito">Tarjeta de Crédito</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              El ingreso se registrará en caja con este método de pago
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              DE: (¿Quién regala?)
            </label>
            <Input
              type="text"
              placeholder="Ej: Feli, Mamá, Tu amiga Ana..."
              value={formData.gift_from}
              onChange={(e) => setFormData({ ...formData, gift_from: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PARA: (¿Quién recibe?)
            </label>
            <Input
              type="text"
              placeholder="Ej: Yesi, María, Mi amor..."
              value={formData.gift_to}
              onChange={(e) => setFormData({ ...formData, gift_to: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente asociado (opcional)
            </label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Sin cliente asociado</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Notas adicionales..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGiftCard} disabled={loading}>
              {loading ? 'Creando...' : 'Crear Gift Card'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Detalles de Gift Card"
      >
        {selectedGiftCard && (
          <div className="space-y-6">
            <div ref={giftCardPreviewRef}>
              <GiftCardPreview
                code={selectedGiftCard.code}
                amount={selectedGiftCard.current_balance}
                gift_from={selectedGiftCard.gift_from}
                gift_to={selectedGiftCard.gift_to}
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Estado:</span>
                {getStatusBadge(selectedGiftCard.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monto inicial:</span>
                <span className="font-semibold">${selectedGiftCard.initial_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">DE:</span>
                <span className="ml-2 font-semibold">{selectedGiftCard.gift_from || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">PARA:</span>
                <span className="ml-2 font-semibold">{selectedGiftCard.gift_to || '-'}</span>
              </div>
              <div>
                <span className="text-gray-600">Fecha de emisión:</span>
                <span className="ml-2 font-semibold">
                  {new Date(selectedGiftCard.issued_at).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Cliente asociado:</span>
                <span className="ml-2 font-semibold">{selectedGiftCard.client_name || 'Sin asignar'}</span>
              </div>
            </div>

            {selectedGiftCard.notes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Notas</div>
                <div className="text-sm">{selectedGiftCard.notes}</div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Historial de Transacciones</h3>
              {transactions.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No hay transacciones registradas
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {transaction.transaction_type === 'issue' && '🎁 Emisión'}
                          {transaction.transaction_type === 'use' && '💳 Uso'}
                          {transaction.transaction_type === 'refund' && '↩️ Reembolso'}
                          {transaction.transaction_type === 'cancel' && '❌ Cancelación'}
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(transaction.created_at).toLocaleString()}
                        </div>
                        {transaction.notes && (
                          <div className="text-xs text-gray-500 mt-1">{transaction.notes}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${
                          transaction.transaction_type === 'use' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.transaction_type === 'use' ? '-' : '+'}
                          ${transaction.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-600">
                          Saldo: ${transaction.balance_after.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => copyToClipboard(selectedGiftCard.code)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Código
              </Button>
              {selectedGiftCard.status === 'active' && (
                <Button
                  variant="primary"
                  onClick={() => downloadGiftCardImage(selectedGiftCard)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Imagen
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setGiftCardToDelete(null);
        }}
        title="Eliminar Gift Card"
      >
        {giftCardToDelete && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ¿Estás seguro que deseas eliminar esta gift card?
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Código:</span>
                <span className="font-mono font-semibold">{giftCardToDelete.code}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monto:</span>
                <span className="font-semibold">${giftCardToDelete.initial_amount.toFixed(2)}</span>
              </div>
              {giftCardToDelete.gift_from && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">DE:</span>
                  <span className="font-semibold">{giftCardToDelete.gift_from}</span>
                </div>
              )}
              {giftCardToDelete.gift_to && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">PARA:</span>
                  <span className="font-semibold">{giftCardToDelete.gift_to}</span>
                </div>
              )}
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-semibold">
                Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setGiftCardToDelete(null);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleDeleteGiftCard}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Eliminando...' : 'Eliminar Gift Card'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default GiftCardsPage;
