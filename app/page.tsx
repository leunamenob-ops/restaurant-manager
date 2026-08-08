"use client";

import React, { useState, useEffect } from "react";

export default function Page() {
  const [scrolled, setScrolled] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [ventasMensuales, setVentasMensuales] = useState(45000);
  const [activeModule, setActiveModule] = useState<number>(5);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fugaFB = Math.round(ventasMensuales * 0.058);
  const ahorroAnual = Math.round(fugaFB * 12);
  const recuperacionMensual = Math.round(fugaFB * 0.85);
  const horasAhorradas = Math.round(ventasMensuales / 2500);

  const testimonials = [
    { quote: "En 3 meses recuperamos el 100% de la inversión. El food cost bajó del 32% al 24%.", author: "Carlos Mendoza", role: "Director F&B, Hotel Resort 5*", location: "Mallorca" },
    { quote: "Dejamos de perder 2.400€ al mes en mermas no detectadas. KOST se paga solo.", author: "Ana Rodríguez", role: "Propietaria, Grupo Restauración", location: "Barcelona" },
    { quote: "La matriz nos mostró 3 platos estrella con FC del 38%. Los ajustamos y ganamos 1.800€/mes extra.", author: "Miguel Torres", role: "Chef Ejecutivo", location: "Madrid" }
  ];

  // Galería de platos reales (imágenes en /public/img/)
  const gallery = [
    { img: "/img/ceviche.jpg", name: "Ceviche Peruano", fc: "26.5%", margen: "73.5%", tag: "🐴 Caballo" },
    { img: "/img/burger.jpg", name: "Clásica Burger Cheddar", fc: "17.4%", margen: "82.6%", tag: "🌟 Estrella" },
    { img: "/img/mariscada.jpg", name: "Mariscada Mar y Fuego", fc: "22.5%", margen: "77.5%", tag: "🌟 Estrella" },
    { img: "/img/cesar.jpg", name: "César Clásica", fc: "7.5%", margen: "92.5%", tag: "🌟 Estrella" }
  ];

  const modulesData = [
    { id: 1, badge: "MÓDULO 01", title: "Proveedores y Control de Compras", subtitle: "Cada céntimo de compra bajo lupa, sin sorpresas.", icon: "📦",
      features: ["Alertas automáticas cuando un proveedor sube precios", "Histórico visual de precios para negociar con datos", "Comparativa entre proveedores del mismo producto", "Detección de alternativas más económicas"],
      preview: (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
            <div><p className="font-bold text-sm text-slate-900">Distribuidora Horeca</p><p className="text-xs text-slate-500">142 productos</p></div>
            <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded">Activo</span>
          </div>
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3">
            <p className="text-xs font-bold text-amber-900">⚠️ Alerta de Precio</p>
            <p className="text-xs text-amber-800 mt-1">Aceite Oliva 5L: <b>+2,48€ (+12.4%)</b></p>
            <p className="text-[10px] text-amber-700 mt-1">Impacto anual: +892€</p>
          </div>
        </div>
      )
    },
    { id: 2, badge: "MÓDULO 02", title: "Recetas con Escandallos Vivos", subtitle: "El coste de cada plato se recalcula solo.", icon: "📖",
      features: ["Escandallos que se actualizan con cada factura", "Semáforo: verde ≤28%, ámbar 28-32%, rojo >32%", "Fichas técnicas con fotos y alérgenos", "Soporte de sub-recetas"],
      preview: (
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">
            <div><h4 className="font-bold text-slate-900">Solomillo al Whisky</h4><p className="text-xs text-slate-500">PVP: 18,50€</p></div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded">FC: 21.8%</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-slate-600">Solomillo (220g)</span><span className="font-mono font-bold">3,40€</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Salsa Whisky</span><span className="font-mono font-bold">0,45€</span></div>
            <div className="flex justify-between"><span className="text-slate-600">Guarnición</span><span className="font-mono font-bold">0,18€</span></div>
          </div>
        </div>
      )
    },
    { id: 3, badge: "MÓDULO 03", title: "Pedidos Inteligentes", subtitle: "Compras automáticas según stock y ventas.", icon: "🛒",
      features: ["Borradores automáticos según stock y previsión", "Envío directo por WhatsApp o email", "Verificación de entregas", "Historial completo"],
      preview: (
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center mb-3"><span className="text-xs font-mono font-bold text-slate-500">PED-2026-0892</span><span className="bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded text-xs">Enviado</span></div>
          <p className="font-bold text-slate-900 mb-3">Frutas y Verduras La Huerta</p>
          <div className="bg-slate-50 p-3 rounded text-xs space-y-1.5 font-mono text-slate-700">
            <div className="flex justify-between"><span>• 20kg Tomate</span><span className="font-bold">48,00€</span></div>
            <div className="flex justify-between"><span>• 5kg Aguacate</span><span className="font-bold">22,50€</span></div>
          </div>
        </div>
      )
    },
    { id: 4, badge: "MÓDULO 04", title: "HACCP / APPCC Digital", subtitle: "Sanidad 100% digital. Cero papel.", icon: "🛡️",
      features: ["Checklists diarios en tablet", "Control de temperaturas con alertas", "Incidencias NO-OK con acciones correctivas", "Trazabilidad con QR"],
      preview: (
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center mb-3"><span className="text-xs font-bold">Cumplimiento Hoy</span><span className="text-2xl font-black text-emerald-600 font-mono">94%</span></div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4"><div className="bg-emerald-500 h-2.5 rounded-full" style={{width:'94%'}}></div></div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg"><p className="font-bold text-emerald-900">✓ Cámaras</p></div>
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg"><p className="font-bold text-emerald-900">✓ Aceites</p></div>
          </div>
        </div>
      )
    },
    { id: 5, badge: "⭐ MÓDULO ESTRELLA", title: "Menu Engineering con IA", subtitle: "Tu TPV + escandallos = decisiones reales.", icon: "🎯",
      features: ["Import automático de cierres TPV (XLS, CSV, PDF con IA)", "Matriz Kasavana-Smith: Estrellas, Caballos, Puzzles, Perros", "Regla F&B: Estrella requiere FC ≤ 30%", "Sugerencias: 'Subir X a Y€ → +Z€/mes'"],
      preview: (
        <div className="bg-slate-900 text-white p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center text-xs border-b border-slate-700 pb-2"><span className="font-bold text-amber-400">Matriz Agosto</span><span className="bg-emerald-900/50 text-emerald-400 font-mono px-2 py-0.5 rounded text-[10px]">TPV Conectado</span></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-emerald-900/30 border border-emerald-500/30 p-2.5 rounded"><p className="font-black text-emerald-400 text-xs">🌟 ESTRELLAS</p><p className="text-slate-300 text-[10px]">14 platos</p></div>
            <div className="bg-blue-900/30 border border-blue-500/30 p-2.5 rounded"><p className="font-black text-blue-400 text-xs">🐴 CABALLOS</p><p className="text-slate-300 text-[10px]">8 platos</p></div>
          </div>
          <div className="bg-amber-900/40 border border-amber-500/30 p-3 rounded-lg">
            <p className="text-amber-200 font-bold text-xs">💡 Sugerencia IA</p>
            <p className="text-slate-300 text-[11px] mt-1">Subir "Arroz A Banda" a 17,30€</p>
            <p className="text-emerald-400 font-mono font-bold text-xs mt-1">+340 €/mes</p>
          </div>
        </div>
      )
    },
    { id: 6, badge: "MÓDULO 06", title: "Inventarios y Mermas", subtitle: "Stock valorado en tiempo real.", icon: "📊",
      features: ["Conteos cíclicos por zonas", "Stock Teórico (TPV) vs Real", "Registro de mermas clasificado", "Alertas de stock mínimo"],
      preview: (
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between items-center py-2 border-b border-slate-50"><span className="text-slate-700">Entrecot Vaca</span><span className="bg-rose-100 text-rose-700 font-mono font-bold px-2 py-0.5 rounded">-18%</span></div>
          <div className="flex justify-between items-center py-2"><span className="text-slate-700">Ginebra Premium</span><span className="bg-emerald-100 text-emerald-700 font-mono font-bold px-2 py-0.5 rounded">OK</span></div>
        </div>
      )
    },
    { id: 7, badge: "MÓDULO 07", title: "Producciones y Mise en Place", subtitle: "Cocina planificada, no improvisada.", icon: "👨🍳",
      features: ["Planificación según reservas", "Descuento automático de materias primas", "Control de caducidades", "Estandarización entre turnos"],
      preview: (
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2">
          <div className="p-2.5 bg-slate-50 rounded-lg flex justify-between items-center"><div><p className="font-bold text-xs">Fondo Ternera (15L)</p><p className="text-[10px] text-slate-500">Cad: 12/Ago</p></div><span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded">✓</span></div>
          <div className="p-2.5 bg-amber-50 rounded-lg flex justify-between items-center"><div><p className="font-bold text-xs">Salsa Tomate (8L)</p><p className="text-[10px] text-slate-500">Cad: 10/Ago</p></div><span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-1 rounded">⏳</span></div>
        </div>
      )
    },
    { id: 8, badge: "MÓDULO 08", title: "Facturas con IA", subtitle: "Foto → datos en segundos.", icon: "📸",
      features: ["OCR con IA: foto/PDF → datos automáticos", "Desglose de líneas e impuestos", "Actualización instantánea de costes", "Imputación al P&L"],
      preview: (
        <div className="bg-white p-4 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3 mb-3"><div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><span className="text-emerald-700 font-black text-xs">PDF</span></div><div><p className="text-xs font-bold">Factura_Carnes.pdf</p><p className="text-[10px] text-slate-500">IA · 100% precisión</p></div></div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-900">✓ 14 líneas → escandallos actualizados</div>
        </div>
      )
    },
    { id: 9, badge: "MÓDULO 09", title: "Informes y P&L Real", subtitle: "La cuenta de explotación que se entiende.", icon: "📈",
      features: ["P&L: Ventas TPV × Compras × Food Cost", "Desviación teórico vs real", "Evolución y estacionalidad", "Export PDF y Excel"],
      preview: (
        <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-slate-700">Ventas TPV</span><span className="font-mono font-bold">48.200€</span></div>
          <div className="flex justify-between"><span className="text-slate-700">Compras</span><span className="font-mono font-bold text-rose-600">-12.800€</span></div>
          <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-bold"><span>Margen Bruto</span><span className="font-mono text-emerald-600">73,4%</span></div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp .6s ease both; }
        .d1 { animation-delay: .1s } .d2 { animation-delay: .2s } .d3 { animation-delay: .3s } .d4 { animation-delay: .4s }
      `}</style>

      {/* HEADER */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30"><span className="text-white font-black text-xl">K</span></div>
            <div><span className="text-xl font-black text-slate-900 block leading-none">KOST<span className="text-emerald-600">.</span></span><span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase block mt-0.5">Software F&B</span></div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden lg:flex items-center gap-6">
              <a href="#modulos" className="text-sm font-semibold text-slate-600 hover:text-emerald-600">Módulos</a>
              <a href="#carta" className="text-sm font-semibold text-slate-600 hover:text-emerald-600">Carta Real</a>
              <a href="#calculadora" className="text-sm font-semibold text-slate-600 hover:text-emerald-600">ROI</a>
            </nav>
            <button onClick={() => setShowLogin(true)} className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm shadow-md">Acceder</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="fade-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Plataforma Integral F&B · Web + App Móvil
            </div>
            <h1 className="fade-up d1 text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
              Convierte el caos de tu cocina en <span className="text-emerald-600">decisiones rentables</span> en tiempo real
            </h1>
            <p className="fade-up d2 text-lg text-slate-600 leading-relaxed max-w-2xl">
              Costes, APPCC, inventarios y TPV unificados. Recupera hasta el <strong>85% de las pérdidas ocultas</strong> en mermas y escandallos desfasados.
            </p>
            <div className="fade-up d3 flex flex-col sm:flex-row gap-4 pt-2">
              <button onClick={() => setShowLogin(true)} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-xl shadow-emerald-600/30 transition hover:scale-105">Solicitar Demo Gratuita →</button>
              <a href="#calculadora" className="px-8 py-4 bg-white border-2 border-slate-300 rounded-xl font-bold hover:border-emerald-600 hover:text-emerald-600 text-center">💰 Calcular mis Pérdidas</a>
            </div>
            <div className="fade-up d4 pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-sm font-medium text-slate-600">
              <span>✓ Multi-Outlet</span><span>✓ TPV Conectado</span><span>✓ Setup 48h</span>
            </div>
          </div>

          <div className="fade-up d2 lg:col-span-5">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
              <img src="/img/ceviche.jpg" alt="Ceviche Peruano" className="w-full h-80 object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 to-transparent p-4">
                <p className="text-white font-bold">Ceviche Peruano</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] bg-emerald-500 text-white font-bold px-2 py-0.5 rounded">FC 26.5%</span>
                  <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded">🐴 Caballo de batalla</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CARTA REAL (fotos) */}
      <section id="carta" className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-slate-900">Tu carta, analizada plato a plato</h2>
            <p className="text-slate-600 mt-2 text-sm">Cada receta con su food cost y su posición en la matriz, en vivo</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {gallery.map((g, i) => (
              <div key={i} className="group rounded-2xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl transition bg-white">
                <div className="relative h-44 overflow-hidden">
                  <img src={g.img} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <span className="absolute top-2 right-2 text-[10px] bg-white/90 text-slate-800 font-bold px-2 py-1 rounded">{g.tag}</span>
                </div>
                <div className="p-4">
                  <p className="font-bold text-slate-900 text-sm">{g.name}</p>
                  <div className="flex justify-between mt-2 text-xs">
                    <span className="text-slate-500">FC <b className={parseFloat(g.fc) > 30 ? 'text-rose-600' : 'text-emerald-600'}>{g.fc}</b></span>
                    <span className="text-slate-500">Margen <b className="text-emerald-600">{g.margen}</b></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIFERENCIALES */}
      <section className="py-12 bg-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { icon: "⚡", title: "Escandallos Vivos", desc: "Se actualizan solos con cada factura" },
            { icon: "🎯", title: "Menu Engineering Real", desc: "Basado en ventas reales del TPV" },
            { icon: "🤖", title: "IA en Facturas", desc: "Cero picado manual" },
            { icon: "🛡️", title: "APPCC Digital", desc: "Sanidad sin papel con QR" },
            { icon: "🏢", title: "Multi-Outlet", desc: "Cada local analizado aparte" }
          ].map((it, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 text-center hover:shadow-lg hover:border-emerald-300 transition">
              <div className="text-3xl mb-2">{it.icon}</div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">{it.title}</h3>
              <p className="text-xs text-slate-600">{it.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MÓDULOS */}
      <section id="modulos" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Todo tu negocio F&B bajo control</h2>
            <p className="text-slate-600 mt-3">Selecciona cualquier módulo para verlo en acción</p>
          </div>
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-2">
              {modulesData.map((m) => (
                <button key={m.id} onClick={() => setActiveModule(m.id)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition flex items-center justify-between ${activeModule === m.id ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${activeModule === m.id ? 'bg-emerald-700' : 'bg-slate-100'}`}>{m.icon}</div>
                    <div>
                      <p className={`text-xs font-mono font-bold ${activeModule === m.id ? 'text-emerald-100' : 'text-slate-400'}`}>{m.badge}</p>
                      <p className="text-sm font-bold leading-snug">{m.title}</p>
                    </div>
                  </div>
                  <span>›</span>
                </button>
              ))}
            </div>

            <div className="lg:col-span-7 lg:sticky lg:top-28">
              {(() => {
                const mod = modulesData.find(m => m.id === activeModule) || modulesData[4];
                return (
                  <div key={mod.id} className="fade-up bg-white border-2 border-slate-200 rounded-2xl p-6 sm:p-8 shadow-lg space-y-6">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded border border-emerald-200">{mod.badge}</span>
                      <h3 className="text-2xl font-black text-slate-900 mt-2">{mod.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{mod.subtitle}</p>
                    </div>
                    <div><p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Vista en vivo:</p>{mod.preview}</div>
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Capacidades:</p>
                      {mod.features.map((f, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => setShowLogin(true)} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md">Ver {mod.title} en Acción →</button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-10">Lo que dicen nuestros clientes</h2>
          <div className="bg-gradient-to-br from-emerald-50 to-slate-50 rounded-2xl p-8 sm:p-12 border-2 border-emerald-200 shadow-lg text-left">
            <p className="text-xl sm:text-2xl text-slate-800 leading-relaxed mb-6 font-medium">"{testimonials[activeTestimonial].quote}"</p>
            <p className="font-bold text-slate-900">{testimonials[activeTestimonial].author}</p>
            <p className="text-sm text-slate-600">{testimonials[activeTestimonial].role} · {testimonials[activeTestimonial].location}</p>
          </div>
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button key={i} onClick={() => setActiveTestimonial(i)} className={`h-3 rounded-full transition-all ${activeTestimonial === i ? 'bg-emerald-600 w-8' : 'bg-slate-300 w-3'}`} />
            ))}
          </div>
        </div>
      </section>

      {/* CALCULADORA */}
      <section id="calculadora" className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 sm:p-12 border border-white/10 shadow-2xl space-y-8">
            <div className="text-center space-y-3">
              <h2 className="text-3xl sm:text-4xl font-black">¿Cuánto dinero estás perdiendo ahora mismo?</h2>
              <p className="text-slate-300 text-sm">La hostelería pierde de media un 5,8% en fugas de margen no detectadas</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Facturación Mensual:</span>
                <span className="text-3xl font-black text-emerald-400 font-mono">{ventasMensuales.toLocaleString('es-ES')}€</span>
              </div>
              <input type="range" min="10000" max="250000" step="5000" value={ventasMensuales} onChange={(e) => setVentasMensuales(Number(e.target.value))} className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-rose-500/20 p-5 rounded-2xl border border-rose-500/30"><p className="text-xs font-bold text-rose-300 uppercase mb-2">Pérdidas / mes</p><p className="text-3xl font-black text-rose-400 font-mono">-{fugaFB.toLocaleString('es-ES')}€</p></div>
              <div className="bg-emerald-500/20 p-5 rounded-2xl border border-emerald-500/30"><p className="text-xs font-bold text-emerald-300 uppercase mb-2">Recuperación / año</p><p className="text-3xl font-black text-emerald-400 font-mono">+{ahorroAnual.toLocaleString('es-ES')}€</p></div>
              <div className="bg-blue-500/20 p-5 rounded-2xl border border-blue-500/30"><p className="text-xs font-bold text-blue-300 uppercase mb-2">Horas ahorradas / mes</p><p className="text-3xl font-black text-blue-400 font-mono">{horasAhorradas}h</p></div>
            </div>
            <div className="text-center">
              <button onClick={() => setShowLogin(true)} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-xl hover:scale-105 transition">Recuperar {recuperacionMensual.toLocaleString('es-ES')}€/mes →</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 bg-slate-900 text-white text-center">
        <div className="max-w-5xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black">¿Listo para recuperar tu margen?</h2>
          <p className="text-slate-400">Setup en 48 horas. Sin permanencia.</p>
          <button onClick={() => setShowLogin(true)} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-xl">Comenzar con KOST →</button>
          <p className="text-xs text-slate-500 font-mono pt-8 border-t border-slate-800">© 2026 KOST Software F&B</p>
        </div>
      </footer>

      {/* MODAL */}
      {showLogin && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="fade-up bg-white rounded-2xl p-8 max-w-md w-full space-y-5 shadow-2xl relative">
            <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl font-bold">✕</button>
            <div><h3 className="text-2xl font-black text-slate-900">Acceder a KOST</h3><p className="text-sm text-slate-500 mt-1">Introduce tus credenciales</p></div>
            <form onSubmit={(e) => { e.preventDefault(); setShowLogin(false); }} className="space-y-4">
              <input type="email" required placeholder="gerencia@restaurante.com" className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-600" />
              <input type="password" required placeholder="••••••••" className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-600" />
              <button type="submit" className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm">Entrar al Sistema →</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}