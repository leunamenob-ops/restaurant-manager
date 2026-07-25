'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ModulePage() {
  const [usuario, setUsuario] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const usuarioData = sessionStorage.getItem('usuario');
    if (!usuarioData) {
      router.push('/');
      return;
    }
    setUsuario(JSON.parse(usuarioData));
  }, []);

  if (!usuario) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Módulo en Construcción</h1>
        <p className="text-gray-600">Este módulo estará disponible próximamente.</p>
      </div>
    </div>
  );
}