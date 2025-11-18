import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function usePurchases(userId: string | undefined, period: 'week' | 'month' | 'all') {
  return useQuery({
    queryKey: ['purchases', userId, period],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('purchases')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('date', weekAgo.toISOString().split('T')[0]);
      } else if (period === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        query = query.gte('date', monthAgo.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function usePurchaseItems(purchaseId: string | undefined) {
  return useQuery({
    queryKey: ['purchase-items', purchaseId],
    queryFn: async () => {
      if (!purchaseId) return [];

      const { data, error } = await supabase
        .from('purchase_items')
        .select('*')
        .eq('purchase_id', purchaseId)
        .order('name_ocr');

      if (error) throw error;
      return data || [];
    },
    enabled: !!purchaseId,
  });
}

export function useDashboardData(userId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', userId],
    queryFn: async () => {
      if (!userId) return null;

      const hoje = new Date();
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(inicioSemana.getDate() + 6);

      const [purchaseItems, bills, purchases, billsWeekly] = await Promise.all([
        supabase
          .from('purchase_items')
          .select('total_cost, purchase_id')
          .eq('user_id', userId)
          .gte('created_at', inicioSemana.toISOString())
          .lte('created_at', fimSemana.toISOString()),

        supabase
          .from('bills')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'scheduled')
          .gte('due_date', hoje.toISOString().split('T')[0])
          .lte('due_date', new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('due_date', { ascending: true })
          .limit(5),

        supabase
          .from('purchases')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(5),

        supabase
          .from('bills')
          .select('due_date, amount')
          .eq('user_id', userId)
          .gte('due_date', new Date(hoje.getTime() - 56 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      ]);

      const gastoSemana = purchaseItems.data?.reduce((sum, item) => sum + Number(item.total_cost), 0) || 0;
      const uniquePurchases = new Set(purchaseItems.data?.map(item => item.purchase_id));

      return {
        kpis: {
          gastoSemana,
          totalCompras: uniquePurchases.size,
        },
        bills: bills.data || [],
        purchases: purchases.data || [],
        billsWeekly: billsWeekly.data || [],
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, documentType, userId }: {
      file: File;
      documentType: 'cupom' | 'boleto';
      userId: string
    }) => {
      const fileName = `${userId}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const endpoint = documentType === 'cupom' ? 'processar-cupom' : 'processar-boleto';
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão não encontrada');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl: publicUrl, userId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    retry: 3,
  });
}
