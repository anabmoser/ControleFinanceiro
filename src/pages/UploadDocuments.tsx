import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type DocumentType = 'cupom' | 'boleto' | null;

export function UploadDocuments() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setMessage('Tipo de arquivo inválido. Use JPG, PNG ou PDF.');
      setStatus('error');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setMessage('Arquivo muito grande. Tamanho máximo: 10MB');
      setStatus('error');
      return;
    }

    setFile(selectedFile);
    setStatus('idle');
    setMessage('');

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

    setProcessing(true);
    setStatus('idle');
    setMessage('');

    try {
      const fileName = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw new Error(`Erro no upload: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      console.log('Arquivo enviado:', publicUrl);

      const endpoint = documentType === 'cupom'
        ? 'processar-cupom'
        : 'processar-boleto';

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storage-upload`;
      console.log('Chamando Edge Function:', apiUrl);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: publicUrl,
          userId: user.id,
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`Erro ao processar: ${errorText}`);
      }

      const result = await response.json();
      console.log('Resultado:', result);

      setStatus('success');
      setMessage(
        documentType === 'cupom'
          ? `Cupom processado com sucesso! ${result.itemsCount} itens extraídos.`
          : 'Boleto processado com sucesso!'
      );

      setTimeout(() => {
        setFile(null);
        setPreview(null);
        setDocumentType(null);
        setStatus('idle');
        setMessage('');
      }, 3000);

    } catch (error: any) {
      console.error('Erro completo:', error);
      setStatus('error');

      let errorMessage = 'Erro ao processar documento. ';

      if (error.message.includes('ANTHROPIC_API_KEY')) {
        errorMessage = 'IMPORTANTE: Configure a chave ANTHROPIC_API_KEY no Supabase para processar documentos com IA.';
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Erro de conexão. Verifique se as Edge Functions estão ativas no Supabase.';
      } else {
        errorMessage += error.message;
      }

      setMessage(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setDocumentType(null);
    setStatus('idle');
    setMessage('');
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

          {message && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${
                status === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : status === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : ''
              }`}
            >
              {status === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : status === 'error' ? (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              ) : null}
              <p className="text-sm">{message}</p>
            </div>
          )}

          <button
            onClick={handleProcess}
            disabled={!documentType || processing}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processando...' : 'Processar Documento'}
          </button>
        </div>
      )}
    </div>
  );
}
