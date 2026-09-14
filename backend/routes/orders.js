const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, optionalAuthenticate } = require('../middleware/auth');
const { sendOrderConfirmationEmail } = require('../services/emailService');

const { createOrderFromCart } = require('../services/orderService');

// POST /api/orders - Place a new order (Supports both logged-in users and guest checkout)
router.post('/', optionalAuthenticate, async (req, res) => {
  const { address, payment_method, promo_code, shipping_method, guestInfo, session_id } = req.body;
  const userId = req.user ? req.user.id : null;

  try {
    const order = await createOrderFromCart({
      userId,
      guestInfo,
      sessionId: session_id,
      address,
      payment_method,
      promo_code,
      shipping_method,
      payment_status: 'PENDING'
    });

    res.status(201).json({
      message: 'Pedido realizado con éxito.',
      order
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(400).json({ message: err.message || 'Error al procesar el pedido.' });
  }
});

// GET /api/orders - Get user order history
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*, 
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_items
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({ orders: result.rows });
  } catch (err) {
    console.error('Fetch user orders error:', err);
    res.status(500).json({ message: 'Error al obtener historial de pedidos.' });
  }
});

// GET /api/orders/:id - Get specific order details
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Get order metadata
    const orderRes = await db.query(
      `SELECT o.*,
              a.address_line1, a.address_line2, a.city, a.state, a.postal_code, a.country, a.phone as shipping_phone,
              p.code as promo_code
       FROM orders o
       LEFT JOIN addresses a ON o.address_id = a.id
       LEFT JOIN promotions p ON o.promotion_id = p.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [id, req.user.id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    const order = orderRes.rows[0];

    // 2. Get order items
    const itemsRes = await db.query(
      `SELECT oi.quantity, oi.price,
              pv.sku,
              p.name as product_name, p.slug as product_slug,
              c.name as color_name, s.name as size_name,
              (SELECT image_url FROM product_images WHERE product_id = p.id AND is_featured = true LIMIT 1) as image_url
       FROM order_items oi
       JOIN product_variants pv ON oi.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       LEFT JOIN colors c ON pv.color_id = c.id
       LEFT JOIN sizes s ON pv.size_id = s.id
       WHERE oi.order_id = $1`,
      [order.id]
    );
    order.items = itemsRes.rows;

    res.json({ order });
  } catch (err) {
    console.error('Fetch order detail error:', err);
    res.status(500).json({ message: 'Error al obtener detalle del pedido.' });
  }
});

// GET /api/orders/payment/:paymentId - Fetch order metadata by payment_id (Supports both logged-in users and guests)
router.get('/payment/:paymentId', optionalAuthenticate, async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user ? req.user.id : null;
  try {
    let result;
    if (userId) {
      result = await db.query(
        `SELECT o.id, o.order_number, o.total, o.shipping_method, o.status, o.guest_email
         FROM orders o
         WHERE o.mp_payment_id = $1 AND o.user_id = $2`,
        [paymentId, userId]
      );
    } else {
      result = await db.query(
        `SELECT o.id, o.order_number, o.total, o.shipping_method, o.status, o.guest_email
         FROM orders o
         WHERE o.mp_payment_id = $1`,
        [paymentId]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }
    res.json({ order: result.rows[0] });
  } catch (err) {
    console.error('Fetch order by payment ID error:', err);
    res.status(500).json({ message: 'Error al obtener el pedido.' });
  }
});

module.exports = router;
