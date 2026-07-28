const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const { createOrderFromCart } = require('../services/orderService');

// POST /api/orders - Place a new order
router.post('/', authenticateToken, async (req, res) => {
  const { address, payment_method, promo_code } = req.body;
  const userId = req.user.id;

  try {
    const order = await createOrderFromCart({
      userId,
      address,
      payment_method,
      promo_code,
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
       JOIN colors c ON pv.color_id = c.id
       JOIN sizes s ON pv.size_id = s.id
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

module.exports = router;
