'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function MovilFacturasPage() {
  const router = useRouter();
  const camRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [fase, setFase] = useState<'idle' | 'comprimir' | 'textract' | 'openai'>('idle');
  const [error, setError] = useState('');

  const procesando = fase !== 'idle';

  function elegirArchivo(f: File) {
    setFile(f);
    setError('');
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview('');
    }
  }

  // =====================================================
  // COMPRESIÓN EN EL MÓVIL (2000px + calidad 0.9)
  // Texto legible para Textract y dentro del límite de Vercel
  // =====================================================
  async function comprimirImagen(original: File): Promise<File> {
    if (!original.type.startsWith('image/')) return original;

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(original);

      img.onload = () => {
        try {
          const maxDim = 2000;
          let { width, height } = img;
          const scale = Math.min(1, maxDim / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(original);

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (!blob) return resolve(original);
              resolve(
                new File([blob], original.name.replace(/\.\w+$/, '') + '.jpg', {
                  type: 'image/jpeg',
                })
              );
            },
            'image/jpeg',
            0.9
          );
        } catch {
          resolve(original);
        }
      };

      img.onerror = () => resolve(original);
      img.src = url;
    });
  }

  async function analizar() {
    if (!file) return;
    setError('');
    setFase('comprimir');

    try {
      // 0. Comprimir en el móvil
      const archivo = await comprimirImagen(file);

      // 1. AWS Textract
      setFase('textract');
      const formData = new FormData();
      formData.append('factura', archivo);

      const resProc = await fetch('/api/facturas/procesar', {
        method: 'POST',
        body: formData,
      });
      const dataProc = await resProc.json();

      if (!resProc.ok) throw new Error(dataProc.error || 'Error al leer la factura');

      // 2. OpenAI
      setFase('openai');

      const resAna = await fetch('/api/facturas/analizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: dataProc.texto }),
      });

      const textoRes = await resAna.text();
      let dataAna: any;
      try {
        dataAna = JSON.parse(textoRes);
      } catch {
        throw new Error(textoRes.slice(0, 80) || 'Error al analizar con IA');
      }

      if (!resAna.ok || !dataAna.success) {
        throw new Error(dataAna.error || 'Error al analizar con IA');
      }

      // 3. Revisión móvil
      sessionStorage.setItem('factura_datos', JSON.stringify(dataAna.datos));
      router.push('/movil/facturas/revisar');
    } catch (e: any) {
      setError(e.message);
      setFase('idle');
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      <div className="max-w-md mx-auto px-4 py-6 pb-10">
        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/movil')}
            className="w-11 h-11 bg-white shadow-sm border border-slate-200 rounded-xl flex items-center justify-center text-xl active:scale-95 transition"
          >
            🏠
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">🧾 Escanear Factura</h1>
            <p className="text-xs text-slate-500">Foto → compresión → AWS → OpenAI → revisar</p>
          </div>
        </div>

        {/* Paso 1: foto */}
        {!file && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-[11px] text-amber-800 leading-relaxed">
              💡 <strong>Para mejor lectura:</strong> foto de frente (no en ángulo), con buena luz y que se vea TODA la factura dentro del encuadre.
            </div>

            <button
              onClick={() => camRef.current?.click()}
              className="w-full bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-8 text-white shadow-lg active:scale-[0.98] transition"
            >
              <span className="text-6xl block mb-3">📸</span>
              <p className="font-bold text-xl">Hacer foto a la factura</p>
              <p className="text-xs text-white/80 mt-1">Se abre la cámara directamente</p>
            </button>

            <button
              onClick={() => galleryRef.current?.click()}
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-700 font-semibold text-sm shadow-sm active:scale-[0.98] transition"
            >
              🖼️ Elegir de la galería / PDF
            </button>

            <input
              ref={camRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) elegirArchivo(f);
              }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) elegirArchivo(f);
              }}
            />
          </div>
        )}

        {/* Paso 2: vista previa + analizar */}
        {file && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-4">
            {preview ? (
              <img
                src={preview}
                alt="Factura"
                className="w-full h-56 object-cover rounded-xl border border-slate-200"
              />
            ) : (
              <div className="w-full h-32 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center">
                <p className="text-sm text-slate-500 font-medium">📄 {file.name}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFile(null);
                  setPreview('');
                }}
                disabled={procesando}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm active:scale-[0.98] transition disabled:opacity-50"
              >
                🔄 Cambiar
              </button>
              <button
                onClick={analizar}
                disabled={procesando}
                className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-sm active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {procesando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    {fase === 'comprimir'
                      ? 'Optimizando foto...'
                      : fase === 'textract'
                      ? 'Leyendo con AWS...'
                      : 'Analizando con OpenAI...'}
                  </>
                ) : (
                  <>🤖 Analizar con IA</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-500 text-white rounded-2xl text-center text-sm font-bold">
            ❌ {error}
          </div>
        )}

        {/* Cómo funciona */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-4 text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700 text-sm mb-2">¿Cómo funciona?</p>
          <p>1️⃣ Foto a la factura con la cámara</p>
          <p>2️⃣ Se optimiza en tu móvil (alta calidad, peso reducido)</p>
          <p>3️⃣ AWS Textract lee el texto</p>
          <p>4️⃣ OpenAI extrae proveedor, líneas y precios</p>
          <p>5️⃣ Validas y guardas en la pantalla de revisión</p>
        </div>
      </div>
    </div>
  );
}
