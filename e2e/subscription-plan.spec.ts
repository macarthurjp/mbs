import { expect, test } from '@playwright/test';
import {
  formatPlanLabel,
  getEffectivePlan,
  isTrialPeriodActive,
} from '../src/utils/subscriptionPlan';

test.describe('subscription plan resolution', () => {
  test('shows Trial instead of Basic for trial plans', () => {
    expect(formatPlanLabel('trial')).toBe('Trial');
    expect(formatPlanLabel('basic')).toBe('Basic');
  });

  test('keeps a current trial effective while its subscription is pending', () => {
    const now = Date.UTC(2026, 7, 4);
    const trialEndsAt = new Date(Date.UTC(2099, 8, 3)).toISOString();

    expect(isTrialPeriodActive(trialEndsAt, now)).toBe(true);
    expect(getEffectivePlan({
      businessPlan: 'basic',
      subscriptionPlan: 'trial',
      subscriptionStatus: 'pending',
      trialEndsAt,
    })).toBe('trial');
  });

  test('does not preserve an expired trial over the business plan', () => {
    expect(getEffectivePlan({
      businessPlan: 'basic',
      subscriptionPlan: 'trial',
      subscriptionStatus: 'pending',
      trialEndsAt: '2000-07-01T00:00:00.000Z',
    })).toBe('basic');
  });
});
