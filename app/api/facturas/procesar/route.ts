import { NextRequest, NextResponse } from 'next/server';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

// Configurar cliente AWS
const textractClient = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('factura') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Convertir archivo a Uint8Array (no Buffer)
    const bytes = await file.arrayBuffer();
    const uint8Array = new Uint8Array(bytes);

    // Llamar a Textract
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: uint8Array,
      },
    });

    const response = await textractClient.send(command);

    // Extraer texto del resultado
    const textoCompleto = response.Blocks?.map(block => block.Text).filter(Boolean).join('\n');

    return NextResponse.json({
      success: true,
      texto: textoCompleto,
      bloques: response.Blocks,
    });

  } catch (error: any) {
    console.error('Error procesando factura:', error);
    return NextResponse.json(
      { error: error.message || 'Error al procesar la factura' },
      { status: 500 }
    );
  }
}