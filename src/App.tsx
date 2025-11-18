import { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { UploadSimples } from './pages/UploadSimples';
import { Historico } from './pages/Historico';
import { Boletos } from './pages/Boletos';
import { ChatAprendizado } from './components/ChatAprendizado';
import { Home, Upload, History, FileText } from 'lucide-react';

type Page = 'dashboard' | 'upload' | 'historico' | 'boletos';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">CR</span>
              </div>
              <h1 className="text-xl font-bold text-gray-800">Controle Restaurante</h1>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === 'dashboard'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Home className="w-5 h-5" />
                <span>Início</span>
              </button>

              <button
                onClick={() => setCurrentPage('upload')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === 'upload'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-5 h-5" />
                <span>Escanear</span>
              </button>

              <button
                onClick={() => setCurrentPage('historico')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === 'historico'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <History className="w-5 h-5" />
                <span>Histórico</span>
              </button>

              <button
                onClick={() => setCurrentPage('boletos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  currentPage === 'boletos'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>Boletos</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'upload' && <UploadSimples />}
        {currentPage === 'historico' && <Historico />}
        {currentPage === 'boletos' && <Boletos />}
      </main>

      <ChatAprendizado />
    </div>
  );
}

export default App;

