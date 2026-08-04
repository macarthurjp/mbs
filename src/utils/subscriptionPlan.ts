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

export function isTrialPeriodActive(value: unknown, now = Date.now()) {
  if (!value) return false;

  const trialEndsAt = new Date(String(value)).getTime();
  return Number.isFinite(trialEndsAt) && trialEndsAt >= now;
}

export function formatPlanLabel(value: unknown) {
  const normalizedValue = String(value || '').trim().toLowerCase();

  if (!normalizedValue || normalizedValue === 'basic') return 'Basic';
  if (normalizedValue === 'trial') return 'Trial';

  return normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1);
}

export function getEffectivePlan({
  businessPlan,
  subscriptionPlan,
  subscriptionStatus,
  trialEndsAt,
}: {
  businessPlan?: unknown;
  subscriptionPlan?: unknown;
  subscriptionStatus?: unknown;
  trialEndsAt?: unknown;
}) {
  const normalizedSubscriptionPlan = normalizePlan(subscriptionPlan, 'trial');
  const normalizedBusinessPlan = normalizePlan(businessPlan, 'basic');

  if (
    isTrialPeriodActive(trialEndsAt) &&
    (normalizedSubscriptionPlan === 'trial' || normalizedBusinessPlan === 'trial')
  ) {
    return 'trial';
  }

  if (
    normalizedSubscriptionPlan !== 'trial' &&
    isActiveSubscriptionStatus(subscriptionStatus)
  ) {
    return normalizedSubscriptionPlan;
  }

  return normalizedBusinessPlan;
}
