'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadFacturaPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');
  const [analizando, setAnalizando] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  async function handleUpload() {
    if (!file) {
      setError('Selecciona un archivo primero');
      return;
    }

    setProcesando(true);
    setError('');
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append('factura', file);

      const response = await fetch('/api/facturas/procesar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar');
      }

      setResultado(data);
      console.log('TEXTO EXTRAÍDO COMPLETO:', data.texto);

      // Llamar a la API de análisis con IA
      setAnalizando(true);
      
      try {
        const analisisResponse = await fetch('/api/facturas/analizar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: data.texto }),
        });

        const analisisData = await analisisResponse.json();

        if (analisisResponse.ok && analisisData.success) {
          sessionStorage.setItem('factura_datos', JSON.stringify(analisisData.datos));
          router.push('/facturas/revisar');
          return;
        } else {
          setError(analisisData.error || 'Error al analizar con IA');
        }
      } catch (err) {
        console.error('Error en análisis:', err);
        setError('Error al conectar con la IA, pero el texto fue extraído');
      } finally {
        setAnalizando(false);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcesando(false);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('image/') || droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Solo se permiten imágenes (JPG, PNG) y archivos PDF');
      }
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-900">
      {/* HEADER MODERNO */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/facturas')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all text-sm font-medium shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver a Facturas
              </button>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Subir Factura</h1>
                <p className="text-sm text-slate-500">Procesamiento inteligente con IA</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 shadow-sm flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Área de Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Instrucciones */}
          <div className="p-8 bg-gradient-to-br from-blue-50 to-cyan-50 border-b border-slate-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-1">¿Cómo funciona?</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Sube una foto o PDF de tu factura. Nuestra IA con <strong>AWS Textract</strong> y <strong>OpenAI</strong> extraerá automáticamente todos los datos: proveedor, productos, cantidades, precios e importes.
                </p>
              </div>
            </div>
          </div>

          {/* Drop Zone */}
          <div className="p-8">
            <div
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                  : file 
                    ? 'border-emerald-300 bg-emerald-50' 
                    : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {!file ? (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900 mb-1">
                      Arrastra tu factura aquí
                    </p>
                    <p className="text-sm text-slate-600">
                      o <span className="text-blue-600 font-semibold">haz clic para seleccionar</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <span className="px-2 py-1 bg-slate-200 rounded">JPG</span>
                    <span className="px-2 py-1 bg-slate-200 rounded">PNG</span>
                    <span className="px-2 py-1 bg-slate-200 rounded">PDF</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto">
                    <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-slate-900 mb-1">
                      {file.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatFileSize(file.size)} • {file.type.startsWith('image/') ? 'Imagen' : 'PDF'}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Quitar archivo
                  </button>
                </div>
              )}
            </div>

            {/* Botón de Procesar */}
            <button
              onClick={handleUpload}
              disabled={!file || procesando}
              className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg disabled:shadow-none flex items-center justify-center gap-3"
            >
              {procesando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {analizando ? 'Analizando con IA...' : 'Procesando factura...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Procesar con IA
                </>
              )}
            </button>

            {/* Indicador de progreso */}
            {analizando && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Analizando con OpenAI...</p>
                    <p className="text-xs text-blue-700">Extrayendo datos de la factura</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resultado del procesamiento */}
        {resultado && !analizando && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Factura Procesada</h2>
                  <p className="text-sm text-slate-600">Texto extraído por AWS Textract</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Texto extraído</p>
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto leading-relaxed">
                  {resultado.texto}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Info footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            Powered by <span className="font-semibold">AWS Textract</span> + <span className="font-semibold">OpenAI GPT-4o-mini</span>
          </p>
        </div>
      </main>
    </div>
  );
}