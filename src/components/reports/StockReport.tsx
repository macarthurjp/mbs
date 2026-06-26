import { useCallback, useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, Download, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';

interface StockReportProps {
  onClose: () => void;
}

interface ProductStock {
  id: string;
  name: string;
  category: string;
  size: string;
  stock: number;
  min_stock: number;
  price: number;
  cost: number;
  stock_value: number;
}

export default function StockReport({ onClose }: StockReportProps) {
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductStock[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'ok'>('all');
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      const productsWithValue = data.map(p => ({
        ...p,
        stock_value: p.stock * p.cost
      }));

      setProducts(productsWithValue);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterProducts = useCallback(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus === 'low') {
      filtered = filtered.filter(p => p.stock <= p.min_stock);
    } else if (filterStatus === 'ok') {
      filtered = filtered.filter(p => p.stock > p.min_stock);
    }

    setFilteredProducts(filtered);
  }, [filterStatus, products, searchTerm]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    filterProducts();
  }, [filterProducts]);

  function exportToCSV() {
    const headers = ['Producto', 'Categoría', 'Talle', 'Stock Actual', 'Stock Mínimo', 'Estado', 'Costo Unit.', 'Precio', 'Valor Stock'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.category,
      p.size,
      p.stock,
      p.min_stock,
      p.stock <= p.min_stock ? 'Bajo' : 'OK',
      p.cost.toFixed(2),
      p.price.toFixed(2),
      p.stock_value.toFixed(2)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  const lowStockCount = products.filter(p => p.stock <= p.min_stock).length;
  const totalProducts = products.length;
  const totalStockValue = products.reduce((sum, p) => sum + p.stock_value, 0);
  const totalItems = products.reduce((sum, p) => sum + p.stock, 0);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando reporte...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Button onClick={onClose} variant="secondary" className="mb-4">
            Volver a Reportes
          </Button>
          <h1 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900">Reporte de Stock</h1>
          <p className="text-gray-600 mt-2">Estado actual del inventario</p>
        </div>
        <Button onClick={exportToCSV} className="w-full sm:w-auto">
          <Download size={20} />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">Total Productos</p>
                <p className="text-3xl font-bold text-blue-900">{totalProducts}</p>
              </div>
              <Package className="w-12 h-12 text-blue-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">Unidades Totales</p>
                <p className="text-3xl font-bold text-green-900">{totalItems}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-1">Stock Bajo</p>
                <p className="text-3xl font-bold text-yellow-900">{lowStockCount}</p>
              </div>
              <AlertTriangle className="w-12 h-12 text-yellow-400 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Valor Stock</p>
                <p className="text-3xl font-bold text-gray-900">${totalStockValue.toFixed(0)}</p>
              </div>
              <Package className="w-12 h-12 text-gray-400 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar por nombre o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'primary' : 'secondary'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                Todos
              </Button>
              <Button
                variant={filterStatus === 'low' ? 'primary' : 'secondary'}
                onClick={() => setFilterStatus('low')}
                size="sm"
              >
                Stock Bajo
              </Button>
              <Button
                variant={filterStatus === 'ok' ? 'primary' : 'secondary'}
                onClick={() => setFilterStatus('ok')}
                size="sm"
              >
                Stock OK
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Producto</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Talle</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Stock</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Min</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Costo</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Precio</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProducts.map((product) => {
                  const isLowStock = product.stock <= product.min_stock;
                  return (
                    <tr key={product.id} className={`hover:bg-gray-50 ${isLowStock ? 'bg-yellow-50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{product.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{product.size}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{product.stock}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">{product.min_stock}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          {isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertTriangle size={14} />
                              Bajo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle size={14} />
                              OK
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">${product.cost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">${product.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">${product.stock_value.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">No se encontraron productos</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
