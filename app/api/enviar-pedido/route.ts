import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    console.log('📩 [RESEND] Iniciando envío de email...');
    
    const { proveedor, email, numeroPedido, fecha, items, usuario } = await request.json();

    console.log('📋 Datos:', { proveedor, email, numeroPedido });

    // Construir HTML del email
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #c00000;">
        <h2 style="color: #c00000; border-bottom: 3px solid #c00000; padding-bottom: 10px;">📋 ORDEN DE COMPRA - HOTEL BONANZA</h2>
        <p><strong>Nº Pedido:</strong> <span style="color: #c00000; font-size: 18px;">${numeroPedido}</span></p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Proveedor:</strong> ${proveedor}</p>
        <p><strong>Usuario:</strong> ${usuario}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background-color: #c00000; color: white;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Código</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Descripción</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Cantidad</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Unidad</th>
            </tr>
          </thead>
          <tbody>
    `;

    items.forEach((item: any) => {
      html += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.codigo}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.descripcion}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${item.cantidad}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.unidad}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          <strong>Hotel Bonanza **Playa**</strong><br>
          Este pedido ha sido generado automáticamente.
        </p>
      </div>
    `;

    // Enviar email con Resend
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [email],
      cc: [process.env.EMAIL_FROM || 'onboarding@resend.dev'],
      subject: ` Orden de Compra ${numeroPedido} - Hotel Bonanza`,
      html: html,
    });

    console.log('✅ [RESEND] Email enviado exitosamente. ID:', data.id);

    return NextResponse.json({ success: true, id: data.id });
    
  } catch (error: any) {
    console.error('❌ [RESEND] Error al enviar email:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}