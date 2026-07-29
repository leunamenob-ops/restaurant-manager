import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-pdf/renderer';
import { PedidoPDF } from '../../../components/PedidoPDF';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proveedor, email, numeroPedido, fecha, items, usuario, total } = body;

    // 1. Generar el PDF
    const pdfBuffer = await render(
      <PedidoPDF 
        numeroPedido={numeroPedido}
        fecha={fecha}
        restaurante={usuario}
        total={total}
        items={items}
      />
    );

    // 2. HTML del email
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
        <div class="header"><h1>Pedido ${numeroPedido}</h1><p>KOST Software</p></div>
        <div class="content">
          <div class="info">
            <p><strong>Fecha:</strong> ${fecha}</p>
            <p><strong>Restaurante:</strong> ${usuario}</p>
            <p><strong>Productos:</strong> ${items.length} items</p>
          </div>
          <table class="table">
            <thead><tr><th>Código</th><th>Descripción</th><th>Cant.</th><th>Unidad</th><th>Precio</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${items.map((item: any) => `
                <tr>
                  <td>${item.codigo || 'N/A'}</td>
                  <td>${item.descripcion}</td>
                  <td>${item.cantidad}</td>
                  <td>${item.unidad}</td>
                  <td>${item.precio.toFixed(2)}€</td>
                  <td><strong>${item.subtotal.toFixed(2)}€</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total"><p style="margin:0;font-size:14px;color:#059669;">TOTAL</p><p class="total-amount" style="margin:5px 0 0;">${total.toFixed(2)} €</p></div>
        </div>
        <div class="footer"><p>KOST Software - kostsoftware.com</p></div>
      </body>
      </html>
    `;

    // 3. Enviar email con PDF
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'KOST Software <pedidos@kostsoftware.com>',
      to: [email],
      subject: `Pedido ${numeroPedido} - KOST Software`,
      html: htmlContent,
      attachments: [
        {
          filename: `Pedido_${numeroPedido}.pdf`,
          content: Buffer.from(pdfBuffer).toString('base64'),
        },
      ],
    });

    if (error) {
      console.error('Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en API:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
