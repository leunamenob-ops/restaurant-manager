'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [showLogin, setShowLogin] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Estados para la sección interactiva "Así funciona"
  const [activeTab, setActiveTab] = useState<'escandallos' | 'inventario' | 'menu'>('escandallos');
  
  // Estado para el acordeón de FAQ
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    const usuarioTemp = {
      id: codigo || 'B0001',
      nombre: 'Admin Temporal',
      cargo: 'Administrador',
      rol: 'ADMIN',
      hotel_id: '00000000-0000-0000-0000-000000000001'
    };
  
    const permisosTemp = {
      'proveedores': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'recetas': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'pedidos': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'haccp': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'menu-engineering': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'inventarios': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'producciones': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'analisis-costes': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
      'informes': { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, puede_exportar: true },
    };
  
    sessionStorage.setItem('usuario', JSON.stringify(usuarioTemp));
    sessionStorage.setItem('permisos', JSON.stringify(permisosTemp));
    sessionStorage.setItem('hotel_id', usuarioTemp.hotel_id);
  
    router.push('/dashboard');
    setLoading(false);
  }

  const faqs = [
    {
      id: 'tpv',
      q: '¿Se integra con mi TPV o sistema de ventas actual?',
      a: 'Sí. KOST Software cuenta con conectores API nativos para los principales TPVs del mercado (Lightspeed, CoverManager, Glovo, etc.), sincronizando tus ventas reales con el stock teórico en tiempo real.'
    },
    {
      id: 'tiempo',
      q: '¿Cuánto tiempo se tarda en cargar mis recetas e ingredientes?',
      a: 'Menos de lo que crees. Ofrecemos importación masiva vía Excel/CSV y nuestro equipo de onboarding te asiste para tener tu carta digitalizada y con escandallos calculados en menos de 48 horas.'
    },
    {
      id: 'nube',
      q: '¿Necesito instalar algún programa o funciona en la nube?',
      a: 'Es 100% SaaS en la nube. Funciona directamente desde el navegador de tu ordenador, tablet o móvil, sin instalaciones, sin servidores propios y con actualizaciones automáticas.'
    },
    {
      id: 'cocina',
      q: '¿Es complicado de usar para el equipo de cocina?',
      a: 'No. La interfaz está diseñada para ser intuitiva. Los cocineros solo necesitan acceder a las fichas técnicas con fotos y procedimientos desde una tablet en la cocina, sin tocar la parte financiera.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* ================= NAVBAR ================= */}
      <nav className={`fixed top-0 w-full z-40 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <span className="text-lg font-bold text-slate-800 tracking-tight hidden sm:block">
                KOST Software™
              </span>
            </div>
            <button
              onClick={() => setShowLogin(true)}
              className="px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-all text-sm shadow-lg hover:shadow-xl"
            >
              Acceder al Panel
            </button>
          </div>
        </div>
      </nav>

      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-emerald-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Texto Hero */}
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-6 border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Nuevo: Módulo de Alertas de Precios en Tiempo Real
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-6">
                Toma el control absoluto del <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-cyan-600">Food Cost</span> sin perderte en Excel.
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
                KOST automatiza el cálculo de escandallos, el control de inventarios y la relación con proveedores para proteger tus márgenes de beneficio en tiempo real.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-semibold text-lg shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
                >
                  Probar 14 días gratis
                </button>
                <button className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Ver demo interactiva
                </button>
              </div>
              <p className="mt-6 text-sm text-slate-500 flex items-center gap-4">
                <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> Sin tarjeta de crédito</span>
                <span className="flex items-center gap-1.5"><svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> Setup en 48h</span>
              </p>
            </div>

            {/* UI Mockup (CSS Puro) */}
            <div className="relative lg:ml-auto w-full max-w-lg lg:max-w-none">
              <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                {/* Fake Browser Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  </div>
                  <div className="flex-1 bg-white rounded-md h-6 mx-4 border border-slate-200 flex items-center px-2 text-xs text-slate-400">
                    app.kostsoftware.com/dashboard
                  </div>
                </div>
                
                {/* Fake Dashboard Content */}
                <div className="p-6 space-y-6">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm text-slate-500 font-medium">Food Cost Global (Octubre)</p>
                      <p className="text-3xl font-bold text-slate-900">24.8%</p>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-md flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      -1.2% vs mes anterior
                    </span>
                  </div>
                  
                  {/* Fake Chart */}
                  <div className="h-32 flex items-end justify-between gap-2">
                    {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                      <div key={i} className="w-full bg-slate-100 rounded-t-sm relative group">
                        <div 
                          className={`absolute bottom-0 w-full rounded-t-sm transition-all duration-500 ${i === 5 ? 'bg-emerald-500' : 'bg-cyan-400'}`} 
                          style={{ height: `${h}%` }}
                        ></div>
                      </div>
                    ))}
                  </div>

                  {/* Fake Alert Card */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                    <div className="bg-amber-100 p-1.5 rounded-md text-amber-600 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Alerta de Proveedor</p>
                      <p className="text-xs text-amber-800 mt-1">El precio del <span className="font-bold">Aceite de Oliva (5L)</span> ha subido un 12%. El coste de la "Ensalada César" ha variado +0.15€.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements behind mockup */}
              <div className="absolute -z-10 top-10 -right-10 w-full h-full bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl opacity-20 blur-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ASÍ FUNCIONA POR DENTRO (INTERACTIVO) ================= */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Así funciona por dentro</h2>
            <p className="text-lg text-slate-600">Tres pilares operativos diseñados para eliminar las pérdidas invisibles de tu cocina.</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Tabs */}
            <div className="lg:w-1/3 space-y-2">
              {[
                { id: 'escandallos', title: 'Escandallos Vivos', desc: 'El coste de tus platos se recalcula automáticamente cuando un proveedor cambia el precio de un ingrediente.' },
                { id: 'inventario', title: 'Inventario y Mermas', desc: 'Compara en un clic el stock teórico (según ventas) con el stock real del almacén.' },
                { id: 'menu', title: 'Menu Engineering', desc: 'Matriz de rentabilidad que clasifica tus platos en Estrellas, Caballos de Batalla, Puzles y Perros.' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <h3 className="font-bold text-lg mb-1">{tab.title}</h3>
                  <p className={`text-sm ${activeTab === tab.id ? 'text-slate-300' : 'text-slate-500'}`}>{tab.desc}</p>
                </button>
              ))}
            </div>

            {/* Visual Display */}
            <div className="lg:w-2/3 bg-slate-50 rounded-2xl border border-slate-200 p-6 sm:p-8 flex items-center justify-center min-h-[400px]">
              {activeTab === 'escandallos' && (
                <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <span className="font-semibold text-slate-800">Solomillo al Whisky</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-medium">Food Cost: 22%</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Solomillo (200g)</span>
                      <span className="font-medium text-slate-900">4.50 €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Nata (50ml)</span>
                      <span className="font-medium text-slate-900">0.30 €</span>
                    </div>
                    <div className="flex justify-between text-sm bg-amber-50 p-2 rounded border border-amber-100">
                      <span className="text-amber-800 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        Whisky (30ml)
                      </span>
                      <span className="font-bold text-amber-700">1.20 € <span className="text-xs font-normal text-amber-600 line-through ml-1">1.05 €</span></span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-sm text-slate-500">Coste Total Actualizado</span>
                    <span className="text-xl font-bold text-slate-900">6.00 €</span>
                  </div>
                </div>
              )}

              {activeTab === 'inventario' && (
                <div className="w-full max-w-md space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h4 className="font-semibold text-slate-800 mb-4">Desviación de Inventario (Semanal)</h4>
                    <div className="space-y-4">
                      {[
                        { item: 'Harina de Trigo', teorico: '50 kg', real: '48 kg', diff: '-4%', status: 'bg-emerald-500' },
                        { item: 'Gamba Blanca', teorico: '10 kg', real: '7.5 kg', diff: '-25%', status: 'bg-red-500' },
                        { item: 'Aceite de Girasol', teorico: '20 L', real: '19.5 L', diff: '-2.5%', status: 'bg-emerald-500' }
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">{row.item}</p>
                            <p className="text-xs text-slate-500">Teórico: {row.teorico} | Real: {row.real}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded text-white ${row.status}`}>{row.diff}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'menu' && (
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg text-center">
                        <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Estrellas</p>
                        <p className="text-sm text-emerald-900 font-medium">Alta Popularidad<br/>Alto Margen</p>
                        <p className="text-xs text-emerald-600 mt-2">Ej: Solomillo, Ensalada</p>
                      </div>
                      <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-lg text-center">
                        <p className="text-xs font-bold text-cyan-800 uppercase tracking-wider mb-1">Caballos de Batalla</p>
                        <p className="text-sm text-cyan-900 font-medium">Alta Popularidad<br/>Bajo Margen</p>
                        <p className="text-xs text-cyan-600 mt-2">Ej: Menú del día</p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-center">
                        <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Puzles</p>
                        <p className="text-sm text-amber-900 font-medium">Baja Popularidad<br/>Alto Margen</p>
                        <p className="text-xs text-amber-600 mt-2">Ej: Vino de la casa</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
                        <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Perros</p>
                        <p className="text-sm text-red-900 font-medium">Baja Popularidad<br/>Bajo Margen</p>
                        <p className="text-xs text-red-600 mt-2">Ej: Postre X (Eliminar)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= PAIN VS SOLUTION (FEATURES) ================= */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24">
          
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold mb-4">EL PROBLEMA</div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4">¿Pierdes margen sin saber qué ingrediente subió de precio?</h3>
              <p className="text-lg text-slate-600 mb-6">Las facturas de los proveedores cambian cada semana. Si actualizas tus recetas a mano, siempre vas con retraso y tus precios de venta no reflejan la realidad.</p>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-emerald-200 shadow-sm">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">La Solución KOST: Alertas Inteligentes</h4>
                  <p className="text-sm text-slate-600 mt-1">El sistema cruza tus últimas facturas con tus escandallos. Si un ingrediente sube más de un 5%, recibes una alerta y el Food Cost del plato se recalcula al instante.</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center text-cyan-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                </div>
                <span className="font-bold text-slate-800">Módulo de Proveedores</span>
              </div>
              <div className="space-y-3">
                {['Centralización de todas las fichas de producto', 'Histórico de evolución de precios de compra', 'Comparativa automática entre proveedores'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-700">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </div>
                <span className="font-bold text-slate-800">Módulo de Inventarios y HACCP</span>
              </div>
              <div className="space-y-3">
                {['Conteos cíclicos rápidos desde el móvil', 'Cálculo automático de mermas y desperdicio', 'Checklists de limpieza y control de temperaturas (APPCC)'].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-700">
                    <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold mb-4">EL PROBLEMA</div>
              <h3 className="text-3xl font-bold text-slate-900 mb-4">¿Haces inventario a ojo y las cuentas nunca cuadran?</h3>
              <p className="text-lg text-slate-600 mb-6">El stock teórico que te dice el TPV rara vez coincide con la realidad. Las mermas, los errores de comanda y el desperdicio se comen tu beneficio en silencio.</p>
              <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-emerald-200 shadow-sm">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">La Solución KOST: Trazabilidad Total</h4>
                  <p className="text-sm text-slate-600 mt-1">Digitaliza tus conteos. El sistema te muestra exactamente dónde está la desviación y te obliga a justificar las mermas, integrando además los controles sanitarios obligatorios.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ================= FAQ SECTION ================= */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Preguntas Frecuentes</h2>
            <p className="text-slate-600">Resolvemos las dudas técnicas más comunes de los profesionales del sector.</p>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}
                  className="w-full flex justify-between items-center p-5 text-left bg-white hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-900 pr-4">{faq.q}</span>
                  <svg 
                    className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform duration-200 ${openFaq === faq.id ? 'rotate-180' : ''}`} 
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${openFaq === faq.id ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="p-5 pt-0 text-slate-600 leading-relaxed border-t border-slate-100 mt-2">
                    {faq.a}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight">Deja de adivinar. Empieza a controlar.</h2>
          <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
            Únete a los restaurantes que han recuperado hasta un 5% de su facturación anual simplemente digitalizando sus escandallos e inventarios.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowLogin(true)}
              className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-semibold text-lg hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/50"
            >
              Comenzar prueba gratuita de 14 días
            </button>
            <button className="px-8 py-4 bg-transparent text-white border border-slate-700 rounded-xl font-semibold text-lg hover:bg-slate-800 transition-all">
              Hablar con un experto
            </button>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">K</span>
              </div>
              <span className="text-white font-bold text-lg">KOST Software™</span>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacidad</a>
              <a href="#" className="hover:text-white transition-colors">Términos</a>
              <a href="#" className="hover:text-white transition-colors">Contacto</a>
            </div>
            <p className="text-sm text-slate-600">© {new Date().getFullYear()} KOST Software. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* ================= MODAL LOGIN (INTACTO) ================= */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => { setShowLogin(false); setError(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white text-3xl font-bold">K</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Iniciar Sesión</h3>
              <p className="text-gray-500 text-sm mt-1">Accede a tu panel de control</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Código de usuario</label>
                <input
                  type="text"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej: B0001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PIN</label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="****"
                  maxLength={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all shadow-md"
              >
                {loading ? 'Entrando...' : 'Acceder al Sistema'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center bg-gray-50 p-3 rounded-lg">
                💡 <strong>Usuarios de prueba:</strong> B**** a B**** <br/>
                🔑 <strong>PIN:</strong> **** (ADMIN) o **** (USER)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
