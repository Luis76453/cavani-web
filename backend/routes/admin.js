const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Protect all routes here with Admin check
router.use(authenticateToken);
router.use(requireAdmin);

// GET /api/admin/dashboard - Metrics
router.get('/dashboard', async (req, res) => {
  try {
    // 1. Total Sales (excluding CANCELLED orders)
    const salesRes = await db.query(
      `SELECT SUM(total) as total_sales FROM orders WHERE status != 'CANCELLED'`
    );
    const totalSales = parseFloat(salesRes.rows[0].total_sales || 0);

    // 2. Total Orders count
    const ordersRes = await db.query('SELECT COUNT(*) as total_orders FROM orders');
    const totalOrders = parseInt(ordersRes.rows[0].total_orders || 0);

    // 3. Total Customers count
    const customersRes = await db.query('SELECT COUNT(*) as total_customers FROM users WHERE role_id = 2');
    const totalCustomers = parseInt(customersRes.rows[0].total_customers || 0);

    // 4. Total Products count
    const productsRes = await db.query('SELECT COUNT(*) as total_products FROM products');
    const totalProducts = parseInt(productsRes.rows[0].total_products || 0);

    // 5. Low Stock variants (less than 15)
    const lowStockRes = await db.query(
      `SELECT pv.id, pv.sku, pv.stock, p.name as product_name, c.name as color_name, s.name as size_name
       FROM product_variants pv
       JOIN products p ON pv.product_id = p.id
       JOIN colors c ON pv.color_id = c.id
       JOIN sizes s ON pv.size_id = s.id
       WHERE pv.stock < 15
       ORDER BY pv.stock ASC
       LIMIT 10`
    );

    // 6. Best selling products
    const bestSellersRes = await db.query(
      `SELECT p.id, p.name, p.price, SUM(oi.quantity) as units_sold,
              (SELECT image_url FROM product_images WHERE product_id = p.id AND is_featured = true LIMIT 1) as image_url
       FROM order_items oi
       JOIN product_variants pv ON oi.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       JOIN orders o ON oi.order_id = o.id
       WHERE o.status != 'CANCELLED'
       GROUP BY p.id, p.name, p.price
       ORDER BY units_sold DESC
       LIMIT 5`
    );

    // 7. Recent Orders
    const recentOrdersRes = await db.query(
      `SELECT o.id, o.order_number, o.total, o.status, o.created_at, u.first_name, u.last_name, u.email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC
       LIMIT 10`
    );

    res.json({
      metrics: {
        totalSales,
        totalOrders,
        totalCustomers,
        totalProducts
      },
      lowStock: lowStockRes.rows,
      bestSellers: bestSellersRes.rows,
      recentOrders: recentOrdersRes.rows
    });

  } catch (err) {
    console.error('Fetch dashboard metrics error:', err);
    res.status(500).json({ message: 'Error al obtener métricas de administración.' });
  }
});

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.created_at, r.name as role 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener usuarios.' });
  }
});

// GET /api/admin/orders - Get all orders (Lightweight summary for table listing)
router.get('/orders', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.id, o.user_id, o.order_number, o.status, o.subtotal, o.shipping_cost, o.total,
              o.payment_status, o.payment_method, o.mp_payment_id, o.shipping_method,
              o.guest_email, o.guest_first_name, o.guest_last_name, o.guest_phone,
              o.shipping_city, o.shipping_state, o.shipping_address_line1,
              o.created_at,
              u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name,
              a.address_line1 as addr_line1, a.city as addr_city, a.state as addr_state, a.phone as addr_phone,
              (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_items
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN addresses a ON o.address_id = a.id
       ORDER BY o.created_at DESC`
    );
    res.json({ orders: result.rows });
  } catch (err) {
    console.error('Fetch admin orders list error:', err);
    res.status(500).json({ message: 'Error al obtener pedidos.' });
  }
});

// GET /api/admin/orders/:id - Get complete order detail with product items and images (On-Demand / Lazy Loading)
router.get('/orders/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Get complete order metadata
    const orderRes = await db.query(
      `SELECT o.*,
              u.email as user_email, u.first_name as user_first_name, u.last_name as user_last_name, u.phone as user_phone,
              a.address_line1 as db_address_line1, a.address_line2 as db_address_line2, 
              a.city as db_city, a.state as db_state, a.postal_code as db_postal_code, 
              a.country as db_country, a.phone as db_phone,
              p.code as promo_code, p.discount_type as promo_discount_type, p.discount_value as promo_discount_value
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN addresses a ON o.address_id = a.id
       LEFT JOIN promotions p ON o.promotion_id = p.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    const order = orderRes.rows[0];

    // 2. Get order items with variant, product, and thumbnail details
    const itemsRes = await db.query(
      `SELECT oi.id, oi.quantity, oi.price, (oi.price * oi.quantity) as item_subtotal,
              pv.sku, pv.stock as current_stock,
              p.id as product_id, p.name as product_name, p.slug as product_slug,
              c.name as color_name, c.hex_code as color_hex,
              s.name as size_name,
              COALESCE(
                (SELECT image_url FROM product_images WHERE product_id = p.id AND color_id = pv.color_id LIMIT 1),
                (SELECT image_url FROM product_images WHERE product_id = p.id AND is_featured = true LIMIT 1),
                (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1)
              ) as image_url
       FROM order_items oi
       LEFT JOIN product_variants pv ON oi.variant_id = pv.id
       LEFT JOIN products p ON pv.product_id = p.id
       LEFT JOIN colors c ON pv.color_id = c.id
       LEFT JOIN sizes s ON pv.size_id = s.id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    order.items = itemsRes.rows;

    res.json({ order });
  } catch (err) {
    console.error('Fetch admin order detail error:', err);
    res.status(500).json({ message: 'Error al obtener el detalle del pedido.' });
  }
});

// PUT /api/admin/orders/:id/status - Update order status
router.put('/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!status || !validStatuses.includes(status.toUpperCase())) {
    return res.status(400).json({ message: 'Estado del pedido inválido.' });
  }

  try {
    const result = await db.query(
      `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
      [status.toUpperCase(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Pedido no encontrado.' });
    }

    res.json({ message: 'Estado del pedido actualizado.', order: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar el estado del pedido.' });
  }
});

// GET /api/admin/categories - Get all categories (Admin)
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY name');
    res.json({ categories: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener categorías.' });
  }
});

// POST /api/admin/categories - Create a category (Admin)
router.post('/categories', async (req, res) => {
  const { name, description, image_url, active } = req.body;
  if (!name) return res.status(400).json({ message: 'El nombre es requerido.' });
  const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  const isActive = active !== undefined ? !!active : true;

  try {
    const result = await db.query(
      'INSERT INTO categories (name, slug, description, image_url, active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, slug, description || '', image_url || '', isActive]
    );
    res.status(201).json({ category: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear la categoría.' });
  }
});

// PUT /api/admin/categories/:id - Update a category (Admin)
router.put('/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, image_url, active } = req.body;

  try {
    const check = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Categoría no encontrada.' });
    }
    const current = check.rows[0];
    const newName = name || current.name;
    const newSlug = name ? name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : current.slug;
    const newDesc = description !== undefined ? description : current.description;
    const newImg = image_url !== undefined ? image_url : current.image_url;
    const newActive = active !== undefined ? !!active : current.active;

    const result = await db.query(
      `UPDATE categories 
       SET name = $1, slug = $2, description = $3, image_url = $4, active = $5 
       WHERE id = $6 RETURNING *`,
      [newName, newSlug, newDesc, newImg, newActive, id]
    );
    res.json({ category: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar la categoría.' });
  }
});

// GET /api/admin/collections - Get all collections (Admin)
router.get('/collections', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM collections ORDER BY name');
    res.json({ collections: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener colecciones.' });
  }
});

// POST /api/admin/collections - Create a collection (Admin)
router.post('/collections', async (req, res) => {
  const { name, description, image_url, active } = req.body;
  if (!name) return res.status(400).json({ message: 'El nombre es requerido.' });
  const slug = name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  const isActive = active !== undefined ? !!active : true;

  try {
    const result = await db.query(
      'INSERT INTO collections (name, slug, description, image_url, active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, slug, description || '', image_url || '', isActive]
    );
    res.status(201).json({ collection: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al crear la colección.' });
  }
});

// PUT /api/admin/collections/:id - Update a collection (Admin)
router.put('/collections/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, image_url, active } = req.body;

  try {
    const check = await db.query('SELECT * FROM collections WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Colección no encontrada.' });
    }
    const current = check.rows[0];
    const newName = name || current.name;
    const newSlug = name ? name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') : current.slug;
    const newDesc = description !== undefined ? description : current.description;
    const newImg = image_url !== undefined ? image_url : current.image_url;
    const newActive = active !== undefined ? !!active : current.active;

    const result = await db.query(
      `UPDATE collections 
       SET name = $1, slug = $2, description = $3, image_url = $4, active = $5 
       WHERE id = $6 RETURNING *`,
      [newName, newSlug, newDesc, newImg, newActive, id]
    );
    res.json({ collection: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al actualizar la colección.' });
  }
});

// GET /api/admin/promotions - Get all coupons (Admin)
router.get('/promotions', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM promotions ORDER BY id DESC');
    res.json({ promotions: result.rows });
  } catch (err) {
    console.error('Error fetching promotions:', err);
    res.status(500).json({ message: 'Error al obtener los cupones.' });
  }
});

// POST /api/admin/promotions - Create a new coupon (Admin)
router.post('/promotions', async (req, res) => {
  const { code, description, discount_type, discount_value, start_date, end_date, active } = req.body;

  if (!code || !discount_type || discount_value === undefined) {
    return res.status(400).json({ message: 'Código, tipo de descuento y valor son requeridos.' });
  }

  const cleanCode = code.toUpperCase().trim();
  const isActive = active !== undefined ? !!active : true;

  try {
    const result = await db.query(
      `INSERT INTO promotions (code, description, discount_type, discount_value, start_date, end_date, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [cleanCode, description || '', discount_type, parseFloat(discount_value), start_date || null, end_date || null, isActive]
    );
    res.status(201).json({ promotion: result.rows[0] });
  } catch (err) {
    console.error('Error creating promotion:', err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un cupón con ese código.' });
    }
    res.status(500).json({ message: 'Error al crear el cupón.' });
  }
});

// PUT /api/admin/promotions/:id - Update a coupon (Admin)
router.put('/promotions/:id', async (req, res) => {
  const { id } = req.params;
  const { code, description, discount_type, discount_value, start_date, end_date, active } = req.body;

  try {
    const check = await db.query('SELECT * FROM promotions WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Cupón no encontrado.' });
    }
    const current = check.rows[0];
    const newCode = code ? code.toUpperCase().trim() : current.code;
    const newDesc = description !== undefined ? description : current.description;
    const newType = discount_type || current.discount_type;
    const newVal = discount_value !== undefined ? parseFloat(discount_value) : current.discount_value;
    const newStart = start_date !== undefined ? start_date : current.start_date;
    const newEnd = end_date !== undefined ? end_date : current.end_date;
    const newActive = active !== undefined ? !!active : current.active;

    const result = await db.query(
      `UPDATE promotions 
       SET code = $1, description = $2, discount_type = $3, discount_value = $4, start_date = $5, end_date = $6, active = $7
       WHERE id = $8 RETURNING *`,
      [newCode, newDesc, newType, newVal, newStart || null, newEnd || null, newActive, id]
    );
    res.json({ promotion: result.rows[0] });
  } catch (err) {
    console.error('Error updating promotion:', err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Ya existe otro cupón con ese código.' });
    }
    res.status(500).json({ message: 'Error al actualizar el cupón.' });
  }
});

// DELETE /api/admin/promotions/:id - Delete a coupon (Admin)
router.delete('/promotions/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM promotions WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Cupón no encontrado.' });
    }
    res.json({ message: 'Cupón eliminado correctamente.', id });
  } catch (err) {
    console.error('Error deleting promotion:', err);
    res.status(500).json({ message: 'Error al eliminar el cupón.' });
  }
});

// ==========================================
// 8. COLOR MANAGEMENT (ADMIN)
// ==========================================

// Helper to validate and format HEX color
const formatHexColor = (hex) => {
  if (!hex || typeof hex !== 'string') return null;
  let clean = hex.trim();
  if (!clean.startsWith('#')) {
    clean = '#' + clean;
  }
  if (!/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(clean)) {
    return null;
  }
  return clean.toUpperCase();
};

// GET /api/admin/colors - Get all colors with variant usage count
router.get('/colors', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.hex_code, c.active,
              COUNT(DISTINCT pv.id) as variants_count,
              COUNT(DISTINCT pi.id) as images_count
       FROM colors c
       LEFT JOIN product_variants pv ON c.id = pv.color_id
       LEFT JOIN product_images pi ON c.id = pi.color_id
       GROUP BY c.id, c.name, c.hex_code, c.active
       ORDER BY c.active DESC, c.name ASC`
    );
    res.json({ colors: result.rows });
  } catch (err) {
    console.error('Error fetching admin colors:', err);
    res.status(500).json({ message: 'Error al obtener colores.' });
  }
});

// POST /api/admin/colors - Create a new color
router.post('/colors', async (req, res) => {
  const { name, hex_code, active } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'El nombre del color es obligatorio.' });
  }

  const cleanHex = formatHexColor(hex_code);
  if (!cleanHex) {
    return res.status(400).json({ message: 'El código hexadecimal no es válido (ej: #0A142F).' });
  }

  const cleanName = name.trim();
  const isActive = active !== undefined ? !!active : true;

  try {
    // Check duplicates by name or hex
    const dupCheck = await db.query(
      `SELECT id, name, hex_code FROM colors 
       WHERE LOWER(name) = LOWER($1) OR UPPER(hex_code) = UPPER($2)`,
      [cleanName, cleanHex]
    );

    if (dupCheck.rows.length > 0) {
      const match = dupCheck.rows[0];
      if (match.name.toLowerCase() === cleanName.toLowerCase()) {
        return res.status(400).json({ message: `Ya existe un color con el nombre "${cleanName}".` });
      }
      return res.status(400).json({ message: `Ya existe un color con el código hexadecimal "${cleanHex}" (${match.name}).` });
    }

    const result = await db.query(
      `INSERT INTO colors (name, hex_code, active)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [cleanName, cleanHex, isActive]
    );

    res.status(201).json({ color: result.rows[0] });
  } catch (err) {
    console.error('Error creating color:', err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Ya existe un color con ese nombre o código hexadecimal.' });
    }
    res.status(500).json({ message: 'Error al crear el color.' });
  }
});

// PUT /api/admin/colors/:id - Update a color
router.put('/colors/:id', async (req, res) => {
  const { id } = req.params;
  const { name, hex_code, active } = req.body;

  try {
    const check = await db.query('SELECT * FROM colors WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Color no encontrado.' });
    }
    const current = check.rows[0];

    const cleanName = name ? name.trim() : current.name;
    const cleanHex = hex_code ? formatHexColor(hex_code) : current.hex_code;
    if (!cleanHex) {
      return res.status(400).json({ message: 'El código hexadecimal no es válido.' });
    }
    const isActive = active !== undefined ? !!active : current.active;

    // Check duplicates against other colors
    const dupCheck = await db.query(
      `SELECT id, name, hex_code FROM colors 
       WHERE (LOWER(name) = LOWER($1) OR UPPER(hex_code) = UPPER($2)) AND id != $3`,
      [cleanName, cleanHex, id]
    );

    if (dupCheck.rows.length > 0) {
      const match = dupCheck.rows[0];
      if (match.name.toLowerCase() === cleanName.toLowerCase()) {
        return res.status(400).json({ message: `Ya existe otro color con el nombre "${cleanName}".` });
      }
      return res.status(400).json({ message: `Ya existe otro color con el código hexadecimal "${cleanHex}" (${match.name}).` });
    }

    const result = await db.query(
      `UPDATE colors 
       SET name = $1, hex_code = $2, active = $3
       WHERE id = $4
       RETURNING *`,
      [cleanName, cleanHex, isActive, id]
    );

    res.json({ color: result.rows[0] });
  } catch (err) {
    console.error('Error updating color:', err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Ya existe otro color con ese nombre o código hexadecimal.' });
    }
    res.status(500).json({ message: 'Error al actualizar el color.' });
  }
});

// PUT /api/admin/colors/:id/status - Toggle active/inactive
router.put('/colors/:id/status', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  try {
    const result = await db.query(
      `UPDATE colors SET active = $1 WHERE id = $2 RETURNING *`,
      [!!active, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Color no encontrado.' });
    }
    res.json({ color: result.rows[0] });
  } catch (err) {
    console.error('Error updating color status:', err);
    res.status(500).json({ message: 'Error al cambiar estado del color.' });
  }
});

// DELETE /api/admin/colors/:id - Delete a color if not in use
router.delete('/colors/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if color is in use by variants or images
    const usageRes = await db.query(
      `SELECT 
        (SELECT COUNT(*) FROM product_variants WHERE color_id = $1) as variants_count,
        (SELECT COUNT(*) FROM product_images WHERE color_id = $1) as images_count`,
      [id]
    );

    const variantsCount = parseInt(usageRes.rows[0]?.variants_count || 0);
    const imagesCount = parseInt(usageRes.rows[0]?.images_count || 0);

    if (variantsCount > 0 || imagesCount > 0) {
      return res.status(400).json({
        message: `No se puede eliminar este color porque está asignado a ${variantsCount} variante(s) y ${imagesCount} imagen(es) de productos. Te recomendamos desactivarlo en su lugar.`
      });
    }

    const result = await db.query('DELETE FROM colors WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Color no encontrado.' });
    }

    res.json({ message: 'Color eliminado correctamente.', id });
  } catch (err) {
    console.error('Error deleting color:', err);
    res.status(500).json({ message: 'Error al eliminar el color.' });
  }
});

module.exports = router;
