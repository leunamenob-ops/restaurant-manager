import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proveedor, email, numeroPedido, fecha, items, usuario, total } = body;

    // Email HTML profesional (sin PDF)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; padding: 0; }
          .header { background: linear-gradient(135deg, #059669 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; background: #f9fafb; }
          .info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; }
          .table th { background: #059669; color: white; padding: 12px; text-align: left; }
          .table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .total { background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: right; margin-top: 20px; }
          .total-amount { font-size: 28px; color: #059669; font-weight: bold; }
          .footer { text-align: center; color: #9ca3af; padding: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin:0;">Pedido ${numeroPedido}</h1>
          <p style="margin:5px 0 0;opacity:0.9;">KOST Software - Restaurant Manager</p>
        </div>
        <div class="content">
          <div class="info">
            <p style="margin:8px 0;"><strong>📅 Fecha:</strong> ${fecha}</p>
            <p style="margin:8px 0;"><strong>🏪 Restaurante:</strong> ${usuario}</p>
            <p style="margin:8px 0;"><strong>📦 Total productos:</strong> ${items.length} items</p>
          </div>
          
          <h2 style="color:#059669;font-size:18px;">Productos solicitados:</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th style="text-align:center;">Cantidad</th>
                <th style="text-align:center;">Unidad</th>
                <th style="text-align:right;">Precio</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any) => `
                <tr>
                  <td>${item.codigo || 'N/A'}</td>
                  <td>${item.descripcion}</td>
                  <td style="text-align:center;">${item.cantidad}</td>
                  <td style="text-align:center;">${item.unidad}</td>
                  <td style="text-align:right;">${item.precio.toFixed(2)} €</td>
                  <td style="text-align:right;font-weight:bold;">${item.subtotal.toFixed(2)} €</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            <p style="font-size:14px;color:#059669;margin:0;font-weight:600;">TOTAL ESTIMADO</p>
            <p class="total-amount" style="margin:5px 0 0;">${total.toFixed(2)} €</p>
          </div>
        </div>
        <div class="footer">
          <p>KOST Software - kostsoftware.com</p>
        </div>
      </body>
      </html>
    `;

    // Enviar email SIN PDF
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'KOST Software <pedidos@kostsoftware.com>',
      to: [email],
      subject: `📦 Pedido ${numeroPedido} - KOST Software`,
      html: htmlContent,
    });

    if (error) {
      console.error('Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Email enviado a:', email);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error en API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
