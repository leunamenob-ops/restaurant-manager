import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { texto } = await request.json();

    console.log('📄 Texto recibido:', texto.substring(0, 100) + '...');
    console.log(' API Key configurada:', process.env.OPENAI_API_KEY ? 'SÍ' : 'NO');

    if (!texto) {
      return NextResponse.json({ error: 'No hay texto para analizar' }, { status: 400 });
    }

    const prompt = `Extrae TODOS los datos de esta factura española en formato JSON. Busca CADA campo cuidadosamente.

Formato JSON:
{
  "proveedor": {
    "nombre": "string o null",
    "nif": "string o null",
    "direccion": "string o null",
    "telefono": "string o null",
    "email": "string o null"
  },
  "cliente": {
    "nombre": "string o null",
    "nif": "string o null",
    "direccion": "string o null"
  },
  "factura": {
    "numero": "string o null",
    "fecha": "YYYY-MM-DD o null"
  },
  "importes": {
    "base_imponible": null,
    "iva": null,
    "total_iva": null,
    "total": null
  },
  "lineas": [
    {
      "descripcion": "string",
      "cantidad": null,
      "precio_unitario": null,
      "total": null
    }
  ]
}

INSTRUCCIONES:
1. Busca líneas de productos/artículos con descripción, cantidad, precio unitario y total
2. Busca patrones como: "Unid.", "Cantidad", "Precio", "Importe", "Total"
3. Extrae CADA línea de producto que encuentres
4. Si no encuentras un campo, pon null
5. Responde SOLO con JSON válido

FACTURA:
${texto}

Responde SOLO con el JSON completo.`;

    console.log('🚀 Llamando a OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Responde siempre SOLO con JSON válido, sin texto adicional.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
    });

    console.log('✅ Respuesta de OpenAI recibida');

    let respuesta = completion.choices[0].message.content;
    
    console.log('📝 Contenido:', respuesta);

    if (!respuesta) {
      throw new Error('No se pudo analizar la factura');
    }

    // Limpiar
    respuesta = respuesta.trim();
    if (respuesta.startsWith('```json')) {
      respuesta = respuesta.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (respuesta.startsWith('```')) {
      respuesta = respuesta.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    const datosFactura = JSON.parse(respuesta);

    console.log('✅ JSON parseado correctamente');

    return NextResponse.json({
      success: true,
      datos: datosFactura,
    });

  } catch (error: any) {
    console.error('❌ ERROR:', error);
    console.error('❌ Stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Error al analizar la factura',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}