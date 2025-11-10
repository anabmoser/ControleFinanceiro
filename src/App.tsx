import { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { UploadDocuments } from './pages/UploadDocuments';
import { ChatBI } from './pages/ChatBI';
import PurchaseHistory from './pages/PurchaseHistory';
import { Reports } from './pages/Reports';
import { Layout } from './components/Layout';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'upload' | 'chat' | 'history' | 'reports'>('dashboard');

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

export default App;

