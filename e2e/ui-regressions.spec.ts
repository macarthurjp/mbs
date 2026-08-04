import { expect, test, type Page } from '@playwright/test';
import { hasE2ECredentials, loginAsTestOwner } from './utils/auth';

const pageCounterPattern = /^\d+\s*\/\s*\d+$/;
const rangePattern = /^\d+[–-]\d+\s+(?:de|of)\s+\d+$/i;

async function openSidebarPage(page: Page, name: RegExp) {
  await page.getByRole('button', { name }).click();
  await page.waitForLoadState('domcontentloaded');
}

test.describe('UI regression contracts', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasE2ECredentials, 'E2E owner credentials are not configured.');
    await loginAsTestOwner(page);
  });

  test('purchase metrics stay inside their cards and date controls are vertically centered', async ({ page }) => {
    await openSidebarPage(page, /Compras|Purchases/i);
    await expect(page.getByRole('heading', { name: /Compras|Purchases/i, level: 1 })).toBeVisible({ timeout: 10_000 });

    const adaptiveMoneyValues = page.locator('p[title].whitespace-nowrap.tabular-nums');
    await expect(adaptiveMoneyValues.first()).toBeVisible();

    const moneyCount = await adaptiveMoneyValues.count();
    for (let index = 0; index < moneyCount; index += 1) {
      const fits = await adaptiveMoneyValues.nth(index).evaluate((element) => {
        const style = window.getComputedStyle(element);
        return style.whiteSpace === 'nowrap' && element.scrollWidth <= element.clientWidth + 1;
      });
      expect(fits).toBe(true);
    }

    await expect(page.locator('input[type="date"]:visible')).toHaveCount(2);
    const hasCenteredDateRule = await page.evaluate(() => {
      function containsCenteredRule(rules: CSSRuleList): boolean {
        return Array.from(rules).some((rule) => {
          const cssRule = rule as CSSStyleRule;
          if (cssRule.selectorText?.includes('::-webkit-datetime-edit')) {
            return cssRule.style.alignItems === 'center';
          }

          if ('cssRules' in rule) {
            return containsCenteredRule(
              (rule as CSSRule & { cssRules: CSSRuleList }).cssRules,
            );
          }

          return false;
        });
      }

      return Array.from(document.styleSheets).some((sheet) => {
        try {
          return containsCenteredRule(sheet.cssRules);
        } catch {
          return false;
        }
      });
    });
    expect(hasCenteredDateRule).toBe(true);
  });

  test('purchase and invoice histories show only the useful pagination range', async ({ page }) => {
    await openSidebarPage(page, /Compras|Purchases/i);
    await expect(page.getByText(pageCounterPattern)).toHaveCount(0);
    const purchaseRanges = page.getByText(rangePattern);
    const purchaseRangeCount = await purchaseRanges.count();
    if (purchaseRangeCount > 0) {
      await expect(purchaseRanges.first()).toBeVisible();
    }

    await openSidebarPage(page, /Facturas|Invoices/i);
    await expect(page.getByText(pageCounterPattern)).toHaveCount(0);
    const invoiceRanges = page.getByText(rangePattern);
    const invoiceRangeCount = await invoiceRanges.count();
    if (invoiceRangeCount > 0) {
      await expect(invoiceRanges.first()).toBeVisible();
    }
  });

  test('users pagination shows the record range without a duplicate page counter', async ({ page }) => {
    await openSidebarPage(page, /Usuarios|Users/i);
    await expect(page.getByText(rangePattern).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(pageCounterPattern)).toHaveCount(0);
  });

  test('business email remains fully visible in the compact settings card', async ({ page }) => {
    await openSidebarPage(page, /Configuración|Settings/i);
    await expect(page.getByRole('heading', { name: /Datos del negocio|Business Details/i })).toBeVisible({ timeout: 10_000 });

    const businessEmail = page.locator('p[title*="@"]').filter({ hasText: '@' }).first();
    await expect(businessEmail).toBeVisible();
    await expect(businessEmail).toContainText('@');

    const isFullyVisible = await businessEmail.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return style.overflowWrap === 'anywhere'
        && element.scrollWidth <= element.clientWidth + 1;
    });
    expect(isFullyVisible).toBe(true);
  });
});
