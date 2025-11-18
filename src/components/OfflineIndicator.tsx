import { useEffect, useState } from 'react';
import { WifiOff, Wifi, Upload } from 'lucide-react';
import { useOfflineSync } from '../hooks/useOfflineSync';

export function OfflineIndicator() {
  const { isOnline, pendingActions, syncPendingActions } = useOfflineSync();
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowNotification(true);
    } else if (pendingActions.length > 0) {
      setShowNotification(true);
      syncPendingActions();
      setTimeout(() => setShowNotification(false), 3000);
    } else {
      setTimeout(() => setShowNotification(false), 3000);
    }
  }, [isOnline, pendingActions.length]);

  if (!showNotification && isOnline && pendingActions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOnline ? (
        <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <WifiOff className="w-5 h-5" />
          <div>
            <p className="font-medium">Você está offline</p>
            <p className="text-sm opacity-90">Suas alterações serão sincronizadas quando voltar online</p>
          </div>
        </div>
      ) : pendingActions.length > 0 ? (
        <div className="bg-orange-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <Upload className="w-5 h-5 animate-bounce" />
          <div>
            <p className="font-medium">Sincronizando...</p>
            <p className="text-sm opacity-90">{pendingActions.length} ações pendentes</p>
          </div>
        </div>
      ) : (
        <div className="bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in">
          <Wifi className="w-5 h-5" />
          <div>
            <p className="font-medium">Online</p>
            <p className="text-sm opacity-90">Todas as alterações sincronizadas</p>
          </div>
        </div>
      )}
    </div>
  );
}
