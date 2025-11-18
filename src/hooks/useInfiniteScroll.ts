import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const PAGE_SIZE = 10;

interface Purchase {
  id: string;
  date: string;
  supplier_name_raw: string;
  invoice_number: string | null;
  payment_method: string | null;
  total_amount: number | null;
  receipt_url: string | null;
  status: string;
}

export function useInfinitePurchases(
  userId: string | undefined,
  period: 'week' | 'month' | 'all'
) {
  return useInfiniteQuery({
    queryKey: ['purchases-infinite', userId, period],
    queryFn: async ({ pageParam = 0 }) => {
      if (!userId) return { purchases: [], hasMore: false };

      let query = supabase
        .from('purchases')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('date', weekAgo.toISOString().split('T')[0]);
      } else if (period === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('date', monthAgo.toISOString().split('T')[0]);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const hasMore = count ? (pageParam + 1) * PAGE_SIZE < count : false;

      return {
        purchases: (data || []) as Purchase[],
        hasMore,
        nextPage: hasMore ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!userId,
    initialPageParam: 0,
  });
}
