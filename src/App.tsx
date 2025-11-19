import { useState } from 'react';
import { Dashboard } from './pages/Dashboard';
import { UploadSimples } from './pages/UploadSimples';
import { Historico } from './pages/Historico';
import { Boletos } from './pages/Boletos';
import ConsultaProdutos from './pages/ConsultaProdutos';
import ConsultaPeriodo from './pages/ConsultaPeriodo';
import Relatorios from './pages/Relatorios';
import { ChatAprendizado } from './components/ChatAprendizado';
import { Home, Upload, History, FileText, Package, Calendar, BarChart3 } from 'lucide-react';

type Page = 'dashboard' | 'upload' | 'historico' | 'boletos' | 'produtos' | 'periodo' | 'relatorios';

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

            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  currentPage === 'upload'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Upload className="w-5 h-5" />
                <span>Escanear</span>
              </button>

              <button
                onClick={() => setCurrentPage('produtos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  currentPage === 'produtos'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Package className="w-5 h-5" />
                <span>Produtos</span>
              </button>

              <button
                onClick={() => setCurrentPage('periodo')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  currentPage === 'periodo'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span>Período</span>
              </button>

              <button
                onClick={() => setCurrentPage('relatorios')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  currentPage === 'relatorios'
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span>Relatórios</span>
              </button>

              <button
                onClick={() => setCurrentPage('historico')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
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
        {currentPage === 'produtos' && <ConsultaProdutos />}
        {currentPage === 'periodo' && <ConsultaPeriodo />}
        {currentPage === 'relatorios' && <Relatorios />}
        {currentPage === 'historico' && <Historico />}
        {currentPage === 'boletos' && <Boletos />}
      </main>

      <ChatAprendizado />
    </div>
  );
}

export default App;

