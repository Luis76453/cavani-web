const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { calculateCartTotal, createOrderFromCart } = require('../services/orderService');
// POST /api/payments/process - Process Mercado Pago transaction
router.post('/process', authenticateToken, async (req, res) => {
  const { formData, address, promo_code, idempotency_key } = req.body;
  const userId = req.user.id;
  if (!formData) {
    return res.status(400).json({ message: 'Los datos del formulario de pago son requeridos.' });
  }
  if (!address) {
    return res.status(400).json({ message: 'La dirección de envío es requerida.' });
  }
  // 1. Recalculate transaction amount on the server (protection against price tampering)
  let cartTotalInfo;
  try {
    cartTotalInfo = await calculateCartTotal(userId, promo_code);
  } catch (err) {
    console.error('Error recalculating cart total:', err);
    return res.status(500).json({ message: 'Error interno al calcular el total de la compra.' });
  }
  const { total, items } = cartTotalInfo;
  if (items.length === 0) {
    return res.status(400).json({ message: 'El carrito está vacío.' });
  }
  // 2. Validate environment variables
  if (!process.env.MP_ACCESS_TOKEN) {
    console.error('CRITICAL: MP_ACCESS_TOKEN environment variable is not defined.');
    return res.status(500).json({ message: 'La pasarela de pagos no está configurada en el servidor.' });
  }
  // 3. Assemble Mercado Pago payload using recalculated amount
  console.log('formData recibido del frontend:', JSON.stringify(formData, null, 2));
  const mpPayload = {
    token: formData.token,
    issuer_id: formData.issuer_id,
    payment_method_id: formData.payment_method_id,
    transaction_amount: total,
    installments: formData.installments || 1,
    description: `Pedido caVani - ${items.length} artículo(s)`,
    payer: {
      email: req.user.email,
      identification: formData.payer?.identification
    }
  };
  console.log('formData recibido del frontend:', JSON.stringify(formData, null, 2));
  // 4. Request Mercado Pago Payments endpoint with timeout controls and idempotency header
  let mpResponse;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds request timeout
  const idempKey = idempotency_key || `idemp_${Date.now()}_${userId}`;
  console.log('mpPayload a enviar:', JSON.stringify(mpPayload, null, 2));
  console.log('typeof total:', typeof total, 'valor:', total);
  try {
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempKey
      },
      body: JSON.stringify(mpPayload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    //eliminar
    console.log('MP request-id:', response.headers.get('x-request-id'));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Mercado Pago API error response status:', response.status, data);
      
      let userMsg = 'La transacción fue rechazada por la pasarela de pagos.';
      
      if (response.status === 401) {
        userMsg = 'Error de autenticación con el procesador de pagos. Por favor, contacte al soporte técnico.';
      } else if (data.cause && data.cause[0] && data.cause[0].description) {
        userMsg = `Error en el pago: ${data.cause[0].description}`;
      } else if (data.message) {
        userMsg = `Error en el pago: ${data.message}`;
      }
      return res.status(response.status).json({ message: userMsg, details: data });
    }
    mpResponse = data;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Failed to communicate with Mercado Pago API:', err);
    
    if (err.name === 'AbortError') {
      return res.status(548).json({ 
        message: 'Tiempo de espera agotado al conectar con el procesador de pagos. Por favor, reintente.' 
      });
    }
    return res.status(502).json({ 
      message: 'No se pudo establecer comunicación con Mercado Pago. Verifique su conexión y reintente.' 
    });
  }
  // 5. Inspect returned status
  const { status, id: mpPaymentId, status_detail } = mpResponse;
  try {
    // 6. Idempotency Check: check if order is already created for this transaction ID
    const existingOrder = await db.query('SELECT * FROM orders WHERE mp_payment_id = $1', [String(mpPaymentId)]);
    if (existingOrder.rows.length > 0) {
      return res.status(200).json({
        message: 'El pago ya fue aprobado previamente y su pedido está registrado.',
        order: existingOrder.rows[0],
        status: 'approved'
      });
    }
    // 7. If approved, create order in database
    if (status === 'approved') {
      const order = await createOrderFromCart({
        userId,
        address,
        payment_method: formData.payment_method_id || 'credit_card',
        promo_code,
        payment_status: 'PAID',
        mp_payment_id: String(mpPaymentId)
      });
      return res.status(201).json({
        message: 'Pago aprobado y pedido procesado con éxito.',
        order,
        status
      });
    } else {
      // Payment failed or is pending review
      let message = 'El pago no pudo ser procesado.';
      
      if (status === 'in_process') {
        message = 'Su pago está bajo revisión por políticas de prevención de fraude de Mercado Pago. El pedido se completará cuando sea aprobado.';
      } else if (status === 'rejected') {
        message = `El pago fue rechazado (${status_detail || 'Tarjeta declinada'}). Por favor, reintente con otra tarjeta o método de pago.`;
      }
      return res.status(400).json({
        message,
        status,
        status_detail
      });
    }
  } catch (dbErr) {
    console.error('Error handling payment response database integration:', dbErr);
    
    if (status === 'approved') {
      return res.status(500).json({
        message: `Su pago de Mercado Pago fue cobrado exitosamente (ID: ${mpPaymentId}), pero ocurrió un error al registrar el pedido en el servidor de la tienda. Por favor contacte a soporte@cavani.com para registrar su pedido de inmediato.`,
        mp_payment_id: mpPaymentId,
        status: 'approved',
        critical_error: true
      });
    }
    return res.status(500).json({ message: 'Error interno de base de datos al procesar el pago.' });
  }
});
module.exports = router;