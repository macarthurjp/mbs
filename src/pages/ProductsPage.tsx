import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Barcode, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import BarcodeGenerator from 'react-barcode';

export function ProductsPage() {
  const { user } = useAuth();
  const { showToast, showConfirm } = useNotification();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showMassUpdateModal, setShowMassUpdateModal] = useState(false);
  const [massUpdateData, setMassUpdateData] = useState({
    adjustmentType: 'percentage',
    adjustmentValue: '',
    operation: 'increase'
  });

  const [formData, setFormData] = useState({
    name: '',
    category: 'Pantalones',
    size: 'S',
    price: '',
    cost: '',
    stock: '',
    min_stock: '5',
    description: '',
    barcode: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setFilteredProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }

  function generateBarcode(): string {
    // Generar código EAN-13 (estándar internacional)
    // Formato: 779 (prefijo) + 10 dígitos aleatorios
    const prefix = '779';
    let code = prefix;

    // Generar 9 dígitos aleatorios
    for (let i = 0; i < 9; i++) {
      code += Math.floor(Math.random() * 10);
    }

    // Calcular dígito verificador EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    code += checkDigit;

    return code;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      showToast('No hay usuario autenticado', 'error');
      return;
    }

    try {
      // Si no hay código de barras, generar uno automáticamente
      let barcodeValue = formData.barcode;
      if (!barcodeValue && !editingProduct) {
        barcodeValue = generateBarcode();
      }

      const productData = {
        name: formData.name,
        category: formData.category,
        size: formData.size,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost || '0'),
        stock: parseInt(formData.stock),
        min_stock: parseInt(formData.min_stock),
        description: formData.description,
        barcode: barcodeValue || null,
        user_id: user.id
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      resetForm();
      loadProducts();
      showToast(
        editingProduct
          ? 'Producto actualizado correctamente'
          : `Producto creado correctamente${!formData.barcode ? ' con código de barras generado automáticamente' : ''}`,
        'success'
      );
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Error al guardar el producto', 'error');
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await showConfirm({
      title: 'Eliminar Producto',
      message: '¿Estás segura de que deseas eliminar este producto? Esta acción no se puede deshacer.',
      confirmText: 'Sí, Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Producto eliminado correctamente', 'success');
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast('Error al eliminar el producto', 'error');
    }
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      size: product.size,
      price: product.price.toString(),
      cost: product.cost.toString(),
      stock: product.stock.toString(),
      min_stock: product.min_stock.toString(),
      description: product.description || '',
      barcode: product.barcode || ''
    });
    setIsModalOpen(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      category: 'Pantalones',
      size: 'S',
      price: '',
      cost: '',
      stock: '',
      min_stock: '5',
      description: '',
      barcode: ''
    });
  }

  async function handleMassUpdate() {
    const { adjustmentType, adjustmentValue, operation } = massUpdateData;

    if (!adjustmentValue || parseFloat(adjustmentValue) <= 0) {
      showToast('Ingresa un valor válido', 'error');
      return;
    }

    const confirmed = await showConfirm(
      `¿Confirmas ${operation === 'increase' ? 'aumentar' : 'disminuir'} los precios en ${adjustmentValue}${adjustmentType === 'percentage' ? '%' : ' pesos'}?`,
      'Esta acción modificará todos los productos'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const value = parseFloat(adjustmentValue);

      // Actualizar cada producto
      const updates = products.map(async (product) => {
        let newPrice = product.price;

        if (adjustmentType === 'percentage') {
          // Ajuste por porcentaje
          const adjustment = (product.price * value) / 100;
          newPrice = operation === 'increase'
            ? product.price + adjustment
            : product.price - adjustment;
        } else {
          // Ajuste por valor fijo
          newPrice = operation === 'increase'
            ? product.price + value
            : product.price - value;
        }

        // Asegurar que el precio no sea negativo
        newPrice = Math.max(0, newPrice);

        const { error } = await supabase
          .from('products')
          .update({ price: newPrice })
          .eq('id', product.id);

        if (error) throw error;
      });

      await Promise.all(updates);

      showToast('Precios actualizados exitosamente', 'success');
      setShowMassUpdateModal(false);
      setMassUpdateData({ adjustmentType: 'percentage', adjustmentValue: '', operation: 'increase' });
      await loadProducts();
    } catch (error) {
      console.error('Error updating prices:', error);
      showToast('Error al actualizar precios', 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-serif font-bold text-pink-700 mb-2">Productos</h1>
          <p className="text-gray-600 uppercase tracking-wide">Gestiona el inventario de tu boutique</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowMassUpdateModal(true)}
            className="flex items-center gap-2"
          >
            <TrendingUp size={20} />
            Modificación Masiva
          </Button>
          <Button onClick={() => { resetForm(); setEditingProduct(null); setIsModalOpen(true); }}>
            <Plus size={20} />
            Nuevo Producto
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="text"
            placeholder="Buscar por nombre o categoría..."
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
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Nombre</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Categoría</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Talle</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Precio</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Código</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Stock</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-900 font-medium">{product.name}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm">
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                    {product.size}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-900 font-semibold">${product.price}</td>
                <td className="px-6 py-4">
                  {product.barcode ? (
                    <button
                      onClick={() => { setSelectedProduct(product); setShowBarcodeModal(true); }}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-mono"
                    >
                      <Barcode size={16} />
                      {product.barcode}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">Sin código</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`font-semibold ${
                    product.stock <= product.min_stock ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {product.stock} {product.stock === 1 ? 'unidad' : 'unidades'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
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

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No se encontraron productos
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProduct(null); resetForm(); }}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Producto"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoría"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'Pantalones', label: 'Pantalones' },
                { value: 'Remeras', label: 'Remeras' },
                { value: 'Vestidos', label: 'Vestidos' },
                { value: 'Buzos', label: 'Buzos' },
                { value: 'Camperas', label: 'Camperas' },
                { value: 'Bikinis', label: 'Bikinis' },
                { value: 'Sweaters', label: 'Sweaters' },
                { value: 'Accesorios', label: 'Accesorios' },
                { value: 'Calzado', label: 'Calzado' }
              ]}
            />

            <Select
              label="Talle"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              options={[
                { value: 'XS', label: 'XS' },
                { value: 'S', label: 'S' },
                { value: 'M', label: 'M' },
                { value: 'L', label: 'L' },
                { value: 'XL', label: 'XL' },
                { value: 'XXL', label: 'XXL' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio de Venta"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />

            <Input
              label="Costo de Compra"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Stock Actual"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              required
            />

            <Input
              label="Stock Mínimo"
              type="number"
              value={formData.min_stock}
              onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
              required
            />
          </div>

          <div>
            <Input
              label="Código de Barras"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Se generará automáticamente si lo dejas vacío"
            />
            {!editingProduct && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <Barcode size={14} />
                Si no ingresas un código, se generará automáticamente un código EAN-13 único
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción (Opcional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsModalOpen(false); setEditingProduct(null); resetForm(); }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {editingProduct ? 'Actualizar' : 'Crear'} Producto
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showBarcodeModal}
        onClose={() => { setShowBarcodeModal(false); setSelectedProduct(null); }}
        title="Etiqueta con Código de Barras"
      >
        {selectedProduct && selectedProduct.barcode && (
          <div className="space-y-6">
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-700 mb-2 font-medium">Vista previa de la etiqueta:</p>
              <div className="flex justify-center">
                <div
                  id="label-print-area"
                  className="bg-white"
                  style={{
                    width: '58mm',
                    padding: '2mm 1mm',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1mm',
                    border: '1px dashed #ccc'
                  }}
                >
                  <div style={{
                    fontSize: '10pt',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    lineHeight: '1.1',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    padding: '0 2mm'
                  }}>
                    {selectedProduct.name}
                  </div>

                  <div style={{
                    fontSize: '8pt',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    {selectedProduct.category} - Talle {selectedProduct.size}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    margin: '1mm 0'
                  }}>
                    <BarcodeGenerator
                      value={selectedProduct.barcode}
                      width={1.5}
                      height={35}
                      displayValue={true}
                      fontSize={10}
                      margin={0}
                    />
                  </div>

                  <div style={{
                    fontSize: '16pt',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    color: '#e91e63'
                  }}>
                    ${selectedProduct.price}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Formato:</strong> 58mm de ancho (compatible con impresoras térmicas continuas)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  document.body.classList.add('printing-single-label');
                  window.print();
                  setTimeout(() => {
                    document.body.classList.remove('printing-single-label');
                  }, 100);
                }}
                className="flex-1"
              >
                Imprimir Etiqueta
              </Button>
              <Button
                onClick={() => { setShowBarcodeModal(false); setSelectedProduct(null); }}
                className="flex-1"
              >
                Cerrar
              </Button>
            </div>

            <div className="text-sm text-gray-500 text-center">
              Configura tu impresora en modo continuo de 58mm de ancho
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showMassUpdateModal}
        onClose={() => {
          setShowMassUpdateModal(false);
          setMassUpdateData({ adjustmentType: 'percentage', adjustmentValue: '', operation: 'increase' });
        }}
        title="Modificación Masiva de Precios"
      >
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Esta acción modificará los precios de todos los productos ({products.length} productos).
              Los cambios son permanentes.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de operación
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMassUpdateData({ ...massUpdateData, operation: 'increase' })}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  massUpdateData.operation === 'increase'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <TrendingUp size={20} />
                <span className="font-medium">Aumentar</span>
              </button>
              <button
                onClick={() => setMassUpdateData({ ...massUpdateData, operation: 'decrease' })}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                  massUpdateData.operation === 'decrease'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <TrendingDown size={20} />
                <span className="font-medium">Disminuir</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de ajuste
            </label>
            <select
              value={massUpdateData.adjustmentType}
              onChange={(e) => setMassUpdateData({ ...massUpdateData, adjustmentType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="percentage">Porcentaje (%)</option>
              <option value="fixed">Monto Fijo ($)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {massUpdateData.adjustmentType === 'percentage' ? 'Porcentaje' : 'Monto'}
            </label>
            <Input
              type="number"
              placeholder={massUpdateData.adjustmentType === 'percentage' ? 'Ej: 10 para 10%' : 'Ej: 100 para $100'}
              value={massUpdateData.adjustmentValue}
              onChange={(e) => setMassUpdateData({ ...massUpdateData, adjustmentValue: e.target.value })}
              min="0"
              step={massUpdateData.adjustmentType === 'percentage' ? '0.1' : '1'}
            />
          </div>

          {massUpdateData.adjustmentValue && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Vista previa del cambio:</p>
              <div className="space-y-1 text-sm">
                {products.slice(0, 3).map((product) => {
                  const value = parseFloat(massUpdateData.adjustmentValue);
                  let newPrice = product.price;

                  if (massUpdateData.adjustmentType === 'percentage') {
                    const adjustment = (product.price * value) / 100;
                    newPrice = massUpdateData.operation === 'increase'
                      ? product.price + adjustment
                      : product.price - adjustment;
                  } else {
                    newPrice = massUpdateData.operation === 'increase'
                      ? product.price + value
                      : product.price - value;
                  }

                  newPrice = Math.max(0, newPrice);

                  return (
                    <div key={product.id} className="flex justify-between text-blue-800">
                      <span>{product.name}:</span>
                      <span>
                        ${product.price.toFixed(2)} → ${newPrice.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
                {products.length > 3 && (
                  <p className="text-blue-600 italic">...y {products.length - 3} productos más</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setShowMassUpdateModal(false);
                setMassUpdateData({ adjustmentType: 'percentage', adjustmentValue: '', operation: 'increase' });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMassUpdate}
              disabled={loading || !massUpdateData.adjustmentValue}
              className={
                massUpdateData.operation === 'increase'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }
            >
              {loading ? 'Actualizando...' : 'Aplicar Cambios'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
