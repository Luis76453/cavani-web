const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function main() {
  console.log('Starting database initialization...');
  await db.initDb();
  const dbType = db.getDbType();
  console.log(`Database type detected: ${dbType}`);

  // 1. Create tables
  const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql');
  let schemaSql = fs.readFileSync(schemaPath, 'utf8');

  if (dbType === 'sqlite') {
    console.log('Converting PostgreSQL DDL to SQLite DDL...');
    // Translate schema SQL to SQLite dialect
    schemaSql = schemaSql
      .replace(/SERIAL PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/TIMESTAMP WITH TIME ZONE/gi, 'DATETIME')
      .replace(/WITH TIME ZONE/gi, '')
      .replace(/NUMERIC/gi, 'DECIMAL')
      .replace(/DECIMAL\(\d+,\s*\d+\)/gi, 'REAL')
      .replace(/SERIAL/gi, 'INTEGER')
      // Remove RESTRICT constraints on foreign keys if they cause issues, though SQLite supports them,
      // but let's keep references clean.
      .replace(/ON DELETE RESTRICT/gi, 'ON DELETE SET NULL');

    // SQLite does not support executing multiple statements in a single run() via typical methods,
    // so we split by semicolon.
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const sqliteDb = db.getSqliteInstance();
    await new Promise((resolve, reject) => {
      sqliteDb.serialize(() => {
        // Begin transaction
        sqliteDb.run('BEGIN TRANSACTION');
        for (const statement of statements) {
          sqliteDb.run(statement, (err) => {
            if (err) {
              console.error('Error running statement:', statement);
              console.error(err.message);
              sqliteDb.run('ROLLBACK');
              return reject(err);
            }
          });
        }
        sqliteDb.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  } else {
    // PostgreSQL mode
    // We can run the entire schema file
    await db.query(schemaSql);
  }

  console.log('Tables created successfully.');

  // 2. Seeding
  console.log('Seeding initial data...');

  // Seeding Roles
  await db.query(`INSERT INTO roles (id, name) VALUES (1, 'ADMIN') ON CONFLICT (id) DO NOTHING`);
  await db.query(`INSERT INTO roles (id, name) VALUES (2, 'CUSTOMER') ON CONFLICT (id) DO NOTHING`);
  
  // For SQLite, standard INSERT OR IGNORE since ON CONFLICT is supported in modern SQLite
  if (dbType === 'sqlite') {
    // Ensure IDs start from 1 or match
    await db.query(`INSERT OR IGNORE INTO roles (id, name) VALUES (1, 'ADMIN')`);
    await db.query(`INSERT OR IGNORE INTO roles (id, name) VALUES (2, 'CUSTOMER')`);
  }

  // Seeding Colors
  const colors = [
    { id: 1, name: 'Navy Profundo', hex: '#0B132B' },
    { id: 2, name: 'Azul Acero', hex: '#415A77' },
    { id: 3, name: 'Azul Claro', hex: '#778DA9' },
    { id: 4, name: 'Blanco Puro', hex: '#FFFFFF' },
    { id: 5, name: 'Gris Carbón', hex: '#1C2541' }
  ];
  for (const c of colors) {
    if (dbType === 'postgres') {
      await db.query(`INSERT INTO colors (id, name, hex_code) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, [c.id, c.name, c.hex]);
    } else {
      await db.query(`INSERT OR IGNORE INTO colors (id, name, hex_code) VALUES ($1, $2, $3)`, [c.id, c.name, c.hex]);
    }
  }

  // Seeding Sizes
  const sizes = [
    { id: 1, name: 'XS' },
    { id: 2, name: 'S' },
    { id: 3, name: 'M' },
    { id: 4, name: 'L' },
    { id: 5, name: 'XL' }
  ];
  for (const s of sizes) {
    if (dbType === 'postgres') {
      await db.query(`INSERT INTO sizes (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [s.id, s.name]);
    } else {
      await db.query(`INSERT OR IGNORE INTO sizes (id, name) VALUES ($1, $2)`, [s.id, s.name]);
    }
  }

  // Seeding Categories
  const categories = [
    { id: 1, name: 'Scrubs Completos', slug: 'scrubs-completos', desc: 'Conjuntos completos de filipina y pantalón médico diseñados para el alto rendimiento.', img: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=600&q=80' },
    { id: 2, name: 'Filipinas (Tops)', slug: 'tops', desc: 'Tops médicos ergonómicos, transpirables y de corte moderno y elegante.', img: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80' },
    { id: 3, name: 'Pantalones', slug: 'pantalones', desc: 'Pantalones tipo jogger y clásicos con tecnología stretch y múltiples bolsillos.', img: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80' },
    { id: 4, name: 'Batas y Chaquetas', slug: 'batas-y-chaquetas', desc: 'Batas profesionales y chaquetas abrigadoras para laboratorio y consulta.', img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80' },
    { id: 5, name: 'Accesorios', slug: 'accesorios', desc: 'Gorros quirúrgicos, calcetines de compresión y complementos médicos.', img: 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=600&q=80' }
  ];
  for (const cat of categories) {
    if (dbType === 'postgres') {
      await db.query(`INSERT INTO categories (id, name, slug, description, image_url) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [cat.id, cat.name, cat.slug, cat.desc, cat.img]);
    } else {
      await db.query(`INSERT OR IGNORE INTO categories (id, name, slug, description, image_url) VALUES ($1, $2, $3, $4, $5)`, [cat.id, cat.name, cat.slug, cat.desc, cat.img]);
    }
  }

  // Seeding Collections
  const collections = [
    { id: 1, name: 'Classic Premium', slug: 'classic-premium', desc: 'Diseños atemporales confeccionados con nuestra tela de suavidad superior.', img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80' },
    { id: 2, name: 'Zen Flex', slug: 'zen-flex', desc: 'Prendas ultra-elásticas enfocadas en la máxima comodidad y libertad de movimiento.', img: 'https://images.unsplash.com/photo-1582750433449-649352e36475?auto=format&fit=crop&w=600&q=80' },
    { id: 3, name: 'Antimicrobial Pro', slug: 'antimicrobial-pro', desc: 'Tecnología textil avanzada con barrera repelente a líquidos y antimicrobiana.', img: 'https://images.unsplash.com/photo-1631815541560-af25c68fcc70?auto=format&fit=crop&w=600&q=80' }
  ];
  for (const col of collections) {
    if (dbType === 'postgres') {
      await db.query(`INSERT INTO collections (id, name, slug, description, image_url) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [col.id, col.name, col.slug, col.desc, col.img]);
    } else {
      await db.query(`INSERT OR IGNORE INTO collections (id, name, slug, description, image_url) VALUES ($1, $2, $3, $4, $5)`, [col.id, col.name, col.slug, col.desc, col.img]);
    }
  }

  // Seeding Users
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const customerPasswordHash = await bcrypt.hash('customer123', 10);

  if (dbType === 'postgres') {
    await db.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id) 
      VALUES ('admin@cavani.com', $1, 'Admin', 'caVani', '555-0199', 1) 
      ON CONFLICT (email) DO NOTHING`, [adminPasswordHash]);
    await db.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id) 
      VALUES ('customer@cavani.com', $1, 'Sofía', 'Rodríguez', '555-0122', 2) 
      ON CONFLICT (email) DO NOTHING`, [customerPasswordHash]);
  } else {
    // SQLite insert
    await db.query(`
      INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, phone, role_id) 
      VALUES ('admin@cavani.com', $1, 'Admin', 'caVani', '555-0199', 1)`, [adminPasswordHash]);
    await db.query(`
      INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, phone, role_id) 
      VALUES ('customer@cavani.com', $1, 'Sofía', 'Rodríguez', '555-0122', 2)`, [customerPasswordHash]);
  }

  // Seeding Products
  const products = [
    {
      id: 1,
      name: 'Scrub Kit Premium caVani',
      slug: 'scrub-kit-premium-cavani',
      description: 'El conjunto definitivo de alto rendimiento médico. Confeccionado con nuestra firma de tela tecnológica antimicrobiana que ofrece elasticidad en cuatro direcciones. Incluye filipina con cuello en V ergonómico y pantalón jogger con cinturilla elástica de punto súper suave y 6 bolsillos de almacenamiento estratégico.',
      price: 119.99,
      compare_at_price: 139.99,
      sku: 'CV-KIT-001',
      category_id: 1,
      collection_id: 3,
      material: '72% Poliéster, 21% Rayón, 7% Spandex. Tratamiento antimicrobiano Silvadur™.',
      features: '["Tecnología repelente de fluidos", "Elasticidad en 4 direcciones", "Antiarrugas", "Ajuste atlético moderno", "6 bolsillos de almacenamiento"]',
      status: 'active'
    },
    {
      id: 2,
      name: 'Filipina Zen Flex',
      slug: 'filipina-zen-flex',
      description: 'Diseño minimalista de cuello en V cruzado con costuras estilizadas que delinean una silueta elegante y profesional. El tejido Zen Flex es sumamente ligero y ofrece una transpirabilidad superior para guardias largas y activas.',
      price: 54.99,
      compare_at_price: null,
      sku: 'CV-TOP-002',
      category_id: 2,
      collection_id: 2,
      material: '76% Nailon, 24% Spandex. Tecnología de evaporación rápida de sudor.',
      features: '["Cuello cruzado elegante", "Tejido ultraligero transpirable", "Bolsillo oculto para credencial", "Aberturas laterales de movimiento"]',
      status: 'active'
    },
    {
      id: 3,
      name: 'Pantalón Jogger Cargo',
      slug: 'pantalon-jogger-cargo',
      description: 'Eleva tu uniforme diario con este jogger de corte moderno. Cuenta con tobilleras acanaladas de alta resistencia, un cordón ajustable premium y bolsillos laterales de carga integrados de perfil plano que no agregan volumen innecesario.',
      price: 64.99,
      compare_at_price: 74.99,
      sku: 'CV-PAN-003',
      category_id: 3,
      collection_id: 2,
      material: '72% Poliéster, 21% Rayón, 7% Spandex.',
      features: '["Tobilleras de punto acanalado", "Cintura ajustable con cordón", "Bolsillos cargo de perfil bajo", "Resistente a la decoloración"]',
      status: 'active'
    },
    {
      id: 4,
      name: 'Bata de Laboratorio Avant-Garde',
      slug: 'bata-laboratorio-avant-garde',
      description: 'La reinvención de la bata médica clásica. Confeccionada con gabardina de peso medio repelente al agua y manchas, presenta un corte sastre entallado, solapas delgadas de muesca y una tapeta oculta con botones a presión de acero inoxidable.',
      price: 89.99,
      compare_at_price: 110.00,
      sku: 'CV-COAT-004',
      category_id: 4,
      collection_id: 1,
      material: '65% Algodón Egipcio, 35% Poliéster con acabado Teflon™.',
      features: '["Corte sastre estructurado", "Repelente a manchas y líquidos", "Botones a presión ocultos", "Acceso interno a bolsillos del pantalón"]',
      status: 'active'
    },
    {
      id: 5,
      name: 'Gorro Quirúrgico Editorial',
      slug: 'gorro-quirurgico-editorial',
      description: 'Gorro de diseño ergonómico unisex con banda absorbente de sudor en la frente. Se ajusta perfectamente mediante tiras de amarrado traseras. Ideal para cabello largo o corto, manteniendo un aspecto pulcro y moderno.',
      price: 19.99,
      compare_at_price: null,
      sku: 'CV-ACC-005',
      category_id: 5,
      collection_id: 1,
      material: '100% Algodón Premium satinado.',
      features: '["Banda absorbente integrada", "Ajuste universal trasero", "Tejido transpirable de alta densidad", "Apto para lavadoras industriales"]',
      status: 'active'
    }
  ];

  for (const p of products) {
    if (dbType === 'postgres') {
      await db.query(`
        INSERT INTO products (id, name, slug, description, price, compare_at_price, sku, category_id, collection_id, material, features, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.slug, p.description, p.price, p.compare_at_price, p.sku, p.category_id, p.collection_id, p.material, p.features, p.status]
      );
    } else {
      await db.query(`
        INSERT OR IGNORE INTO products (id, name, slug, description, price, compare_at_price, sku, category_id, collection_id, material, features, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [p.id, p.name, p.slug, p.description, p.price, p.compare_at_price, p.sku, p.category_id, p.collection_id, p.material, p.features, p.status]
      );
    }
  }

  // Seeding Product Images (Unsplash high quality links)
  const images = [
    { product_id: 1, url: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=800&q=80', featured: true, order: 0 },
    { product_id: 1, url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80', featured: false, order: 1 },
    { product_id: 2, url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80', featured: true, order: 0 },
    { product_id: 3, url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=800&q=80', featured: true, order: 0 },
    { product_id: 4, url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=800&q=80', featured: true, order: 0 },
    { product_id: 5, url: 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&w=800&q=80', featured: true, order: 0 }
  ];

  for (const img of images) {
    if (dbType === 'postgres') {
      await db.query(`
        INSERT INTO product_images (product_id, image_url, is_featured, display_order)
        VALUES ($1, $2, $3, $4)`,
        [img.product_id, img.url, img.featured, img.order]
      );
    } else {
      await db.query(`
        INSERT INTO product_images (product_id, image_url, is_featured, display_order)
        VALUES ($1, $2, $3, $4)`,
        [img.product_id, img.url, img.featured, img.order]
      );
    }
  }

  // Seeding Variants (XS to XL, and colors Navy (1), Steel Blue (2), Blue Light (3))
  let variantId = 1;
  const productIds = [1, 2, 3, 4, 5];
  const colorIds = [1, 2, 3];
  const sizeIds = [1, 2, 3, 4, 5];

  for (const pid of productIds) {
    for (const cid of colorIds) {
      // Accessories (pid: 5) doesn't need all sizes, but we can seed standard ones or a subset
      for (const sid of sizeIds) {
        const sku = `CV-PROD-${pid}-C${cid}-S${sid}`;
        const stock = Math.floor(Math.random() * 50) + 10; // Random stock 10-60
        if (dbType === 'postgres') {
          await db.query(`
            INSERT INTO product_variants (product_id, color_id, size_id, sku, stock)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (product_id, color_id, size_id) DO NOTHING`,
            [pid, cid, sid, sku, stock]
          );
        } else {
          await db.query(`
            INSERT OR IGNORE INTO product_variants (product_id, color_id, size_id, sku, stock)
            VALUES ($1, $2, $3, $4, $5)`,
            [pid, cid, sid, sku, stock]
          );
        }
      }
    }
  }

  // Seeding Promotions
  if (dbType === 'postgres') {
    await db.query(`
      INSERT INTO promotions (code, description, discount_type, discount_value, active)
      VALUES ('WELCOME10', '10% de descuento en tu primera compra', 'percentage', 10.00, true)
      ON CONFLICT (code) DO NOTHING`);
  } else {
    await db.query(`
      INSERT OR IGNORE INTO promotions (code, description, discount_type, discount_value, active)
      VALUES ('WELCOME10', '10% de descuento en tu primera compra', 'percentage', 10.00, true)`);
  }

  // Seeding Banners
  const banners = [
    { title: 'Designed for those who move medicine forward', subtitle: 'Colección Scrubs Premium 2026', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1600&q=80', link: '/catalog' }
  ];
  for (const b of banners) {
    await db.query(`
      INSERT INTO banners (title, subtitle, image_url, link_url, is_active, display_order)
      VALUES ($1, $2, $3, $4, true, 1)`,
      [b.title, b.subtitle, b.url, b.link]
    );
  }

  console.log('Database initialization and seeding completed successfully!');
  if (dbType === 'sqlite') {
    db.getSqliteInstance().close();
  } else {
    await db.getPgPool().end();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Initialization script failed:', err);
    process.exit(1);
  });
}

module.exports = main;
