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
       LEFT JOIN colors c ON pv.color_id = c.id
       LEFT JOIN sizes s ON pv.size_id = s.id
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
       LEFT JOIN colors c ON pv.color_id = c.id
       LEFT JOIN sizes s ON pv.size_id = s.id
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

const { authenticateToken } = require('../middleware/auth');

// POST /api/cart/merge - Merge guest cart with authenticated user's cart
router.post('/merge', authenticateToken, async (req, res) => {
  const { session_id } = req.body;
  const userId = req.user.id;

  if (!session_id) {
    return res.status(400).json({ message: 'Se requiere el session_id para realizar la fusión del carrito.' });
  }

  try {
    // 1. Get guest cart ID
    const guestCartRes = await db.query('SELECT id FROM carts WHERE session_id = $1', [session_id]);
    if (guestCartRes.rows.length === 0) {
      return res.json({ message: 'No se encontró carrito de invitado, fusión omitida.' });
    }
    const guestCartId = guestCartRes.rows[0].id;

    // 2. Get guest cart items
    const guestItemsRes = await db.query('SELECT * FROM cart_items WHERE cart_id = $1', [guestCartId]);
    const guestItems = guestItemsRes.rows;
    if (guestItems.length === 0) {
      // Delete empty guest cart to keep DB clean
      await db.query('DELETE FROM carts WHERE id = $1', [guestCartId]);
      return res.json({ message: 'El carrito de invitado estaba vacío, fusión omitida.' });
    }

    // 3. Get or create user cart ID
    let userCartId;
    const userCartRes = await db.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
    if (userCartRes.rows.length > 0) {
      userCartId = userCartRes.rows[0].id;
    } else {
      const newUserCart = await db.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [userId]);
      userCartId = newUserCart.rows[0].id;
    }

    const warnings = [];

    // 4. Merge each item
    for (const item of guestItems) {
      // Validate variant exists and check stock limits
      const variantRes = await db.query(
        `SELECT pv.stock, p.name 
         FROM product_variants pv 
         JOIN products p ON pv.product_id = p.id 
         WHERE pv.id = $1`,
        [item.variant_id]
      );
      if (variantRes.rows.length === 0) continue;
      const { stock, name } = variantRes.rows[0];

      // Check if product already in user cart
      const userItemRes = await db.query(
        'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND variant_id = $2',
        [userCartId, item.variant_id]
      );

      if (userItemRes.rows.length > 0) {
        // Update existing item
        const existingQty = userItemRes.rows[0].quantity;
        const targetQty = existingQty + item.quantity;
        let finalQty = targetQty;

        if (targetQty > stock) {
          finalQty = stock;
          const cappedUnits = stock - existingQty;
          if (cappedUnits > 0) {
            warnings.push(`Solo se pudieron sumar ${cappedUnits} unidades de "${name}" debido al límite de stock disponible.`);
          } else {
            warnings.push(`No se agregaron más unidades de "${name}" porque ya tienes el stock máximo disponible en tu carrito.`);
          }
        }

        await db.query(
          'UPDATE cart_items SET quantity = $1 WHERE id = $2',
          [finalQty, userItemRes.rows[0].id]
        );
      } else {
        // Insert new item
        let finalQty = item.quantity;
        if (item.quantity > stock) {
          finalQty = stock;
          warnings.push(`Solo se agregaron ${stock} unidades de "${name}" debido al límite de stock disponible.`);
        }
        
        if (finalQty > 0) {
          await db.query(
            'INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES ($1, $2, $3)',
            [userCartId, item.variant_id, finalQty]
          );
        }
      }
    }

    // 5. Clean up guest cart data
    await db.query('DELETE FROM cart_items WHERE cart_id = $1', [guestCartId]);
    await db.query('DELETE FROM carts WHERE id = $1', [guestCartId]);

    res.json({
      message: 'Fusión de carritos completada.',
      warnings: warnings.length > 0 ? warnings : null
    });

  } catch (err) {
    console.error('Cart merge error:', err);
    res.status(500).json({ message: 'Error interno al fusionar carritos.' });
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
