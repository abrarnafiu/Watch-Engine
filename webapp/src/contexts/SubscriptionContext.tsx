import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import { supabase } from '../lib/supabaseClient';

interface SubscriptionState {
  plan: 'free' | 'pro';
  isPro: boolean;
  loading: boolean;
  refetch: () => void;
}

const SubscriptionContext = createContext<SubscriptionState>({
  plan: 'free',
  isPro: false,
  loading: true,
  refetch: () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlan] = useState<'free' | 'pro'>('free');
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setPlan('free');
        setIsPro(false);
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/subscription`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (result.success) {
        setPlan(result.data.plan);
        setIsPro(result.data.isPro);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <SubscriptionContext.Provider value={{ plan, isPro, loading, refetch: fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
