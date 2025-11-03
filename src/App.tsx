import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { UploadDocuments } from './pages/UploadDocuments';
import { ChatBI } from './pages/ChatBI';
import PurchaseHistory from './pages/PurchaseHistory';
import { Reports } from './pages/Reports';
import { Layout } from './components/Layout';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'upload' | 'chat' | 'history' | 'reports'>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'upload' && <UploadDocuments />}
      {currentPage === 'chat' && <ChatBI />}
      {currentPage === 'history' && <PurchaseHistory />}
      {currentPage === 'reports' && <Reports />}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
