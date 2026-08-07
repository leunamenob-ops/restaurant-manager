'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MovilScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const [detectado, setDetectado] = useState(false);

  const soportaQR =
    typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => {
    if (!soportaQR) {
      setError('Este navegador no detecta QR automáticamente. Usa el modo manual de abajo.');
      return;
    }

    let stream: MediaStream | null = null;
    let activo = true;
    let timer: any = null;

    async function iniciar() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new (window as any).BarcodeDetector({
          formats: ['qr_code'],
        });

        const scan = async () => {
          if (!activo || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              activo = false;
              setDetectado(true);
              navegar(codes[0].rawValue);
              return;
            }
          } catch (e) {
            // frame no legible, seguir intentando
          }
          timer = setTimeout(scan, 300);
        };

        scan();
      } catch (e: any) {
        setError('No se pudo abrir la cámara: ' + (e?.message || 'permiso denegado'));
      }
    }

    iniciar();

    return () => {
      activo = false;
      if (timer) clearTimeout(timer);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navegar(valor: string) {
    if (!valor) return;

    // URL completa de nuestro dominio → ruta interna
    if (valor.includes('kostsoftware.com/lote/')) {
      router.push(valor.replace('https://kostsoftware.com', '').replace('http://kostsoftware.com', ''));
      return;
    }

    // Otra URL → directa
    if (valor.startsWith('http')) {
      window.location.href = valor;
      return;
    }

    // Texto plano → tratarlo como número de lote
    router.push(`/lote/${encodeURIComponent(valor)}`);
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col">
      {/* Cabecera */}
      <div className="max-w-md w-full mx-auto px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.push('/movil')}
          className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Trazabilidad QR</h1>
          <p className="text-xs text-slate-400">Apunta al código de la etiqueta</p>
        </div>
      </div>

      {/* Vídeo cámara */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="relative w-full max-w-md aspect-square bg-black rounded-2xl overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />

          {/* Marco de escaneo */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 border-4 border-orange-500 rounded-2xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-300 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-300 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-300 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-300 rounded-br-lg"></div>
            </div>
          </div>

          {detectado && (
            <div className="absolute inset-0 bg-emerald-600/80 flex items-center justify-center">
              <p className="text-white font-bold text-lg">✅ QR detectado</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-x-0 bottom-0 bg-red-600/90 p-3">
              <p className="text-white text-xs text-center">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modo manual */}
      <div className="max-w-md w-full mx-auto px-4 py-6">
        <p className="text-xs text-slate-400 mb-2 text-center">
          ¿No lee la cámara? Escribe el lote manualmente:
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="PROD-20260807-..."
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-orange-500 outline-none"
          />
          <button
            onClick={() => navegar(manual.trim())}
            disabled={!manual.trim()}
            className="px-5 py-3 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 transition disabled:bg-slate-600"
          >
            Ir
          </button>
        </div>
      </div>
    </div>
  );
}
