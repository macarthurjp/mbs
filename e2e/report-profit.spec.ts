import { expect, test } from '@playwright/test';
import { calculateEstimatedProfit } from '../src/utils/reportProfit';

test.describe('Estimated report profit', () => {
  test('subtracts sale discounts and profit reversed by partial returns', () => {
    const profit = calculateEstimatedProfit({
      activeSaleIds: new Set([174, 175]),
      productCosts: new Map([[177, 115]]),
      saleDiscountTotal: 5,
      saleItems: [
        { venta_id: 174, producto_id: 177, cantidad: 2, precio: 189.9 },
        { venta_id: 175, producto_id: 177, cantidad: 3, precio: 189.9 }
      ],
      saleReturns: [
        {
          sale_id: 175,
          sale_return_items: [
            { product_id: 177, quantity: 1, refund_amount: 188.23 }
          ]
        }
      ]
    });

    expect(profit).toBeCloseTo(296.27, 2);
  });

  test('ignores sales and returns outside the active filtered period', () => {
    const profit = calculateEstimatedProfit({
      activeSaleIds: new Set([1]),
      productCosts: new Map([[10, 40]]),
      saleDiscountTotal: 0,
      saleItems: [
        { venta_id: 1, producto_id: 10, cantidad: 2, precio: 70 },
        { venta_id: 2, producto_id: 10, cantidad: 10, precio: 70 }
      ],
      saleReturns: [
        {
          sale_id: 2,
          sale_return_items: [{ product_id: 10, quantity: 10, refund_amount: 700 }]
        }
      ]
    });

    expect(profit).toBe(60);
  });
});
