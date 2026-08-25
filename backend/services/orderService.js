const db = require('../config/db');

/**
 * Recalculates cart pricing on the server side using values directly from the database.
 * Never trust prices passed from the frontend.
 */
async function calculateCartTotal(userId, promo_code, shipping_method = 'delivery_lima') {
  // 1. Get user cart
  const cartRes = await db.query('SELECT id FROM carts WHERE user_id = $1', [userId]);
  if (cartRes.rows.length === 0) {
    return { subtotal: 0, discount: 0, shipping: 0, total: 0, items: [], promotionId: null, cartId: null };
  }
  const cartId = cartRes.rows[0].id;

  // 2. Get cart items
  const cartItemsRes = await db.query(
    `SELECT ci.quantity, pv.id as variant_id, pv.stock, p.price, p.name 
     FROM cart_items ci
     JOIN product_variants pv ON ci.variant_id = pv.id
     JOIN products p ON pv.product_id = p.id
     WHERE ci.cart_id = $1`,
    [cartId]
  );
  
  const items = cartItemsRes.rows;
  if (items.length === 0) {
    return { subtotal: 0, discount: 0, shipping: 0, total: 0, items: [], promotionId: null, cartId };
  }

  // 3. Compute Subtotal
  let subtotal = 0;
  for (const item of items) {
    subtotal += parseFloat(item.price) * item.quantity;
  }

  // 4. Compute Promotions
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

  let shipping = 0;
  if (shipping_method === 'pickup') {
    shipping = 0;
  } else if (shipping_method === 'delivery_lima') {
    shipping = subtotal > 250 ? 0 : 10.00;
  } else if (shipping_method === 'provincia') {
    shipping = 0;
  } else {
    shipping = subtotal > 250 ? 0 : 9.99;
  }
  const total = Math.max(0, subtotal - discount + shipping);

  // Round values to 2 decimal places to prevent floating point issues in gateway
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    total: Math.round(total * 100) / 100,
    items,
    promotionId,
    cartId
  };
}

/**
 * Creates a physical order from the current items in the user's cart.
 */
async function createOrderFromCart({ userId, address, payment_method, promo_code, shipping_method = 'delivery_lima', payment_status = 'PENDING', mp_payment_id = null }) {
  console.log(`[ORDER-SERVICE] Iniciando createOrderFromCart para usuario ID: ${userId}. Metodo Pago: ${payment_method}, Estado Pago: ${payment_status}, MP Payment ID: ${mp_payment_id}`);
  
  if (!address || !payment_method) {
    console.error('[ORDER-SERVICE] Error: Direccion o Metodo de Pago faltante.');
    throw new Error('La dirección de envío y el método de pago son obligatorios.');
  }

  // 1. Recalculate totals and get items from DB
  console.log('[ORDER-SERVICE] Calculando totales del carrito en la base de datos...');
  const { subtotal, discount, shipping, total, items, promotionId, cartId } = await calculateCartTotal(userId, promo_code, shipping_method);
  console.log(`[ORDER-SERVICE] Totales recalculados: Subtotal: ${subtotal}, Descuento: ${discount}, Envio: ${shipping}, Total: ${total}. Items count: ${items.length}`);

  if (items.length === 0) {
    console.error('[ORDER-SERVICE] Error: El carrito esta vacio.');
    throw new Error('El carrito está vacío.');
  }

  // 2. Validate stock for all items
  console.log('[ORDER-SERVICE] Validando stock para todos los items...');
  for (const item of items) {
    console.log(`[ORDER-SERVICE] Item: ${item.name} (Variant ID: ${item.variant_id}). Stock actual: ${item.stock}, Cantidad solicitada: ${item.quantity}`);
    if (item.stock < item.quantity) {
      console.error(`[ORDER-SERVICE] Error: Stock insuficiente para "${item.name}". Stock: ${item.stock}, Solicitado: ${item.quantity}`);
      throw new Error(`Stock insuficiente para el producto "${item.name}". Solo quedan ${item.stock} unidades.`);
    }
  }

  // 3. Save or load delivery Address
  let addressId;
  if (address.id) {
    addressId = address.id;
    console.log(`[ORDER-SERVICE] Usando ID de direccion existente: ${addressId}`);
  } else {
    const { address_line1, city, state, postal_code, country, phone } = address;
    console.log(`[ORDER-SERVICE] Creando nueva direccion de envio para usuario ID: ${userId}...`);
    if (!address_line1 || !city || !state || !postal_code || !country) {
      console.error('[ORDER-SERVICE] Error: Campos de direccion incompletos.');
      throw new Error('Complete todos los campos obligatorios de la dirección.');
    }

    const addrResult = await db.query(
      `INSERT INTO addresses (user_id, address_line1, address_line2, city, state, postal_code, country, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [userId, address_line1, address.address_line2 || '', city, state, postal_code, country, phone || '']
    );
    addressId = addrResult.rows[0].id;
    console.log(`[ORDER-SERVICE] Nueva direccion registrada exitosamente. ID: ${addressId}`);
  }

  // 4. Insert Order Log
  const orderNumber = `CV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  console.log(`[ORDER-SERVICE] Generando orden de compra ${orderNumber} para insercion en DB...`);
  const orderRes = await db.query(
    `INSERT INTO orders (user_id, order_number, status, subtotal, shipping_cost, total, address_id, payment_status, payment_method, promotion_id, mp_payment_id, shipping_method)
     VALUES ($1, $2, 'PENDING', $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [userId, orderNumber, subtotal, shipping, total, addressId, payment_status, payment_method, promotionId, mp_payment_id, shipping_method]
  );
  const order = orderRes.rows[0];
  console.log(`[ORDER-SERVICE] Orden de compra registrada con éxito en la DB. ID de Orden: ${order.id}`);

  // 5. Create Order Items & Decrement Variant Stock
  for (const item of items) {
    // Create order item link
    await db.query(
      `INSERT INTO order_items (order_id, variant_id, quantity, price)
       VALUES ($1, $2, $3, $4)`,
      [order.id, item.variant_id, item.quantity, item.price]
    );

    // Decrement stock
    await db.query(
      `UPDATE product_variants SET stock = stock - $1 WHERE id = $2`,
      [item.quantity, item.variant_id]
    );
  }

  // 6. Clear User Cart
  await db.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);

  return {
    id: order.id,
    order_number: order.order_number,
    total: order.total,
    status: order.status
  };
}

module.exports = {
  calculateCartTotal,
  createOrderFromCart
};
