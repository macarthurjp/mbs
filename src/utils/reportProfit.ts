export type ProfitSaleItem = {
  venta_id: number | null;
  producto_id: number | null;
  cantidad: number;
  precio: number;
};

export type ProfitReturn = {
  sale_id: number;
  sale_return_items?: Array<{
    product_id: number | null;
    quantity: number;
    refund_amount: number;
  }> | null;
};

type EstimatedProfitInput = {
  saleItems: ProfitSaleItem[];
  activeSaleIds: Set<number>;
  productCosts: Map<number, number>;
  saleDiscountTotal: number;
  saleReturns: ProfitReturn[];
};

export function calculateEstimatedProfit({
  saleItems,
  activeSaleIds,
  productCosts,
  saleDiscountTotal,
  saleReturns
}: EstimatedProfitInput) {
  const soldProfit = saleItems.reduce((sum, item) => {
    if (!item.venta_id || !activeSaleIds.has(item.venta_id)) return sum;

    const cost = productCosts.get(item.producto_id || -1) ?? 0;
    return sum + (Number(item.precio || 0) - cost) * Number(item.cantidad || 0);
  }, 0);

  const returnedProfit = saleReturns.reduce((returnSum, returnRecord) => {
    if (!activeSaleIds.has(returnRecord.sale_id)) return returnSum;

    return returnSum + (returnRecord.sale_return_items || []).reduce((itemSum, item) => {
      const cost = productCosts.get(item.product_id || -1) ?? 0;
      const returnedCost = cost * Number(item.quantity || 0);
      return itemSum + Number(item.refund_amount || 0) - returnedCost;
    }, 0);
  }, 0);

  return soldProfit - Number(saleDiscountTotal || 0) - returnedProfit;
}
