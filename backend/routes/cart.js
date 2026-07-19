const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Helper middleware to optionally authenticate the user but not block if anonymous
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'cavani_editorial_medical_secret_2026_jwt', (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
}

// Helper to get or create cart ID based on user_id or session_id
async function getOrCreateCart(userId, sessionId) {
  if (userId) {
    // Check if user cart exists
    let cartRes = await db.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (cartRes.rows.length > 0) {
      return cartRes.rows[0].id;
    }
    // Create new cart
    const newCart = await db.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
    return newCart.rows[0].id;
  } else if (sessionId) {
    // Check if session cart exists
    let cartRes = await db.query('SELECT id FROM carts WHERE session_id = $1', [sessionId]);
    if (cartRes.rows.length > 0) {
      return cartRes.rows[0].id;
    }
    // Create new cart
    const newCart = await db.query('INSERT INTO carts (session_id) VALUES ($1) RETURNING id', [sessionId]);
    return newCart.rows[0].id;
  }
  throw new Error('Either user_id or session_id must be provided to create a cart.');
}

// GET /api/cart - Get active cart and items
router.get('/', optionalAuthenticate, async (req, res) => {
  const sessionId = req.query.session_id;
  const userId = req.user ? req.user.id : null;

  if (!userId && !sessionId) {
    return res.json({ items: [] });
  }

  try {
    const cartId = await getOrCreateCart(userId, sessionId);

    const itemsRes = await db.query(
      `SELECT ci.id, ci.quantity,
              pv.id as variant_id, pv.sku, pv.stock,
              p.id as product_id, p.name, p.price, p.compare_at_price, p.slug,
              c.name as color_name, c.hex_code as color_hex,
              s.name as size_name,
              (SELECT image_url FROM product_images WHERE product_id = p.id AND is_featured = true LIMIT 1) as image_url
       FROM cart_items ci
       JOIN product_variants pv ON ci.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       JOIN colors c ON pv.color_id = c.id
       JOIN sizes s ON pv.size_id = s.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    res.json({ cart_id: cartId, items: itemsRes.rows });
  } catch (err) {
    console.error('Fetch cart error:', err);
    res.status(500).json({ message: 'Error al obtener el carrito.' });
  }
});

// POST /api/cart/items - Add item to cart
router.post('/items', optionalAuthenticate, async (req, res) => {
  const { variant_id, quantity, session_id } = req.body;
  const userId = req.user ? req.user.id : null;

  if (!variant_id || !quantity) {
    return res.status(400).json({ message: 'Debe especificar variant_id y cantidad.' });
  }

  try {
    // Validate variant exists and has stock
    const variantRes = await db.query('SELECT stock FROM product_variants WHERE id = $1', [variant_id]);
    if (variantRes.rows.length === 0) {
      return res.status(404).json({ message: 'Variante de producto no encontrada.' });
    }

    if (variantRes.rows[0].stock < quantity) {
      return res.status(400).json({ message: 'Stock insuficiente para la cantidad solicitada.' });
    }

    const cartId = await getOrCreateCart(userId, session_id);

    // Check if item already in cart
    const itemExistRes = await db.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2',
      [cartId, variant_id]
    );

    if (itemExistRes.rows.length > 0) {
      // Update quantity
      const newQty = itemExistRes.rows[0].quantity + quantity;
      
      if (variantRes.rows[0].stock < newQty) {
        return res.status(400).json({ message: 'El stock disponible no permite agregar esa cantidad.' });
      }

      await db.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2',
        [newQty, itemExistRes.rows[0].id]
      );
    } else {
      // Insert item
      await db.query(
        'INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES ($1, $2, $3)',
        [cartId, variant_id, quantity]
      );
    }

    // Return the updated cart items
    const itemsRes = await db.query(
      `SELECT ci.id, ci.quantity, pv.id as variant_id, p.name, p.price,
              c.name as color_name, s.name as size_name
       FROM cart_items ci
       JOIN product_variants pv ON ci.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       JOIN colors c ON pv.color_id = c.id
       JOIN sizes s ON pv.size_id = s.id
       WHERE ci.cart_id = $1`,
      [cartId]
    );

    res.status(201).json({ message: 'Producto agregado al carrito.', items: itemsRes.rows });
  } catch (err) {
    console.error('Add cart item error:', err);
    res.status(500).json({ message: 'Error al agregar producto al carrito.' });
  }
});

// PUT /api/cart/items/:id - Update item quantity
router.put('/items/:id', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Cantidad inválida.' });
  }

  try {
    // Check variant stock
    const itemRes = await db.query(
      `SELECT ci.id, pv.stock 
       FROM cart_items ci
       JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.id = $1`,
      [id]
    );

    if (itemRes.rows.length === 0) {
      return res.status(404).json({ message: 'Elemento del carrito no encontrado.' });
    }

    if (itemRes.rows[0].stock < quantity) {
      return res.status(400).json({ message: 'No hay suficiente stock disponible.' });
    }

    await db.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [quantity, id]);
    res.json({ message: 'Cantidad actualizada correctamente.' });
  } catch (err) {
    console.error('Update cart item error:', err);
    res.status(500).json({ message: 'Error al actualizar el carrito.' });
  }
});

// DELETE /api/cart/items/:id - Remove item from cart
router.delete('/items/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM cart_items WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Elemento del carrito no encontrado.' });
    }
    res.json({ message: 'Producto eliminado del carrito correctamente.', id });
  } catch (err) {
    console.error('Delete cart item error:', err);
    res.status(500).json({ message: 'Error al eliminar producto del carrito.' });
  }
});

module.exports = router;
