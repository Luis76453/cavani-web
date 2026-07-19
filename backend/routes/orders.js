const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/orders - Place a new order
router.post('/', authenticateToken, async (req, res) => {
  const { address, payment_method, promo_code } = req.body;
  const userId = req.user.id;

  if (!address || !payment_method) {
    return res.status(400).json({ message: 'La dirección de envío y el método de pago son obligatorios.' });
  }

  try {
    // 1. Get user cart
    const cartRes = await db.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (cartRes.rows.length === 0) {
      return res.status(400).json({ message: 'El carrito está vacío.' });
    }
    const cartId = cartRes.rows[0].id;

    const cartItemsRes = await db.query(
      `SELECT ci.quantity, pv.id as variant_id, pv.stock, p.price, p.name 
       FROM cart_items ci
       JOIN product_variants pv ON ci.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    if (cartItemsRes.rows.length === 0) {
      return res.status(400).json({ message: 'El carrito está vacío.' });
    }

    const items = cartItemsRes.rows;

    // 2. Validate stock for all items
    for (const item of items) {
      if (item.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Stock insuficiente para el producto "${item.name}". Solo quedan ${item.stock} unidades.` 
        });
      }
    }

    // 3. Save Address
    let addressId;
    if (address.id) {
      addressId = address.id;
    } else {
      // Validate address details
      const { address_line1, city, state, postal_code, country, phone } = address;
      if (!address_line1 || !city || !state || !postal_code || !country) {
        return res.status(400).json({ message: 'Complete todos los campos obligatorios de la dirección.' });
      }

      const addrResult = await db.query(
        `INSERT INTO addresses (user_id, address_line1, address_line2, city, state, postal_code, country, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [userId, address_line1, address.address_line2 || '', city, state, postal_code, country, phone || '']
      );
      addressId = addrResult.rows[0].id;
    }

    // 4. Calculate pricing
    let subtotal = 0;
    for (const item of items) {
      subtotal += parseFloat(item.price) * item.quantity;
    }

    // Apply promo code discount if valid
    let discount = 0;
    let promotionId = null;
    if (promo_code) {
      const promoRes = await db.query(
        `SELECT id, discount_type, discount_value 
         FROM promotions 
         WHERE code = $1 AND active = true AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())`,
        [promo_code.toUpperCase().trim()]
      );

      if (promoRes.rows.length > 0) {
        const promo = promoRes.rows[0];
        promotionId = promo.id;
        if (promo.discount_type === 'percentage') {
          discount = subtotal * (parseFloat(promo.discount_value) / 100);
        } else if (promo.discount_type === 'fixed') {
          discount = parseFloat(promo.discount_value);
        }
      }
    }

    const shippingCost = subtotal > 150 ? 0 : 9.99;
    const total = Math.max(0, subtotal - discount + shippingCost);

    // 5. Create Order
    const orderNumber = `CV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderRes = await db.query(
      `INSERT INTO orders (user_id, order_number, status, subtotal, shipping_cost, total, address_id, payment_status, payment_method, promotion_id)
       VALUES ($1, $2, 'PENDING', $3, $4, $5, $6, 'PENDING', $7, $8) RETURNING *`,
      [userId, orderNumber, subtotal, shippingCost, total, addressId, payment_method, promotionId]
    );
    const order = orderRes.rows[0];

    // 6. Create Order Items & Decrement Stock
    for (const item of items) {
      // Create order item
      await db.query(
        `INSERT INTO order_items (order_id, variant_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.variant_id, item.quantity, item.price]
      );

      // Decrement variant stock
      await db.query(
        `UPDATE product_variants SET stock = stock - $1 WHERE id = $2`,
        [item.quantity, item.variant_id]
      );
    }

    // 7. Clear User Cart
    await db.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);

    res.status(201).json({
      message: 'Pedido realizado con éxito.',
      order: {
        id: order.id,
        order_number: order.order_number,
        total: order.total,
        status: order.status
      }
    });

  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Error al procesar el pedido.' });
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
