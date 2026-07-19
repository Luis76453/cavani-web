const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// GET /api/products - Get all products with filters
router.get('/', async (req, res) => {
  const { category, collection, search } = req.query;
  let queryStr = `
    SELECT p.*, c.name as category_name, col.name as collection_name,
           (SELECT image_url FROM product_images WHERE product_id = p.id AND is_featured = true LIMIT 1) as image_url
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN collections col ON p.collection_id = col.id
    WHERE p.status = 'active'
  `;
  const params = [];

  if (category) {
    params.push(category);
    queryStr += ` AND c.slug = $${params.length}`;
  }

  if (collection) {
    params.push(collection);
    queryStr += ` AND col.slug = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    queryStr += ` AND (p.name LIKE $${params.length} OR p.description LIKE $${params.length})`;
  }

  queryStr += ` ORDER BY p.created_at DESC`;

  try {
    const result = await db.query(queryStr, params);
    res.json({ products: result.rows });
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
});

// GET /api/products/categories - Get all categories
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories ORDER BY name');
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ message: 'Error al obtener categorías.' });
  }
});

// GET /api/products/collections - Get all collections
router.get('/collections', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM collections ORDER BY name');
    res.json({ collections: result.rows });
  } catch (err) {
    console.error('Fetch collections error:', err);
    res.status(500).json({ message: 'Error al obtener colecciones.' });
  }
});

// GET /api/products/colors - Get all colors
router.get('/colors', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM colors ORDER BY name');
    res.json({ colors: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener colores.' });
  }
});

// GET /api/products/sizes - Get all sizes
router.get('/sizes', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM sizes');
    res.json({ sizes: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error al obtener tallas.' });
  }
});

// GET /api/products/:id - Get single product detail with variants and images
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const isNumeric = /^\d+$/.test(id);

  try {
    // 1. Get product base details
    let prodQuery = `
      SELECT p.*, c.name as category_name, col.name as collection_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN collections col ON p.collection_id = col.id
    `;
    if (isNumeric) {
      prodQuery += ` WHERE p.id = $1`;
    } else {
      prodQuery += ` WHERE p.slug = $1`;
    }

    const prodResult = await db.query(prodQuery, [id]);
    if (prodResult.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    const product = prodResult.rows[0];

    // parse features array if it's text
    if (typeof product.features === 'string') {
      try {
        product.features = JSON.parse(product.features);
      } catch (e) {
        // Fallback to splitting by comma if raw text
        product.features = product.features.split(',').map(f => f.trim().replace(/[\[\]"']/g, ''));
      }
    }

    // 2. Get product images
    const imagesResult = await db.query(
      'SELECT id, image_url, is_featured, display_order FROM product_images WHERE product_id = $1 ORDER BY display_order',
      [product.id]
    );
    product.images = imagesResult.rows;

    // 3. Get variants with color and size info
    const variantsResult = await db.query(
      `SELECT pv.id, pv.sku, pv.stock,
              c.id as color_id, c.name as color_name, c.hex_code as color_hex,
              s.id as size_id, s.name as size_name
       FROM product_variants pv
       JOIN colors c ON pv.color_id = c.id
       JOIN sizes s ON pv.size_id = s.id
       WHERE pv.product_id = $1`,
      [product.id]
    );
    product.variants = variantsResult.rows;

    res.json({ product });
  } catch (err) {
    console.error('Fetch product detail error:', err);
    res.status(500).json({ message: 'Error al obtener detalle del producto.' });
  }
});

// POST /api/products - Create a new product (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { name, slug, description, price, compare_at_price, sku, category_id, collection_id, material, features, status } = req.body;

  if (!name || !slug || !price || !sku) {
    return res.status(400).json({ message: 'Nombre, slug, precio y SKU son obligatorios.' });
  }

  try {
    const featStr = Array.isArray(features) ? JSON.stringify(features) : (features || '[]');
    const result = await db.query(
      `INSERT INTO products (name, slug, description, price, compare_at_price, sku, category_id, collection_id, material, features, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, slug, description, price, compare_at_price || null, sku, category_id || null, collection_id || null, material || '', featStr, status || 'active']
    );

    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ message: 'Error al crear el producto.' });
  }
});

// PUT /api/products/:id - Update product (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, price, compare_at_price, sku, category_id, collection_id, material, features, status } = req.body;

  try {
    const featStr = Array.isArray(features) ? JSON.stringify(features) : (features || '[]');
    const result = await db.query(
      `UPDATE products 
       SET name = $1, slug = $2, description = $3, price = $4, compare_at_price = $5, sku = $6, 
           category_id = $7, collection_id = $8, material = $9, features = $10, status = $11
       WHERE id = $12 RETURNING *`,
      [name, slug, description, price, compare_at_price || null, sku, category_id || null, collection_id || null, material || '', featStr, status || 'active', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    res.json({ product: result.rows[0] });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ message: 'Error al actualizar el producto.' });
  }
});

// DELETE /api/products/:id - Delete product (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    res.json({ message: 'Producto eliminado correctamente.', id });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ message: 'Error al eliminar el producto.' });
  }
});

module.exports = router;
