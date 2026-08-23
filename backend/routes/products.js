const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const db = require('../config/db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Setup multer in-memory storage for handling image file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// S3-compatible file upload helper
const uploadImageToS3 = async (file) => {
  const s3Client = new S3Client({
    endpoint: process.env.STORAGE_ENDPOINT,
    region: process.env.STORAGE_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY,
      secretAccessKey: process.env.STORAGE_SECRET_KEY,
    },
    forcePathStyle: true, // Required for Supabase Storage and other S3-compatible APIs
  });

  const fileExt = path.extname(file.originalname) || '.jpg';
  const fileName = `products/${Date.now()}_${Math.random().toString(36).substring(2, 9)}${fileExt}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  // Construct public URL portably
  let publicUrl = '';
  if (process.env.STORAGE_PUBLIC_BASE_URL) {
    publicUrl = `${process.env.STORAGE_PUBLIC_BASE_URL}/${fileName}`;
  } else {
    // Fallback: Reconstruct Supabase URL if endpoint matches standard Supabase schema
    const endpoint = process.env.STORAGE_ENDPOINT;
    if (endpoint && endpoint.includes('supabase.co')) {
      const base = endpoint.split('/storage/v1/s3')[0];
      publicUrl = `${base}/storage/v1/object/public/${process.env.STORAGE_BUCKET}/${fileName}`;
    } else {
      // Default general S3 URL template endpoint/bucket/key
      publicUrl = `${endpoint}/${process.env.STORAGE_BUCKET}/${fileName}`;
    }
  }

  return publicUrl;
};

// GET /api/products - Get all products with filters
router.get('/', async (req, res) => {
  const { category, collection, search, include_inactive } = req.query;
  
  let queryStr = `
    SELECT p.*, c.name as category_name, col.name as collection_name,
           (SELECT image_url FROM product_images WHERE product_id = p.id AND is_featured = true LIMIT 1) as image_url
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN collections col ON p.collection_id = col.id
    WHERE 1=1
  `;
  const params = [];

  // Exclude inactive items for public customer listings
  if (include_inactive !== 'true') {
    queryStr += " AND p.status = 'active'";
  }

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
  const { include_inactive } = req.query;
  try {
    const queryStr = include_inactive === 'true'
      ? 'SELECT * FROM categories ORDER BY name'
      : 'SELECT * FROM categories WHERE active = true ORDER BY name';
    const result = await db.query(queryStr);
    res.json({ categories: result.rows });
  } catch (err) {
    console.error('Fetch categories error:', err);
    res.status(500).json({ message: 'Error al obtener categorías.' });
  }
});

// GET /api/products/collections - Get all collections
router.get('/collections', async (req, res) => {
  const { include_inactive } = req.query;
  try {
    const queryStr = include_inactive === 'true'
      ? 'SELECT * FROM collections ORDER BY name'
      : 'SELECT * FROM collections WHERE active = true ORDER BY name';
    const result = await db.query(queryStr);
    res.json({ collections: result.rows });
  } catch (err) {
    console.error('Fetch collections error:', err);
    res.status(500).json({ message: 'Error al obtener colecciones.' });
  }
});

// GET /api/products/colors - Get all colors
router.get('/colors', async (req, res) => {
  const { include_inactive } = req.query;
  try {
    const queryStr = include_inactive === 'true'
      ? 'SELECT * FROM colors ORDER BY name'
      : 'SELECT * FROM colors WHERE active = true ORDER BY name';
    const result = await db.query(queryStr);
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

// POST /api/products/upload-image - Upload an image to S3 compatible storage (Admin only)
router.post('/upload-image', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo de imagen.' });
  }

  if (!process.env.STORAGE_ENDPOINT || !process.env.STORAGE_ACCESS_KEY || !process.env.STORAGE_SECRET_KEY || !process.env.STORAGE_BUCKET) {
    console.warn('Storage credentials are not configured in environment variables.');
    return res.status(500).json({ message: 'El almacenamiento de archivos S3 no está configurado en el servidor.' });
  }

  try {
    const imageUrl = await uploadImageToS3(req.file);
    res.json({ image_url: imageUrl });
  } catch (err) {
    console.error('Image upload to S3 failed:', err);
    res.status(500).json({ message: 'Error al subir la imagen al almacenamiento en la nube.', error: err.message });
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
        product.features = product.features.split(',').map(f => f.trim().replace(/[\[\]"']/g, ''));
      }
    }

    // 2. Get product images (now including color_id)
    const imagesResult = await db.query(
      'SELECT id, color_id, image_url, is_featured, display_order FROM product_images WHERE product_id = $1 ORDER BY display_order',
      [product.id]
    );
    product.images = imagesResult.rows;

    // 3. Get variants with color and size info
    const variantsResult = await db.query(
      `SELECT pv.id, pv.sku, pv.stock,
              c.id as color_id, c.name as color_name, c.hex_code as color_hex,
              s.id as size_id, s.name as size_name
       FROM product_variants pv
       LEFT JOIN colors c ON pv.color_id = c.id
       LEFT JOIN sizes s ON pv.size_id = s.id
       WHERE pv.product_id = $1 AND (c.active IS NULL OR c.active = true)`,
      [product.id]
    );
    product.variants = variantsResult.rows;

    // 4. Get product size guide (joining sizes to get size_name)
    const sizeGuideResult = await db.query(
      `SELECT sg.size_id, s.name as size_name, sg.chest_cm, sg.waist_cm, sg.hip_cm 
       FROM product_size_guide sg
       JOIN sizes s ON sg.size_id = s.id
       WHERE sg.product_id = $1`,
      [product.id]
    );
    product.size_guide = sizeGuideResult.rows;

    res.json({ product });
  } catch (err) {
    console.error('Fetch product detail error:', err);
    res.status(500).json({ message: 'Error al obtener detalle del producto.' });
  }
});

// Helper transaction executor
const runQuery = async (queryText, queryParams, client) => {
  if (client) {
    return client.query(queryText, queryParams);
  }
  return db.query(queryText, queryParams);
};

// POST /api/products - Create a new product with variants and images (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const { name, slug, description, price, compare_at_price, sku, category_id, collection_id, material, features, status, variants, images, size_guide } = req.body;

  if (!name || !slug || !price || !sku) {
    return res.status(400).json({ message: 'Nombre, slug, precio y SKU son obligatorios.' });
  }

// Validation slug to string
  if (/^\d+$/.test(slug.trim())) {
    return res.status(400).json({ 
      message: 'El slug no puede ser únicamente numérico (ej: "231"). Debe contener al menos una letra, como "prueba-3".' 
    });
  }

  let client = null;
  const dbType = db.getDbType();
  if (dbType === 'postgres') {
    client = await db.getPgPool().connect();
  }

  try {
    if (client) await client.query('BEGIN');
    else await db.query('BEGIN');

    // 1. Insert product
    const featStr = Array.isArray(features) ? JSON.stringify(features) : (features || '[]');
    const prodResult = await runQuery(
      `INSERT INTO products (name, slug, description, price, compare_at_price, sku, category_id, collection_id, material, features, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [name, slug, description, price, compare_at_price || null, sku, category_id || null, collection_id || null, material || '', featStr, status || 'active'],
      client
    );
    const product = prodResult.rows[0];
    const productId = product.id;

    // 2. Insert variants
    if (Array.isArray(variants)) {
      for (const variant of variants) {
        const { color_id, size_id, sku: vSku, stock } = variant;
        await runQuery(
          `INSERT INTO product_variants (product_id, color_id, size_id, sku, stock)
           VALUES ($1, $2, $3, $4, $5)`,
          [productId, color_id, size_id, vSku, stock || 0],
          client
        );
      }
    }

    // 3. Insert images (with color_id)
    if (Array.isArray(images)) {
      for (const img of images) {
        await runQuery(
          `INSERT INTO product_images (product_id, color_id, image_url, is_featured, display_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [productId, img.color_id || null, img.image_url, img.is_featured || false, img.display_order || 0],
          client
        );
      }
    }

    // 4. Insert size guide
    if (Array.isArray(size_guide)) {
      for (const sg of size_guide) {
        const chest = sg.chest_cm ? parseFloat(sg.chest_cm) : null;
        const waist = sg.waist_cm ? parseFloat(sg.waist_cm) : null;
        const hip = sg.hip_cm ? parseFloat(sg.hip_cm) : null;
        
        if (chest !== null || waist !== null || hip !== null) {
          await runQuery(
            `INSERT INTO product_size_guide (product_id, size_id, chest_cm, waist_cm, hip_cm)
             VALUES ($1, $2, $3, $4, $5)`,
            [productId, sg.size_id, chest, waist, hip],
            client
          );
        }
      }
    }

    if (client) await client.query('COMMIT');
    else await db.query('COMMIT');

    res.status(201).json({ product });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    else await db.query('ROLLBACK');
    console.error('Create product transaction failed:', err);

    if (err.code === '23505') {
      if (err.constraint && err.constraint.includes('sku')) {
        return res.status(409).json({ message: 'Ya existe un producto con ese SKU. Por favor use un SKU diferente.' });
        }
      if (err.constraint && err.constraint.includes('slug')) {
        return res.status(409).json({ message: 'Ya existe un producto con ese slug. Por favor use un slug diferente.' });
        }
      return res.status(409).json({ message: 'Ya existe un registro con ese valor único (SKU o slug duplicado).' });
    }
  
    res.status(500).json({ message: 'Error al crear el producto en la base de datos.' });
  } finally {
    if (client) client.release();
  }
});

// PUT /api/products/:id - Update product details, variants and S3 images (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, slug, description, price, compare_at_price, sku, category_id, collection_id, material, features, status, variants, images, size_guide } = req.body;

  if (/^\d+$/.test(slug.trim())) {
    return res.status(400).json({ 
      message: 'El slug no puede ser únicamente numérico (ej: "231"). Debe contener al menos una letra, como "prueba-3".' 
    });
  }

  let client = null;
  const dbType = db.getDbType();
  if (dbType === 'postgres') {
    client = await db.getPgPool().connect();
  }

  try {
    if (client) await client.query('BEGIN');
    else await db.query('BEGIN');

    // 1. Update product base details
    const featStr = Array.isArray(features) ? JSON.stringify(features) : (features || '[]');
    const prodResult = await runQuery(
      `UPDATE products 
       SET name = $1, slug = $2, description = $3, price = $4, compare_at_price = $5, sku = $6, 
           category_id = $7, collection_id = $8, material = $9, features = $10, status = $11
       WHERE id = $12 RETURNING *`,
      [name, slug, description, price, compare_at_price || null, sku, category_id || null, collection_id || null, material || '', featStr, status || 'active', id],
      client
    );

    if (prodResult.rows.length === 0) {
      if (client) await client.query('ROLLBACK');
      else await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }
    const product = prodResult.rows[0];
    const productId = product.id;

    // 2. Sync product variants
    if (Array.isArray(variants)) {
      const upsertedVariantIds = [];
      
      // A. Upsert active variants
      for (const variant of variants) {
        const { color_id, size_id, sku: vSku, stock } = variant;
        
        if (color_id === null && size_id === null) {
          // Simple variant sync
          const checkRes = await runQuery(
            'SELECT id FROM product_variants WHERE product_id = $1 AND color_id IS NULL AND size_id IS NULL',
            [productId],
            client
          );
          if (checkRes.rows.length > 0) {
            const vId = checkRes.rows[0].id;
            await runQuery(
              'UPDATE product_variants SET stock = $1, sku = $2 WHERE id = $3',
              [stock || 0, vSku, vId],
              client
            );
            upsertedVariantIds.push(vId);
          } else {
            const insRes = await runQuery(
              'INSERT INTO product_variants (product_id, color_id, size_id, sku, stock) VALUES ($1, null, null, $2, $3) RETURNING id',
              [productId, vSku, stock || 0],
              client
            );
            upsertedVariantIds.push(insRes.rows[0].id);
          }
        } else {
          // Standard attribute variant sync
          const upsertRes = await runQuery(
            `INSERT INTO product_variants (product_id, color_id, size_id, sku, stock)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (product_id, color_id, size_id)
             DO UPDATE SET stock = EXCLUDED.stock, sku = EXCLUDED.sku
             RETURNING id`,
            [productId, color_id, size_id, vSku, stock || 0],
            client
          );
          upsertedVariantIds.push(upsertRes.rows[0].id);
        }
      }

      // B. Fetch all variants currently registered for this product
      const currentVarsRes = await runQuery(
        'SELECT id, sku FROM product_variants WHERE product_id = $1',
        [productId],
        client
      );

      // C. Delete or soft-disable missing variants
      const variantsToDelete = currentVarsRes.rows.filter(
        v => !upsertedVariantIds.includes(v.id)
      );

      for (const v of variantsToDelete) {
        try {
          await runQuery('DELETE FROM product_variants WHERE id = $1', [v.id], client);
        } catch (delErr) {
          console.warn(`Could not delete variant ${v.id} (SKU: ${v.sku}) due to foreign key restrictions. Setting stock to 0.`);
          await runQuery('UPDATE product_variants SET stock = 0 WHERE id = $1', [v.id], client);
        }
      }
    }

    // 3. Sync product images
    if (Array.isArray(images)) {
      // Clean up previous image list
      await runQuery('DELETE FROM product_images WHERE product_id = $1', [productId], client);

      // Insert new image list
      for (const img of images) {
        await runQuery(
          `INSERT INTO product_images (product_id, color_id, image_url, is_featured, display_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [productId, img.color_id || null, img.image_url, img.is_featured || false, img.display_order || 0],
          client
        );
      }
    }

    // 4. Sync product size guide
    await runQuery('DELETE FROM product_size_guide WHERE product_id = $1', [productId], client);
    if (Array.isArray(size_guide)) {
      for (const sg of size_guide) {
        const chest = sg.chest_cm ? parseFloat(sg.chest_cm) : null;
        const waist = sg.waist_cm ? parseFloat(sg.waist_cm) : null;
        const hip = sg.hip_cm ? parseFloat(sg.hip_cm) : null;
        
        if (chest !== null || waist !== null || hip !== null) {
          await runQuery(
            `INSERT INTO product_size_guide (product_id, size_id, chest_cm, waist_cm, hip_cm)
             VALUES ($1, $2, $3, $4, $5)`,
            [productId, sg.size_id, chest, waist, hip],
            client
          );
        }
      }
    }

    if (client) await client.query('COMMIT');
    else await db.query('COMMIT');

    res.json({ product });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    else await db.query('ROLLBACK');
    console.error('Update product transaction failed:', err);
    res.status(500).json({ message: 'Error al actualizar el producto.' });
  } finally {
    if (client) client.release();
  }
});

// PUT /api/products/:id/status - Update product status only (Admin only)
router.put('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== 'active' && status !== 'inactive') {
    return res.status(400).json({ message: 'Estado inválido. Debe ser active o inactive.' });
  }

  try {
    const result = await db.query(
      'UPDATE products SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Producto no encontrado.' });
    }

    res.json({ message: 'Estado del producto actualizado.', product: result.rows[0] });
  } catch (err) {
    console.error('Update product status error:', err);
    res.status(500).json({ message: 'Error al actualizar el estado del producto.' });
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
