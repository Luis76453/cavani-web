const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { optionalAuthenticate } = require('../middleware/auth');
const { calculateCartTotal, createOrderFromCart } = require('../services/orderService');
const { sendOrderConfirmationEmail } = require('../services/emailService');
const { MercadoPagoConfig, Preference, Payment, WebhookSignatureValidator } = require('mercadopago');

// Initialize Mercado Pago configurations
const mpAccessToken = process.env.MP_ACCESS_TOKEN;
let client;
let preferenceClient;
let paymentClient;

if (mpAccessToken) {
  client = new MercadoPagoConfig({ accessToken: mpAccessToken });
  preferenceClient = new Preference(client);
  paymentClient = new Payment(client);
} else {
  console.warn('[Payments Route] Warning: MP_ACCESS_TOKEN is not defined in environment variables.');
}

/**
 * POST /api/payments/create-preference
 * Public/Protected route to initialize a secure payment preference for Checkout Pro.
 */
router.post('/create-preference', optionalAuthenticate, async (req, res) => {
  const { address, promo_code, shipping_method, session_id } = req.body;
  const guestInfo = req.body.guestInfo || req.body.guest_info;
  const userId = req.user ? req.user.id : null;

  console.log(`[CREATE-PREFERENCE] Peticion recibida. Usuario ID: ${userId || 'GUEST'}, Session ID: ${session_id || 'N/A'}. Metodo: ${shipping_method}, Promo: ${promo_code}`);
  console.log(`[CREATE-PREFERENCE] Direccion recibida:`, JSON.stringify(address));
  console.log(`[CREATE-PREFERENCE] guestInfo recibido:`, JSON.stringify(guestInfo));

  if (!address) {
    console.warn(`[CREATE-PREFERENCE] Intento fallido: Direccion faltante.`);
    return res.status(400).json({ message: 'La dirección de envío es requerida.' });
  }

  // 0. Extract effective email from user, guestInfo or address
  const payerEmail = req.user?.email || guestInfo?.email || guestInfo?.guest_email || address?.email || address?.guest_email;
  if (!payerEmail) {
    console.warn(`[CREATE-PREFERENCE] Intento fallido: Correo de cliente faltante.`);
    return res.status(400).json({ message: 'El correo electrónico es requerido para procesar el pago.' });
  }

  try {
    // 1. Recalculate cart totals server-side
    const { subtotal, discount, shipping, total, items } = await calculateCartTotal(userId, promo_code, shipping_method, session_id);
    console.log(`[CREATE-PREFERENCE] Totales calculados: Subtotal: ${subtotal}, Descuento: ${discount}, Envio: ${shipping}, Total: ${total}. Items count: ${items.length}`);

    if (items.length === 0) {
      console.warn(`[CREATE-PREFERENCE] Intento fallido: Carrito vacio.`);
      return res.status(400).json({ message: 'El carrito está vacío.' });
    }

    // 2. Pre-create Order in PENDING state to freeze order snapshot and items in database
    console.log('[CREATE-PREFERENCE] Pre-creando registro de Orden en estado PENDING...');
    const order = await createOrderFromCart({
      userId,
      guestInfo,
      sessionId: session_id,
      address: { ...address, email: payerEmail },
      payment_method: 'mercado_pago',
      promo_code,
      shipping_method,
      payment_status: 'PENDING'
    });

    console.log(`[CREATE-PREFERENCE] Orden pre-creada exitosamente. ID: ${order.id}, Numero: ${order.order_number}`);

    // 3. Map items and distribute discount proportionally for Mercado Pago payload
    const itemsTargetTotal = subtotal - discount;
    const discountRatio = subtotal > 0 ? itemsTargetTotal / subtotal : 1;

    let distributedItemsTotal = 0;
    const mpItems = items.map((item) => {
      const originalUnitPrice = parseFloat(item.price);
      let adjustedPrice = Math.round(originalUnitPrice * discountRatio * 100) / 100;
      if (adjustedPrice <= 0) adjustedPrice = 0.01;

      distributedItemsTotal += adjustedPrice * item.quantity;
      return {
        id: String(item.variant_id),
        title: item.name,
        quantity: item.quantity,
        unit_price: adjustedPrice,
        currency_id: 'PEN'
      };
    });

    // Adjust rounding difference on the last item to match target total exactly
    const difference = Math.round((itemsTargetTotal - distributedItemsTotal) * 100) / 100;
    if (difference !== 0 && mpItems.length > 0) {
      const lastItem = mpItems[mpItems.length - 1];
      const adjustedLastUnitPrice = Math.round((lastItem.unit_price + (difference / lastItem.quantity)) * 100) / 100;
      if (adjustedLastUnitPrice > 0) {
        lastItem.unit_price = adjustedLastUnitPrice;
      }
    }

    if (shipping > 0) {
      mpItems.push({
        id: 'shipping',
        title: 'Costo de Envío',
        quantity: 1,
        unit_price: parseFloat(shipping),
        currency_id: 'PEN'
      });
    }

    // 4. Setup redirection URLs & Ultra-compact external_reference (~18 characters)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const backUrls = {
      success: `${frontendUrl}/checkout/success`,
      failure: `${frontendUrl}/checkout/failure`,
      pending: `${frontendUrl}/checkout/pending`
    };

    const external_reference = JSON.stringify({ orderId: order.id });

    const preferenceBody = {
      items: mpItems,
      payer: {
        email: payerEmail
      },
      back_urls: backUrls,
      external_reference,
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/webhook`
    };

    console.log('[CREATE-PREFERENCE] Webhook URL asignada:', preferenceBody.notification_url);
    console.log('[CREATE-PREFERENCE] Payer email asignado:', payerEmail);
    console.log('[CREATE-PREFERENCE] external_reference compacto:', external_reference);

    if (!preferenceClient) {
      console.error('[CREATE-PREFERENCE] Error: Mercado Pago SDK client no inicializado.');
      throw new Error('Mercado Pago SDK clients are not initialized.');
    }

    const preferenceResponse = await preferenceClient.create({ body: preferenceBody });
    console.log(`[CREATE-PREFERENCE] Preferencia creada con exito en MP. ID: ${preferenceResponse.id}. Init Point: ${preferenceResponse.init_point}`);

    res.json({
      init_point: preferenceResponse.init_point,
      preferenceId: preferenceResponse.id,
      orderId: order.id,
      orderNumber: order.order_number
    });
  } catch (err) {
    console.error('[CREATE-PREFERENCE] Error creando preferencia en Mercado Pago:', err);
    if (err.response) {
      console.error('[CREATE-PREFERENCE] Respuesta de error de Mercado Pago API:', JSON.stringify(err.response.data || err.response));
    }
    res.status(500).json({ message: 'Error al crear la preferencia de pago.' });
  }
});

/**
 * POST /api/payments/webhook
 * Public endpoint consumed by Mercado Pago servers to verify and confirm payments asynchronously.
 */
router.post('/webhook', async (req, res) => {
  console.log('[WEBHOOK] Notificacion recibida en Webhook de Mercado Pago.');
  console.log('[WEBHOOK] Headers:', JSON.stringify(req.headers));
  console.log('[WEBHOOK] Query params:', JSON.stringify(req.query));
  console.log('[WEBHOOK] Body recibido:', JSON.stringify(req.body));

  const { type, data } = req.body;
  if (type === 'payment' && data && data.id) {
    const paymentId = data.id;
    console.log(`[WEBHOOK] Detectado evento de pago. Payment ID: ${paymentId}`);
    try {
      if (!paymentClient) {
        console.error('[WEBHOOK] Error: Mercado Pago SDK paymentClient no inicializado.');
        throw new Error('Mercado Pago SDK clients are not initialized.');
      }

      console.log(`[WEBHOOK] Consultando API de Mercado Pago para recuperar detalles del pago ${paymentId}...`);
      const payment = await paymentClient.get({ id: paymentId });
      console.log(`[WEBHOOK] Detalles de pago recibidos. Status: ${payment.status}, External Reference: ${payment.external_reference}, ID Pago MP: ${payment.id}`);

      if (payment.status === 'approved') {
        const { external_reference, id: mpPaymentId } = payment;
        let refObj = {};
        try {
          refObj = JSON.parse(external_reference);
        } catch (e) {
          console.warn('[WEBHOOK] Error parseando external_reference:', external_reference);
        }

        if (refObj.orderId) {
          // Pre-created order flow (New compact architecture)
          const orderRes = await db.query('SELECT * FROM orders WHERE id = $1', [refObj.orderId]);
          if (orderRes.rows.length > 0) {
            const order = orderRes.rows[0];
            
            // Check if already paid to avoid duplicate updates
            if (order.payment_status !== 'PAID') {
              console.log(`[WEBHOOK] Actualizando orden ID: ${order.id} a PAID y CONFIRMED...`);
              await db.query(
                `UPDATE orders SET payment_status = 'PAID', status = 'CONFIRMED', mp_payment_id = $1 WHERE id = $2`,
                [String(mpPaymentId), order.id]
              );
              console.log(`[WEBHOOK] Orden ID: ${order.id} actualizada con exito.`);

              // Fetch order items for email notification
              const itemsRes = await db.query(
                `SELECT oi.quantity, oi.price, p.name
                 FROM order_items oi
                 JOIN product_variants pv ON oi.variant_id = pv.id
                 JOIN products p ON pv.product_id = p.id
                 WHERE oi.order_id = $1`,
                [order.id]
              );
              const orderItems = itemsRes.rows;

              // Extract recipient info
              let recipientEmail = order.guest_email;
              let recipientName = `${order.guest_first_name || ''} ${order.guest_last_name || ''}`.trim();

              if (!recipientEmail && order.user_id) {
                const userRes = await db.query('SELECT email, first_name, last_name FROM users WHERE id = $1', [order.user_id]);
                if (userRes.rows.length > 0) {
                  recipientEmail = userRes.rows[0].email;
                  recipientName = `${userRes.rows[0].first_name} ${userRes.rows[0].last_name}`.trim();
                }
              }

              // Trigger email dispatch asynchronously in non-blocking background block
              setImmediate(async () => {
                try {
                  await sendOrderConfirmationEmail({
                    recipientEmail,
                    recipientName: recipientName || 'Cliente',
                    orderNumber: order.order_number,
                    total: order.total,
                    shippingAddress: {
                      address_line1: order.shipping_address_line1,
                      city: order.shipping_city,
                      state: order.shipping_state,
                      phone: order.guest_phone,
                      reference: order.shipping_reference
                    },
                    items: orderItems
                  });
                } catch (emailErr) {
                  console.error('[WEBHOOK Background Email Error]:', emailErr);
                }
              });
            } else {
              console.log(`[WEBHOOK] La orden ID: ${order.id} ya estaba marcada como PAID. Omitiendo.`);
            }
          } else {
            console.warn(`[WEBHOOK] No se encontro la orden ID: ${refObj.orderId} en la base de datos.`);
          }
        } else if (refObj.userId || refObj.address) {
          // Legacy payload fallback for backward compatibility
          const existingOrder = await db.query('SELECT * FROM orders WHERE mp_payment_id = $1', [String(mpPaymentId)]);
          if (existingOrder.rows.length === 0) {
            const order = await createOrderFromCart({
              userId: refObj.userId,
              address: refObj.address,
              payment_method: 'mercado_pago',
              promo_code: refObj.promo_code,
              shipping_method: refObj.shipping_method,
              payment_status: 'PAID',
              mp_payment_id: String(mpPaymentId)
            });
            console.log(`[WEBHOOK Legacy] Orden creada exitosamente para pago ID: ${mpPaymentId}`);
          }
        }
      } else {
        console.log(`[WEBHOOK] Pago registrado pero no aprobado. Status: "${payment.status}"`);
      }
    } catch (err) {
      console.error(`[WEBHOOK Error] Error procesando webhook de pago ${paymentId}:`, err);
    }
  }

  console.log('[WEBHOOK] Respondiendo con 200 OK a Mercado Pago.');
  res.status(200).send('OK');
});

module.exports = router;