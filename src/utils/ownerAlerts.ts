import { supabase } from '../lib/supabase';

type OwnerAlertEvent = 'signup_started' | 'signup_completed' | 'signup_failed';

type OwnerAlertPayload = {
  event_type: OwnerAlertEvent;
  email?: string | null;
  user_id?: string | null;
  negocio_id?: string | null;
  selected_plan?: string | null;
  owner_name?: string | null;
  business_name?: string | null;
  error?: string | null;
};

export function notifySaasOwner(payload: OwnerAlertPayload) {
  supabase.functions
    .invoke('send-owner-alert', {
      body: {
        ...payload,
        source: 'web',
      },
    })
    .then(({ error }) => {
      if (error) {
        console.warn('SaaS owner alert was not sent:', error);
      }
    })
    .catch((error) => {
      console.warn('SaaS owner alert failed:', error);
    });
}
