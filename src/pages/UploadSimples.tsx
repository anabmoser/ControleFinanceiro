import { useState } from 'react';
import { Upload, Loader, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ConfirmacaoDados } from '../components/ConfirmacaoDados';

export function UploadSimples() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [dadosExtraidos, setDadosExtraidos] = useState<any | null>(null);
  const [urlImagem, setUrlImagem] = useState<string>('');
  const [tipoDocumento, setTipoDocumento] = useState<'cupom' | 'boleto'>('cupom');

  const handleArquivoSelecionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!arquivo) return;

    setProcessando(true);

    try {
      const nomeArquivo = `${Date.now()}-${arquivo.name}`;

      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(nomeArquivo, arquivo, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(nomeArquivo);

      setUrlImagem(publicUrl);

      const endpoint = tipoDocumento === 'cupom' ? 'processar-cupom-simples' : 'processar-boleto';
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl: publicUrl }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro no processamento: ${errorText}`);
      }

      const dados = await response.json();
      setDadosExtraidos(dados);
    } catch (error: any) {
      console.error('Erro:', error);
      alert(`Erro ao processar documento: ${error.message}`);
      setProcessando(false);
    }
  };

  const handleConfirmarDados = () => {
    setDadosExtraidos(null);
    setArquivo(null);
    setPreviewUrl(null);
    setProcessando(false);
    alert('Compra salva com sucesso!');
  };

  const handleRejeitarDados = () => {
    setDadosExtraidos(null);
    setProcessando(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Escanear Documentos</h2>
        <p className="text-gray-600">
          Faça upload de cupons fiscais ou boletos para extrair as informações automaticamente
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Tipo de Documento
          </label>
          <div className="flex gap-4">
            <button
              onClick={() => setTipoDocumento('cupom')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                tipoDocumento === 'cupom'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Cupom Fiscal</div>
              <div className="text-sm text-gray-600">Nota de compra de fornecedores</div>
            </button>

            <button
              onClick={() => setTipoDocumento('boleto')}
              className={`flex-1 py-3 px-4 rounded-lg border-2 transition ${
                tipoDocumento === 'boleto'
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold">Boleto</div>
              <div className="text-sm text-gray-600">Contas a pagar</div>
            </button>
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8">
          {!previewUrl ? (
            <label className="flex flex-col items-center justify-center cursor-pointer">
              <Upload className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Clique para selecionar uma imagem
              </p>
              <p className="text-sm text-gray-500">
                PNG, JPG ou PDF (máx. 10MB)
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleArquivoSelecionado}
                className="hidden"
              />
            </label>
          ) : (
            <div>
              <div className="flex items-start gap-4 mb-4">
                <ImageIcon className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{arquivo?.name}</p>
                  <p className="text-sm text-gray-500">
                    {(arquivo!.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setArquivo(null);
                    setPreviewUrl(null);
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                  disabled={processando}
                >
                  Remover
                </button>
              </div>

              <img
                src={previewUrl}
                alt="Preview"
                className="w-full max-h-96 object-contain rounded-lg border border-gray-200"
              />
            </div>
          )}
        </div>

        {arquivo && !dadosExtraidos && (
          <button
            onClick={handleUpload}
            disabled={processando}
            className="mt-6 w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processando ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Processar Documento
              </>
            )}
          </button>
        )}
      </div>

      {dadosExtraidos && (
        <ConfirmacaoDados
          dadosOCR={dadosExtraidos}
          urlImagem={urlImagem}
          onConfirmar={handleConfirmarDados}
          onRejeitar={handleRejeitarDados}
        />
      )}
    </div>
  );
}
