import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inicializar Resend (o el servicio que uses)
const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proveedor, email, numeroPedido, fecha, items, usuario, total } = body;

    // Construir el email
    const htmlContent = `
      <h1>Pedido ${numeroPedido}</h1>
      <p><strong>Fecha:</strong> ${fecha}</p>
      <p><strong>Restaurante:</strong> ${usuario}</p>
      <p><strong>Total estimado:</strong> ${total.toFixed(2)}€</p>
      
      <h2>Productos solicitados:</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Código</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Descripción</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Cantidad</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Unidad</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Precio</th>
            <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.codigo}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${item.descripcion}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.cantidad}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.unidad}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.precio.toFixed(2)}€</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.subtotal.toFixed(2)}€</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <p style="margin-top: 20px; color: #6b7280;">
        Este es un email automático generado por KOST Software - Restaurant Manager
      </p>
    `;

    // Enviar email con Resend
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'KOST Software <onboarding@resend.dev>',
      to: [email],
      subject: `Pedido ${numeroPedido} - KOST Software`,
      html: htmlContent,
    });

    if (error) {
      console.error('Error enviando email:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error en API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
