import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface OfflineAction {
  id: string;
  type: 'upload' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadPendingActions();

    const handleOnline = () => {
      setIsOnline(true);
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingActions = () => {
    try {
      const stored = localStorage.getItem('offline_actions');
      if (stored) {
        setPendingActions(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pending actions:', error);
    }
  };

  const savePendingActions = (actions: OfflineAction[]) => {
    try {
      localStorage.setItem('offline_actions', JSON.stringify(actions));
      setPendingActions(actions);
    } catch (error) {
      console.error('Error saving pending actions:', error);
    }
  };

  const addPendingAction = (action: Omit<OfflineAction, 'id' | 'timestamp'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };

    const updated = [...pendingActions, newAction];
    savePendingActions(updated);

    if (isOnline) {
      syncPendingActions();
    }
  };

  const syncPendingActions = async () => {
    if (pendingActions.length === 0) return;

    const actions = [...pendingActions];
    const successfulActions: string[] = [];

    for (const action of actions) {
      try {
        await processAction(action);
        successfulActions.push(action.id);
      } catch (error) {
        console.error('Error syncing action:', error);
      }
    }

    const remaining = actions.filter(a => !successfulActions.includes(a.id));
    savePendingActions(remaining);

    if (successfulActions.length > 0) {
      queryClient.invalidateQueries();
    }
  };

  const processAction = async (action: OfflineAction) => {
    switch (action.type) {
      case 'upload':
        break;
      case 'update':
        break;
      case 'delete':
        break;
    }
  };

  const clearPendingActions = () => {
    savePendingActions([]);
  };

  return {
    isOnline,
    pendingActions,
    addPendingAction,
    syncPendingActions,
    clearPendingActions,
  };
}
