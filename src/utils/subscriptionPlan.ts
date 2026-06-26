export type PlanSlug = 'basic' | 'pro' | 'premium' | 'trial';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing', 'activa', 'activo']);

export function normalizePlan(value: unknown, fallback: PlanSlug = 'basic'): PlanSlug {
  const normalizedValue = String(value || '').trim().toLowerCase();
  if (normalizedValue === 'pro' || normalizedValue === 'premium' || normalizedValue === 'trial') {
    return normalizedValue;
  }
  if (normalizedValue === 'basic') return 'basic';
  return fallback;
}

export function normalizeSubscriptionStatus(value: unknown) {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (normalizedValue === 'active' || normalizedValue === 'trialing' || normalizedValue === 'activa') {
    return 'activo';
  }

  if (normalizedValue === 'canceled' || normalizedValue === 'cancelled' || normalizedValue === 'cancelado') {
    return 'cancelado';
  }

  if (normalizedValue === 'past_due' || normalizedValue === 'unpaid' || normalizedValue === 'incomplete' || normalizedValue === 'suspendido') {
    return 'suspendido';
  }

  return normalizedValue || null;
}

export function isActiveSubscriptionStatus(value: unknown) {
  return ACTIVE_SUBSCRIPTION_STATUSES.has(String(value || '').trim().toLowerCase());
}

export function getEffectivePlan({
  businessPlan,
  subscriptionPlan,
  subscriptionStatus,
}: {
  businessPlan?: unknown;
  subscriptionPlan?: unknown;
  subscriptionStatus?: unknown;
}) {
  const normalizedSubscriptionPlan = normalizePlan(subscriptionPlan, 'trial');

  if (
    normalizedSubscriptionPlan !== 'trial' &&
    isActiveSubscriptionStatus(subscriptionStatus)
  ) {
    return normalizedSubscriptionPlan;
  }

  return normalizePlan(businessPlan, 'basic');
}
