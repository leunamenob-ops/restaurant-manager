import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-pdf/renderer';
import { PedidoPDF } from '../../../components/PedidoPDF';

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proveedor, email, numeroPedido, fecha, items, usuario, total } = body;

    // 1. Generar el PDF en memoria
    const pdfBuffer = await render(
      <PedidoPDF
        numeroPedido={numeroPedido}
        fecha={fecha}
        restaurante={usuario}
        total={total}
        items={items}
      />
    );

    // 2. Construir el email HTML (más bonito y profesional)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; margin: 0; padding: 0; }
          .header { background: linear-gradient(135deg, #059669 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0; opacity: 0.9; }
          .content { padding: 30px; background: #f9fafb; }
          .info { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #059669; }
          .info p { margin: 8px 0; font-size: 14px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; background: white; border-radius: 8px; overflow: hidden; }
          .table th { background: #059669; color: white; padding: 12px; text-align: left; font-size: 13px; }
          .table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          .table tr:last-child td { border-bottom: none; }
          .total { background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: right; margin-top: 20px; border: 1px solid #bbf7d0; }
          .total-amount { font-size: 28px; color: #059669; font-weight: bold; margin: 5px 0 0; }
          .footer { text-align: center; color: #9ca3af; padding: 30px 20px; font-size: 12px; }
          .pdf-notice { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Nuevo Pedido Recibido</h1>
          <p>KOST Software - Restaurant Manager</p>
        </div>
        <div class="content">
          <div class="pdf-notice">
            📎 <strong>Adjunto encontrarás el PDF oficial</strong> de este pedido, listo para imprimir o guardar.
          </div>
          
          <div class="info">
            <p><strong>📅 Fecha:</strong> ${fecha}</p>
            <p><strong>🏪 Restaurante:</strong> ${usuario}</p>
            <p><strong>📦 Total de productos:</strong> ${items.length} items</p>
          </div>
          
          <h2 style="color: #059669; font-size: 18px;">Productos solicitados:</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: center;">Unidad</th>
                <th style="text-align: right;">Precio</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item: any) => `
                <tr>
                  <td>${item.codigo || 'N/A'}</td>
                  <td>${item.descripcion}</td>
                  <td style="text-align: center;">${item.cantidad}</td>
                  <td style="text-align: center;">${item.unidad}</td>
                  <td style="text-align: right;">${item.precio.toFixed(2)} €</td>
                  <td style="text-align: right; font-weight: bold;">${item.subtotal.toFixed(2)} €</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total">
            <p style="font-size: 14px; color: #059669; margin: 0; font-weight: 600;">TOTAL ESTIMADO DEL PEDIDO</p>
            <p class="total-amount">${total.toFixed(2)} €</p>
          </div>
        </div>
        <div class="footer">
          <p>Este es un correo automático generado por KOST Software.</p>
          <p>Por favor, no responda a este mensaje. Para dudas, contacte con el restaurante.</p>
          <p><strong>kostsoftware.com</strong></p>
        </div>
      </body>
      </html>
    `;

    // 3. Enviar email con Resend + PDF adjunto
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'KOST Software <pedidos@kostsoftware.com>',
      to: [email],
      subject: `📦 Nuevo Pedido ${numeroPedido} - KOST Software`,
      html: htmlContent,
      attachments: [
        {
          filename: `Pedido_${numeroPedido}.pdf`,
          content: Buffer.from(pdfBuffer).toString('base64'),
        },
      ],
    });

    if (error) {
      console.error('❌ Error enviando email con Resend:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Email con PDF enviado exitosamente a:', email);
    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    console.error('❌ Error crítico en API de envío:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
