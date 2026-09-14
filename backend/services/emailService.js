const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.EMAIL_FROM || 'caVani MedWear <onboarding@resend.dev>';

/**
 * Sends a confirmation email asynchronously upon successful payment.
 * Wrapped in an independent try/catch block to guarantee background safety.
 */
async function sendOrderConfirmationEmail(orderData) {
  if (!resend) {
    console.warn('[EMAIL-SERVICE] Aviso: RESEND_API_KEY no configurada. Omitiendo envío de correo.');
    return { success: false, reason: 'RESEND_API_KEY not configured' };
  }

  const {
    recipientEmail,
    recipientName,
    orderNumber,
    total,
    shippingAddress = {},
    items = []
  } = orderData;

  if (!recipientEmail) {
    console.warn('[EMAIL-SERVICE] Aviso: No hay email de destinatario provisto.');
    return { success: false, reason: 'No recipient email' };
  }

  console.log(`[EMAIL-SERVICE] Preparando correo de confirmación de pedido ${orderNumber} para ${recipientEmail}...`);

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name || item.product_name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">S/ ${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Confirmación de Pedido - caVani MedWear</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f8; margin: 0; padding: 20px; color: #0A142F;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        
        <!-- Header -->
        <div style="background-color: #0A142F; padding: 30px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase;">caVani</h1>
          <p style="margin: 5px 0 0 0; font-size: 12px; color: #84A9F8; text-transform: uppercase; letter-spacing: 1px;">MedWear</p>
        </div>

        <!-- Body -->
        <div style="padding: 30px;">
          <h2 style="font-size: 20px; margin-top: 0; color: #0A142F;">¡Gracias por tu compra, ${recipientName || 'Cliente'}!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #4A5568;">
            Hemos recibido y verificado tu pago correctamente. Tu número de pedido es <strong style="color: #0C3BC4;">${orderNumber}</strong>.
          </p>

          <div style="background-color: #F7FAFC; border-left: 4px solid #0C3BC4; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 13px; color: #2D3748; line-height: 1.5;">
              📲 <strong>Coordinación de Entrega:</strong> Nuestro equipo logístico se pondrá en contacto contigo a la brevedad vía <strong>teléfono o WhatsApp</strong> para coordinar la fecha y hora exacta del despacho de tu pedido.
            </p>
          </div>

          <!-- Items Table -->
          <h3 style="font-size: 16px; margin-top: 25px; border-bottom: 2px solid #EDF2F7; padding-bottom: 8px;">Resumen del Pedido</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #EDF2F7; text-align: left; color: #4A5568;">
                <th style="padding: 8px 10px;">Producto</th>
                <th style="padding: 8px 10px; text-align: center;">Cant.</th>
                <th style="padding: 8px 10px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Total summary -->
          <div style="text-align: right; font-size: 16px; font-weight: bold; color: #0A142F; margin-bottom: 25px;">
            Total Pagado: S/ ${parseFloat(total).toFixed(2)}
          </div>

          <!-- Shipping details -->
          <h3 style="font-size: 16px; border-bottom: 2px solid #EDF2F7; padding-bottom: 8px;">Dirección de Entrega</h3>
          <p style="font-size: 13px; color: #4A5568; line-height: 1.6; margin-bottom: 0;">
            ${shippingAddress.address_line1 || shippingAddress.shipping_address_line1 || ''}<br>
            ${shippingAddress.city || shippingAddress.shipping_city || ''}, ${shippingAddress.state || shippingAddress.shipping_state || ''}<br>
            Teléfono: ${shippingAddress.phone || shippingAddress.shipping_phone || shippingAddress.guest_phone || 'No especificado'}<br>
            ${(shippingAddress.reference || shippingAddress.shipping_reference) ? `Referencia: ${shippingAddress.reference || shippingAddress.shipping_reference}` : ''}
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #EDF2F7; padding: 20px; text-align: center; font-size: 12px; color: #718096;">
          <p style="margin: 0;">caVani MedWear - Made for those who care.</p>
        </div>

      </div>
    </body>
    </html>
  `;

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to: [recipientEmail],
      subject: `Confirmación de Pedido ${orderNumber} - caVani MedWear`,
      html: htmlContent
    });

    console.log(`[EMAIL-SERVICE] ¡Correo enviado con éxito a ${recipientEmail}! ID Resend:`, data.id);
    return { success: true, id: data.id };
  } catch (err) {
    console.error(`[EMAIL-SERVICE Error] Error al enviar correo a ${recipientEmail}:`, err.message || err);
    return { success: false, error: err };
  }
}

module.exports = {
  sendOrderConfirmationEmail
};