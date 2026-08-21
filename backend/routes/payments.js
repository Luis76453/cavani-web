const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { calculateCartTotal, createOrderFromCart } = require('../services/orderService');
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
 * Protected route to initialize a secure payment preference for Checkout Pro.
 */
router.post('/create-preference', authenticateToken, async (req, res) => {
  const { address, promo_code, shipping_method } = req.body;
  const userId = req.user.id;

  if (!address) {
    return res.status(400).json({ message: 'La dirección de envío es requerida.' });
  }

  try {
    // 1. Recalculate cart totals server-side (do not trust frontend pricing)
    const { subtotal, discount, shipping, total, items } = await calculateCartTotal(userId, promo_code, shipping_method);

    if (items.length === 0) {
      return res.status(400).json({ message: 'El carrito está vacío.' });
    }

    // 2. Map items and distribute discount proportionally
    // Mercado Pago Checkout Pro does not support negative unit prices for discounts,
    // so we distribute the discount proportionally among all purchase items.
    const itemsTargetTotal = subtotal - discount;
    const discountRatio = subtotal > 0 ? itemsTargetTotal / subtotal : 1;

    let distributedItemsTotal = 0;
    const mpItems = items.map((item) => {
      const originalUnitPrice = parseFloat(item.price);
      let adjustedPrice = Math.round(originalUnitPrice * discountRatio * 100) / 100;
      if (adjustedPrice <= 0) adjustedPrice = 0.01; // safety fallback

      distributedItemsTotal += adjustedPrice * item.quantity;
      return {
        id: String(item.variant_id),
        title: item.name,
        quantity: item.quantity,
        unit_price: adjustedPrice,
        currency_id: 'PEN'
      };
    });

    // Adjust rounding difference on the last item to match the target total exactly
    const difference = Math.round((itemsTargetTotal - distributedItemsTotal) * 100) / 100;
    if (difference !== 0 && mpItems.length > 0) {
      const lastItem = mpItems[mpItems.length - 1];
      const adjustedLastUnitPrice = Math.round((lastItem.unit_price + (difference / lastItem.quantity)) * 100) / 100;
      if (adjustedLastUnitPrice > 0) {
        lastItem.unit_price = adjustedLastUnitPrice;
      }
    }

    // Add shipping cost if applicable
    if (shipping > 0) {
      mpItems.push({
        id: 'shipping',
        title: 'Costo de Envío',
        quantity: 1,
        unit_price: parseFloat(shipping),
        currency_id: 'PEN'
      });
    }

    // 3. Setup redirection URLs and metadata
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    const backUrls = {
      success: `${frontendUrl}/checkout/success`,
      failure: `${frontendUrl}/checkout/failure`,
      pending: `${frontendUrl}/checkout/pending`
    };

    // Serialize payload inside external_reference for the webhook receiver
    const externalReferencePayload = {
      userId,
      address,
      promo_code,
      shipping_method
    };
    const external_reference = JSON.stringify(externalReferencePayload);
    
    const preferenceBody = {
      items: mpItems,
      payer: {
        email: req.user.email
      },
      back_urls: backUrls,
      external_reference,
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/webhook`
    };
    console.log('notification_url que se va a enviar:', preferenceBody.notification_url);
    // NOTE: auto_return will fail if success back_url contains localhost (it requires a public HTTPS url).
    // In production or ngrok development settings, we enable it to redirect the user back automatically.
    // Timer to return 5 seconds
    {/*if (frontendUrl.startsWith('https')) {
      preferenceBody.auto_return = 'approved';
    } */}

    if (!preferenceClient) {
      throw new Error('Mercado Pago SDK clients are not initialized.');
    }

    const preferenceResponse = await preferenceClient.create({ body: preferenceBody });

    res.json({
      init_point: preferenceResponse.init_point,
      preferenceId: preferenceResponse.id
    });
  } catch (err) {
    console.error('Error creating Mercado Pago preference:', err);
    res.status(500).json({ message: 'Error al crear la preferencia de pago.' });
  }
});

/**
 * POST /api/payments/webhook
 * Public endpoint consumed by Mercado Pago servers to verify and confirm payments asynchronously.
 */
router.post('/webhook', async (req, res) => {
  const secret = process.env.MP_WEBHOOK_SECRET;

  // 1. Validate signature using official algorithm if secret is defined
  {/*if (secret) {
    try {
      const xSignature = req.headers['x-signature'];
      const xRequestId = req.headers['x-request-id'];
      const dataId = req.query['data.id'] || (req.body && req.body.data && req.body.data.id);

      if (!xSignature || !xRequestId || !dataId) {
        console.warn('[Webhook] Missing verification headers or parameter ID.');
        return res.status(401).json({ message: 'Invalid webhook signature.' });
      }

      WebhookSignatureValidator.validate({
        xSignature,
        xRequestId,
        dataId,
        secret
      });
    } catch (err) {
      console.error('[Webhook] Signature validation failed:', err.message);
      return res.status(401).json({ message: 'Invalid webhook signature.' });
    }
  } else {
    console.warn('[Webhook] Warning: MP_WEBHOOK_SECRET is not configured. Skipping signature verification.');
  } */}

  // 2. Fetch full payment information on payment events
  const { type, data } = req.body;
  if (type === 'payment' && data && data.id) {
    const paymentId = data.id;
    try {
      if (!paymentClient) {
        throw new Error('Mercado Pago SDK clients are not initialized.');
      }

      const payment = await paymentClient.get({ id: paymentId });

      if (payment.status === 'approved') {
        const { external_reference, id: mpPaymentId } = payment;
        const { userId, address, promo_code, shipping_method } = JSON.parse(external_reference);

        // Prevent duplicate orders by checking if order already exists for this payment ID
        const existingOrder = await db.query('SELECT * FROM orders WHERE mp_payment_id = $1', [String(mpPaymentId)]);
        if (existingOrder.rows.length === 0) {
          await createOrderFromCart({
            userId,
            address,
            payment_method: 'mercado_pago',
            promo_code,
            shipping_method,
            payment_status: 'PAID',
            mp_payment_id: String(mpPaymentId)
          });
          console.log(`[Webhook] Order successfully created for payment ID: ${mpPaymentId}`);
        } else {
          console.log(`[Webhook] Order already exists for payment ID: ${mpPaymentId}, skipping creation.`);
        }
      } else {
        console.log(`[Webhook] Payment status is "${payment.status}" (Payment ID: ${paymentId}). Logged event.`);
      }
    } catch (err) {
      console.error('[Webhook] Error processing payment details:', err);
      // Always respond with 200 OK to Mercado Pago to stop retries, but log the error
    }
  }

  // Always respond with 200 OK to Mercado Pago immediately
  res.status(200).send('OK');
});

module.exports = router;