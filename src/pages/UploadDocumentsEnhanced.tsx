import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUploadDocument } from '../hooks/useQueryHooks';

type DocumentType = 'cupom' | 'boleto' | null;

export function UploadDocumentsEnhanced() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadDocument();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      return;
    }

    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleProcess = async () => {
    if (!file || !documentType || !user) return;

    uploadMutation.mutate(
      {
        file,
        documentType,
        userId: user.id,
      },
      {
        onSuccess: (result) => {
          setTimeout(() => {
            handleReset();
          }, 3000);
        },
      }
    );
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setDocumentType(null);
    uploadMutation.reset();
  };

  const handleRetry = () => {
    if (file && documentType && user) {
      uploadMutation.reset();
      handleProcess();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Upload de Documentos</h1>

      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
        >
          <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            Arraste e solte seu documento aqui
          </p>
          <p className="text-sm text-gray-500 mb-4">
            ou clique para selecionar um arquivo
          </p>
          <p className="text-xs text-gray-400">
            Formatos aceitos: JPG, PNG, PDF (máx. 10MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            onChange={(e) => handleFileSelect(e.target.files?.[0]!)}
            className="hidden"
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <FileText className="w-12 h-12 text-blue-600" />
              <div>
                <p className="font-medium text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              disabled={uploadMutation.isPending}
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {preview && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <img src={preview} alt="Preview" className="w-full max-h-96 object-contain" />
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Tipo de documento:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDocumentType('cupom')}
                disabled={uploadMutation.isPending}
                className={`p-4 rounded-lg border-2 transition ${
                  documentType === 'cupom'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium">Cupom Fiscal</p>
                <p className="text-sm text-gray-500 mt-1">Nota de compra</p>
              </button>

              <button
                onClick={() => setDocumentType('boleto')}
                disabled={uploadMutation.isPending}
                className={`p-4 rounded-lg border-2 transition ${
                  documentType === 'boleto'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium">Boleto</p>
                <p className="text-sm text-gray-500 mt-1">Conta a pagar</p>
              </button>
            </div>
          </div>

          {uploadMutation.isSuccess && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 text-green-700 border border-green-200">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">
                {documentType === 'cupom'
                  ? `Cupom processado com sucesso! ${uploadMutation.data?.itemsCount || 0} itens extraídos.`
                  : 'Boleto processado com sucesso!'}
              </p>
            </div>
          )}

          {uploadMutation.isError && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-1">Erro ao processar documento</p>
                  <p className="text-xs">{uploadMutation.error?.message}</p>
                  {uploadMutation.failureCount > 0 && (
                    <p className="text-xs mt-2">
                      Tentativa {uploadMutation.failureCount} de 3
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 transition"
              >
                <RefreshCw className="w-5 h-5" />
                Tentar Novamente
              </button>
            </div>
          )}

          {uploadMutation.isPending && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
              <p className="text-sm">
                Processando documento... Isso pode levar alguns segundos.
                {uploadMutation.failureCount > 0 && ` (Tentativa ${uploadMutation.failureCount + 1})`}
              </p>
            </div>
          )}

          <button
            onClick={handleProcess}
            disabled={!documentType || uploadMutation.isPending}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending ? 'Processando...' : 'Processar Documento'}
          </button>
        </div>
      )}
    </div>
  );
}
