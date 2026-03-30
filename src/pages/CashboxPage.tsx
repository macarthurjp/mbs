import React, { useEffect, useState, useRef } from 'react';
import { Plus, Filter, ArrowUp, ArrowDown, Wallet, Gift, X, Check, Trash2, Search, Eye, Lock, Unlock, Edit } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card, CardContent } from '../components/ui/Card';
import { supabase } from '../lib/supabase';
import { Transaction, Product, Client } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { formatArgentinaDateTime, formatArgentinaDate, getTodayStartArgentina, getTodayEndArgentina } from '../utils/dateHelpers';

interface CashboxClosure {
  id: string;
  opening_date: string;
  closing_date?: string;
  initial_cash: number;
  final_cash?: number;
  expected_cash?: number;
  cash_difference?: number;
  total_sales?: number;
  total_cash_sales?: number;
  total_transfer_sales?: number;
  total_cc_sales?: number;
  total_cc_collections?: number;
  notes?: string;
  closed_by?: string;
  opened_by: string;
  status: 'open' | 'closed';
}

interface SelectedProduct {
  product_id: string;
  quantity: number;
  name: string;
  price: number;
  discount: number; // Porcentaje de descuento (0-100)
}

interface TransactionItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: {
    name: string;
    category: string;
    size: string;
  };
}

export function CashboxPage() {
  const { user } = useAuth();
  const { showToast, showConfirm } = useNotification();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [isEditProductSelectorOpen, setIsEditProductSelectorOpen] = useState(false);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState({
    payment_method: '',
    client_id: '',
    description: '',
    custom_date: '',
    selectedProducts: [] as SelectedProduct[],
    gift_card_code: ''
  });
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalCCSales, setTotalCCSales] = useState(0);
  const [totalCash, setTotalCash] = useState(0);
  const [totalGiftCards, setTotalGiftCards] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<Array<{ method: string; amount: string }>>([
    { method: 'Efectivo', amount: '' },
    { method: 'Transferencia', amount: '' }
  ]);

  const [currentCashbox, setCurrentCashbox] = useState<CashboxClosure | null>(null);
  const [isOpenCashboxModalOpen, setIsOpenCashboxModalOpen] = useState(false);
  const [isCloseCashboxModalOpen, setIsCloseCashboxModalOpen] = useState(false);
  const [giftCardValidated, setGiftCardValidated] = useState(false);
  const [validatedGiftCard, setValidatedGiftCard] = useState<any>(null);
  const [openCashboxData, setOpenCashboxData] = useState({
    initial_cash: ''
  });
  const [closeCashboxData, setCloseCashboxData] = useState({
    notes: ''
  });

  const [formData, setFormData] = useState({
    type: 'income',
    category: 'Venta General',
    payment_method: 'Efectivo',
    amount: '',
    description: '',
    client_id: '',
    selectedProducts: [] as SelectedProduct[],
    custom_date: '',
    gift_card_code: ''
  });

  const [newProductData, setNewProductData] = useState({
    name: '',
    category: 'Pantalones',
    size: 'S',
    price: '',
    cost: '',
    stock: '',
    min_stock: '5'
  });

  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    checkCurrentCashbox();
  }, []);

  useEffect(() => {
    if (currentCashbox) {
      loadData();
    }
  }, [currentCashbox]);

  async function checkCurrentCashbox() {
    try {
      const { data, error } = await supabase
        .from('cashbox_closures')
        .select('*')
        .eq('status', 'open')
        .order('opening_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error checking cashbox:', error);
        return;
      }

      if (!data) {
        setIsOpenCashboxModalOpen(true);
      } else {
        setCurrentCashbox(data);
      }
    } catch (error) {
      console.error('Error checking cashbox:', error);
    }
  }

  async function loadData() {
    if (!currentCashbox) return;

    try {
      // Obtener todas las transacciones del día completo (00:00 a 23:59)
      const todayStart = getTodayStartArgentina();
      const todayEnd = getTodayEndArgentina();

      const [transactionsResult, productsResult, clientsResult] = await Promise.all([
        supabase
          .from('transactions')
          .select(`
            *,
            clients (
              name
            )
          `)
          .gte('created_at', todayStart)
          .lte('created_at', todayEnd)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*')
          .order('name'),
        supabase
          .from('clients')
          .select('*')
          .order('name')
      ]);

      const txs = transactionsResult.data || [];
      setTransactions(txs);
      setProducts(productsResult.data || []);
      setClients(clientsResult.data || []);

      const income = txs
        .filter(t => t.type === 'income' && (
          ['Efectivo', 'Transferencia', 'Tarjeta', 'Tarjeta de Crédito', 'efectivo', 'transferencia', 'tarjeta_debito', 'tarjeta_credito'].includes(t.payment_method) ||
          t.category === 'Cobranza (Cta. Cte.)' ||
          t.category === 'Gift Cards'
        ))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const ccSales = txs
        .filter(t => t.type === 'income' && t.payment_method === 'Cuenta Corriente')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expense = txs
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const cashIncome = txs
        .filter(t => t.type === 'income' && (
          t.payment_method === 'Efectivo' ||
          t.payment_method === 'efectivo' ||
          (t.category === 'Cobranza (Cta. Cte.)' && (t.payment_method === 'Efectivo' || t.payment_method === 'efectivo')) ||
          (t.category === 'Gift Cards' && (t.payment_method === 'Efectivo' || t.payment_method === 'efectivo'))
        ))
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const giftCardSales = txs
        .filter(t => t.type === 'income' && t.category === 'Gift Cards')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      setTotalIncome(income);
      setTotalCCSales(ccSales);
      setTotalCash(cashIncome - expense);
      setTotalGiftCards(giftCardSales);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function handleOpenCashbox(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      showToast('No hay usuario autenticado', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cashbox_closures')
        .insert([{
          initial_cash: parseFloat(openCashboxData.initial_cash),
          opened_by: user.id,
          status: 'open'
        }])
        .select()
        .single();

      if (error) throw error;

      setCurrentCashbox(data);
      setIsOpenCashboxModalOpen(false);
      setOpenCashboxData({ initial_cash: '' });
      showToast('Caja abierta correctamente', 'success');
    } catch (error) {
      console.error('Error opening cashbox:', error);
      showToast('Error al abrir la caja', 'error');
    }
  }

  async function handleCloseCashbox(e: React.FormEvent) {
    e.preventDefault();

    if (!user || !currentCashbox) {
      showToast('No hay caja abierta', 'error');
      return;
    }

    try {
      const cashSales = transactions
        .filter(t => t.type === 'income' && t.payment_method === 'Efectivo')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const transferSales = transactions
        .filter(t => t.type === 'income' && t.payment_method === 'Transferencia')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const ccSales = transactions
        .filter(t => t.type === 'income' && t.payment_method === 'Tarjeta')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const ccCollections = transactions
        .filter(t => t.type === 'income' && t.category === 'Cobranza (Cta. Cte.)')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expectedCash = currentCashbox.initial_cash + cashSales - expenses;
      const totalSales = cashSales + transferSales + ccSales + ccCollections;

      const { error } = await supabase
        .from('cashbox_closures')
        .update({
          closing_date: new Date().toISOString(),
          final_cash: expectedCash,
          expected_cash: expectedCash,
          cash_difference: 0,
          total_sales: totalSales,
          total_cash_sales: cashSales,
          total_transfer_sales: transferSales,
          total_cc_sales: ccSales,
          total_cc_collections: ccCollections,
          notes: closeCashboxData.notes || null,
          closed_by: user.id,
          status: 'closed'
        })
        .eq('id', currentCashbox.id);

      if (error) throw error;

      setCurrentCashbox(null);
      setIsCloseCashboxModalOpen(false);
      setCloseCashboxData({ notes: '' });
      setTransactions([]);
      setTotalIncome(0);
      setTotalCCSales(0);
      setTotalCash(0);
      setTotalGiftCards(0);

      showToast('Caja cerrada correctamente', 'success');

      checkCurrentCashbox();
    } catch (error) {
      console.error('Error closing cashbox:', error);
      showToast('Error al cerrar la caja', 'error');
    }
  }

  async function validateGiftCard() {
    if (!formData.gift_card_code) {
      showToast('Ingrese el código de la gift card', 'warning');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('validate_gift_card', {
        p_code: formData.gift_card_code.trim().toUpperCase()
      });

      if (error) throw error;

      const result = data as any;

      if (result.valid) {
        setGiftCardValidated(true);
        setValidatedGiftCard(result);
        showToast(`Gift card validada - Saldo disponible: $${result.current_balance}`, 'success');
      } else {
        showToast(result.message, 'error');
        setGiftCardValidated(false);
        setValidatedGiftCard(null);
      }
    } catch (error: any) {
      showToast('Error al validar gift card: ' + error.message, 'error');
      setGiftCardValidated(false);
      setValidatedGiftCard(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      showToast('No hay usuario autenticado', 'error');
      return;
    }

    try {
      let totalAmount = parseFloat(formData.amount);

      if (!totalAmount && formData.selectedProducts.length > 0) {
        totalAmount = formData.selectedProducts.reduce((sum, sp) => {
          const discountAmount = (sp.price * sp.quantity) * (sp.discount / 100);
          return sum + ((sp.price * sp.quantity) - discountAmount);
        }, 0);
      }

      // Validar pago dividido
      if (isSplitPayment) {
        const splitTotal = splitPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
        if (Math.abs(splitTotal - totalAmount) > 0.01) {
          showToast(`El total de los pagos divididos ($${splitTotal.toFixed(2)}) debe ser igual al monto total ($${totalAmount.toFixed(2)})`, 'warning');
          return;
        }

        // Validar gift card si algún método de pago es Gift Card
        const hasGiftCard = splitPayments.some(p => p.method === 'Gift Card');
        if (hasGiftCard) {
          if (!formData.gift_card_code || !giftCardValidated) {
            showToast('Debe validar la gift card antes de continuar', 'warning');
            return;
          }
          const giftCardPayment = splitPayments.find(p => p.method === 'Gift Card');
          const giftCardAmount = giftCardPayment ? parseFloat(giftCardPayment.amount || '0') : 0;
          if (!validatedGiftCard || validatedGiftCard.current_balance < giftCardAmount) {
            showToast('Saldo insuficiente en la gift card', 'error');
            return;
          }
        }

        // Crear una transacción por cada medio de pago
        for (const payment of splitPayments) {
          if (!payment.amount || parseFloat(payment.amount) <= 0) continue;

          const transactionData: any = {
            type: formData.type,
            category: formData.category,
            payment_method: payment.method,
            amount: parseFloat(payment.amount),
            description: formData.description + ` (Pago dividido: ${payment.method})` + (payment.method === 'Gift Card' ? ` - ${formData.gift_card_code}` : ''),
            client_id: formData.client_id || null,
            user_id: user.id
          };

          if (formData.custom_date) {
            // Interpretar la fecha como hora Argentina y convertir a UTC
            const localDate = new Date(formData.custom_date);
            const utcDate = new Date(localDate.getTime() + (3 * 60 * 60 * 1000)); // Sumar 3 horas para convertir Argentina a UTC
            transactionData.created_at = utcDate.toISOString();
          } else {
            // Usar la hora actual (ya está en UTC)
            transactionData.created_at = new Date().toISOString();
          }

          const { data: transaction, error } = await supabase
            .from('transactions')
            .insert([transactionData])
            .select()
            .single();

          if (error) throw error;

          // Solo agregar los items al primer pago para evitar duplicados
          if (formData.selectedProducts.length > 0 && transaction && payment === splitPayments[0]) {
            const items = formData.selectedProducts.map(sp => {
              const subtotalWithoutDiscount = sp.price * sp.quantity;
              const discountAmount = subtotalWithoutDiscount * (sp.discount / 100);
              return {
                transaction_id: transaction.id,
                product_id: sp.product_id,
                quantity: sp.quantity,
                unit_price: sp.price,
                subtotal: subtotalWithoutDiscount - discountAmount
              };
            });

            await supabase.from('transaction_items').insert(items);

            // Actualizar el stock de cada producto vendido
            for (const sp of formData.selectedProducts) {
              const { error: stockError } = await supabase.rpc('decrement_product_stock', {
                product_id: sp.product_id,
                quantity_sold: sp.quantity
              });

              if (stockError) {
                console.error('Error actualizando stock:', stockError);
              }
            }
          }

          // Usar gift card si el método es Gift Card
          if (payment.method === 'Gift Card' && transaction) {
            const { data: giftCardResult, error: giftCardError } = await supabase.rpc('use_gift_card', {
              p_code: formData.gift_card_code.trim().toUpperCase(),
              p_amount: parseFloat(payment.amount),
              p_transaction_id: transaction.id,
              p_notes: `Usado en venta (pago dividido): ${formData.description || 'Sin descripción'}`
            });

            if (giftCardError) throw giftCardError;

            const result = giftCardResult as any;
            if (!result.success) {
              throw new Error(result.message || 'Error al usar gift card');
            }
          }

          // Solo crear movimiento de cuenta corriente una vez
          if (payment.method === 'Cuenta Corriente' && formData.client_id && transaction && payment === splitPayments.find(p => p.method === 'Cuenta Corriente')) {
            let description = formData.description;

            if (formData.selectedProducts.length > 0) {
              const productDetails = formData.selectedProducts
                .map(sp => `${sp.name} (${sp.quantity}x $${sp.price})`)
                .join(', ');
              description = `Venta: ${productDetails}`;
            }

            const accountMovement: any = {
              client_id: formData.client_id,
              transaction_id: transaction.id,
              type: 'charge',
              amount: parseFloat(payment.amount),
              description: description || 'Venta a crédito (pago dividido)',
              user_id: user.id
            };

            if (formData.custom_date) {
              // Interpretar la fecha como hora Argentina y convertir a UTC
              const localDate = new Date(formData.custom_date);
              const utcDate = new Date(localDate.getTime() + (3 * 60 * 60 * 1000)); // Sumar 3 horas para convertir Argentina a UTC
              accountMovement.created_at = utcDate.toISOString();
            }

            await supabase.from('account_movements').insert([accountMovement]);
          }
        }
      } else {
        // Validar gift card si el método de pago es Gift Card
        if (formData.payment_method === 'Gift Card') {
          if (!formData.gift_card_code || !giftCardValidated) {
            showToast('Debe validar la gift card antes de continuar', 'warning');
            return;
          }

          if (!validatedGiftCard || validatedGiftCard.current_balance < totalAmount) {
            showToast('Saldo insuficiente en la gift card', 'error');
            return;
          }
        }

        // Pago simple (código original)
        const transactionData: any = {
          type: formData.type,
          category: formData.category,
          payment_method: formData.payment_method,
          amount: totalAmount,
          description: formData.description + (formData.payment_method === 'Gift Card' ? ` (Gift Card: ${formData.gift_card_code})` : ''),
          client_id: formData.client_id || null,
          user_id: user.id
        };

        if (formData.custom_date) {
          transactionData.created_at = new Date(formData.custom_date).toISOString();
        }

        const { data: transaction, error } = await supabase
          .from('transactions')
          .insert([transactionData])
          .select()
          .single();

        if (error) throw error;

        // Usar gift card si el método de pago es Gift Card
        if (formData.payment_method === 'Gift Card' && transaction) {
          const { data: giftCardResult, error: giftCardError } = await supabase.rpc('use_gift_card', {
            p_code: formData.gift_card_code.trim().toUpperCase(),
            p_amount: totalAmount,
            p_transaction_id: transaction.id,
            p_notes: `Usado en venta: ${formData.description || 'Sin descripción'}`
          });

          if (giftCardError) throw giftCardError;

          const result = giftCardResult as any;
          if (!result.success) {
            throw new Error(result.message || 'Error al usar gift card');
          }
        }

        if (formData.selectedProducts.length > 0 && transaction) {
          const items = formData.selectedProducts.map(sp => {
            const subtotalWithoutDiscount = sp.price * sp.quantity;
            const discountAmount = subtotalWithoutDiscount * (sp.discount / 100);
            return {
              transaction_id: transaction.id,
              product_id: sp.product_id,
              quantity: sp.quantity,
              unit_price: sp.price,
              subtotal: subtotalWithoutDiscount - discountAmount
            };
          });

          await supabase.from('transaction_items').insert(items);

          // Actualizar el stock de cada producto vendido
          for (const sp of formData.selectedProducts) {
            const { error: stockError } = await supabase.rpc('decrement_product_stock', {
              product_id: sp.product_id,
              quantity_sold: sp.quantity
            });

            if (stockError) {
              console.error('Error actualizando stock:', stockError);
            }
          }
        }

        if (formData.payment_method === 'Cuenta Corriente' && formData.client_id && transaction) {
          let description = formData.description;

          if (formData.selectedProducts.length > 0) {
            const productDetails = formData.selectedProducts
              .map(sp => `${sp.name} (${sp.quantity}x $${sp.price})`)
              .join(', ');
            description = `Venta: ${productDetails}`;
          }

          const accountMovement: any = {
            client_id: formData.client_id,
            transaction_id: transaction.id,
            type: 'charge',
            amount: totalAmount,
            description: description || 'Venta a crédito',
            user_id: user.id
          };

          if (formData.custom_date) {
            // Interpretar la fecha como hora Argentina y convertir a UTC
            const localDate = new Date(formData.custom_date);
            const utcDate = new Date(localDate.getTime() + (3 * 60 * 60 * 1000)); // Sumar 3 horas para convertir Argentina a UTC
            accountMovement.created_at = utcDate.toISOString();
          }

          await supabase.from('account_movements').insert([accountMovement]);
        }
      }

      setIsModalOpen(false);
      resetForm();
      loadData();
      showToast('Venta registrada correctamente', 'success');
    } catch (error) {
      console.error('Error saving transaction:', error);
      showToast('Error al guardar la transacción', 'error');
    }
  }

  async function handleNewProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      showToast('No hay usuario autenticado', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: newProductData.name,
          category: newProductData.category,
          size: newProductData.size,
          price: parseFloat(newProductData.price),
          cost: newProductData.cost ? parseFloat(newProductData.cost) : 0,
          stock: parseInt(newProductData.stock),
          min_stock: parseInt(newProductData.min_stock),
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setProducts([...products, data]);
      setIsNewProductModalOpen(false);
      resetNewProductForm();
      showToast('Producto creado correctamente', 'success');
    } catch (error) {
      console.error('Error creating product:', error);
      showToast('Error al crear el producto', 'error');
    }
  }

  function resetForm() {
    setFormData({
      type: 'income',
      category: 'Venta General',
      payment_method: 'Efectivo',
      amount: '',
      description: '',
      client_id: '',
      selectedProducts: [],
      custom_date: '',
      gift_card_code: ''
    });
    setProductSearch('');
    setIsSplitPayment(false);
    setSplitPayments([
      { method: 'Efectivo', amount: '' },
      { method: 'Transferencia', amount: '' }
    ]);
    setGiftCardValidated(false);
    setValidatedGiftCard(null);
  }

  function resetNewProductForm() {
    setNewProductData({
      name: '',
      category: 'Pantalones',
      size: 'S',
      price: '',
      cost: '',
      stock: '',
      min_stock: '5'
    });
  }

  function resetNewClientForm() {
    setNewClientData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: ''
    });
  }

  async function handleNewClient(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      showToast('No hay usuario autenticado', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: newClientData.name,
          email: newClientData.email || null,
          phone: newClientData.phone || null,
          address: newClientData.address || null,
          notes: newClientData.notes || null,
          balance: 0,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setClients([...clients, data]);
      setFormData({ ...formData, client_id: data.id });
      setIsNewClientModalOpen(false);
      resetNewClientForm();
      showToast('Cliente creado correctamente', 'success');
    } catch (error) {
      console.error('Error creating client:', error);
      showToast('Error al crear el cliente', 'error');
    }
  }

  function toggleProductSelection(product: Product) {
    const existingIndex = formData.selectedProducts.findIndex(sp => sp.product_id === product.id);

    if (existingIndex >= 0) {
      const updatedProducts = formData.selectedProducts.filter((_, i) => i !== existingIndex);
      const newAmount = updatedProducts.reduce((sum, sp) => {
        const discountAmount = (sp.price * sp.quantity) * (sp.discount / 100);
        return sum + ((sp.price * sp.quantity) - discountAmount);
      }, 0).toFixed(2);
      setFormData({
        ...formData,
        selectedProducts: updatedProducts,
        amount: updatedProducts.length > 0 ? newAmount : ''
      });
    } else {
      const updatedProducts = [
        ...formData.selectedProducts,
        {
          product_id: product.id,
          quantity: 1,
          name: product.name,
          price: product.price,
          discount: 0
        }
      ];
      const newAmount = updatedProducts.reduce((sum, sp) => {
        const discountAmount = (sp.price * sp.quantity) * (sp.discount / 100);
        return sum + ((sp.price * sp.quantity) - discountAmount);
      }, 0).toFixed(2);
      setFormData({
        ...formData,
        selectedProducts: updatedProducts,
        amount: newAmount
      });
    }
  }

  function addOrIncrementProduct(product: Product) {
    const existingIndex = formData.selectedProducts.findIndex(sp => sp.product_id === product.id);

    if (existingIndex >= 0) {
      // Si ya existe, incrementar cantidad
      const updatedProducts = formData.selectedProducts.map(sp =>
        sp.product_id === product.id ? { ...sp, quantity: sp.quantity + 1 } : sp
      );
      const newAmount = updatedProducts.reduce((sum, sp) => {
        const discountAmount = (sp.price * sp.quantity) * (sp.discount / 100);
        return sum + ((sp.price * sp.quantity) - discountAmount);
      }, 0).toFixed(2);
      setFormData({
        ...formData,
        selectedProducts: updatedProducts,
        amount: newAmount
      });
    } else {
      // Si no existe, agregarlo
      const updatedProducts = [
        ...formData.selectedProducts,
        {
          product_id: product.id,
          quantity: 1,
          name: product.name,
          price: product.price,
          discount: 0
        }
      ];
      const newAmount = updatedProducts.reduce((sum, sp) => {
        const discountAmount = (sp.price * sp.quantity) * (sp.discount / 100);
        return sum + ((sp.price * sp.quantity) - discountAmount);
      }, 0).toFixed(2);
      setFormData({
        ...formData,
        selectedProducts: updatedProducts,
        amount: newAmount
      });
    }
  }

  function updateProductQuantity(product_id: string, quantity: number) {
    const updatedProducts = formData.selectedProducts.map(sp =>
      sp.product_id === product_id ? { ...sp, quantity } : sp
    );
    const newAmount = updatedProducts.reduce((sum, sp) => {
      const discountAmount = (sp.price * sp.quantity) * (sp.discount / 100);
      return sum + ((sp.price * sp.quantity) - discountAmount);
    }, 0).toFixed(2);
    setFormData({
      ...formData,
      selectedProducts: updatedProducts,
      amount: newAmount
    });
  }

  function updateProductDiscount(product_id: string, discount: number) {
    const updatedProducts = formData.selectedProducts.map(sp =>
      sp.product_id === product_id ? { ...sp, discount } : sp
    );
    const newAmount = updatedProducts.reduce((sum, sp) => {
      const discountAmount = (sp.price * sp.quantity) * (sp.discount / 100);
      return sum + ((sp.price * sp.quantity) - discountAmount);
    }, 0).toFixed(2);
    setFormData({
      ...formData,
      selectedProducts: updatedProducts,
      amount: newAmount
    });
  }

  function removeProduct(product_id: string) {
    const updatedProducts = formData.selectedProducts.filter(sp => sp.product_id !== product_id);
    const newAmount = updatedProducts.reduce((sum, sp) => {
      const discountAmount = (sp.price * sp.quantity) * (sp.discount / 100);
      return sum + ((sp.price * sp.quantity) - discountAmount);
    }, 0).toFixed(2);
    setFormData({
      ...formData,
      selectedProducts: updatedProducts,
      amount: updatedProducts.length > 0 ? newAmount : ''
    });
  }

  function toggleEditProductSelection(product: Product) {
    const existingIndex = editFormData.selectedProducts.findIndex(sp => sp.product_id === product.id);

    if (existingIndex >= 0) {
      setEditFormData({
        ...editFormData,
        selectedProducts: editFormData.selectedProducts.filter((_, i) => i !== existingIndex)
      });
    } else {
      setEditFormData({
        ...editFormData,
        selectedProducts: [
          ...editFormData.selectedProducts,
          {
            product_id: product.id,
            quantity: 1,
            name: product.name,
            price: product.price,
            discount: 0
          }
        ]
      });
    }
  }

  function addOrIncrementEditProduct(product: Product) {
    const existingIndex = editFormData.selectedProducts.findIndex(sp => sp.product_id === product.id);

    if (existingIndex >= 0) {
      // Si ya existe, incrementar cantidad
      setEditFormData({
        ...editFormData,
        selectedProducts: editFormData.selectedProducts.map(sp =>
          sp.product_id === product.id ? { ...sp, quantity: sp.quantity + 1 } : sp
        )
      });
    } else {
      // Si no existe, agregarlo
      setEditFormData({
        ...editFormData,
        selectedProducts: [
          ...editFormData.selectedProducts,
          {
            product_id: product.id,
            quantity: 1,
            name: product.name,
            price: product.price,
            discount: 0
          }
        ]
      });
    }
  }

  function updateEditProductQuantity(product_id: string, quantity: number) {
    setEditFormData({
      ...editFormData,
      selectedProducts: editFormData.selectedProducts.map(sp =>
        sp.product_id === product_id ? { ...sp, quantity } : sp
      )
    });
  }

  function updateEditProductDiscount(product_id: string, discount: number) {
    setEditFormData({
      ...editFormData,
      selectedProducts: editFormData.selectedProducts.map(sp =>
        sp.product_id === product_id ? { ...sp, discount } : sp
      )
    });
  }

  function removeEditProduct(product_id: string) {
    setEditFormData({
      ...editFormData,
      selectedProducts: editFormData.selectedProducts.filter(sp => sp.product_id !== product_id)
    });
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.category.toLowerCase().includes(productSearch.toLowerCase()) ||
    product.size.toLowerCase().includes(productSearch.toLowerCase()) ||
    (product.barcode && product.barcode.includes(productSearch))
  );

  function addSplitPayment() {
    setSplitPayments([...splitPayments, { method: 'Efectivo', amount: '' }]);
  }

  function removeSplitPayment(index: number) {
    if (splitPayments.length <= 2) {
      showToast('Debe haber al menos 2 medios de pago', 'warning');
      return;
    }
    setSplitPayments(splitPayments.filter((_, i) => i !== index));
  }

  function updateSplitPayment(index: number, field: 'method' | 'amount', value: string) {
    const updated = [...splitPayments];
    updated[index][field] = value;
    setSplitPayments(updated);
  }

  function toggleSplitPayment() {
    setIsSplitPayment(!isSplitPayment);
    if (!isSplitPayment) {
      // Calcular distribución sugerida si hay un monto total
      const total = parseFloat(formData.amount) || 0;
      if (total > 0) {
        const half = (total / 2).toFixed(2);
        setSplitPayments([
          { method: 'Efectivo', amount: half },
          { method: 'Transferencia', amount: half }
        ]);
      }
    }
  }

  async function handleViewDetails(transaction: Transaction) {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
    setIsEditMode(false);
    setLoadingDetails(true);

    try {
      const { data, error } = await supabase
        .from('transaction_items')
        .select(`
          id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          products (
            id,
            name,
            category,
            size
          )
        `)
        .eq('transaction_id', transaction.id);

      if (error) throw error;

      setTransactionItems(data || []);

      if (transaction.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('name, phone, email')
          .eq('id', transaction.client_id)
          .maybeSingle();

        if (clientData) {
          setSelectedTransaction({
            ...transaction,
            client_name: clientData.name,
            client_phone: clientData.phone,
            client_email: clientData.email
          } as any);
        }
      }

      // Convertir de UTC a hora Argentina (restar 3 horas)
      const transactionDate = new Date(transaction.created_at);
      const argentinaDate = new Date(transactionDate.getTime() - (3 * 60 * 60 * 1000));
      const dateString = argentinaDate.toISOString().slice(0, 16);

      setEditFormData({
        payment_method: transaction.payment_method,
        client_id: transaction.client_id || '',
        description: transaction.description || '',
        custom_date: dateString,
        selectedProducts: (data || []).map(item => {
          const subtotalWithoutDiscount = item.quantity * item.unit_price;
          const discountAmount = subtotalWithoutDiscount - item.subtotal;
          const discountPercentage = subtotalWithoutDiscount > 0 ? (discountAmount / subtotalWithoutDiscount) * 100 : 0;

          return {
            product_id: item.product_id,
            quantity: item.quantity,
            name: item.products.name,
            price: item.unit_price,
            discount: Math.round(discountPercentage * 100) / 100
          };
        })
      });
    } catch (error) {
      console.error('Error loading transaction details:', error);
      showToast('Error al cargar los detalles', 'error');
    } finally {
      setLoadingDetails(false);
    }
  }

  function handleEnterEditMode() {
    if (!selectedTransaction) return;
    setProductSearch('');
    setIsEditMode(true);
  }

  async function handleUpdateSale(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedTransaction || !user) {
      showToast('Error: No hay venta seleccionada', 'error');
      return;
    }

    try {
      const oldItems = transactionItems;
      const newItems = editFormData.selectedProducts;

      for (const oldItem of oldItems) {
        await supabase.rpc('increment_product_stock', {
          product_id: (oldItem as any).product_id,
          quantity_to_add: oldItem.quantity
        });
      }

      await supabase
        .from('transaction_items')
        .delete()
        .eq('transaction_id', selectedTransaction.id);

      for (const newItem of newItems) {
        await supabase.rpc('decrement_product_stock', {
          product_id: newItem.product_id,
          quantity_sold: newItem.quantity
        });
      }

      const newTotalAmount = newItems.reduce((sum, item) => {
        const subtotalWithoutDiscount = item.price * item.quantity;
        const discountAmount = subtotalWithoutDiscount * (item.discount / 100);
        return sum + (subtotalWithoutDiscount - discountAmount);
      }, 0);

      await supabase
        .from('transactions')
        .update({
          payment_method: editFormData.payment_method,
          client_id: editFormData.client_id || null,
          description: editFormData.description,
          amount: newTotalAmount,
          created_at: (() => {
            // Interpretar la fecha como hora Argentina y convertir a UTC
            const localDate = new Date(editFormData.custom_date);
            const utcDate = new Date(localDate.getTime() + (3 * 60 * 60 * 1000));
            return utcDate.toISOString();
          })()
        })
        .eq('id', selectedTransaction.id);

      if (newItems.length > 0) {
        const items = newItems.map(item => {
          const subtotalWithoutDiscount = item.price * item.quantity;
          const discountAmount = subtotalWithoutDiscount * (item.discount / 100);
          return {
            transaction_id: selectedTransaction.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.price,
            subtotal: subtotalWithoutDiscount - discountAmount
          };
        });

        await supabase.from('transaction_items').insert(items);
      }

      const wasCC = selectedTransaction.payment_method === 'Cuenta Corriente';
      const nowCC = editFormData.payment_method === 'Cuenta Corriente';

      if (wasCC && selectedTransaction.client_id) {
        await supabase
          .from('account_movements')
          .delete()
          .eq('transaction_id', selectedTransaction.id);

        const { data: oldClient } = await supabase
          .from('clients')
          .select('balance')
          .eq('id', selectedTransaction.client_id)
          .single();

        if (oldClient) {
          await supabase
            .from('clients')
            .update({
              balance: oldClient.balance - selectedTransaction.amount
            })
            .eq('id', selectedTransaction.client_id);
        }
      }

      if (nowCC && editFormData.client_id) {
        const productDetails = newItems
          .map(item => `${item.name} (${item.quantity}x $${item.price})`)
          .join(', ');
        const description = `Venta: ${productDetails}`;

        await supabase.from('account_movements').insert([{
          client_id: editFormData.client_id,
          transaction_id: selectedTransaction.id,
          type: 'charge',
          amount: newTotalAmount,
          description: description,
          user_id: user.id,
          created_at: (() => {
            // Interpretar la fecha como hora Argentina y convertir a UTC
            const localDate = new Date(editFormData.custom_date);
            const utcDate = new Date(localDate.getTime() + (3 * 60 * 60 * 1000));
            return utcDate.toISOString();
          })()
        }]);

        const { data: newClient } = await supabase
          .from('clients')
          .select('balance')
          .eq('id', editFormData.client_id)
          .single();

        if (newClient) {
          await supabase
            .from('clients')
            .update({
              balance: newClient.balance + newTotalAmount
            })
            .eq('id', editFormData.client_id);
        }
      }

      showToast('Venta actualizada correctamente', 'success');
      setIsEditMode(false);
      setIsDetailModalOpen(false);
      loadData();
    } catch (error) {
      console.error('Error updating sale:', error);
      showToast('Error al actualizar la venta', 'error');
    }
  }

  async function handleDeleteTransaction(transactionId: string) {
    const confirmed = await showConfirm({
      title: 'Anular Venta',
      message: '¿Estás seguro de que deseas anular esta venta? Esta acción no se puede deshacer y el stock será restaurado.',
      confirmText: 'Sí, Anular',
      cancelText: 'Cancelar',
      variant: 'danger'
    });

    if (!confirmed) {
      return;
    }

    try {
      // Usar la función de base de datos que maneja toda la lógica consistentemente
      const { data, error } = await supabase.rpc('delete_sale', {
        p_transaction_id: transactionId
      });

      if (error) throw error;

      if (data && !data.success) {
        showToast(data.message || 'Error al anular la venta', 'error');
        return;
      }

      showToast('Venta anulada correctamente', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      showToast('Error al anular la venta', 'error');
    }
  }

  if (!currentCashbox) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-pink-100 rounded-full mb-4">
              <Lock size={40} className="text-pink-600" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-gray-800 mb-2">Caja Cerrada</h2>
            <p className="text-gray-600 mb-6">Debes abrir la caja para comenzar a trabajar</p>
          </div>
        </div>

        <Modal
          isOpen={isOpenCashboxModalOpen}
          onClose={() => {}}
          title="Apertura de Caja"
        >
          <form onSubmit={handleOpenCashbox} className="space-y-5">
            <div className="bg-pink-50 rounded-lg p-4 border border-pink-200">
              <p className="text-sm text-gray-700">
                Ingresa el monto inicial en efectivo con el que vas a comenzar el día.
              </p>
            </div>

            <Input
              label="Efectivo Inicial ($)"
              type="number"
              step="0.01"
              value={openCashboxData.initial_cash}
              onChange={(e) => setOpenCashboxData({ initial_cash: e.target.value })}
              placeholder="0.00"
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="submit">
                <Unlock size={18} />
                Abrir Caja
              </Button>
            </div>
          </form>
        </Modal>
      </>
    );
  }

  return (
    <div>
      <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-serif font-bold text-pink-700 mb-2">Caja</h1>
          <p className="text-gray-600 uppercase tracking-wider text-xs lg:text-sm">Control de ventas y movimientos</p>
          {currentCashbox && (
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <Unlock size={14} />
                Caja Abierta
              </span>
              <span className="text-xs text-gray-500">
                Desde {formatArgentinaDateTime(currentCashbox.opening_date)}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex-1 sm:flex-initial">
            <Plus size={20} />
            Nueva Venta
          </Button>
          <Button
            onClick={() => setIsCloseCashboxModalOpen(true)}
            variant="secondary"
            className="flex-1 sm:flex-initial"
          >
            <Lock size={20} />
            Cerrar Caja
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-green-700 uppercase tracking-wide mb-1 font-medium">Ingresos (Caja)</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <ArrowUp size={20} className="text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-green-700">${totalIncome.toFixed(2)}</p>
            <p className="text-xs text-green-600 mt-2">Efectivo, transferencia y tarjeta</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-blue-700 uppercase tracking-wide mb-1 font-medium">Ventas Gift Cards</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Gift size={20} className="text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-700">${totalGiftCards.toFixed(2)}</p>
            <p className="text-xs text-blue-600 mt-2">Tarjetas de regalo vendidas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-orange-700 uppercase tracking-wide mb-1 font-medium">Ventas CC</p>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Wallet size={20} className="text-orange-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-orange-700">${totalCCSales.toFixed(2)}</p>
            <p className="text-xs text-orange-600 mt-2">Ventas en Cuenta Corriente</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-pink-700 uppercase tracking-wide mb-1 font-medium">Efectivo en Caja</p>
              </div>
              <div className="p-2 bg-pink-100 rounded-lg">
                <Wallet size={20} className="text-pink-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-pink-700">${totalCash.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg lg:text-xl font-serif font-bold text-gray-800">Movimientos Recientes</h2>
          <button className="flex items-center gap-2 px-3 lg:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs lg:text-sm font-medium">
            <Filter size={16} className="lg:w-[18px] lg:h-[18px]" />
            <span className="hidden sm:inline">Filtrar</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Fecha</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Descripción</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Categoría</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Medio</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Cliente</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Monto</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr
                key={transaction.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleViewDetails(transaction)}
              >
                <td className="px-6 py-4 text-gray-900 text-sm">
                  {formatArgentinaDateTime(transaction.created_at)}
                </td>
                <td className="px-6 py-4 text-gray-700 text-sm">
                  {transaction.description || '-'}
                </td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {transaction.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 text-sm">{transaction.payment_method}</td>
                <td className="px-6 py-4 text-gray-700 text-sm">
                  {transaction.payment_method === 'Cuenta Corriente' && (transaction as any).clients?.name ? (
                    <span className="inline-flex items-center px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      {(transaction as any).clients.name}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`font-bold text-sm ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}${Number(transaction.amount).toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(transaction);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleViewDetails(transaction);
                        setTimeout(() => {
                          handleEnterEditMode();
                        }, 100);
                      }}
                      className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                      title="Editar venta"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTransaction(transaction.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Anular venta"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No hay movimientos registrados.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title="Nuevo Movimiento"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha y Hora de la Venta (Hora Argentina - Opcional)
            </label>
            <input
              type="datetime-local"
              value={formData.custom_date}
              onChange={(e) => setFormData({ ...formData, custom_date: e.target.value })}
              max={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <p className="text-xs text-blue-600 mt-2">
              {formData.custom_date
                ? `Esta venta se registrará el ${formatArgentinaDateTime(formData.custom_date)}`
                : 'Si no especificas una fecha, se usará la fecha y hora actual de Argentina'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo de Movimiento"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              options={[
                { value: 'income', label: 'Ingreso' },
                { value: 'expense', label: 'Egreso' }
              ]}
            />

            <Select
              label="Categoría"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'Venta General', label: 'Venta General' },
                { value: 'Cobro de Pedido', label: 'Cobro de Pedido' },
                { value: 'Insumos', label: 'Insumos' },
                { value: 'Servicios', label: 'Servicios' },
                { value: 'Pago Proveedores', label: 'Pago Proveedores' },
                { value: 'Otros', label: 'Otros' }
              ]}
            />
          </div>

          {!isSplitPayment ? (
            <>
              <Select
                label="Medio de Pago"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                options={[
                  { value: 'Efectivo', label: 'Efectivo' },
                  { value: 'Transferencia', label: 'Transferencia' },
                  { value: 'Tarjeta', label: 'Tarjeta' },
                  { value: 'Cheque', label: 'Cheque' },
                  { value: 'Gift Card', label: 'Gift Card' },
                  { value: 'Cuenta Corriente', label: 'Cuenta Corriente' }
                ]}
              />

              {formData.payment_method === 'Gift Card' && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Gift Card
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="GC-XXXXXX"
                      value={formData.gift_card_code}
                      onChange={(e) => {
                        setFormData({ ...formData, gift_card_code: e.target.value.toUpperCase() });
                        setGiftCardValidated(false);
                        setValidatedGiftCard(null);
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={validateGiftCard}
                      variant={giftCardValidated ? 'secondary' : 'primary'}
                      className="whitespace-nowrap"
                    >
                      {giftCardValidated ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Validada
                        </>
                      ) : (
                        'Validar'
                      )}
                    </Button>
                  </div>
                  {giftCardValidated && validatedGiftCard && (
                    <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded">
                      ✓ Saldo disponible: ${validatedGiftCard.current_balance?.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={toggleSplitPayment}
                className="w-full py-2 border-2 border-dashed border-pink-300 rounded-lg text-pink-600 hover:bg-pink-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Pago Dividido
              </button>
            </>
          ) : (
            <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-pink-700">Pago Dividido</h3>
                <button
                  type="button"
                  onClick={toggleSplitPayment}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Cancelar
                </button>
              </div>

              <div className="space-y-3">
                {splitPayments.map((payment, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <select
                        value={payment.method}
                        onChange={(e) => updateSplitPayment(index, 'method', e.target.value)}
                        className="w-full px-3 py-2 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Gift Card">Gift Card</option>
                        <option value="Cuenta Corriente">Cuenta Corriente</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        step="0.01"
                        value={payment.amount}
                        onChange={(e) => updateSplitPayment(index, 'amount', e.target.value)}
                        placeholder="Monto"
                        className="w-full px-3 py-2 border border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
                      />
                    </div>
                    {splitPayments.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeSplitPayment(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {splitPayments.some(p => p.method === 'Gift Card') && (
                <div className="mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código de Gift Card
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="GC-XXXXXX"
                      value={formData.gift_card_code}
                      onChange={(e) => {
                        setFormData({ ...formData, gift_card_code: e.target.value.toUpperCase() });
                        setGiftCardValidated(false);
                        setValidatedGiftCard(null);
                      }}
                      className="flex-1 text-sm"
                    />
                    <Button
                      type="button"
                      onClick={validateGiftCard}
                      variant={giftCardValidated ? 'secondary' : 'primary'}
                      className="whitespace-nowrap text-xs"
                    >
                      {giftCardValidated ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Validada
                        </>
                      ) : (
                        'Validar'
                      )}
                    </Button>
                  </div>
                  {giftCardValidated && validatedGiftCard && (
                    <div className="mt-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                      ✓ Saldo disponible: ${validatedGiftCard.current_balance?.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={addSplitPayment}
                className="w-full mt-3 py-2 border-2 border-dashed border-pink-300 rounded-lg text-pink-600 hover:bg-white transition-colors text-xs font-medium flex items-center justify-center gap-1"
              >
                <Plus size={14} />
                Agregar Medio de Pago
              </button>

              <div className="mt-3 pt-3 border-t border-pink-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total pagado:</span>
                  <span className="font-bold text-pink-700">
                    ${splitPayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0).toFixed(2)}
                  </span>
                </div>
                {formData.amount && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Total requerido:</span>
                    <span className="font-bold text-gray-900">${parseFloat(formData.amount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-pink-50 rounded-xl p-5 border border-pink-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-widest text-pink-700 font-semibold">Seleccionar Productos</h3>
              <button
                type="button"
                onClick={() => setIsNewProductModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-pink-300 rounded-lg text-pink-700 hover:bg-pink-50 transition-colors text-xs font-medium"
              >
                <Gift size={14} />
                Producto Nuevo
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsProductSelectorOpen(true)}
              className="w-full mb-3 relative bg-white border-2 border-pink-300 rounded-lg hover:border-pink-500 transition-colors group"
            >
              <div className="flex items-center px-4 py-3">
                <Search className="text-pink-400 group-hover:text-pink-600 mr-3" size={20} />
                <span className="text-gray-500 group-hover:text-gray-700 text-sm">
                  Click aquí para buscar y agregar productos...
                </span>
              </div>
            </button>

            {formData.selectedProducts.length > 0 && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-pink-700 font-semibold mb-3">Productos Seleccionados:</p>
                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                {formData.selectedProducts.map((sp) => {
                  const subtotal = sp.price * sp.quantity;
                  const discountAmount = subtotal * (sp.discount / 100);
                  const finalPrice = subtotal - discountAmount;

                  return (
                    <div key={sp.product_id} className="bg-white rounded-lg p-3 border border-pink-200">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{sp.name}</p>
                          <p className="text-xs text-pink-600 font-medium">${sp.price}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={sp.quantity}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || /^\d+$/.test(value)) {
                                  const quantity = value === '' ? 0 : parseInt(value);
                                  updateProductQuantity(sp.product_id, quantity);
                                }
                              }}
                              onBlur={(e) => {
                                const quantity = parseInt(e.target.value) || 1;
                                if (quantity < 1) {
                                  updateProductQuantity(sp.product_id, 1);
                                }
                              }}
                              className="w-16 px-2 py-1.5 border-2 border-pink-300 rounded-lg text-center text-sm font-semibold focus:outline-none focus:border-pink-500"
                              placeholder="Cant"
                            />
                            <select
                              value={sp.discount}
                              onChange={(e) => updateProductDiscount(sp.product_id, parseFloat(e.target.value))}
                              className="w-20 px-2 py-1.5 border-2 border-green-300 rounded-lg text-center text-xs font-semibold focus:outline-none focus:border-green-500 bg-white"
                              title="Descuento %"
                            >
                              <option value={0}>0%</option>
                              <option value={10}>10%</option>
                              <option value={20}>20%</option>
                              <option value={30}>30%</option>
                              <option value={40}>40%</option>
                              <option value={50}>50%</option>
                            </select>
                          </div>
                          <Check className="text-pink-600 flex-shrink-0" size={18} />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeProduct(sp.product_id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                          title="Eliminar producto"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="mt-2 space-y-0.5">
                        <p className="text-xs text-gray-500">
                          Subtotal: {sp.quantity} × ${sp.price} = ${subtotal.toFixed(2)}
                        </p>
                        {sp.discount > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            Descuento ({sp.discount}%): -${discountAmount.toFixed(2)}
                          </p>
                        )}
                        <p className="text-xs text-gray-900 font-bold">
                          Total: ${finalPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                </div>
                <div className="mt-3 pt-3 border-t border-pink-200">
                  <p className="text-base text-pink-700 font-bold text-center">
                    Total: ${formData.selectedProducts.reduce((sum, sp) => {
                      const discountAmount = (sp.price * sp.quantity) * (sp.discount / 100);
                      return sum + ((sp.price * sp.quantity) - discountAmount);
                    }, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Monto ($)"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder={formData.selectedProducts.length > 0 ? "Auto-calculado desde productos" : "Ingrese monto"}
                disabled={formData.selectedProducts.length > 0}
              />
              {formData.selectedProducts.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">El monto se calcula automáticamente desde los productos seleccionados</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Descripción
              </label>
              <textarea
                placeholder="Ej. Ventas del día, Pago Proveedor..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Cliente Relacionado (Opcional)
              </label>
              <button
                type="button"
                onClick={() => setIsNewClientModalOpen(true)}
                className="text-xs text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1"
              >
                <Plus size={14} />
                Nuevo Cliente
              </button>
            </div>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            >
              <option value="">Seleccionar Cliente</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Registrar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isNewProductModalOpen}
        onClose={() => { setIsNewProductModalOpen(false); resetNewProductForm(); }}
        title="Crear Producto Nuevo"
      >
        <form onSubmit={handleNewProduct} className="space-y-4">
          <Input
            label="Nombre del Producto"
            value={newProductData.name}
            onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoría"
              value={newProductData.category}
              onChange={(e) => setNewProductData({ ...newProductData, category: e.target.value })}
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
              value={newProductData.size}
              onChange={(e) => setNewProductData({ ...newProductData, size: e.target.value })}
              options={[
                { value: 'XS', label: 'XS' },
                { value: 'S', label: 'S' },
                { value: 'M', label: 'M' },
                { value: 'L', label: 'L' },
                { value: 'XL', label: 'XL' }
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio de Venta"
              type="number"
              step="0.01"
              value={newProductData.price}
              onChange={(e) => setNewProductData({ ...newProductData, price: e.target.value })}
              required
            />

            <Input
              label="Costo (Opcional)"
              type="number"
              step="0.01"
              value={newProductData.cost}
              onChange={(e) => setNewProductData({ ...newProductData, cost: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Stock"
              type="number"
              value={newProductData.stock}
              onChange={(e) => setNewProductData({ ...newProductData, stock: e.target.value })}
              required
            />

            <Input
              label="Stock Mínimo"
              type="number"
              value={newProductData.min_stock}
              onChange={(e) => setNewProductData({ ...newProductData, min_stock: e.target.value })}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsNewProductModalOpen(false); resetNewProductForm(); }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Crear Producto
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isNewClientModalOpen}
        onClose={() => { setIsNewClientModalOpen(false); resetNewClientForm(); }}
        title="Crear Nuevo Cliente"
      >
        <form onSubmit={handleNewClient} className="space-y-4">
          <Input
            label="Nombre del Cliente"
            value={newClientData.name}
            onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
            placeholder="Ej. Juan Pérez"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email (Opcional)"
              type="email"
              value={newClientData.email}
              onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
              placeholder="cliente@email.com"
            />

            <Input
              label="Teléfono (Opcional)"
              type="tel"
              value={newClientData.phone}
              onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
              placeholder="Ej. 1155443322"
            />
          </div>

          <Input
            label="Dirección (Opcional)"
            value={newClientData.address}
            onChange={(e) => setNewClientData({ ...newClientData, address: e.target.value })}
            placeholder="Ej. Av. Principal 123"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notas (Opcional)
            </label>
            <textarea
              value={newClientData.notes}
              onChange={(e) => setNewClientData({ ...newClientData, notes: e.target.value })}
              placeholder="Información adicional del cliente..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setIsNewClientModalOpen(false); resetNewClientForm(); }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              Crear Cliente
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTransaction(null);
          setTransactionItems([]);
          setIsEditMode(false);
        }}
        title={isEditMode ? "Editar Venta" : "Detalle de Venta"}
      >
        {selectedTransaction && !isEditMode && (
          <div className="space-y-5">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatArgentinaDateTime(selectedTransaction.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total</p>
                  <p className={`text-lg font-bold ${
                    selectedTransaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${Number(selectedTransaction.amount).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Categoría</p>
                  <span className="inline-block px-3 py-1 bg-white text-gray-700 rounded-full text-xs font-medium border">
                    {selectedTransaction.category}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Medio de Pago</p>
                  <p className="text-sm font-medium text-gray-900">{selectedTransaction.payment_method}</p>
                </div>
              </div>

              {(selectedTransaction as any).client_name && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cliente</p>
                  <p className="text-sm font-semibold text-pink-700">{(selectedTransaction as any).client_name}</p>
                  {((selectedTransaction as any).client_phone || (selectedTransaction as any).client_email) && (
                    <div className="mt-1 space-y-0.5">
                      {(selectedTransaction as any).client_phone && (
                        <p className="text-xs text-gray-600">Tel: {(selectedTransaction as any).client_phone}</p>
                      )}
                      {(selectedTransaction as any).client_email && (
                        <p className="text-xs text-gray-600">Email: {(selectedTransaction as any).client_email}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {selectedTransaction.description && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Descripción</p>
                  <p className="text-sm text-gray-700">{selectedTransaction.description}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
                Productos Comprados
              </h3>

              {loadingDetails ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Cargando productos...</p>
                </div>
              ) : transactionItems.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 text-sm">Esta venta no tiene productos asociados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactionItems.map((item) => (
                    <div key={item.id} className="bg-pink-50 rounded-lg p-4 border border-pink-100">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">{item.products.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {item.products.category} · {item.products.size}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="font-bold text-pink-700">${Number(item.subtotal).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-600 pt-2 border-t border-pink-200">
                        <span>Cantidad: <strong>{item.quantity}</strong></span>
                        <span>Precio unitario: <strong>${Number(item.unit_price).toFixed(2)}</strong></span>
                      </div>
                    </div>
                  ))}

                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 border-2 border-pink-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Total de la Venta
                      </span>
                      <span className="text-xl font-bold text-pink-700">
                        ${transactionItems.reduce((sum, item) => sum + Number(item.subtotal), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="secondary"
                onClick={handleEnterEditMode}
              >
                Editar
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedTransaction(null);
                  setTransactionItems([]);
                }}
              >
                Cerrar
              </Button>
            </div>
          </div>
        )}

        {selectedTransaction && isEditMode && (
          <form onSubmit={handleUpdateSale} className="space-y-5">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha y Hora de la Venta (Hora Argentina)
              </label>
              <input
                type="datetime-local"
                value={editFormData.custom_date}
                onChange={(e) => setEditFormData({ ...editFormData, custom_date: e.target.value })}
                max={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                required
              />
              <p className="text-xs text-blue-600 mt-2">
                Ingresa la fecha y hora en horario de Argentina
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Medio de Pago"
                value={editFormData.payment_method}
                onChange={(e) => setEditFormData({ ...editFormData, payment_method: e.target.value })}
                options={[
                  { value: 'Efectivo', label: 'Efectivo' },
                  { value: 'Transferencia', label: 'Transferencia' },
                  { value: 'Tarjeta', label: 'Tarjeta' },
                  { value: 'Cheque', label: 'Cheque' },
                  { value: 'Gift Card', label: 'Gift Card' },
                  { value: 'Cuenta Corriente', label: 'Cuenta Corriente' }
                ]}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cliente Relacionado (Opcional)
                </label>
                <select
                  value={editFormData.client_id}
                  onChange={(e) => setEditFormData({ ...editFormData, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                >
                  <option value="">Seleccionar Cliente</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Descripción
              </label>
              <textarea
                placeholder="Ej. Ventas del día..."
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="bg-pink-50 rounded-xl p-5 border border-pink-100">
              <h3 className="text-xs uppercase tracking-widest text-pink-700 font-semibold mb-4">Productos</h3>

              <button
                type="button"
                onClick={() => setIsEditProductSelectorOpen(true)}
                className="w-full mb-3 relative bg-white border-2 border-pink-300 rounded-lg hover:border-pink-500 transition-colors group"
              >
                <div className="flex items-center px-4 py-3">
                  <Search className="text-pink-400 group-hover:text-pink-600 mr-3" size={20} />
                  <span className="text-gray-500 group-hover:text-gray-700 text-sm">
                    Click aquí para buscar y agregar productos...
                  </span>
                </div>
              </button>

              {editFormData.selectedProducts.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-pink-700 font-semibold mb-3">Productos en la Venta:</p>
                  <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                  {editFormData.selectedProducts.map((sp) => {
                    const subtotal = sp.price * sp.quantity;
                    const discountAmount = subtotal * (sp.discount / 100);
                    const finalPrice = subtotal - discountAmount;

                    return (
                      <div key={sp.product_id} className="bg-white rounded-lg p-3 border border-pink-200">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm truncate">{sp.name}</p>
                            <p className="text-xs text-pink-600 font-medium">${sp.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={sp.quantity}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === '' || /^\d+$/.test(value)) {
                                    const quantity = value === '' ? 0 : parseInt(value);
                                    updateEditProductQuantity(sp.product_id, quantity);
                                  }
                                }}
                                onBlur={(e) => {
                                  const quantity = parseInt(e.target.value) || 1;
                                  if (quantity < 1) {
                                    updateEditProductQuantity(sp.product_id, 1);
                                  }
                                }}
                                className="w-16 px-2 py-1.5 border-2 border-pink-300 rounded-lg text-center text-sm font-semibold focus:outline-none focus:border-pink-500"
                                placeholder="Cant"
                              />
                              <select
                                value={sp.discount}
                                onChange={(e) => updateEditProductDiscount(sp.product_id, parseFloat(e.target.value))}
                                className="w-20 px-2 py-1.5 border-2 border-green-300 rounded-lg text-center text-xs font-semibold focus:outline-none focus:border-green-500 bg-white"
                                title="Descuento %"
                              >
                                <option value={0}>0%</option>
                                <option value={10}>10%</option>
                                <option value={20}>20%</option>
                                <option value={30}>30%</option>
                                <option value={40}>40%</option>
                                <option value={50}>50%</option>
                              </select>
                            </div>
                            <Check className="text-pink-600 flex-shrink-0" size={18} />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEditProduct(sp.product_id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                            title="Eliminar producto"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="mt-2 space-y-0.5">
                          <p className="text-xs text-gray-500">
                            Subtotal: {sp.quantity} × ${sp.price} = ${subtotal.toFixed(2)}
                          </p>
                          {sp.discount > 0 && (
                            <p className="text-xs text-green-600 font-medium">
                              Descuento ({sp.discount}%): -${discountAmount.toFixed(2)}
                            </p>
                          )}
                          <p className="text-xs text-gray-900 font-bold">
                            Total: ${finalPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-pink-200">
                    <p className="text-base text-pink-700 font-bold text-center">
                      Total: ${editFormData.selectedProducts.reduce((sum, sp) => {
                        const discountAmount = (sp.price * sp.quantity) * (sp.discount / 100);
                        return sum + ((sp.price * sp.quantity) - discountAmount);
                      }, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsEditMode(false);
                  setProductSearch('');
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                Guardar Cambios
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        isOpen={isCloseCashboxModalOpen}
        onClose={() => setIsCloseCashboxModalOpen(false)}
        title="Cierre de Caja"
      >
        <form onSubmit={handleCloseCashbox} className="space-y-5">
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-5 border border-pink-200">
            <h3 className="text-sm font-semibold text-pink-900 uppercase tracking-wide mb-4">Resumen del Día</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Efectivo Inicial:</span>
                <span className="text-sm font-bold text-gray-900">${currentCashbox?.initial_cash.toFixed(2)}</span>
              </div>

              <div className="h-px bg-pink-200"></div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Ventas Efectivo:</span>
                <span className="text-sm font-bold text-green-600">
                  ${transactions
                    .filter(t => t.type === 'income' && t.payment_method === 'Efectivo')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                    .toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Ventas Transferencia:</span>
                <span className="text-sm font-bold text-blue-600">
                  ${transactions
                    .filter(t => t.type === 'income' && t.payment_method === 'Transferencia')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                    .toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Ventas Tarjeta:</span>
                <span className="text-sm font-bold text-purple-600">
                  ${transactions
                    .filter(t => t.type === 'income' && t.payment_method === 'Tarjeta')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                    .toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Cobros Cta. Corriente:</span>
                <span className="text-sm font-bold text-orange-600">
                  ${transactions
                    .filter(t => t.type === 'income' && t.category === 'Cobranza (Cta. Cte.)')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                    .toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Egresos:</span>
                <span className="text-sm font-bold text-red-600">
                  -${transactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                    .toFixed(2)}
                </span>
              </div>

              <div className="h-px bg-pink-300"></div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-semibold text-gray-900">Efectivo Esperado:</span>
                <span className="text-lg font-bold text-pink-700">
                  ${(() => {
                    const cashSales = transactions
                      .filter(t => t.type === 'income' && t.payment_method === 'Efectivo')
                      .reduce((sum, t) => sum + Number(t.amount), 0);
                    const expenses = transactions
                      .filter(t => t.type === 'expense')
                      .reduce((sum, t) => sum + Number(t.amount), 0);
                    return ((currentCashbox?.initial_cash || 0) + cashSales - expenses).toFixed(2);
                  })()}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notas (Opcional)
            </label>
            <textarea
              value={closeCashboxData.notes}
              onChange={(e) => setCloseCashboxData({ ...closeCashboxData, notes: e.target.value })}
              placeholder="Observaciones sobre el cierre de caja..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCloseCashboxModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">
              <Lock size={18} />
              Cerrar Caja
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isProductSelectorOpen}
        onClose={() => {
          setIsProductSelectorOpen(false);
          setProductSearch('');
        }}
        title="Buscar y Agregar Productos"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={productSearchInputRef}
              type="text"
              placeholder="Buscar por nombre, categoría, talle o código de barras... (Enter para agregar)"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length > 0) {
                  e.preventDefault();
                  const firstProduct = filteredProducts[0];
                  addOrIncrementProduct(firstProduct);
                  setProductSearch('');
                  setIsProductSelectorOpen(false);
                }
              }}
              autoFocus
              className="w-full pl-10 pr-10 py-3 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-base"
            />
            {productSearch && (
              <button
                type="button"
                onClick={() => {
                  setProductSearch('');
                  productSearchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {productSearch ? (
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
              {filteredProducts.map((product, index) => {
                const isSelected = formData.selectedProducts.some(sp => sp.product_id === product.id);
                const selectedProduct = formData.selectedProducts.find(sp => sp.product_id === product.id);

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-lg p-4 border-2 transition-all cursor-pointer ${
                      index === 0 ? 'ring-2 ring-pink-400' : ''
                    } ${
                      isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                    }`}
                    onClick={() => {
                      addOrIncrementProduct(product);
                      setProductSearch('');
                      setIsProductSelectorOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-base">{product.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{product.category} · {product.size}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-pink-700 font-bold text-lg">${product.price}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center justify-between pt-2 border-t border-pink-200">
                        <span className="text-xs text-pink-600 font-medium">✓ Agregado</span>
                        <span className="text-xs text-gray-600">Cant: {selectedProduct?.quantity || 1}</span>
                      </div>
                    )}
                    {index === 0 && productSearch && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-pink-600 font-medium">↵ Presiona Enter para agregar</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <p className="col-span-2 text-center text-gray-400 py-8">No se encontraron productos</p>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 text-base">Escribe para buscar productos</p>
              <p className="text-gray-400 text-sm mt-2">Presiona Enter para agregar el primer resultado</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={() => {
                setIsProductSelectorOpen(false);
                setProductSearch('');
              }}
            >
              Listo
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEditProductSelectorOpen}
        onClose={() => {
          setIsEditProductSelectorOpen(false);
          setProductSearch('');
        }}
        title="Buscar y Agregar Productos"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={productSearchInputRef}
              type="text"
              placeholder="Buscar por nombre, categoría, talle o código de barras... (Enter para agregar)"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredProducts.length > 0) {
                  e.preventDefault();
                  const firstProduct = filteredProducts[0];
                  addOrIncrementEditProduct(firstProduct);
                  setProductSearch('');
                  setIsEditProductSelectorOpen(false);
                }
              }}
              autoFocus
              className="w-full pl-10 pr-10 py-3 border-2 border-pink-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-base"
            />
            {productSearch && (
              <button
                type="button"
                onClick={() => {
                  setProductSearch('');
                  productSearchInputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {productSearch ? (
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-2">
              {filteredProducts.map((product, index) => {
                const isSelected = editFormData.selectedProducts.some(sp => sp.product_id === product.id);
                const selectedProduct = editFormData.selectedProducts.find(sp => sp.product_id === product.id);

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-lg p-4 border-2 transition-all cursor-pointer ${
                      index === 0 ? 'ring-2 ring-pink-400' : ''
                    } ${
                      isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-pink-300'
                    }`}
                    onClick={() => {
                      addOrIncrementEditProduct(product);
                      setProductSearch('');
                      setIsEditProductSelectorOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-base">{product.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{product.category} · {product.size}</p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-pink-700 font-bold text-lg">${product.price}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center justify-between pt-2 border-t border-pink-200">
                        <span className="text-xs text-pink-600 font-medium">✓ Agregado</span>
                        <span className="text-xs text-gray-600">Cant: {selectedProduct?.quantity || 1}</span>
                      </div>
                    )}
                    {index === 0 && productSearch && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-pink-600 font-medium">↵ Presiona Enter para agregar</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <p className="col-span-2 text-center text-gray-400 py-8">No se encontraron productos</p>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 text-base">Escribe para buscar productos</p>
              <p className="text-gray-400 text-sm mt-2">Presiona Enter para agregar el primer resultado</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              onClick={() => {
                setIsEditProductSelectorOpen(false);
                setProductSearch('');
              }}
            >
              Listo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
