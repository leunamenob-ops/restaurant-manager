import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const datos = await request.json();

    // Hotel ID temporal (luego vendrá del usuario logueado)
    const hotelId = '00000000-0000-0000-0000-000000000001';

    console.log('💾 Guardando factura...');
    console.log('Hotel ID:', hotelId);
    console.log('Proveedor:', datos.proveedor?.nombre);
    console.log('Número factura:', datos.factura?.numero);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Insertar factura CON hotel_id
    const { data: facturaData, error: facturaError } = await supabase
      .from('facturas')
      .insert({
        numero_factura: datos.factura?.numero,
        fecha: datos.factura?.fecha,
        base_imponible: datos.importes?.base_imponible || null,
        iva_porcentaje: datos.importes?.iva || null,
        iva_importe: datos.importes?.total_iva || null,
        total: datos.importes?.total || null,
        estado: 'procesada',
        hotel_id: hotelId,  // ← AÑADIDO
      })
      .select()
      .single();

    if (facturaError) {
      console.error('Error factura:', facturaError);
      throw facturaError;
    }

    console.log('✅ Factura ID:', facturaData.id);

    // 2. Insertar líneas UNA POR UNA (trigger deshabilitado)
    let lineasInsertadas = 0;
    let lineasFallidas = 0;

    if (datos.lineas && datos.lineas.length > 0) {
      for (let i = 0; i < datos.lineas.length; i++) {
        const linea = datos.lineas[i];
        
        try {
          const { error } = await supabase
            .from('facturas_lineas')
            .insert({
              factura_id: facturaData.id,
              descripcion: linea.descripcion,
              cantidad: linea.cantidad,
              precio_unitario: linea.precio_unitario,
              total_linea: linea.total,
              matched: false,
            });

          if (error) {
            console.error(`❌ Línea ${i + 1} falló:`, error.message);
            lineasFallidas++;
          } else {
            lineasInsertadas++;
          }
        } catch (err: any) {
          console.error(`❌ Línea ${i + 1} error:`, err.message);
          lineasFallidas++;
        }
      }

      console.log(`✅ Líneas insertadas: ${lineasInsertadas}/${datos.lineas.length}`);
      if (lineasFallidas > 0) {
        console.log(`⚠️ Líneas fallidas: ${lineasFallidas}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Factura guardada (${lineasInsertadas} líneas)`,
      id: facturaData.id,
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}