export type CompactReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type CompactReceiptDetail = {
  label: string;
  value: string;
};

export type CompactReceiptData = {
  saleId: number;
  businessName: string;
  date: string;
  time: string;
  seller: string;
  client: string;
  paymentType: 'Contado' | 'Crédito';
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  currencySymbol: string;
  items: CompactReceiptItem[];
  details?: CompactReceiptDetail[];
  status?: string | null;
};

const receiptCopy = {
  es: {
    title: 'Recibo de venta',
    date: 'Fecha',
    time: 'Hora',
    seller: 'Vendedor',
    client: 'Cliente',
    payment: 'Pago',
    cash: 'Contado',
    credit: 'Crédito',
    product: 'Producto',
    quantity: 'Cant.',
    price: 'Precio',
    subtotal: 'Subtotal',
    discount: 'Descuento',
    total: 'Total',
    thanks: 'Gracias por su compra.',
    cancelled: 'Anulada',
  },
  en: {
    title: 'Sales receipt',
    date: 'Date',
    time: 'Time',
    seller: 'Seller',
    client: 'Client',
    payment: 'Payment',
    cash: 'Cash',
    credit: 'Credit',
    product: 'Product',
    quantity: 'Qty.',
    price: 'Price',
    subtotal: 'Subtotal',
    discount: 'Discount',
    total: 'Total',
    thanks: 'Thank you for your purchase.',
    cancelled: 'Cancelled',
  },
} as const;

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMoney(value: number, currencySymbol: string) {
  return `${escapeHtml(currencySymbol)} ${formatNumber(value)}`;
}

function formatSaleCode(id: number) {
  return `V-${String(id).padStart(4, '0')}`;
}

function isCancelled(status: string | null | undefined) {
  return status === 'anulada' || status === 'cancelled';
}

export function printCompactReceipt(data: CompactReceiptData, language: 'es' | 'en') {
  const t = receiptCopy[language];
  const rows = data.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.name)}</td>
      <td class="number">${Number(item.quantity || 0).toLocaleString('en-US')}</td>
      <td class="number">${formatMoney(item.unitPrice, data.currencySymbol)}</td>
      <td class="number">${formatMoney(item.quantity * item.unitPrice, data.currencySymbol)}</td>
    </tr>
  `).join('');
  const detailRows = (data.details || []).map((detail) => `
    <div><strong>${escapeHtml(detail.label)}:</strong> ${escapeHtml(detail.value)}</div>
  `).join('');
  const cancelled = isCancelled(data.status);
  const receiptWindow = window.open('', '_blank', 'width=420,height=700');

  if (!receiptWindow) return false;

  receiptWindow.document.write(`
    <!doctype html>
    <html lang="${language}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(t.title)} ${formatSaleCode(data.saleId)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 18px; }
          .receipt { max-width: 360px; margin: 0 auto; }
          h1 { font-size: 20px; margin: 0 0 5px; text-align: center; }
          .muted { color: #555; font-size: 11px; text-align: center; margin: 0; }
          .info { border-top: 1px dashed #777; border-bottom: 1px dashed #777; margin: 14px 0; padding: 10px 0; font-size: 12px; line-height: 1.45; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: auto; }
          th, td { padding: 6px 2px; border-bottom: 1px solid #ddd; vertical-align: top; }
          th { text-align: left; }
          th:first-child, td:first-child { padding-left: 0; overflow-wrap: anywhere; }
          th:last-child, td:last-child { padding-right: 0; }
          .number { text-align: right; white-space: nowrap; }
          .summary { margin-top: 12px; font-size: 12px; }
          .summary-row { display: flex; justify-content: space-between; gap: 12px; margin-top: 5px; }
          .grand-total { border-top: 1px dashed #777; padding-top: 8px; margin-top: 8px; font-size: 17px; font-weight: 800; }
          .thanks { margin-top: 18px; text-align: center; font-size: 11px; color: #555; }
          .cancelled { margin: 9px auto 0; width: fit-content; border: 2px solid #111; padding: 4px 10px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
          @page { margin: 16mm 8mm 10mm 8mm; }
          @media print {
            body { padding: 0; }
            .receipt { max-width: none; }
          }
        </style>
      </head>
      <body>
        <main class="receipt">
          <h1>${escapeHtml(data.businessName)}</h1>
          <p class="muted">${escapeHtml(t.title)}</p>
          <p class="muted">${formatSaleCode(data.saleId)}</p>
          ${cancelled ? `<p class="cancelled">${escapeHtml(t.cancelled)}</p>` : ''}
          <div class="info">
            <div><strong>${escapeHtml(t.date)}:</strong> ${escapeHtml(data.date)}</div>
            <div><strong>${escapeHtml(t.time)}:</strong> ${escapeHtml(data.time)}</div>
            <div><strong>${escapeHtml(t.seller)}:</strong> ${escapeHtml(data.seller)}</div>
            <div><strong>${escapeHtml(t.client)}:</strong> ${escapeHtml(data.client)}</div>
            <div><strong>${escapeHtml(t.payment)}:</strong> ${escapeHtml(data.paymentType === 'Contado' ? t.cash : t.credit)}</div>
          </div>
          <table>
            <thead><tr><th>${escapeHtml(t.product)}</th><th class="number">${escapeHtml(t.quantity)}</th><th class="number">${escapeHtml(t.price)}</th><th class="number">${escapeHtml(t.total)}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="summary">
            <div class="summary-row"><span>${escapeHtml(t.subtotal)}</span><span>${formatMoney(data.subtotal, data.currencySymbol)}</span></div>
            ${data.discountAmount > 0 ? `<div class="summary-row"><span>${escapeHtml(t.discount)} (${formatNumber(data.discountPercent)}%)</span><span>-${formatMoney(data.discountAmount, data.currencySymbol)}</span></div>` : ''}
            <div class="summary-row grand-total"><span>${escapeHtml(t.total)}</span><span>${formatMoney(data.total, data.currencySymbol)}</span></div>
          </div>
          ${detailRows ? `<div class="info">${detailRows}</div>` : ''}
          <div class="thanks">${escapeHtml(t.thanks)}</div>
        </main>
        <script>window.onload = function() { window.focus(); window.print(); };</script>
      </body>
    </html>
  `);
  receiptWindow.document.close();
  return true;
}
