

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ElementType, FormEvent } from 'react';
import { AlertTriangle, ArrowRight, Calculator, DollarSign, Package, PackageOpen, Plus, RefreshCw, Search, ShoppingBag, Sparkles, Truck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getUserRoleFlags } from '../utils/roles';
import { logAudit } from '../utils/audit';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';

type Producto = {
  id: number;
  negocio_id: string | null;
  nombre: string;
  unidad: string | null;
  precio: number | null;
  costo: number | null;
  stock: number | null;
  minimo: number | null;
};

type Compra = {
  id: number;
  negocio_id: string | null;
  proveedor: string | null;
  producto_id: number | null;
  fecha: string;
  cantidad: number;
  costo: number | null;
  total: number | null;
  created_at?: string | null;
  productos?: {
    nombre: string;
    unidad: string | null;
  } | null;
};

type InventoryTransformation = {
  id: number;
  negocio_id: string;
  source_product_id: number | null;
  destination_product_id: number | null;
  source_product_name: string;
  destination_product_name: string;
  source_quantity: number;
  units_per_source: number;
  total_units: number;
  damaged_quantity: number;
  destination_quantity: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  source_product?: Producto | null;
  destination_product?: Producto | null;
};


const purchasesCopy = {
  es: {
    loading: 'Cargando compras...',
    missingTitle: 'Usuario sin negocio asignado',
    missingText: 'El login funciona, pero este usuario todavía no existe en la tabla usuarios o no tiene un negocio_id asignado.',
    title: 'Compras',
    sellerSubtitle: 'Acceso restringido al módulo de compras',
    adminSubtitle: 'Registra compras y actualiza el inventario automáticamente',
    newPurchase: 'Nueva Compra',
    transformStock: 'Descomponer stock',
    transformStockTitle: 'Descomponer inventario',
    transformStockDescription: 'Convierte empaques completos en unidades sueltas y registra las unidades averiadas como merma.',
    sourceProduct: 'Producto de origen',
    destinationProduct: 'Producto de destino',
    selectSourceProduct: 'Selecciona el producto empacado',
    selectDestinationProduct: 'Selecciona el producto por unidad',
    packagesToOpen: 'Cantidad de empaques a abrir',
    unitsPerPackage: 'Unidades dentro de cada empaque',
    damagedUnits: 'Unidades averiadas',
    notes: 'Motivo u observación',
    notesPlaceholder: 'Ej. Dos galones con envase roto',
    containedUnits: 'Unidades contenidas',
    usableUnits: 'Unidades aprovechables',
    shrinkage: 'Merma',
    stockPreview: 'Vista previa del movimiento',
    before: 'Antes',
    after: 'Después',
    transformConfirmTitle: 'Confirmar transformación',
    transformConfirmText: 'Transformar stock',
    transformConfirmMessage: 'Esta operación descontará el producto empacado y agregará únicamente las unidades aprovechables al producto de destino.',
    transformSuccess: 'Inventario transformado y merma registrada correctamente',
    transformError: 'Error al transformar el inventario',
    sameProductError: 'Selecciona productos de origen y destino diferentes',
    insufficientStockError: 'La cantidad a abrir supera el stock disponible',
    invalidTransformationError: 'Completa cantidades válidas y deja al menos una unidad aprovechable',
    transformationHistory: 'Historial de transformaciones',
    transformationHistoryDescription: 'Descomposiciones y mermas registradas recientemente',
    noTransformations: 'Todavía no hay transformaciones de inventario',
    transformationNotificationTitle: 'Inventario transformado',
    totalPurchases: 'Total Compras',
    purchases: 'Compras',
    units: 'Unidades',
    suppliers: 'Proveedores',
    averagePurchase: 'Promedio compra',
    searchPlaceholder: 'Buscar por proveedor, producto o fecha...',
    history: 'Historial de compras',
    registeredPurchases: 'compras registradas',
    refresh: 'Actualizar',
    exportCsv: 'Exportar CSV',
    from: 'Desde',
    to: 'Hasta',
    allSuppliers: 'Todos los proveedores',
    page: 'Página',
    previous: 'Anterior',
    next: 'Siguiente',
    of: 'de',
    id: 'ID',
    date: 'Fecha',
    supplier: 'Proveedor',
    product: 'Producto',
    quantity: 'Cantidad',
    cost: 'Costo',
    total: 'Total',
    noSupplier: 'Sin proveedor',
    deletedProduct: 'Producto eliminado',
    noPurchases: 'No se encontraron compras',
    supplierPlaceholder: 'Ej. Distribuidora Central',
    selectProduct: 'Selecciona un producto',
    currentStock: 'Stock actual',
    selectedProduct: 'Producto seleccionado',
    currentCost: 'Costo actual',
    unit: 'unidad',
    unitCost: 'Costo Unitario',
    purchaseTotal: 'Total de compra',
    cancel: 'Cancelar',
    saving: 'Guardando...',
    registerPurchase: 'Registrar Compra',
    loadError: 'Error al cargar las compras',
    sellerReadOnly: 'No tienes permiso para acceder a compras',
    noBusiness: 'No se encontró el negocio del usuario',
    selectProductError: 'Selecciona un producto',
    selectDateError: 'Selecciona una fecha',
    quantityError: 'La cantidad debe ser mayor que cero',
    costError: 'El costo no puede ser negativo',
    pendingCost: 'Pendiente',
    completeCost: 'Completar costo',
    completeCostTitle: 'Completar Costo de Compra',
    completeCostDescription: 'Esta compra fue registrada sin costo. Agrega el costo y proveedor para completarla.',
    productNotFound: 'Producto no encontrado',
    confirmTitle: 'Registrar compra',
    confirmText: 'Registrar compra',
    confirmMessageStart: '¿Deseas registrar esta compra y aumentar el stock de',
    confirmMessageMiddle: 'en',
    purchaseSuccess: 'Compra registrada y stock actualizado correctamente',
        purchaseNotificationTitle: 'Compra registrada',
    purchaseNotificationMessage: 'registró una compra de',
    purchaseNotificationFor: 'para',
    stockNotificationTitle: 'Stock actualizado por compra',
    stockNotificationMessage: 'aumentó su stock a',
    saveError: 'Error al registrar la compra',
  },
  en: {
    loading: 'Loading purchases...',
    missingTitle: 'User has no assigned business',
    missingText: 'Login works, but this user does not exist in the usuarios table yet or does not have an assigned negocio_id.',
    title: 'Purchases',
    sellerSubtitle: 'Restricted access to the purchases module',
    adminSubtitle: 'Register purchases and update inventory automatically',
    newPurchase: 'New Purchase',
    transformStock: 'Break down stock',
    transformStockTitle: 'Break down inventory',
    transformStockDescription: 'Convert full packages into loose units and record damaged units as shrinkage.',
    sourceProduct: 'Source product',
    destinationProduct: 'Destination product',
    selectSourceProduct: 'Select the packaged product',
    selectDestinationProduct: 'Select the unit product',
    packagesToOpen: 'Packages to open',
    unitsPerPackage: 'Units inside each package',
    damagedUnits: 'Damaged units',
    notes: 'Reason or notes',
    notesPlaceholder: 'Ex. Two gallons with broken containers',
    containedUnits: 'Contained units',
    usableUnits: 'Usable units',
    shrinkage: 'Shrinkage',
    stockPreview: 'Movement preview',
    before: 'Before',
    after: 'After',
    transformConfirmTitle: 'Confirm transformation',
    transformConfirmText: 'Transform stock',
    transformConfirmMessage: 'This operation will deduct the packaged product and add only usable units to the destination product.',
    transformSuccess: 'Inventory transformed and shrinkage recorded successfully',
    transformError: 'Error transforming inventory',
    sameProductError: 'Select different source and destination products',
    insufficientStockError: 'The quantity to open exceeds available stock',
    invalidTransformationError: 'Enter valid quantities and leave at least one usable unit',
    transformationHistory: 'Transformation history',
    transformationHistoryDescription: 'Recently recorded breakdowns and shrinkage',
    noTransformations: 'There are no inventory transformations yet',
    transformationNotificationTitle: 'Inventory transformed',
    totalPurchases: 'Total Purchases',
    purchases: 'Purchases',
    units: 'Units',
    suppliers: 'Suppliers',
    averagePurchase: 'Average purchase',
    searchPlaceholder: 'Search by supplier, product, or date...',
    history: 'Purchase history',
    registeredPurchases: 'registered purchases',
    refresh: 'Refresh',
    exportCsv: 'Export CSV',
    from: 'From',
    to: 'To',
    allSuppliers: 'All suppliers',
    page: 'Page',
    previous: 'Previous',
    next: 'Next',
    of: 'of',
    id: 'ID',
    date: 'Date',
    supplier: 'Supplier',
    product: 'Product',
    quantity: 'Quantity',
    cost: 'Cost',
    total: 'Total',
    noSupplier: 'No supplier',
    deletedProduct: 'Deleted product',
    noPurchases: 'No purchases found',
    supplierPlaceholder: 'Ex. Central Distributor',
    selectProduct: 'Select a product',
    currentStock: 'Current stock',
    selectedProduct: 'Selected product',
    currentCost: 'Current cost',
    unit: 'unit',
    unitCost: 'Unit Cost',
    purchaseTotal: 'Purchase total',
    cancel: 'Cancel',
    saving: 'Saving...',
    registerPurchase: 'Register Purchase',
    loadError: 'Error loading purchases',
    sellerReadOnly: 'You do not have permission to access purchases',
    noBusiness: 'The user business was not found',
    selectProductError: 'Select a product',
    selectDateError: 'Select a date',
    quantityError: 'Quantity must be greater than zero',
    costError: 'Cost cannot be negative',
    pendingCost: 'Pending',
    completeCost: 'Complete cost',
    completeCostTitle: 'Complete Purchase Cost',
    completeCostDescription: 'This purchase was registered without cost. Add the cost and supplier to complete it.',
    productNotFound: 'Product not found',
    confirmTitle: 'Register purchase',
    confirmText: 'Register purchase',
    confirmMessageStart: 'Do you want to register this purchase and increase the stock of',
    confirmMessageMiddle: 'by',
    purchaseSuccess: 'Purchase registered and stock updated successfully',
        purchaseNotificationTitle: 'Purchase registered',
    purchaseNotificationMessage: 'registered a purchase of',
    purchaseNotificationFor: 'for',
    stockNotificationTitle: 'Stock updated by purchase',
    stockNotificationMessage: 'increased its stock to',
    saveError: 'Error registering purchase',
  },
} as const;

type CurrencySettings = {
  code: string;
  symbol: string;
};

const DEFAULT_CURRENCY: CurrencySettings = {
  code: 'USD',
  symbol: '$'
};

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

function formatPurchaseCode(id: number) {
  return `PUR-${String(id).padStart(4, '0')}`;
}

const PURCHASES_PER_PAGE = 12;

export default function PurchasesPage() {
  const { user, userProfile } = useAuth();
  const roleFlags = getUserRoleFlags(userProfile);
  const canManagePurchases = roleFlags.isOwner || roleFlags.isAdmin || roleFlags.isSuperAdmin;
  const { showToast, showConfirm } = useNotification();

  const [negocioId, setNegocioId] = useState<string | null>(null);
  const [products, setProducts] = useState<Producto[]>([]);
  const [purchases, setPurchases] = useState<Compra[]>([]);
  const [transformations, setTransformations] = useState<InventoryTransformation[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<Compra[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransformationModalOpen, setIsTransformationModalOpen] = useState(false);
  const [savingTransformation, setSavingTransformation] = useState(false);
  const [missingNegocio, setMissingNegocio] = useState(false);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY);
  const [currentPage, setCurrentPage] = useState(1);
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [completeCostPurchase, setCompleteCostPurchase] = useState<Compra | null>(null);
  const [completeCostAmount, setCompleteCostAmount] = useState('');
  const [completeCostProveedor, setCompleteCostProveedor] = useState('');
  const [savingCost, setSavingCost] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { language } = useLanguage();
  const t = purchasesCopy[language];

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

  const today = new Date().toLocaleDateString('en-CA');

  const [formData, setFormData] = useState({
    proveedor: '',
    producto_id: '',
    fecha: today,
    cantidad: '',
    costo: ''
  });

  const [transformationData, setTransformationData] = useState({
    source_product_id: '',
    destination_product_id: '',
    source_quantity: '',
    units_per_source: '',
    damaged_quantity: '0',
    notes: ''
  });

  useEffect(() => {
    const search = searchTerm.toLowerCase().trim();

    const filtered = purchases.filter((purchase) => {
      const supplierName = purchase.proveedor || t.noSupplier;
      const matchesSearch =
        supplierName.toLowerCase().includes(search) ||
        (purchase.productos?.nombre || '').toLowerCase().includes(search) ||
        purchase.fecha.includes(search);
      const matchesSupplier = supplierFilter === 'all' || supplierName === supplierFilter;
      const matchesFrom = !dateFrom || purchase.fecha >= dateFrom;
      const matchesTo = !dateTo || purchase.fecha <= dateTo;

      return matchesSearch && matchesSupplier && matchesFrom && matchesTo;
    });

    setFilteredPurchases(filtered);
    setCurrentPage(1);
  }, [searchTerm, purchases, supplierFilter, dateFrom, dateTo, t.noSupplier]);

  const selectedProduct = useMemo(() => {
    return products.find((product) => product.id.toString() === formData.producto_id) || null;
  }, [products, formData.producto_id]);

  const sourceTransformationProduct = useMemo(() => {
    return products.find((product) => product.id.toString() === transformationData.source_product_id) || null;
  }, [products, transformationData.source_product_id]);

  const destinationTransformationProduct = useMemo(() => {
    return products.find((product) => product.id.toString() === transformationData.destination_product_id) || null;
  }, [products, transformationData.destination_product_id]);

  const transformationPreview = useMemo(() => {
    const sourceQuantity = Number(transformationData.source_quantity || 0);
    const unitsPerSource = Number(transformationData.units_per_source || 0);
    const damagedQuantity = Number(transformationData.damaged_quantity || 0);
    const totalUnits = sourceQuantity * unitsPerSource;
    const destinationQuantity = totalUnits - damagedQuantity;

    return {
      sourceQuantity,
      unitsPerSource,
      damagedQuantity,
      totalUnits,
      destinationQuantity,
      sourceStockAfter: Number(sourceTransformationProduct?.stock || 0) - sourceQuantity,
      destinationStockAfter: Number(destinationTransformationProduct?.stock || 0) + destinationQuantity
    };
  }, [destinationTransformationProduct?.stock, sourceTransformationProduct?.stock, transformationData]);

  const isTransformationValid = Boolean(
    sourceTransformationProduct &&
    destinationTransformationProduct &&
    sourceTransformationProduct.id !== destinationTransformationProduct.id &&
    Number.isFinite(transformationPreview.sourceQuantity) &&
    Number.isFinite(transformationPreview.unitsPerSource) &&
    Number.isFinite(transformationPreview.damagedQuantity) &&
    transformationPreview.sourceQuantity > 0 &&
    transformationPreview.unitsPerSource > 0 &&
    transformationPreview.damagedQuantity >= 0 &&
    transformationPreview.destinationQuantity > 0 &&
    transformationPreview.sourceQuantity <= Number(sourceTransformationProduct.stock || 0)
  );

  const formTotal = useMemo(() => {
    return Number(formData.cantidad || 0) * Number(formData.costo || 0);
  }, [formData.cantidad, formData.costo]);

  const metrics = useMemo(() => {
    const totalCompras = purchases.reduce((sum, purchase) => sum + Number(purchase.total || 0), 0);
    const totalUnidades = purchases.reduce((sum, purchase) => sum + Number(purchase.cantidad || 0), 0);
    const proveedores = new Set(purchases.map((purchase) => purchase.proveedor || t.noSupplier));

    return {
      totalCompras,
      totalUnidades,
      cantidadCompras: purchases.length,
      promedioCompra: purchases.length > 0 ? totalCompras / purchases.length : 0,
      proveedores: proveedores.size
    };
  }, [purchases, t.noSupplier]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / PURCHASES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * PURCHASES_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + PURCHASES_PER_PAGE, filteredPurchases.length);

  const visiblePurchases = useMemo(() => {
    return filteredPurchases.slice(pageStartIndex, pageEndIndex);
  }, [filteredPurchases, pageStartIndex, pageEndIndex]);

  const suppliers = useMemo(() => {
    return Array.from(new Set(purchases.map((purchase) => purchase.proveedor || t.noSupplier))).sort();
  }, [purchases, t.noSupplier]);

  function exportPurchasesCsv() {
    const headers = [t.id, t.date, t.supplier, t.product, t.quantity, t.cost, t.total];
    const rows = filteredPurchases.map((purchase) => [
      formatPurchaseCode(purchase.id),
      purchase.fecha,
      `"${purchase.proveedor || t.noSupplier}"`,
      `"${purchase.productos?.nombre || t.deletedProduct}"`,
      `"${Number(purchase.cantidad || 0).toLocaleString('en-US')} ${purchase.productos?.unidad || ''}"`,
      `"${formatMoney(purchase.costo, currencySettings)}"`,
      `"${formatMoney(purchase.total, currencySettings)}"`
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `compras-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (!canManagePurchases) {
        setProducts([]);
        setPurchases([]);
        setTransformations([]);
        setFilteredPurchases([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setMissingNegocio(false);
        return;
      }

      if (!user) {
        setProducts([]);
        setPurchases([]);
        setTransformations([]);
        setFilteredPurchases([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setMissingNegocio(false);
        return;
      }

      const currentNegocioId = userProfile?.negocio_id || null;
      setNegocioId(currentNegocioId);

      if (!currentNegocioId) {
        setProducts([]);
        setPurchases([]);
        setTransformations([]);
        setFilteredPurchases([]);
        setCurrencySettings(DEFAULT_CURRENCY);
        setMissingNegocio(true);
        return;
      }

      const [productsResult, purchasesResult, transformationsResult, businessResult] = await Promise.all([
        supabase
          .rpc('get_productos_for_business', { p_negocio_id: currentNegocioId })
          .order('nombre', { ascending: true }),
        supabase
          .rpc('get_compras_for_business', { p_negocio_id: currentNegocioId })
          .order('created_at', { ascending: false }),
        supabase
          .from('inventory_transformations')
          .select('id, negocio_id, source_product_id, destination_product_id, source_product_name, destination_product_name, source_quantity, units_per_source, total_units, damaged_quantity, destination_quantity, notes, created_by, created_at')
          .eq('negocio_id', currentNegocioId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('negocios')
          .select('*')
          .eq('id', currentNegocioId)
          .maybeSingle()
      ]);

      if (productsResult.error) throw productsResult.error;
      if (purchasesResult.error) throw purchasesResult.error;
      if (transformationsResult.error) throw transformationsResult.error;
      if (businessResult.error) throw businessResult.error;

      const loadedProducts = (productsResult.data || []) as Producto[];
      const productsById = new Map(loadedProducts.map((product) => [product.id, product]));

      const normalizedPurchases = ((purchasesResult.data || []) as Compra[]).map((purchase) => {
        const product = purchase.producto_id ? productsById.get(purchase.producto_id) : null;
        return {
          ...purchase,
          productos: product ? { nombre: product.nombre, unidad: product.unidad } : null
        };
      });

      const normalizedTransformations = ((transformationsResult.data || []) as InventoryTransformation[]).map((transformation) => ({
        ...transformation,
        source_product: transformation.source_product_id ? productsById.get(transformation.source_product_id) || null : null,
        destination_product: transformation.destination_product_id ? productsById.get(transformation.destination_product_id) || null : null
      }));

      setProducts(loadedProducts);
      setPurchases(normalizedPurchases);
      setTransformations(normalizedTransformations);
      setFilteredPurchases(normalizedPurchases);
      setCurrencySettings(normalizeCurrencySettings(businessResult.data));
      setMissingNegocio(false);
    } catch (error) {
      console.error('Error loading purchases:', error);
      showToast(t.loadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [canManagePurchases, showToast, t.loadError, user, userProfile?.negocio_id]);

  useEffect(() => {
    if (!canManagePurchases) {
      setLoading(false);
      return;
    }

    loadData();
  }, [canManagePurchases, loadData, roleFlags.role]);

  function resetForm() {
    setFormData({
      proveedor: '',
      producto_id: '',
      fecha: today,
      cantidad: '',
      costo: ''
    });
  }

  function resetTransformationForm() {
    setTransformationData({
      source_product_id: '',
      destination_product_id: '',
      source_quantity: '',
      units_per_source: '',
      damaged_quantity: '0',
      notes: ''
    });
  }

  async function handleTransformationSubmit(e: FormEvent) {
    e.preventDefault();

    if (!canManagePurchases || savingTransformation) return;

    if (!negocioId || !user?.id) {
      showToast(t.noBusiness, 'error');
      return;
    }

    if (!sourceTransformationProduct || !destinationTransformationProduct) {
      showToast(t.productNotFound, 'error');
      return;
    }

    if (sourceTransformationProduct.id === destinationTransformationProduct.id) {
      showToast(t.sameProductError, 'error');
      return;
    }

    const {
      sourceQuantity,
      unitsPerSource,
      damagedQuantity,
      totalUnits,
      destinationQuantity,
      sourceStockAfter,
      destinationStockAfter
    } = transformationPreview;

    if (
      !Number.isFinite(sourceQuantity) ||
      !Number.isFinite(unitsPerSource) ||
      !Number.isFinite(damagedQuantity) ||
      sourceQuantity <= 0 ||
      unitsPerSource <= 0 ||
      damagedQuantity < 0 ||
      destinationQuantity <= 0
    ) {
      showToast(t.invalidTransformationError, 'error');
      return;
    }

    if (sourceQuantity > Number(sourceTransformationProduct.stock || 0)) {
      showToast(t.insufficientStockError, 'error');
      return;
    }

    setIsTransformationModalOpen(false);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const confirmed = await showConfirm({
      title: t.transformConfirmTitle,
      message: `${t.transformConfirmMessage} ${sourceTransformationProduct.nombre}: ${Number(sourceTransformationProduct.stock || 0).toLocaleString('en-US')} → ${sourceStockAfter.toLocaleString('en-US')}. ${destinationTransformationProduct.nombre}: ${Number(destinationTransformationProduct.stock || 0).toLocaleString('en-US')} → ${destinationStockAfter.toLocaleString('en-US')}. ${t.shrinkage}: ${damagedQuantity.toLocaleString('en-US')}.`,
      confirmText: t.transformConfirmText,
      cancelText: t.cancel,
      variant: 'warning'
    });

    if (!confirmed) {
      setIsTransformationModalOpen(true);
      return;
    }

    try {
      setSavingTransformation(true);

      const { data, error } = await supabase.rpc('transform_inventory', {
        p_source_product_id: sourceTransformationProduct.id,
        p_destination_product_id: destinationTransformationProduct.id,
        p_source_quantity: sourceQuantity,
        p_units_per_source: unitsPerSource,
        p_damaged_quantity: damagedQuantity,
        p_notes: transformationData.notes.trim() || null
      });

      if (error) throw error;

      const result = (data || {}) as Record<string, unknown>;
      const transformationId = Number(result.id || 0);

      await logAudit({
        negocio_id: negocioId,
        user_id: user.id,
        user_name: loggedUserName,
        user_email: loggedUserEmail || undefined,
        user_role: loggedUserRole || undefined,
        action: 'TRANSFORM_INVENTORY',
        module: 'PURCHASES',
        record_id: transformationId || undefined,
        description: `${loggedUserName} transformó ${sourceQuantity} ${sourceTransformationProduct.unidad || ''} de ${sourceTransformationProduct.nombre} en ${destinationQuantity} ${destinationTransformationProduct.unidad || ''} de ${destinationTransformationProduct.nombre}`,
        old_data: {
          source_product_id: sourceTransformationProduct.id,
          source_stock: Number(sourceTransformationProduct.stock || 0),
          destination_product_id: destinationTransformationProduct.id,
          destination_stock: Number(destinationTransformationProduct.stock || 0)
        },
        new_data: {
          source_stock: sourceStockAfter,
          destination_stock: destinationStockAfter,
          source_quantity: sourceQuantity,
          units_per_source: unitsPerSource,
          total_units: totalUnits,
          damaged_quantity: damagedQuantity,
          destination_quantity: destinationQuantity,
          notes: transformationData.notes.trim() || null
        }
      });

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          negocio_id: negocioId,
          user_id: null,
          audience: 'admin',
          title: t.transformationNotificationTitle,
          message: `${loggedUserName}: ${sourceQuantity.toLocaleString('en-US')} ${sourceTransformationProduct.nombre} → ${destinationQuantity.toLocaleString('en-US')} ${destinationTransformationProduct.nombre}. ${t.shrinkage}: ${damagedQuantity.toLocaleString('en-US')}.`,
          type: damagedQuantity > 0 ? 'warning' : 'info',
          category: 'inventory',
          link: 'purchases',
          read: false
        });

      if (notificationError) {
        console.warn('Inventory transformation notification was not created:', notificationError);
      }

      showToast(t.transformSuccess, 'success');
      resetTransformationForm();
      await loadData();
    } catch (error) {
      console.error('Error transforming inventory:', error);
      showToast(t.transformError, 'error');
    } finally {
      setSavingTransformation(false);
    }
  }

  function openCompleteCostModal(purchase: Compra) {
    if (!roleFlags.isOwner) return;
    setCompleteCostPurchase(purchase);
    setCompleteCostAmount('');
    setCompleteCostProveedor('');
  }

  function closeCompleteCostModal() {
    setCompleteCostPurchase(null);
    setCompleteCostAmount('');
    setCompleteCostProveedor('');
  }

  async function handleCompleteCost(e: FormEvent) {
    e.preventDefault();
    if (!roleFlags.isOwner || !completeCostPurchase) return;

    const costo = Number(completeCostAmount || 0);
    if (!completeCostAmount || costo < 0) {
      showToast(t.costError, 'error');
      return;
    }

    try {
      setSavingCost(true);
      const { error } = await supabase.rpc('set_purchase_cost', {
        p_compra_id: completeCostPurchase.id,
        p_costo: costo,
        p_proveedor: completeCostProveedor.trim() || null
      });

      if (error) throw error;

      if (user?.id && negocioId) {
        await logAudit({
          negocio_id: negocioId,
          user_id: user.id,
          user_name: loggedUserName,
          user_email: loggedUserEmail || undefined,
          user_role: loggedUserRole || undefined,
          action: 'COMPLETE_PURCHASE_COST',
          module: 'PURCHASES',
          record_id: completeCostPurchase.id,
          description: `${loggedUserName} completó el costo de la compra ${formatPurchaseCode(completeCostPurchase.id)}`,
          new_data: { costo, proveedor: completeCostProveedor.trim() || null }
        });
      }

      showToast(t.purchaseSuccess, 'success');
      closeCompleteCostModal();
      await loadData();
    } catch (error) {
      console.error('Error completing purchase cost:', error);
      showToast(t.saveError, 'error');
    } finally {
      setSavingCost(false);
    }
  }

  function handleProductChange(productId: string) {
    const product = products.find((item) => item.id.toString() === productId);

    setFormData({
      ...formData,
      producto_id: productId,
      costo: product?.costo ? Number(product.costo).toString() : formData.costo
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canManagePurchases) {
      showToast(t.sellerReadOnly, 'error');
      return;
    }

    if (saving) return;

    if (!negocioId) {
      showToast(t.noBusiness, 'error');
      return;
    }

    if (!user?.id) {
      showToast(t.sellerReadOnly, 'error');
      return;
    }

    if (!formData.producto_id) {
      showToast(t.selectProductError, 'error');
      return;
    }

    if (!formData.fecha) {
      showToast(t.selectDateError, 'error');
      return;
    }

    const cantidad = Number(formData.cantidad || 0);
    const costo = roleFlags.isOwner ? Number(formData.costo || 0) : null;

    if (cantidad <= 0) {
      showToast(t.quantityError, 'error');
      return;
    }

    if (costo !== null && costo < 0) {
      showToast(t.costError, 'error');
      return;
    }

    const product = products.find((item) => item.id.toString() === formData.producto_id);

    if (!product) {
      showToast(t.productNotFound, 'error');
      return;
    }

    setIsModalOpen(false);

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const confirmed = await showConfirm({
      title: t.confirmTitle,
      message: `${t.confirmMessageStart} ${product.nombre} ${t.confirmMessageMiddle} ${cantidad.toLocaleString('en-US')}?`,
      confirmText: t.confirmText,
      cancelText: t.cancel,
      variant: 'warning'
    });

    if (!confirmed) {
      setIsModalOpen(true);
      return;
    }

    try {
      setSaving(true);

      const total = costo !== null ? cantidad * costo : null;
      const proveedor = roleFlags.isOwner ? (formData.proveedor.trim() || null) : null;

      const { data: compraId, error: purchaseError } = await supabase.rpc('create_purchase', {
        p_producto_id: product.id,
        p_cantidad: cantidad,
        p_costo: costo,
        p_proveedor: proveedor,
        p_fecha: formData.fecha
      });

      if (purchaseError) throw purchaseError;

      const newStock = Number(product.stock || 0) + cantidad;

      await logAudit({
        negocio_id: negocioId,
        user_id: user.id,
        user_name: loggedUserName,
        user_email: loggedUserEmail || undefined,
        user_role: loggedUserRole || undefined,
        action: 'CREATE_PURCHASE',
        module: 'PURCHASES',
        record_id: compraId,
        description: `Compra ${compraId ? formatPurchaseCode(compraId) : ''} registrada por ${loggedUserName}`,
        new_data: {
          compra_id: compraId,
          proveedor,
          producto_id: product.id,
          producto_nombre: product.nombre,
          cantidad,
          costo,
          total,
          stock_anterior: Number(product.stock || 0),
          stock_nuevo: newStock,
          fecha: formData.fecha
        }
      });

      const { error: purchaseNotificationError } = await supabase
        .from('notifications')
        .insert({
          negocio_id: negocioId,
          user_id: null,
          audience: 'admin',
          title: t.purchaseNotificationTitle,
          message: total !== null
            ? `${loggedUserName} ${t.purchaseNotificationMessage} ${formatMoney(total, currencySettings)} ${t.purchaseNotificationFor} ${product.nombre}.`
            : `${loggedUserName} ${t.purchaseNotificationMessage} ${cantidad.toLocaleString('en-US')} ${product.unidad || ''} ${t.purchaseNotificationFor} ${product.nombre}.`,
          type: 'success',
          category: 'purchases',
          link: 'purchases',
          read: false
        });

      if (purchaseNotificationError) {
        console.warn('Purchase notification was not created:', purchaseNotificationError);
      }

      const { error: stockNotificationError } = await supabase
        .from('notifications')
        .insert({
          negocio_id: negocioId,
          user_id: null,
          audience: 'admin',
          title: t.stockNotificationTitle,
          message: `${product.nombre} ${t.stockNotificationMessage} ${newStock.toLocaleString('en-US')} ${product.unidad || ''}.`,
          type: 'info',
          category: 'inventory',
          link: 'products',
          read: false
        });

      if (stockNotificationError) {
        console.warn('Purchase stock notification was not created:', stockNotificationError);
      }
      showToast(t.purchaseSuccess, 'success');
      setIsModalOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving purchase:', error);
      showToast(t.saveError, 'error');
    } finally {
      setSaving(false);
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
          <h1 className="mb-3 text-xl font-serif font-bold text-red-700 sm:text-2xl">
            {t.missingTitle}
          </h1>
          <p className="mb-4 text-sm text-[#71717a] sm:text-base">
            {t.missingText}
          </p>
          <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 text-left text-sm text-[#3f3f46]">
            <p className="mb-2 font-black">User ID:</p>
            <code className="break-all">{user?.id}</code>
          </div>
        </div>
      </div>
    );
  }

  if (!canManagePurchases) {
    return (
      <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#fbfaf7] p-4 sm:p-6">
        <div className="w-full max-w-xl rounded-[2rem] border border-[#f4c542]/35 bg-white/90 p-5 text-center shadow-matmax-soft sm:p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#050505] text-[#f4c542] shadow-[0_16px_36px_rgba(0,0,0,0.16)]">
            <ShoppingBag className="h-6 w-6 shrink-0" />
          </div>
          <h1 className="mb-3 text-xl font-serif font-bold text-[#050505] sm:text-2xl">
            {t.title}
          </h1>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#8a6a16] sm:text-base">
            {t.sellerReadOnly}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 overflow-x-hidden text-[#08080b] sm:space-y-6">
      <section className="relative min-w-0 overflow-hidden rounded-[2rem] border border-[#e9e2d3]/80 bg-[#fffdf8]/85 p-5 shadow-[0_24px_70px_rgba(15,15,15,0.07)] backdrop-blur-2xl sm:p-7 xl:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,197,66,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.9),transparent_42%)]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#f4c542]/60 to-transparent" />
        <div className="relative z-10 grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] xl:items-stretch">
          <div className="flex min-w-0 flex-col justify-between gap-6">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#eadfca] bg-white/75 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6a16] shadow-sm backdrop-blur-xl">
                <Sparkles size={14} />
                MatMax Business Suite
              </div>
              <h1 className="mb-3 text-4xl font-black tracking-tight text-[#050505] sm:text-5xl xl:text-6xl">
                {t.title}
              </h1>
              <p className="max-w-3xl text-sm font-bold uppercase tracking-[0.18em] text-[#71717a] sm:text-base">
                {canManagePurchases ? t.adminSubtitle : t.sellerSubtitle}
              </p>
            </div>


          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3">
            {roleFlags.isOwner && (
              <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#050505] bg-[#050505] p-5 text-white shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.2),transparent_38%)]" />
                <div className="relative flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#f4c542] text-[#050505] shadow-[0_16px_36px_rgba(244,197,66,0.2)]">
                    <ShoppingBag className="h-6 w-6 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#f4c542]">{t.totalPurchases}</p>
                    <p className="break-words text-3xl font-black leading-none text-white sm:text-4xl">
                      {formatMoney(metrics.totalCompras, currencySettings)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {roleFlags.isOwner && (
              <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] border border-[#e9e2d3] bg-white/78 p-4 shadow-sm backdrop-blur-xl">
                <div className="relative flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff4c7] text-[#8a6a16] shadow-[0_16px_36px_rgba(138,106,22,0.14)]">
                    <Calculator className="h-5 w-5 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6a16]">{t.averagePurchase}</p>
                    <p className="break-words text-xl font-black leading-tight text-[#050505] sm:text-2xl">
                      {formatMoney(metrics.promedioCompra, currencySettings)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {canManagePurchases && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
                <Button
                  type="button"
                  className="w-full gap-2 rounded-2xl shadow-[0_18px_45px_rgba(0,0,0,0.16)]"
                  onClick={() => {
                    resetForm();
                    setIsModalOpen(true);
                  }}
                >
                  <Plus className="shrink-0" size={20} />
                  {t.newPurchase}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full gap-2 rounded-2xl border border-[#f4c542]/50 bg-[#fff9e8] text-[#050505] shadow-[0_14px_34px_rgba(138,106,22,0.1)] hover:-translate-y-0.5"
                  onClick={() => {
                    resetTransformationForm();
                    setIsTransformationModalOpen(true);
                  }}
                >
                  <PackageOpen className="shrink-0 text-[#8a6a16]" size={20} />
                  {t.transformStock}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <MetricCard
          title={t.purchases}
          value={metrics.cantidadCompras.toLocaleString('en-US')}
          icon={ShoppingBag}
          color="bg-[#050505] text-[#f4c542]"
        />
        <MetricCard
          title={t.units}
          value={metrics.totalUnidades.toLocaleString('en-US')}
          icon={Package}
          color="bg-[#f6f4ee] text-[#050505]"
        />
        {roleFlags.isOwner && (
          <MetricCard
            title={t.suppliers}
            value={metrics.proveedores.toLocaleString('en-US')}
            icon={Truck}
            color="bg-[#050505] text-[#f4c542]"
          />
        )}
      </div>

      <div className="rounded-[1.6rem] border border-[#e9e2d3] bg-white/92 p-4 shadow-[0_18px_50px_rgba(15,15,15,0.06)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
          <div className="min-w-0 xl:col-span-1">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] opacity-0">
              Search
            </label>
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-4 top-1/2 z-10 shrink-0 -translate-y-1/2 text-[#a1a1aa]" size={18} />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 w-full min-w-0 rounded-2xl border border-[#e9e2d3] bg-white px-4 pl-11 text-sm font-black text-[#050505] outline-none transition placeholder:text-[#a1a1aa] focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/10"
              />
            </div>
          </div>

          <div className="min-w-0 xl:col-span-1">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">
              {t.supplier}
            </label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="h-11 w-full min-w-0 rounded-2xl border border-[#e9e2d3] bg-white px-4 text-sm font-black text-[#050505] outline-none transition focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/10"
            >
              <option value="all">{t.allSuppliers}</option>
              {suppliers.map((supplier) => (
                <option key={supplier} value={supplier}>{supplier}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0 xl:col-span-1">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">
              {t.from}
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 w-full min-w-0 rounded-2xl border border-[#e9e2d3] bg-white px-4 text-sm font-black text-[#050505] outline-none transition focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/10"
            />
          </div>

          <div className="min-w-0 xl:col-span-1">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">
              {t.to}
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 w-full min-w-0 rounded-2xl border border-[#e9e2d3] bg-white px-4 text-sm font-black text-[#050505] outline-none transition focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/10"
            />
          </div>

          <div className="min-w-0 xl:col-span-1">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] opacity-0">
              Export
            </label>
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full whitespace-nowrap px-3"
              onClick={exportPurchasesCsv}
              disabled={filteredPurchases.length === 0}
            >
              {t.exportCsv}
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-serif font-bold text-[#050505] sm:text-2xl">{t.history}</h2>
              <p className="mt-1 text-sm font-semibold text-[#71717a]">{filteredPurchases.length.toLocaleString('en-US')} {t.registeredPurchases}</p>
            </div>
            <Button type="button" variant="secondary" className="w-full gap-2 rounded-2xl border border-[#e9e2d3] bg-white/90 shadow-[0_14px_34px_rgba(15,15,15,0.05)] hover:-translate-y-0.5 sm:w-auto" onClick={loadData}>
              <RefreshCw size={16} />
              {t.refresh}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="hidden rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] lg:block">
            <table className="w-full table-fixed">
              <thead className="border-b border-[#e9e2d3] bg-[#fbfaf7]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.id}</th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.date}</th>
                  {roleFlags.isOwner && (
                    <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.supplier}</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.product}</th>
                  <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.quantity}</th>
                  {roleFlags.isOwner && (
                    <>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.cost}</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]">{t.total}</th>
                      <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#8a6a16]" />
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1ebdf]">
                {visiblePurchases.map((purchase) => (
                  <tr key={purchase.id} className="transition-all duration-300 hover:bg-[#fff9e8]">
                    <td className="px-4 py-3 font-black text-[#050505]">
                      <span className="inline-flex rounded-full border border-[#e9e2d3] bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#8a6a16] shadow-sm">
                        {formatPurchaseCode(purchase.id)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#71717a]">{purchase.fecha}</td>
                    {roleFlags.isOwner && (
                      <td className="px-4 py-3 font-semibold text-[#71717a]">
                        <span className="line-clamp-2 break-words leading-snug" title={purchase.proveedor || t.noSupplier}>
                          {purchase.proveedor || t.noSupplier}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 font-black text-[#050505]">
                      <span className="line-clamp-2 break-words leading-snug" title={purchase.productos?.nombre || t.deletedProduct}>
                        {purchase.productos?.nombre || t.deletedProduct}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-black tabular-nums text-[#050505]">
                      {Number(purchase.cantidad || 0).toLocaleString('en-US')} {purchase.productos?.unidad || ''}
                    </td>
                    {roleFlags.isOwner && (
                      <>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-[#3f3f46]">
                          {purchase.costo === null ? t.pendingCost : formatMoney(purchase.costo, currencySettings)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-black tabular-nums text-[#8a6a16]">
                          {purchase.total === null ? '—' : formatMoney(purchase.total, currencySettings)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {purchase.costo === null && (
                            <button
                              type="button"
                              onClick={() => openCompleteCostModal(purchase)}
                              className="rounded-xl border border-[#f4c542]/40 bg-[#fff4c7] px-3 py-1.5 text-xs font-black uppercase tracking-[0.08em] text-[#8a6a16] transition hover:-translate-y-0.5 hover:bg-[#ffeaa3]"
                            >
                              {t.completeCost}
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {visiblePurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="relative overflow-hidden rounded-[1.5rem] border border-[#e9e2d3] bg-white p-4 shadow-[0_14px_34px_rgba(15,15,15,0.06)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.10),transparent_38%)]" />
                <div className="relative z-10 space-y-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.id}</p>
                      <p className="mt-1 truncate text-lg font-black text-[#050505]">{formatPurchaseCode(purchase.id)}</p>
                      <p className="mt-1 text-xs font-bold text-[#71717a]">{purchase.fecha}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[#e9e2d3] bg-[#fff4c7] px-3 py-1 text-xs font-black text-[#8a6a16]">
                      {Number(purchase.cantidad || 0).toLocaleString('en-US')} {purchase.productos?.unidad || ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#f1ebdf] bg-[#fffdf8] p-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.product}</p>
                      <p className="mt-1 line-clamp-2 break-words text-sm font-black text-[#050505]">{purchase.productos?.nombre || t.deletedProduct}</p>
                    </div>
                    {roleFlags.isOwner && (
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.supplier}</p>
                        <p className="mt-1 line-clamp-2 break-words text-sm font-semibold text-[#71717a]">{purchase.proveedor || t.noSupplier}</p>
                      </div>
                    )}
                  </div>

                  {roleFlags.isOwner && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="min-w-0 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] px-3 py-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.cost}</p>
                        <p className="mt-1 truncate text-sm font-black tabular-nums text-[#050505]">{purchase.costo === null ? t.pendingCost : formatMoney(purchase.costo, currencySettings)}</p>
                      </div>
                      <div className="min-w-0 rounded-2xl border border-[#f4c542]/30 bg-[#fff4c7] px-3 py-2 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a16]">{t.total}</p>
                        <p className="mt-1 truncate text-base font-black tabular-nums text-[#8a6a16]">{purchase.total === null ? '—' : formatMoney(purchase.total, currencySettings)}</p>
                      </div>
                    </div>
                  )}

                  {roleFlags.isOwner && purchase.costo === null && (
                    <button
                      type="button"
                      onClick={() => openCompleteCostModal(purchase)}
                      className="w-full rounded-xl border border-[#f4c542]/40 bg-[#fff4c7] px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#8a6a16] transition hover:-translate-y-0.5 hover:bg-[#ffeaa3]"
                    >
                      {t.completeCost}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredPurchases.length === 0 && (
            <div className="rounded-2xl border border-[#f1ebdf] bg-[#fbfaf7] py-12 text-center font-semibold text-[#71717a]">
              {t.noPurchases}
            </div>
          )}

          {filteredPurchases.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 border-t border-[#f1ebdf] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-black text-[#71717a]">
                {t.page} {safeCurrentPage.toLocaleString('en-US')} / {totalPages.toLocaleString('en-US')} · {pageStartIndex + 1}-{pageEndIndex} {t.of} {filteredPurchases.length.toLocaleString('en-US')}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1}
                >
                  {t.previous}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage >= totalPages}
                >
                  {t.next}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff4c7] text-[#8a6a16]">
              <PackageOpen size={21} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-[#050505]">{t.transformationHistory}</h2>
              <p className="mt-1 text-sm font-semibold text-[#71717a]">{t.transformationHistoryDescription}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transformations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e9e2d3] bg-[#fbfaf7] px-5 py-8 text-center text-sm font-bold text-[#71717a]">
              {t.noTransformations}
            </div>
          ) : (
            <div className="space-y-3">
              {transformations.map((transformation) => (
                <div
                  key={transformation.id}
                  className="rounded-2xl border border-[#e9e2d3] bg-white p-4 shadow-[0_10px_30px_rgba(15,15,15,0.04)]"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#050505] text-[#f4c542]">
                        <PackageOpen size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm font-black text-[#050505]">
                          <span>{Number(transformation.source_quantity).toLocaleString('en-US')} {transformation.source_product?.nombre || transformation.source_product_name || t.deletedProduct}</span>
                          <ArrowRight className="shrink-0 text-[#8a6a16]" size={16} />
                          <span>{Number(transformation.destination_quantity).toLocaleString('en-US')} {transformation.destination_product?.nombre || transformation.destination_product_name || t.deletedProduct}</span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-[#71717a]">
                          {new Date(transformation.created_at).toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
                          {transformation.notes ? ` · ${transformation.notes}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className={`inline-flex w-fit items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${Number(transformation.damaged_quantity) > 0 ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      <AlertTriangle size={15} />
                      {t.shrinkage}: {Number(transformation.damaged_quantity).toLocaleString('en-US')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isTransformationModalOpen}
        onClose={() => {
          if (savingTransformation) return;
          setIsTransformationModalOpen(false);
          resetTransformationForm();
        }}
        title={t.transformStockTitle}
      >
        <form onSubmit={handleTransformationSubmit} className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-[#f4c542]/35 bg-[#fff9e8] p-4 text-sm font-semibold text-[#52525b]">
            <PackageOpen className="mt-0.5 shrink-0 text-[#8a6a16]" size={20} />
            <p>{t.transformStockDescription}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Select
              label={t.sourceProduct}
              value={transformationData.source_product_id}
              onChange={(e) => setTransformationData({
                ...transformationData,
                source_product_id: e.target.value,
                destination_product_id: e.target.value === transformationData.destination_product_id
                  ? ''
                  : transformationData.destination_product_id
              })}
              options={[
                { value: '', label: t.selectSourceProduct },
                ...products.map((product) => ({
                  value: product.id.toString(),
                  label: `${product.nombre} · ${t.currentStock}: ${Number(product.stock || 0).toLocaleString('en-US')} ${product.unidad || ''}`
                }))
              ]}
            />

            <Select
              label={t.destinationProduct}
              value={transformationData.destination_product_id}
              onChange={(e) => setTransformationData({ ...transformationData, destination_product_id: e.target.value })}
              options={[
                { value: '', label: t.selectDestinationProduct },
                ...products
                  .filter((product) => product.id.toString() !== transformationData.source_product_id)
                  .map((product) => ({
                    value: product.id.toString(),
                    label: `${product.nombre} · ${t.currentStock}: ${Number(product.stock || 0).toLocaleString('en-US')} ${product.unidad || ''}`
                  }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label={t.packagesToOpen}
              type="number"
              min="0"
              step="0.01"
              value={transformationData.source_quantity}
              onChange={(e) => setTransformationData({ ...transformationData, source_quantity: e.target.value })}
              error={sourceTransformationProduct && transformationPreview.sourceQuantity > Number(sourceTransformationProduct.stock || 0)
                ? t.insufficientStockError
                : undefined}
              required
            />
            <Input
              label={t.unitsPerPackage}
              type="number"
              min="0"
              step="0.01"
              value={transformationData.units_per_source}
              onChange={(e) => setTransformationData({ ...transformationData, units_per_source: e.target.value })}
              required
            />
            <Input
              label={t.damagedUnits}
              type="number"
              min="0"
              step="0.01"
              value={transformationData.damaged_quantity}
              onChange={(e) => setTransformationData({ ...transformationData, damaged_quantity: e.target.value })}
              error={transformationPreview.totalUnits > 0 && transformationPreview.destinationQuantity <= 0
                ? t.invalidTransformationError
                : undefined}
              required
            />
          </div>

          <div>
            <label className="mb-2.5 block text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6a16]">
              {t.notes}
            </label>
            <textarea
              rows={3}
              value={transformationData.notes}
              onChange={(e) => setTransformationData({ ...transformationData, notes: e.target.value })}
              placeholder={t.notesPlaceholder}
              className="w-full resize-none rounded-2xl border-2 border-[#e9e2d3] bg-white/96 px-4 py-3.5 text-[15px] font-semibold text-[#050505] shadow-[0_10px_30px_rgba(15,15,15,0.05)] outline-none transition placeholder:text-[#a1a1aa] focus:border-[#f4c542] focus:ring-4 focus:ring-[#f4c542]/25"
            />
          </div>

          {(sourceTransformationProduct || destinationTransformationProduct) && (
            <div className="rounded-[1.5rem] border border-[#e9e2d3] bg-[#fbfaf7] p-4 sm:p-5">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[#8a6a16]">{t.stockPreview}</p>

              <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                <div className="rounded-2xl border border-[#e9e2d3] bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#71717a]">{t.sourceProduct}</p>
                  <p className="mt-1 text-base font-black text-[#050505]">{sourceTransformationProduct?.nombre || '—'}</p>
                  <p className="mt-3 text-sm font-semibold text-[#71717a]">
                    {t.before}: <strong className="text-[#050505]">{Number(sourceTransformationProduct?.stock || 0).toLocaleString('en-US')}</strong>
                    {' → '}
                    {t.after}: <strong className={transformationPreview.sourceStockAfter < 0 ? 'text-red-600' : 'text-[#050505]'}>{transformationPreview.sourceStockAfter.toLocaleString('en-US')}</strong>
                  </p>
                </div>

                <ArrowRight className="mx-auto rotate-90 text-[#8a6a16] lg:rotate-0" size={22} />

                <div className="rounded-2xl border border-[#e9e2d3] bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#71717a]">{t.destinationProduct}</p>
                  <p className="mt-1 text-base font-black text-[#050505]">{destinationTransformationProduct?.nombre || '—'}</p>
                  <p className="mt-3 text-sm font-semibold text-[#71717a]">
                    {t.before}: <strong className="text-[#050505]">{Number(destinationTransformationProduct?.stock || 0).toLocaleString('en-US')}</strong>
                    {' → '}
                    {t.after}: <strong className="text-[#050505]">{transformationPreview.destinationStockAfter.toLocaleString('en-US')}</strong>
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#71717a]">
                  {t.containedUnits}: <strong className="text-[#050505]">{transformationPreview.totalUnits.toLocaleString('en-US')}</strong>
                </div>
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {t.shrinkage}: <strong>{transformationPreview.damagedQuantity.toLocaleString('en-US')}</strong>
                </div>
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  {t.usableUnits}: <strong>{Math.max(0, transformationPreview.destinationQuantity).toLocaleString('en-US')}</strong>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsTransformationModalOpen(false);
                resetTransformationForm();
              }}
              disabled={savingTransformation}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={savingTransformation || !isTransformationValid}>
              {savingTransformation ? t.saving : t.transformConfirmText}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={t.newPurchase}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {roleFlags.isOwner && (
            <Input
              label={t.supplier}
              placeholder={t.supplierPlaceholder}
              value={formData.proveedor}
              onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
            />
          )}

          <Select
            label={t.product}
            value={formData.producto_id}
            onChange={(e) => handleProductChange(e.target.value)}
            options={[
              { value: '', label: t.selectProduct },
              ...products.map((product) => ({
                value: product.id.toString(),
                label: `${product.nombre} · ${t.currentStock}: ${Number(product.stock || 0)}`
              }))
            ]}
          />

          {selectedProduct && (
            <div className="rounded-2xl border border-[#f4c542]/30 bg-[#fff4c7] p-4 text-sm font-semibold text-[#3f3f46] shadow-sm">
              <p className="mb-2 font-black text-[#8a6a16]">{t.selectedProduct}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-[#71717a]">{t.currentStock}:</span>{' '}
                  <strong>{Number(selectedProduct.stock || 0).toLocaleString('en-US')} {selectedProduct.unidad || t.unit}</strong>
                </div>
                {roleFlags.isOwner && (
                  <div>
                    <span className="text-[#71717a]">{t.currentCost}:</span>{' '}
                    <strong>{formatMoney(selectedProduct.costo, currencySettings)}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          <Input
            label={t.date}
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
            required
          />

          <div className={`grid grid-cols-1 gap-4 ${roleFlags.isOwner ? 'sm:grid-cols-2' : ''}`}>
            <Input
              label={t.quantity}
              type="number"
              step="0.01"
              value={formData.cantidad}
              onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
              required
            />

            {roleFlags.isOwner && (
              <Input
                label={t.unitCost}
                type="number"
                step="0.01"
                value={formData.costo}
                onChange={(e) => setFormData({ ...formData, costo: e.target.value })}
                required
              />
            )}
          </div>

          {roleFlags.isOwner && (
            <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-[#71717a]">
                <DollarSign className="shrink-0" size={18} />
                <span className="font-black">{t.purchaseTotal}</span>
              </div>
              <span className="max-w-full break-words text-left text-2xl font-black tabular-nums text-[#8a6a16] sm:max-w-[260px] sm:text-right sm:text-3xl">{formatMoney(formTotal, currencySettings)}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              disabled={saving}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={saving || Number(formData.cantidad || 0) <= 0 || (roleFlags.isOwner && formTotal < 0)}>
              {saving ? t.saving : t.registerPurchase}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!completeCostPurchase} onClose={closeCompleteCostModal} title={t.completeCostTitle}>
        {completeCostPurchase && (
          <form onSubmit={handleCompleteCost} className="space-y-4">
            <p className="text-sm font-semibold text-[#71717a]">{t.completeCostDescription}</p>

            <div className="rounded-2xl border border-[#e9e2d3] bg-[#fbfaf7] p-4">
              <p className="text-lg font-black text-[#050505]">
                {completeCostPurchase.productos?.nombre || t.deletedProduct}
              </p>
              <p className="mt-1 text-sm font-bold uppercase tracking-[0.12em] text-[#8a6a16]">
                {formatPurchaseCode(completeCostPurchase.id)} · {Number(completeCostPurchase.cantidad || 0).toLocaleString('en-US')} {completeCostPurchase.productos?.unidad || ''}
              </p>
            </div>

            <Input
              label={t.unitCost}
              type="number"
              step="0.01"
              value={completeCostAmount}
              onChange={(e) => setCompleteCostAmount(e.target.value)}
              required
              autoFocus
            />

            <Input
              label={t.supplier}
              placeholder={t.supplierPlaceholder}
              value={completeCostProveedor}
              onChange={(e) => setCompleteCostProveedor(e.target.value)}
            />

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={closeCompleteCostModal}>{t.cancel}</Button>
              <Button type="submit" disabled={savingCost}>{savingCost ? t.saving : t.completeCost}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string;
  value: string;
  icon: ElementType;
  color: string;
}) {
  return (
    <div className="group relative flex min-w-0 items-center justify-between gap-4 overflow-hidden rounded-[1.75rem] border border-[#e9e2d3]/85 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,15,15,0.055)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#f4c542]/35 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,15,15,0.09)] sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,197,66,0.09),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 min-w-0 flex-1 overflow-hidden pr-2">
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6a16] sm:text-[11px]">
          {title}
        </p>
        <p className="max-w-full break-words text-[2rem] font-black leading-[0.95] tracking-tight tabular-nums text-[#050505] sm:text-[2.35rem] xl:text-[2.25rem] 2xl:text-[2.55rem]">
          {value}
        </p>
      </div>
      <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-white/10 shadow-[0_18px_40px_rgba(15,15,15,0.12)] transition-all duration-300 group-hover:scale-105 group-hover:-translate-y-0.5 sm:h-14 sm:w-14 ${color}`}>
        <Icon className="h-5 w-5 shrink-0 drop-shadow-sm sm:h-6 sm:w-6" />
      </div>
    </div>
  );
}
