import React, { useEffect, useState } from 'react';
import { Search, ImageDown } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

export function LabelsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  async function loadProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      const productsWithBarcode = (data || []).filter(p => p.barcode);
      setProducts(productsWithBarcode);
      setFilteredProducts(productsWithBarcode);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleProduct(productId: string) {
    const newSelected = new Map(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.set(productId, 1);
    }
    setSelectedProducts(newSelected);
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      const newSelected = new Map(selectedProducts);
      newSelected.delete(productId);
      setSelectedProducts(newSelected);
    } else {
      const newSelected = new Map(selectedProducts);
      newSelected.set(productId, quantity);
      setSelectedProducts(newSelected);
    }
  }

  async function generateLabelImage(product: Product, index: number = 0): Promise<Blob | null> {
    return new Promise((resolve) => {
      try {
        if (!product.barcode) {
          resolve(null);
          return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        const dpi = 300;
        const mmToInches = 0.0393701;
        const pixelWidth = Math.round(50 * mmToInches * dpi);
        const pixelHeight = Math.round(25 * mmToInches * dpi);
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, pixelWidth, pixelHeight);

        const padding = 12;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'center';
        const maxNameLength = 24;
        const productName = product.name.length > maxNameLength ? product.name.substring(0, maxNameLength) + '...' : product.name;
        ctx.fillText(productName, pixelWidth / 2, padding + 35);

        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        document.body.appendChild(tempSvg);

        import('jsbarcode').then((module) => {
          const JsBarcodeLib = module.default;
          JsBarcodeLib(tempSvg, product.barcode!, {
            format: 'CODE128',
            width: 3.5,
            height: 95,
            displayValue: false,
            fontSize: 12,
            margin: 0,
            background: '#FFFFFF',
            lineColor: '#000000'
          });

          const svgData = new XMLSerializer().serializeToString(tempSvg);
          const img = new Image();
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(svgBlob);

          img.onload = () => {
            const maxBarcodeWidth = pixelWidth - (padding * 2);
            const scale = Math.min(1, maxBarcodeWidth / img.width);
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;
            const barcodeX = (pixelWidth - scaledWidth) / 2;
            const barcodeY = padding + 50;

            ctx.drawImage(img, barcodeX, barcodeY, scaledWidth, scaledHeight);

            ctx.fillStyle = '#000000';
            ctx.font = 'bold 65px Arial';
            ctx.textAlign = 'center';
            const priceY = pixelHeight - padding - 8;
            ctx.fillText(`$${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, pixelWidth / 2, priceY);

            canvas.toBlob((blob) => {
              document.body.removeChild(tempSvg);
              URL.revokeObjectURL(url);
              resolve(blob);
            }, 'image/jpeg', 1.0);
          };

          img.onerror = () => {
            document.body.removeChild(tempSvg);
            URL.revokeObjectURL(url);
            resolve(null);
          };

          img.src = url;
        });
      } catch (error) {
        console.error('Error generating label image:', error);
        resolve(null);
      }
    });
  }

  async function handleDownloadJPG(product: Product) {
    try {
      const blob = await generateLabelImage(product);
      if (blob) {
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        const sanitizedName = product.name
          .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '')
          .replace(/\s+/g, '-')
          .toLowerCase();
        link.download = `${sanitizedName}.jpg`;
        link.click();
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Error downloading JPG:', error);
      alert('Error al descargar la imagen');
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
      <div className="mb-8 print:hidden">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-4xl font-serif font-bold text-pink-700 mb-2">Etiquetas Térmicas</h1>
            <p className="text-gray-600 uppercase tracking-wide">Genera e imprime etiquetas con códigos de barras para impresora térmica</p>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <Input
              type="text"
              placeholder="Buscar por nombre, categoría o código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedProducts.has(product.id)
                    ? 'border-pink-600 bg-pink-50'
                    : 'border-gray-300 hover:border-pink-300 hover:bg-pink-50'
                }`}
                onClick={() => toggleProduct(product.id)}
              >
                <div className="space-y-3">
                  <div className="text-center">
                    <h3 className="font-bold text-lg text-gray-900 mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-600">
                      {product.category} {product.size && `• ${product.size}`}
                    </p>
                    <p className="text-2xl font-bold text-pink-600 mt-2">
                      ${product.price.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    {selectedProducts.has(product.id) ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(product.id, (selectedProducts.get(product.id) || 1) - 1);
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-pink-600 hover:bg-pink-700 rounded-lg font-bold text-white transition-colors"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-bold text-lg text-gray-900">
                          {selectedProducts.get(product.id) || 1}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(product.id, (selectedProducts.get(product.id) || 1) + 1);
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-pink-600 hover:bg-pink-700 rounded-lg font-bold text-white transition-colors"
                        >
                          +
                        </button>
                      </>
                    ) : null}
                  </div>

                  <div className="flex justify-center">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {product.barcode}
                    </span>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadJPG(product);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <ImageDown size={16} />
                      JPG
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {products.length === 0
                ? 'No hay productos con códigos de barras'
                : 'No se encontraron productos'
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
