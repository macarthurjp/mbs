import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType, FormEvent } from 'react';
import {
  AlertTriangle,
  Barcode,
  Boxes,
  DollarSign,
  Edit2,
  Package,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import { logAudit } from '../utils/audit';

type Producto = {
  id: number;
  negocio_id: string | null;
  nombre: string;
  unidad: string | null;
  precio: number;
  precio_anterior?: number | null;
  precio_cambio?: 'up' | 'down' | null;
  precio_actualizado_en?: string | null;
  costo: number | null;
  stock: number | null;
  minimo: number | null;
  proveedor: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const productsCopy = {
  // ... (see above, unchanged for brevity)
  // The full productsCopy object is present here, as in the input code
  // (identical to the one from the user prompt)
  es: {
    loading: 'Cargando productos...',
    missingTitle: 'Usuario sin negocio asignado',
    missingText: 'El login funciona, pero este usuario todavía no existe en la tabla usuarios o no tiene un negocio_id asignado.',
    missingHelp: 'Crea primero el negocio y luego inserta este usuario como admin en Supabase.',
    title: 'Productos',
    subtitle: 'Gestiona el inventario de tu negocio',
    totalProducts: 'Total productos',
    inventoryValue: 'Valor inventario',
    lowStock: 'Bajo stock',
    totalUnits: 'Unidades total',
    sellerReadOnly: 'Los vendedores solo pueden consultar productos',
    sellerBasicView: 'Vista básica para vendedor: precios de venta y stock disponible',
    massUpdate: 'Modificación Masiva',
    newProduct: 'Nuevo Producto',
    searchPlaceholder: 'Buscar por nombre o unidad...',
    name: 'Nombre',
    unit: 'Unidad',
    price: 'Precio',
    cost: 'Costo',
    stock: 'Stock',
    minimum: 'Mínimo',
    provider: 'Proveedor',
    providerPlaceholder: 'Escribe o selecciona un proveedor',
    noProvider: 'Sin proveedor',
    lastUpdate: 'Última actualización',
    actions: 'Acciones',
    inventory: 'Inventario',
    showing: 'Mostrando',
    of: 'de',
    previous: 'Anterior',
    next: 'Siguiente',
    page: 'Página',
    defaultUnit: 'unidad',
    noProducts: 'No se encontraron productos',
    editProduct: 'Editar Producto',
    productName: 'Nombre del Producto',
    salePrice: 'Precio de Venta',
    purchaseCost: 'Costo de Compra',
    currentStock: 'Stock Actual',
    minimumStock: 'Stock Mínimo',
    cancel: 'Cancelar',
    update: 'Actualizar',
    create: 'Crear',
    productSingular: 'Producto',
    addStockAction: 'Agregar stock',
    addStockTitle: 'Agregar Stock',
    addStockDescription: 'Suma unidades al stock actual, por ejemplo al recibir una compra.',
    quantityToAdd: 'Cantidad a agregar',
    quantityPlaceholder: 'Ej: 300',
    newStockPreview: 'Nuevo stock',
    addStockConfirm: 'Agregar Stock',
    addStockSuccess: 'Stock actualizado correctamente',
    addStockError: 'Error al actualizar el stock',
    invalidQuantity: 'Ingresa una cantidad válida mayor a 0',
    stockAddedNotificationTitle: 'Stock actualizado',
    stockAddedNotificationMessage: 'agregó',
    stockAddedNotificationSuffix: 'unidades a',
    massUpdateTitle: 'Modificación Masiva de Precios',
    massWarningStart: 'Esta acción modificará los precios de todos los productos',
    massWarningEnd: 'Los cambios son permanentes.',
    productsCount: 'productos',
    operationType: 'Tipo de operación',
    increase: 'Aumentar',
    decrease: 'Disminuir',
    adjustmentType: 'Tipo de ajuste',
    percentage: 'Porcentaje (%)',
    fixedAmount: 'Monto Fijo ($)',
    percentageLabel: 'Porcentaje',
    amountLabel: 'Monto',
    percentagePlaceholder: 'Ej: 10 para 10%',
    amountPlaceholder: 'Ej: 100 para $100',
    preview: 'Vista previa del cambio:',
    moreProducts: 'productos más',
    moreProductsPrefix: '...y',
    updating: 'Actualizando...',
    applyChanges: 'Aplicar Cambios',
    loadError: 'Error al cargar los productos',
    noUser: 'No hay usuario autenticado',
    noBusiness: 'No se encontró el negocio del usuario',
    nameRequired: 'El nombre del producto es obligatorio',
    priceInvalid: 'El precio debe ser válido',
    productUpdated: 'Producto actualizado correctamente',
    productCreated: 'Producto creado correctamente',
    productNotificationCreatedTitle: 'Producto creado',
    productNotificationUpdatedTitle: 'Producto actualizado',
    productNotificationMessage: 'Producto',
    productNotificationCreatedMessage: 'fue creado por',
    productNotificationUpdatedMessage: 'fue actualizado por',
    priceChangeNotificationTitle: 'Precio de producto actualizado',
    priceChangeNotificationMessage: 'cambió de precio. Notificar a los clientes antes de vender.',
    priceIncreased: 'Subió',
    priceDecreased: 'Bajó',
    lowStockNotificationTitle: 'Producto con stock bajo',
    lowStockNotificationMessage: 'está por debajo o igual al mínimo configurado',
    saveError: 'Error al guardar el producto',
    deleteTitle: 'Eliminar Producto',
    deleteMessage: '¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.',
    deleteConfirm: 'Sí, eliminar',
    productDeleted: 'Producto eliminado correctamente',
    deleteError: 'Error al eliminar el producto',
    validValue: 'Ingresa un valor válido',
    massConfirmTitle: 'Modificación masiva de precios',
    massConfirmApply: 'Aplicar cambios',
    increaseVerb: 'aumentar',
    decreaseVerb: 'disminuir',
    massConfirmPrefix: '¿Confirmas',
    massConfirmMiddle: 'los precios en',
    massConfirmSuffix: 'Esta acción modificará todos los productos.',
    pricesUpdated: 'Precios actualizados exitosamente',
    pricesError: 'Error al actualizar precios',
    units: {
      unidad: 'Unidad (u)',
      kg: 'Kilogramo (kg)',
      g: 'Gramo (g)',
      lb: 'Libra (lb)',
      oz: 'Onza (oz)',
      metro: 'Metro (m)',
      cm: 'Centímetro (cm)',
      pulgada: 'Pulgada (in)',
      pie: 'Pie (ft)',
      yarda: 'Yarda (yd)',
      litro: 'Litro (L)',
      ml: 'Mililitro (ml)',
      galon: 'Galón (gal)',
      paquete: 'Paquete (pkg)',
      caja: 'Caja (box)',
      bolsa: 'Bolsa (bag)',
      botella: 'Botella (btl)',
      lata: 'Lata (can)',
      carton: 'Cartón (ctn)',
      docena: 'Docena (doz)',
      par: 'Par (pair)',
      rollo: 'Rollo (roll)',
      servicio: 'Servicio (svc)',
      hora: 'Hora (hr)'
    }
  },
  en: {
    loading: 'Loading products...',
    missingTitle: 'User has no assigned business',
    missingText: 'Login works, but this user does not exist in the usuarios table yet or does not have an assigned negocio_id.',
    missingHelp: 'Create the business first, then insert this user as admin in Supabase.',
    title: 'Products',
    subtitle: 'Manage your business inventory',
    totalProducts: 'Total products',
    inventoryValue: 'Inventory value',
    lowStock: 'Low stock',
    totalUnits: 'Total units',
    sellerReadOnly: 'Sellers can only view products',
    sellerBasicView: 'Basic seller view: sale prices and available stock',
    massUpdate: 'Mass Update',
    newProduct: 'New Product',
    searchPlaceholder: 'Search by name or unit...',
    name: 'Name',
    unit: 'Unit',
    price: 'Price',
    cost: 'Cost',
    stock: 'Stock',
    minimum: 'Minimum',
    provider: 'Supplier',
    providerPlaceholder: 'Type or select a supplier',
    noProvider: 'No supplier',
    lastUpdate: 'Last update',
    actions: 'Actions',
    inventory: 'Inventory',
    showing: 'Showing',
    of: 'of',
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    defaultUnit: 'unit',
    noProducts: 'No products found',
    editProduct: 'Edit Product',
    productName: 'Product Name',
    salePrice: 'Sale Price',
    purchaseCost: 'Purchase Cost',
    currentStock: 'Current Stock',
    minimumStock: 'Minimum Stock',
    cancel: 'Cancel',
    update: 'Update',
    create: 'Create',
    productSingular: 'Product',
    addStockAction: 'Add stock',
    addStockTitle: 'Add Stock',
    addStockDescription: 'Add units to the current stock, for example when receiving a purchase.',
    quantityToAdd: 'Quantity to add',
    quantityPlaceholder: 'E.g: 300',
    newStockPreview: 'New stock',
    addStockConfirm: 'Add Stock',
    addStockSuccess: 'Stock updated successfully',
    addStockError: 'Error updating stock',
    invalidQuantity: 'Enter a valid quantity greater than 0',
    stockAddedNotificationTitle: 'Stock updated',
    stockAddedNotificationMessage: 'added',
    stockAddedNotificationSuffix: 'units to',
    massUpdateTitle: 'Mass Price Update',
    massWarningStart: 'This action will modify the prices of all products',
    massWarningEnd: 'Changes are permanent.',
    productsCount: 'products',
    operationType: 'Operation type',
    increase: 'Increase',
    decrease: 'Decrease',
    adjustmentType: 'Adjustment type',
    percentage: 'Percentage (%)',
    fixedAmount: 'Fixed Amount ($)',
    percentageLabel: 'Percentage',
    amountLabel: 'Amount',
    percentagePlaceholder: 'Ex: 10 for 10%',
    amountPlaceholder: 'Ex: 100 for $100',
    preview: 'Change preview:',
    moreProducts: 'more products',
    moreProductsPrefix: '...and',
    updating: 'Updating...',
    applyChanges: 'Apply Changes',
    loadError: 'Error loading products',
    noUser: 'No authenticated user',
    noBusiness: 'The user business was not found',
    nameRequired: 'Product name is required',
    priceInvalid: 'Price must be valid',
    productUpdated: 'Product updated successfully',
    productCreated: 'Product created successfully',
    productNotificationCreatedTitle: 'Product created',
    productNotificationUpdatedTitle: 'Product updated',
    productNotificationMessage: 'Product',
    productNotificationCreatedMessage: 'was created by',
    productNotificationUpdatedMessage: 'was updated by',
    priceChangeNotificationTitle: 'Product price updated',
    priceChangeNotificationMessage: 'changed price. Notify clients before selling.',
    priceIncreased: 'Increased',
    priceDecreased: 'Decreased',
    lowStockNotificationTitle: 'Low stock product',
    lowStockNotificationMessage: 'is below or equal to the configured minimum',
    saveError: 'Error saving product',
    deleteTitle: 'Delete Product',
    deleteMessage: 'Are you sure you want to delete this product? This action cannot be undone.',
    deleteConfirm: 'Yes, delete',
    productDeleted: 'Product deleted successfully',
    deleteError: 'Error deleting product',
    validValue: 'Enter a valid value',
    massConfirmTitle: 'Mass price update',
    massConfirmApply: 'Apply changes',
    increaseVerb: 'increase',
    decreaseVerb: 'decrease',
    massConfirmPrefix: 'Do you confirm you want to',
    massConfirmMiddle: 'prices by',
    massConfirmSuffix: 'This action will modify all products.',
    pricesUpdated: 'Prices updated successfully',
    pricesError: 'Error updating prices',
    units: {
      unidad: 'Unit (u)',
      kg: 'Kilogram (kg)',
      g: 'Gram (g)',
      lb: 'Pound (lb)',
      oz: 'Ounce (oz)',
      metro: 'Meter (m)',
      cm: 'Centimeter (cm)',
      pulgada: 'Inch (in)',
      pie: 'Foot (ft)',
      yarda: 'Yard (yd)',
      litro: 'Liter (L)',
      ml: 'Milliliter (ml)',
      galon: 'Gallon (gal)',
      paquete: 'Package (pkg)',
      caja: 'Box (box)',
      bolsa: 'Bag (bag)',
      botella: 'Bottle (btl)',
      lata: 'Can (can)',
      carton: 'Carton (ctn)',
      docena: 'Dozen (doz)',
      par: 'Pair (pair)',
      rollo: 'Roll (roll)',
      servicio: 'Service (svc)',
      hora: 'Hour (hr)'
    }
  }
} as const;

type CurrencySettings = {
  code: string;
  symbol: string;
};

const DEFAULT_CURRENCY: CurrencySettings = {
  code: 'USD',
  symbol: '$'
};

const PRODUCTS_PER_PAGE = 48;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  HTG: 'HTG',
  DOP: 'RD$',
  CAD: 'CA$',
  MXN: 'MX$',
  BRL: 'R$',
  GBP: '£'
};

function getCurrencySymbol(code: string) {
  return CURRENCY_SYMBOLS[code] || code || DEFAULT_CURRENCY.symbol;
}

function normalizeCurrencySettings(data: Record<string, unknown> | null | undefined): CurrencySettings {
  const rawCode =
    data?.moneda_codigo ||
    data?.monedaCode ||
    data?.currency_code ||
    data?.currencyCode ||
    data?.moneda ||
    data?.currency ||
    DEFAULT_CURRENCY.code;

  const code = String(rawCode || DEFAULT_CURRENCY.code).trim().toUpperCase();

  const rawSymbol =
    data?.moneda_simbolo ||
    data?.monedaSimbolo ||
    data?.currency_symbol ||
    data?.currencySymbol ||
    data?.simbolo_moneda ||
    data?.simboloMoneda ||
    data?.simbolo ||
    data?.simboloMonedaNegocio ||
    data?.currencySymbolBusiness;

  const symbol = String(rawSymbol || getCurrencySymbol(code)).trim() || getCurrencySymbol(code);
  return { code, symbol };
}

function formatCurrency(value: number | null | undefined) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatMoney(value: number | null | undefined, currency: CurrencySettings) {
  return `${currency.symbol} ${formatCurrency(value)}`;
}

function formatProductCode(id: number) {
  return `PRD-${String(id).padStart(4, '0')}`;
}

function formatProductDate(value: string | null | undefined, language: 'es' | 'en') {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getProductLastUpdate(product: Producto) {
  return product.updated_at || product.created_at || null;
}
function normalizeMoneyInput(value: string) {
  if (value === '') return '';
  return Number(value || 0).toFixed(2);
}

export function ProductsPage() {
  const { user, userProfile } = useAuth();
  const roleFlags = getUserRoleFlags(userProfile);
  const isSeller = roleFlags.isSeller;
  const canManageProducts = roleFlags.isOwner || roleFlags.isAdmin || roleFlags.isSuperAdmin;
  const { showToast, showConfirm } = useNotification();
  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [products, setProducts] = useState<Producto[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingNegocio, setMissingNegocio] = useState(false);
  const [showMassUpdateModal, setShowMassUpdateModal] = useState(false);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY);
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Producto | null>(null);
  const [stockAdjustAmount, setStockAdjustAmount] = useState('');
  const [addingStock, setAddingStock] = useState(false);

  const [massUpdateData, setMassUpdateData] = useState({
    adjustmentType: 'percentage',
    adjustmentValue: '',
    operation: 'increase'
  });

  const { language } = useLanguage();
  const t = productsCopy[language];

  const profileData = userProfile as Record<string, unknown> | null | undefined;
  const loggedUserName = String(
    profileData?.full_name ||
    profileData?.nombre ||
    profileData?.username ||
    user?.email ||
    'Usuario'
  );
  const loggedUserEmail = String(profileData?.email || user?.email || '');
  const loggedUserRole = roleFlags.role;

  const [formData, setFormData] = useState({
    nombre: '',
    unidad: 'unidad',
    precio: '',
    costo: '',
    stock: '',
    minimo: '5',
    proveedor: ''
  });

  useEffect(() => {
    const search = searchTerm.toLowerCase().trim();

    const filtered = products.filter((product) => {
      return (
        product.nombre.toLowerCase().includes(search) ||
        (product.unidad || '').toLowerCase().includes(search)
      );
    });

    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const productMetrics = useMemo(() => {
    return products.reduce(
      (acc, product) => {
        const stock = Number(product.stock || 0);
        const cost = Number(product.costo || 0);
        const minimum = Number(product.minimo || 0);

        acc.totalProducts += 1;
        acc.totalUnits += stock;
        acc.inventoryValue += stock * cost;

        if (stock <= minimum) {
          acc.lowStock += 1;
        }

        return acc;
      },
      {
        totalProducts: 0,
        inventoryValue: 0,
        lowStock: 0,
        totalUnits: 0
      }
    );
  }, [products]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * PRODUCTS_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + PRODUCTS_PER_PAGE, filteredProducts.length);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(pageStartIndex, pageEndIndex);
  }, [filteredProducts, pageStartIndex, pageEndIndex]);

  const providerOptions = useMemo(() => {
    const providers = products
      .map((product) => String(product.proveedor || '').trim())
      .filter(Boolean);

    return Array.from(new Set(providers)).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        setProducts([]);
        setFilteredProducts([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setMissingNegocio(false);
        return;
      }

      const currentNegocioId = userProfile?.negocio_id || null;
      setNegocioId(currentNegocioId);

      if (!currentNegocioId) {
        setProducts([]);
        setFilteredProducts([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setMissingNegocio(true);
        return;
      }

      const [productsResult, businessResult] = await Promise.all([
        supabase
          .rpc('get_productos_for_business', { p_negocio_id: currentNegocioId })
          .order('created_at', { ascending: false }),
        supabase
          .from('negocios')
          .select('*')
          .eq('id', currentNegocioId)
          .maybeSingle()
      ]);

      if (productsResult.error) throw productsResult.error;
      if (businessResult.error) throw businessResult.error;

      setMissingNegocio(false);
      setCurrencySettings(normalizeCurrencySettings(businessResult.data));
      setProducts(productsResult.data || []);
      setFilteredProducts(productsResult.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t.loadError, user?.id, userProfile?.negocio_id]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canManageProducts) {
      showToast(t.sellerReadOnly, 'error');
      return;
    }

    if (!user) {
      showToast(t.noUser, 'error');
      return;
    }

    if (!negocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }

    if (!formData.nombre.trim()) {
      showToast(t.nameRequired, 'error');
      return;
    }

    if (!formData.precio || Number(formData.precio) < 0) {
      showToast(t.priceInvalid, 'error');
      return;
    }

    try {
      const productData: Record<string, string | number | null> = {
        negocio_id: negocioId,
        nombre: formData.nombre.trim(),
        unidad: formData.unidad,
        precio: Number(formData.precio),
        stock: Number(formData.stock || 0),
        minimo: Number(formData.minimo || 0)
      };
      const nextCosto = Number(formData.costo || 0);
      const nextProveedor = formData.proveedor.trim() || null;
      const PRODUCT_SELECT_COLUMNS =
        'id, negocio_id, nombre, unidad, precio, stock, minimo, created_at, precio_anterior, precio_cambio, precio_actualizado_en';

      if (editingProduct) {
        const oldPrice = Number(editingProduct.precio || 0);
        const newPrice = Number(productData.precio || 0);
        const priceChanged = oldPrice !== newPrice;
        const updateData = priceChanged
          ? {
              ...productData,
              precio_anterior: oldPrice,
              precio_cambio: newPrice > oldPrice ? 'up' : 'down',
              precio_actualizado_en: new Date().toISOString()
            }
          : productData;

        const { data: updatedProduct, error } = await supabase
          .from('productos')
          .update(updateData)
          .eq('id', editingProduct.id)
          .eq('negocio_id', negocioId)
          .select(PRODUCT_SELECT_COLUMNS)
          .single();

        if (error) throw error;

        if (roleFlags.isOwner) {
          const costoChanged = Number(editingProduct.costo || 0) !== nextCosto;
          const proveedorChanged = (editingProduct.proveedor || null) !== nextProveedor;

          if (costoChanged || proveedorChanged) {
            const { error: costoError } = await supabase.rpc('upsert_producto_costo', {
              p_producto_id: editingProduct.id,
              p_costo: nextCosto,
              p_proveedor: nextProveedor
            });

            if (costoError) throw costoError;

            await logAudit({
              negocio_id: negocioId,
              user_id: user.id,
              user_name: loggedUserName,
              user_email: loggedUserEmail || undefined,
              user_role: loggedUserRole || undefined,
              action: 'UPDATE_PRODUCT_COST',
              module: 'PRODUCTS',
              record_id: editingProduct.id,
              description: `Costo/proveedor de ${editingProduct.nombre} actualizado por ${loggedUserName}`,
              old_data: { costo: editingProduct.costo, proveedor: editingProduct.proveedor },
              new_data: { costo: nextCosto, proveedor: nextProveedor }
            });
          }
        }

        await logAudit({
          negocio_id: negocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'UPDATE_PRODUCT',
          module: 'PRODUCTS',
          record_id: editingProduct.id,
          description: `Producto ${editingProduct.nombre} actualizado por ${loggedUserName}`,
          old_data: {
            id: editingProduct.id,
            nombre: editingProduct.nombre,
            unidad: editingProduct.unidad,
            precio: editingProduct.precio,
            stock: editingProduct.stock,
            minimo: editingProduct.minimo
          },
          new_data: updatedProduct as Record<string, unknown>
        });

        // Notifications for updated product
        const updatedStock = Number(updatedProduct?.stock || 0);
        const updatedMinimum = Number(updatedProduct?.minimo || 0);

        const { error: productNotificationError } = await supabase
          .from('notifications')
          .insert({
            negocio_id: negocioId,
            user_id: null,
            audience: 'admin',
            title: t.productNotificationUpdatedTitle,
            message: `${t.productNotificationMessage} ${updatedProduct?.nombre || productData.nombre} ${t.productNotificationUpdatedMessage} ${loggedUserName}.`,
            type: 'info',
            category: 'inventory',
            link: 'products',
            read: false
          });

        if (productNotificationError) {
          console.warn('Product update notification was not created:', productNotificationError);
        }

        if (priceChanged) {
          const priceDirectionIcon = newPrice > oldPrice ? '↑' : '↓';
          const priceDirectionLabel = newPrice > oldPrice ? t.priceIncreased : t.priceDecreased;

          await logAudit({
            negocio_id: negocioId,
            user_id: user.id,
            user_name: loggedUserName,
            user_email: loggedUserEmail || undefined,
            user_role: loggedUserRole || undefined,
            action: 'UPDATE_PRODUCT_PRICE',
            module: 'PRODUCTS',
            record_id: editingProduct.id,
            description: `Precio actualizado para ${updatedProduct?.nombre || productData.nombre}`,
            old_data: {
              precio: oldPrice
            },
            new_data: {
              precio: newPrice
            }
          });

          const { error: priceChangeNotificationError } = await supabase
            .from('notifications')
            .insert({
              negocio_id: negocioId,
              user_id: null,
              audience: 'sales_team',
              title: t.priceChangeNotificationTitle,
              message: `${priceDirectionIcon} ${priceDirectionLabel}: ${updatedProduct?.nombre || productData.nombre} ${t.priceChangeNotificationMessage} ${formatMoney(oldPrice, currencySettings)} → ${priceDirectionIcon} ${formatMoney(newPrice, currencySettings)}.`,
              type: 'warning',
              category: 'products',
              link: 'products',
              read: false
            });

          if (priceChangeNotificationError) {
            console.warn('Product price change notification was not created:', priceChangeNotificationError);
          }
        }

        if (updatedStock <= updatedMinimum) {
          const { error: lowStockNotificationError } = await supabase
            .from('notifications')
            .insert({
              negocio_id: negocioId,
              user_id: null,
              audience: 'admin',
              title: t.lowStockNotificationTitle,
              message: `${updatedProduct?.nombre || productData.nombre} ${t.lowStockNotificationMessage}. Stock: ${updatedStock.toLocaleString('en-US')}. ${t.minimum}: ${updatedMinimum.toLocaleString('en-US')}.`,
              type: 'warning',
              category: 'low_stock',
              link: 'products',
              read: false
            });

          if (lowStockNotificationError) {
            console.warn('Low stock notification was not created:', lowStockNotificationError);
          }
        }
      } else {
        const { data: createdProduct, error } = await supabase
          .from('productos')
          .insert([productData])
          .select(PRODUCT_SELECT_COLUMNS)
          .single();

        if (error) throw error;

        if (roleFlags.isOwner && createdProduct?.id && (nextCosto !== 0 || nextProveedor)) {
          const { error: costoError } = await supabase.rpc('upsert_producto_costo', {
            p_producto_id: createdProduct.id,
            p_costo: nextCosto,
            p_proveedor: nextProveedor
          });

          if (costoError) throw costoError;
        }

        await logAudit({
          negocio_id: negocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'CREATE_PRODUCT',
          module: 'PRODUCTS',
          record_id: createdProduct?.id,
          description: `Producto ${productData.nombre} creado por ${loggedUserName}`,
          new_data: createdProduct as Record<string, unknown>
        });

        // Notifications for created product
        const createdStock = Number(createdProduct?.stock || 0);
        const createdMinimum = Number(createdProduct?.minimo || 0);

        const { error: productNotificationError } = await supabase
          .from('notifications')
          .insert({
            negocio_id: negocioId,
            user_id: null,
            audience: 'admin',
            title: t.productNotificationCreatedTitle,
            message: `${t.productNotificationMessage} ${createdProduct?.nombre || productData.nombre} ${t.productNotificationCreatedMessage} ${loggedUserName}.`,
            type: 'success',
            category: 'inventory',
            link: 'products',
            read: false
          });

        if (productNotificationError) {
          console.warn('Product creation notification was not created:', productNotificationError);
        }

        if (createdStock <= createdMinimum) {
          const { error: lowStockNotificationError } = await supabase
            .from('notifications')
            .insert({
              negocio_id: negocioId,
              user_id: null,
              audience: 'admin',
              title: t.lowStockNotificationTitle,
              message: `${createdProduct?.nombre || productData.nombre} ${t.lowStockNotificationMessage}. Stock: ${createdStock.toLocaleString('en-US')}. ${t.minimum}: ${createdMinimum.toLocaleString('en-US')}.`,
              type: 'warning',
              category: 'low_stock',
              link: 'products',
              read: false
            });

          if (lowStockNotificationError) {
            console.warn('Low stock notification was not created:', lowStockNotificationError);
          }
        }
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      resetForm();
      await loadProducts();
      showToast(editingProduct ? t.productUpdated : t.productCreated, 'success');
    } catch (error) {
      console.error('Error saving product:', error);
      showToast(t.saveError, 'error');
    }
  }

  async function handleDelete(id: number) {
    if (!canManageProducts) {
      showToast(t.sellerReadOnly, 'error');
      return;
    }
    if (!negocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }

    if (!user?.id) {
      showToast(t.noUser, 'error');
      return;
    }

    const confirmed = await showConfirm({
      title: t.deleteTitle,
      message: t.deleteMessage,
      confirmText: t.deleteConfirm,
      cancelText: t.cancel,
      variant: 'danger'
    });

    if (!confirmed) return;

    try {
      const productToDelete = products.find((product) => product.id === id) || null;

      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id)
        .eq('negocio_id', negocioId);

      if (error) throw error;

      await logAudit({
        negocio_id: negocioId,
        user_id: user.id,
        user_name: loggedUserName,
        user_email: loggedUserEmail || undefined,
        user_role: loggedUserRole || undefined,
        action: 'DELETE_PRODUCT',
        module: 'PRODUCTS',
        record_id: id,
        description: `Producto ${productToDelete?.nombre || id} eliminado por ${loggedUserName}`,
        old_data: productToDelete ? {
          id: productToDelete.id,
          nombre: productToDelete.nombre,
          unidad: productToDelete.unidad,
          precio: productToDelete.precio,
          costo: productToDelete.costo,
          stock: productToDelete.stock,
          minimo: productToDelete.minimo,
          proveedor: productToDelete.proveedor
        } : null
      });

      showToast(t.productDeleted, 'success');
      await loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      showToast(t.deleteError, 'error');
    }
  }

  function openEditModal(product: Producto) {
    if (!canManageProducts) {
      showToast(t.sellerReadOnly, 'error');
      return;
    }
    setEditingProduct(product);
    setFormData({
      nombre: product.nombre,
      unidad: product.unidad || 'unidad',
      precio: Number(product.precio || 0).toFixed(2),
      costo: Number(product.costo || 0).toFixed(2),
      stock: Number(product.stock || 0).toString(),
      minimo: Number(product.minimo || 0).toString(),
      proveedor: product.proveedor || ''
    });
    setIsModalOpen(true);
  }

  function resetForm() {
    setFormData({
      nombre: '',
      unidad: 'unidad',
      precio: '',
      costo: '',
      stock: '',
      minimo: '5',
      proveedor: ''
    });
  }

  function openAddStockModal(product: Producto) {
    if (!canManageProducts) {
      showToast(t.sellerReadOnly, 'error');
      return;
    }
    setStockAdjustProduct(product);
    setStockAdjustAmount('');
  }

  function closeAddStockModal() {
    setStockAdjustProduct(null);
    setStockAdjustAmount('');
  }

  async function handleAddStock(e: FormEvent) {
    e.preventDefault();
    if (!canManageProducts) {
      showToast(t.sellerReadOnly, 'error');
      return;
    }
    if (!stockAdjustProduct || !negocioId || !user?.id) return;

    const quantity = Number(stockAdjustAmount);
    if (!stockAdjustAmount || !Number.isFinite(quantity) || quantity <= 0) {
      showToast(t.invalidQuantity, 'error');
      return;
    }

    try {
      setAddingStock(true);
      const oldStock = Number(stockAdjustProduct.stock || 0);
      const newStock = oldStock + quantity;

      const { data: updatedProduct, error } = await supabase
        .from('productos')
        .update({ stock: newStock })
        .eq('id', stockAdjustProduct.id)
        .eq('negocio_id', negocioId)
        .select('id, negocio_id, nombre, unidad, precio, stock, minimo, created_at, precio_anterior, precio_cambio, precio_actualizado_en')
        .single();

      if (error) throw error;

      await logAudit({
        negocio_id: negocioId,
        user_id: user.id,
        user_name: loggedUserName,
        user_email: loggedUserEmail || undefined,
        user_role: loggedUserRole || undefined,
        action: 'ADD_PRODUCT_STOCK',
        module: 'PRODUCTS',
        record_id: stockAdjustProduct.id,
        description: `${loggedUserName} agregó ${quantity} unidades a ${stockAdjustProduct.nombre}`,
        old_data: { stock: oldStock },
        new_data: { stock: newStock, quantity_added: quantity }
      });

      const { error: stockNotificationError } = await supabase
        .from('notifications')
        .insert({
          negocio_id: negocioId,
          user_id: null,
          audience: 'admin',
          title: t.stockAddedNotificationTitle,
          message: `${loggedUserName} ${t.stockAddedNotificationMessage} ${quantity.toLocaleString('en-US')} ${t.stockAddedNotificationSuffix} ${stockAdjustProduct.nombre}. Stock: ${oldStock.toLocaleString('en-US')} → ${newStock.toLocaleString('en-US')}.`,
          type: 'info',
          category: 'inventory',
          link: 'products',
          read: false
        });

      if (stockNotificationError) {
        console.warn('Stock update notification was not created:', stockNotificationError);
      }

      const updatedMinimum = Number(updatedProduct?.minimo || 0);
      if (newStock <= updatedMinimum) {
        const { error: lowStockNotificationError } = await supabase
          .from('notifications')
          .insert({
            negocio_id: negocioId,
            user_id: null,
            audience: 'admin',
            title: t.lowStockNotificationTitle,
            message: `${stockAdjustProduct.nombre} ${t.lowStockNotificationMessage}. Stock: ${newStock.toLocaleString('en-US')}. ${t.minimum}: ${updatedMinimum.toLocaleString('en-US')}.`,
            type: 'warning',
            category: 'low_stock',
            link: 'products',
            read: false
          });

        if (lowStockNotificationError) {
          console.warn('Low stock notification was not created:', lowStockNotificationError);
        }
      }

      closeAddStockModal();
      await loadProducts();
      showToast(t.addStockSuccess, 'success');
    } catch (error) {
      console.error('Error adding stock:', error);
      showToast(t.addStockError, 'error');
    } finally {
      setAddingStock(false);
    }
  }

  async function handleMassUpdate() {
    if (!canManageProducts) {
      showToast(t.sellerReadOnly, 'error');
      return;
    }

    const { adjustmentType, adjustmentValue, operation } = massUpdateData;

    if (!negocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }

    if (!user?.id) {
      showToast(t.noUser, 'error');
      return;
    }

    if (!adjustmentValue || Number(adjustmentValue) <= 0) {
      showToast(t.validValue, 'error');
      return;
    }

    const confirmed = await showConfirm({
      title: t.massConfirmTitle,
      message: `${t.massConfirmPrefix} ${operation === 'increase' ? t.increaseVerb : t.decreaseVerb} ${t.massConfirmMiddle} ${adjustmentType === 'percentage' ? `${adjustmentValue}%` : formatMoney(Number(adjustmentValue), currencySettings)}? ${t.massConfirmSuffix}`,
      confirmText: t.massConfirmApply,
      cancelText: t.cancel,
      variant: 'warning'
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      const value = Number(adjustmentValue);

      const updates = products.map(async (product) => {
        const oldPrice = Number(product.precio || 0);
        let newPrice = oldPrice;

        if (adjustmentType === 'percentage') {
          const adjustment = (newPrice * value) / 100;
          newPrice = operation === 'increase' ? newPrice + adjustment : newPrice - adjustment;
        } else {
          newPrice = operation === 'increase' ? newPrice + value : newPrice - value;
        }

        newPrice = Math.max(0, newPrice);

        const { error } = await supabase
          .from('productos')
          .update({
            precio: newPrice,
            ...(oldPrice !== newPrice
              ? {
                  precio_anterior: oldPrice,
                  precio_cambio: newPrice > oldPrice ? 'up' : 'down',
                  precio_actualizado_en: new Date().toISOString()
                }
              : {})
          })
          .eq('id', product.id)
          .eq('negocio_id', negocioId);

        if (error) throw error;
      });

      await Promise.all(updates);

      await logAudit({
        negocio_id: negocioId,
        user_id: user.id,
        user_name: loggedUserName,
        user_email: loggedUserEmail || undefined,
        user_role: loggedUserRole || undefined,
        action: 'MASS_UPDATE_PRICES',
        module: 'PRODUCTS',
        description: `Modificación masiva de precios aplicada por ${loggedUserName}`,
        new_data: {
          adjustment_type: adjustmentType,
          adjustment_value: value,
          operation,
          affected_products: products.length
        }
      });

      // Notification for mass update
      const { error: massUpdateNotificationError } = await supabase
        .from('notifications')
        .insert({
          negocio_id: negocioId,
          user_id: null,
          audience: 'admin',
          title: t.massUpdateTitle,
          message: `${loggedUserName} ${operation === 'increase' ? t.increaseVerb : t.decreaseVerb} ${t.massConfirmMiddle} ${adjustmentType === 'percentage' ? `${value}%` : formatMoney(value, currencySettings)}. ${products.length.toLocaleString('en-US')} ${t.productsCount}.`,
          type: 'info',
          category: 'inventory',
          link: 'products',
          read: false
        });

      if (massUpdateNotificationError) {
        console.warn('Mass product update notification was not created:', massUpdateNotificationError);
      }

      showToast(t.pricesUpdated, 'success');
      setShowMassUpdateModal(false);
      setMassUpdateData({ adjustmentType: 'percentage', adjustmentValue: '', operation: 'increase' });
      await loadProducts();
    } catch (error) {
      console.error('Error updating prices:', error);
      showToast(t.pricesError, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center px-4">
        <div className="rounded-2xl border border-[#e9e2d3] bg-white/80 px-5 py-4 text-sm font-bold text-[#71717a] shadow-matmax-soft sm:px-6">
          {t.loading}
        </div>
      </div>
    );
  }

  if (missingNegocio) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#fbfaf7] p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white/90 p-5 text-center shadow-matmax-soft sm:p-8">
          <h1 className="mb-3 text-xl font-serif font-bold text-red-700 sm:text-2xl">{t.missingTitle}</h1>
          <p className="mb-4 text-sm text-[#71717a] sm:text-base">{t.missingText}</p>
          <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 text-left text-sm text-[#3f3f46]">
            <p className="mb-2 font-black">User ID:</p>
            <code className="break-all">{user?.id}</code>
          </div>
          <p className="mt-4 text-sm font-medium text-[#71717a]">{t.missingHelp}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-6">
      <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-[#fffdf8]/85 p-5 shadow-[0_24px_70px_rgba(15,15,15,0.07)] backdrop-blur-2xl sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.88),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/60 to-transparent" />
        <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6 xl:flex-row xl:items-center">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl">
              <Sparkles size={14} />
              MatMax Business Suite
            </div>
            <h1 className="mb-3 text-4xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-6xl">{t.title}</h1>
            <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">{t.subtitle}</p>
          </div>

          {canManageProducts && (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button variant="secondary" onClick={() => setShowMassUpdateModal(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/90 shadow-sm sm:w-auto">
                <TrendingUp className="shrink-0" size={20} />
                {t.massUpdate}
              </Button>
              <Button className="w-full gap-2 rounded-2xl shadow-[0_18px_45px_rgba(0,0,0,0.18)] sm:w-auto" onClick={() => { resetForm(); setEditingProduct(null); setIsModalOpen(true); }}>
                <Plus className="shrink-0" size={20} />
                {t.newProduct}
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${!roleFlags.isOwner ? '2xl:grid-cols-3' : '2xl:grid-cols-[0.95fr_1.35fr_0.95fr_0.95fr]'}`}>
        <ProductMetricCard title={t.totalProducts} value={productMetrics.totalProducts.toLocaleString('en-US')} icon={Package} iconClass="bg-[#050505] text-[#f4c542]" />
        {roleFlags.isOwner && (
          <ProductMetricCard title={t.inventoryValue} value={formatMoney(productMetrics.inventoryValue, currencySettings)} icon={DollarSign} iconClass="bg-[#fff4c7] text-[#8a6a16]" />
        )}
        <ProductMetricCard title={t.lowStock} value={productMetrics.lowStock.toLocaleString('en-US')} icon={AlertTriangle} iconClass="bg-red-100 text-red-700" valueClass={productMetrics.lowStock > 0 ? 'text-red-600' : 'text-[#050505]'} />
        <ProductMetricCard title={t.totalUnits} value={productMetrics.totalUnits.toLocaleString('en-US')} icon={Boxes} iconClass="bg-[#f6f4ee] text-[#050505]" />
      </div>

      {isSeller && (
        <div className="rounded-[1.5rem] border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-3 text-sm font-bold text-[#71717a] shadow-sm">
          {t.sellerBasicView}
        </div>
      )}

      <section className="rounded-[2rem] border border-[#e9e2d3]/80 bg-white/82 p-4 shadow-[0_18px_55px_rgba(15,15,15,0.055)] backdrop-blur-2xl sm:p-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 shrink-0 -translate-y-1/2 transform text-[#a1a1aa]" size={20} />
          <Input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-11" />
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-white/90 shadow-[0_22px_65px_rgba(15,15,15,0.06)] backdrop-blur-2xl">
        <div className="border-b border-[#f1ebdf] bg-white/75 px-5 py-5 backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6a16]">{t.inventory}</p>
              <h2 className="mt-1 text-xl font-black text-[#050505] sm:text-2xl">{filteredProducts.length.toLocaleString('en-US')} {t.productsCount}</h2>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <p className="inline-flex rounded-full border border-[#e9e2d3] bg-[#fbfaf7] px-4 py-2 text-sm font-black text-[#71717a] shadow-sm">
                {filteredProducts.length.toLocaleString('en-US')} / {products.length.toLocaleString('en-US')}
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a1a1aa]">
                {t.showing} {filteredProducts.length === 0 ? 0 : pageStartIndex + 1}-{pageEndIndex} {t.of} {filteredProducts.length.toLocaleString('en-US')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-3 sm:p-4">
          {visibleProducts.map((product) => {
            const stock = Number(product.stock || 0);
            const minimum = Number(product.minimo || 0);
            const isLowStock = stock <= minimum;

            return (
              <article key={product.id} className="group relative min-w-0 overflow-hidden rounded-[1.45rem] border border-[#ece5d7] bg-[#fffdf8]/92 p-4 shadow-[0_14px_34px_rgba(15,15,15,0.045)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f4c542]/40 hover:bg-white hover:shadow-[0_22px_50px_rgba(15,15,15,0.08)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.10),transparent_34%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3 xl:max-w-[32%]">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_14px_30px_rgba(0,0,0,0.18)]">
                      <Barcode size={19} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6a16]">{formatProductCode(product.id)}</p>
                      <h3 className="mt-1 break-words text-lg font-black leading-snug text-[#050505] xl:text-xl">{product.nombre}</h3>
                      {roleFlags.isOwner && (
                        <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.12em] text-[#71717a]">
                          {t.provider}: {product.proveedor || t.noProvider}
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className={`grid min-w-0 flex-1 grid-cols-2 gap-3 rounded-[1.25rem] border border-[#f1ebdf] bg-white/82 p-3 shadow-inner ${
                      !roleFlags.isOwner
                        ? 'sm:grid-cols-[minmax(82px,0.85fr)_minmax(112px,1fr)_minmax(78px,0.7fr)_minmax(132px,1fr)] xl:max-w-[64%]'
                        : 'sm:grid-cols-[minmax(82px,0.85fr)_minmax(82px,0.85fr)_minmax(112px,1fr)_minmax(78px,0.7fr)_minmax(132px,1fr)] xl:max-w-[72%]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.price}</p>
                      <p className="mt-1 max-w-full truncate text-[clamp(0.85rem,1vw,1.05rem)] font-black leading-tight tabular-nums text-[#050505]">{formatMoney(product.precio, currencySettings)}</p>
                    </div>
                    {roleFlags.isOwner && (
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.cost}</p>
                        <p className="mt-1 max-w-full truncate text-[clamp(0.85rem,1vw,1.05rem)] font-black leading-tight tabular-nums text-[#71717a]">{formatMoney(product.costo, currencySettings)}</p>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.stock}</p>
                      <span
                        className={`mt-1 inline-flex max-w-full truncate rounded-full px-2.5 py-1 text-xs xl:text-sm font-black tabular-nums ${
                          isLowStock
                            ? 'bg-red-50 text-red-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {stock.toLocaleString('en-US', { maximumFractionDigits: 2 })} {product.unidad || t.defaultUnit}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.minimum}</p>
                      <p className="mt-1 truncate text-[clamp(0.85rem,1vw,1.05rem)] font-black tabular-nums text-[#71717a]">{minimum.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="min-w-0 max-w-[132px]">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.lastUpdate}</p>
                      <p className="mt-1 max-w-full truncate text-[clamp(0.78rem,0.95vw,0.95rem)] font-black tabular-nums text-[#71717a]">
                        {formatProductDate(getProductLastUpdate(product), language)}
                      </p>
                    </div>
                  </div>

                  {canManageProducts && (
                    <div className="flex shrink-0 items-center justify-end gap-2 opacity-90 transition-opacity group-hover:opacity-100 xl:min-w-[92px]">
                      <button onClick={() => openAddStockModal(product)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:-translate-y-0.5 hover:bg-emerald-100" type="button" aria-label={t.addStockAction}>
                        <Plus size={17} />
                      </button>
                      <button onClick={() => openEditModal(product)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#f4c542]/30 bg-[#fff4c7] text-[#8a6a16] transition hover:-translate-y-0.5 hover:bg-[#ffeaa3]" type="button" aria-label={t.editProduct}>
                        <Edit2 size={17} />
                      </button>
                      <button onClick={() => handleDelete(product.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100" type="button" aria-label={t.deleteTitle}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {visibleProducts.length === 0 && (
          <div className="border-t border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">{t.noProducts}</div>
        )}

        {filteredProducts.length > PRODUCTS_PER_PAGE && (
          <div className="border-t border-[#f1ebdf] bg-white/75 px-4 py-4 backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.page} {safeCurrentPage} {t.of} {totalPages}</p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage <= 1} className="rounded-2xl border border-[#e9e2d3] bg-white px-4 py-2 text-sm font-black text-[#71717a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#f4c542]/50 hover:bg-[#fff9e8] hover:text-[#050505] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:text-[#71717a]">
                  {t.previous}
                </button>
                <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage >= totalPages} className="rounded-2xl border border-[#e9e2d3] bg-white px-4 py-2 text-sm font-black text-[#71717a] shadow-sm transition hover:-translate-y-0.5 hover:border-[#f4c542]/50 hover:bg-[#fff9e8] hover:text-[#050505] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:bg-white disabled:hover:text-[#71717a]">
                  {t.next}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingProduct(null); resetForm(); }} title={editingProduct ? t.editProduct : t.newProduct}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t.productName} value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />

          <Select
            label={t.unit}
            value={formData.unidad}
            onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
            options={[
              { value: 'unidad', label: t.units.unidad },
              { value: 'kg', label: t.units.kg },
              { value: 'g', label: t.units.g },
              { value: 'lb', label: t.units.lb },
              { value: 'oz', label: t.units.oz },
              { value: 'metro', label: t.units.metro },
              { value: 'cm', label: t.units.cm },
              { value: 'pulgada', label: t.units.pulgada },
              { value: 'pie', label: t.units.pie },
              { value: 'yarda', label: t.units.yarda },
              { value: 'litro', label: t.units.litro },
              { value: 'ml', label: t.units.ml },
              { value: 'galon', label: t.units.galon },
              { value: 'paquete', label: t.units.paquete },
              { value: 'caja', label: t.units.caja },
              { value: 'bolsa', label: t.units.bolsa },
              { value: 'botella', label: t.units.botella },
              { value: 'lata', label: t.units.lata },
              { value: 'carton', label: t.units.carton },
              { value: 'docena', label: t.units.docena },
              { value: 'par', label: t.units.par },
              { value: 'rollo', label: t.units.rollo },
              { value: 'servicio', label: t.units.servicio },
              { value: 'hora', label: t.units.hora }
            ]}
          />

          {roleFlags.isOwner && providerOptions.length > 0 && (
            <Select
              label={t.provider}
              value={providerOptions.includes(formData.proveedor.trim()) ? formData.proveedor.trim() : ''}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              options={[
                { value: '', label: t.noProvider },
                ...providerOptions.map((provider) => ({ value: provider, label: provider }))
              ]}
            />
          )}

          {roleFlags.isOwner && (
            <Input
              label={t.provider}
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
              placeholder={t.providerPlaceholder}
            />
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label={t.salePrice}
              type="number"
              step="0.01"
              value={formData.precio}
              onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
              onBlur={(e) => setFormData({ ...formData, precio: normalizeMoneyInput(e.target.value) })}
              required
            />
            {roleFlags.isOwner && (
              <Input
                label={t.purchaseCost}
                type="number"
                step="0.01"
                value={formData.costo}
                onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                onBlur={(e) => setFormData({ ...formData, costo: normalizeMoneyInput(e.target.value) })}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label={t.currentStock} type="number" step="0.01" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} required />
            <Input label={t.minimumStock} type="number" step="0.01" value={formData.minimo} onChange={(e) => setFormData({ ...formData, minimo: e.target.value })} required />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); setEditingProduct(null); resetForm(); }}>{t.cancel}</Button>
            <Button type="submit">{editingProduct ? t.update : t.create} {t.productSingular}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!stockAdjustProduct} onClose={closeAddStockModal} title={t.addStockTitle}>
        {stockAdjustProduct && (
          <form onSubmit={handleAddStock} className="space-y-4">
            <p className="text-sm font-semibold text-[#71717a]">{t.addStockDescription}</p>

            <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
              <p className="text-lg font-black text-[#050505]">{stockAdjustProduct.nombre}</p>
              <p className="mt-1 text-sm font-bold uppercase tracking-[0.12em] text-[#8a6a16]">
                {t.stock}: {Number(stockAdjustProduct.stock || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })} {stockAdjustProduct.unidad || t.defaultUnit}
              </p>
            </div>

            <Input
              label={t.quantityToAdd}
              type="number"
              step="0.01"
              min="0"
              value={stockAdjustAmount}
              onChange={(e) => setStockAdjustAmount(e.target.value)}
              placeholder={t.quantityPlaceholder}
              required
              autoFocus
            />

            {stockAdjustAmount && Number(stockAdjustAmount) > 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-emerald-700">
                  {t.newStockPreview}: {(Number(stockAdjustProduct.stock || 0) + Number(stockAdjustAmount)).toLocaleString('en-US', { maximumFractionDigits: 2 })} {stockAdjustProduct.unidad || t.defaultUnit}
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeAddStockModal}>{t.cancel}</Button>
              <Button type="submit" disabled={addingStock}>{addingStock ? t.updating : t.addStockConfirm}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={showMassUpdateModal}
        onClose={() => {
          setShowMassUpdateModal(false);
          setMassUpdateData({ adjustmentType: 'percentage', adjustmentValue: '', operation: 'increase' });
        }}
        title={t.massUpdateTitle}
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#f4c542]/30 bg-[#fff4c7] p-4 shadow-sm">
            <p className="text-sm font-semibold text-[#8a6a16]">
              {t.massWarningStart} ({products.length.toLocaleString('en-US')} {t.productsCount}). {t.massWarningEnd}
            </p>
          </div>

          <div>
            <label className="mb-2.5 block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.operationType}</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setMassUpdateData({ ...massUpdateData, operation: 'increase' })} className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-black transition-all ${massUpdateData.operation === 'increase' ? 'border-[#050505] bg-[#050505] text-[#f4c542] shadow-[0_14px_34px_rgba(0,0,0,0.22)]' : 'border-[#e9e2d3] bg-white text-[#71717a] hover:border-[#f4c542]/40 hover:bg-[#fff9e8] hover:text-[#050505]'}`}>
                <TrendingUp className="shrink-0" size={20} />
                <span className="font-medium">{t.increase}</span>
              </button>
              <button type="button" onClick={() => setMassUpdateData({ ...massUpdateData, operation: 'decrease' })} className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-black transition-all ${massUpdateData.operation === 'decrease' ? 'border-red-500 bg-red-50 text-red-700 shadow-[0_14px_34px_rgba(220,38,38,0.14)]' : 'border-[#e9e2d3] bg-white text-[#71717a] hover:border-red-200 hover:bg-red-50 hover:text-red-700'}`}>
                <TrendingDown className="shrink-0" size={20} />
                <span className="font-medium">{t.decrease}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2.5 block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.adjustmentType}</label>
            <Select value={massUpdateData.adjustmentType} onChange={(e) => setMassUpdateData({ ...massUpdateData, adjustmentType: e.target.value })} options={[{ value: 'percentage', label: t.percentage }, { value: 'fixed', label: t.fixedAmount }]} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{massUpdateData.adjustmentType === 'percentage' ? t.percentageLabel : t.amountLabel}</label>
            <Input type="number" placeholder={massUpdateData.adjustmentType === 'percentage' ? t.percentagePlaceholder : t.amountPlaceholder} value={massUpdateData.adjustmentValue} onChange={(e) => setMassUpdateData({ ...massUpdateData, adjustmentValue: e.target.value })} min="0" step={massUpdateData.adjustmentType === 'percentage' ? '0.1' : '1'} />
          </div>

          {massUpdateData.adjustmentValue && (
            <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 shadow-sm">
              <p className="mb-2 text-sm font-black text-[#050505]">{t.preview}</p>
              <div className="space-y-1 text-sm font-medium text-[#3f3f46]">
                {products.slice(0, 3).map((product) => {
                  const value = Number(massUpdateData.adjustmentValue);
                  let newPrice = Number(product.precio || 0);

                  if (massUpdateData.adjustmentType === 'percentage') {
                    const adjustment = (newPrice * value) / 100;
                    newPrice = massUpdateData.operation === 'increase' ? newPrice + adjustment : newPrice - adjustment;
                  } else {
                    newPrice = massUpdateData.operation === 'increase' ? newPrice + value : newPrice - value;
                  }

                  newPrice = Math.max(0, newPrice);

                  return (
                    <div key={product.id} className="flex min-w-0 flex-col gap-1 text-[#3f3f46] sm:flex-row sm:justify-between sm:gap-4">
                      <span className="min-w-0 break-words">{product.nombre}:</span>
                      <span className="whitespace-nowrap">{formatMoney(product.precio, currencySettings)} → {formatMoney(newPrice, currencySettings)}</span>
                    </div>
                  );
                })}
                {products.length > 3 && <p className="italic text-[#8a6a16]">{t.moreProductsPrefix} {(products.length - 3).toLocaleString('en-US')} {t.moreProducts}</p>}
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => { setShowMassUpdateModal(false); setMassUpdateData({ adjustmentType: 'percentage', adjustmentValue: '', operation: 'increase' }); }}>{t.cancel}</Button>
            <Button type="button" onClick={handleMassUpdate} disabled={loading || !massUpdateData.adjustmentValue} variant={massUpdateData.operation === 'increase' ? 'primary' : 'danger'}>{loading ? t.updating : t.applyChanges}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ProductMetricCard({
  title,
  value,
  icon: Icon,
  iconClass,
  valueClass = 'text-[#050505]'
}: {
  title: string;
  value: string;
  icon: ElementType;
  iconClass: string;
  valueClass?: string;
}) {
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-[1.75rem] border border-[#e9e2d3]/85 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/35 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,15,15,0.09)] sm:p-5 2xl:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.09),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="mb-4 max-w-[13rem] text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6a16] sm:text-[11px]">{title}</p>
          <p className={`max-w-full whitespace-nowrap text-[clamp(1.45rem,1.85vw,2.15rem)] font-black leading-[0.95] tracking-tight tabular-nums ${valueClass}`}>{value}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.05rem] border border-white/10 shadow-[0_18px_40px_rgba(15,15,15,0.12)] transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 sm:h-12 sm:w-12 ${iconClass}`}>
          <Icon className="h-5 w-5 shrink-0" />
        </div>
      </div>
    </div>
  );
}
