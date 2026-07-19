const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./config/db');

async function testDatabase() {
  console.log('--- Test 1: Database Connection ---');
  await db.initDb();
  const dbType = db.getDbType();
  console.log(`Connected successfully. Database Type: ${dbType}`);

  console.log('--- Test 2: Table Existence Verification ---');
  const tables = ['users', 'roles', 'products', 'product_variants', 'orders', 'order_items', 'categories', 'collections'];
  
  for (const table of tables) {
    let checkQuery = '';
    if (dbType === 'sqlite') {
      checkQuery = `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}'`;
    } else {
      checkQuery = `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}'`;
    }

    const res = await db.query(checkQuery);
    if (res.rows.length > 0) {
      console.log(`[PASS] Table "${table}" exists.`);
    } else {
      console.log(`[FAIL] Table "${table}" was not found!`);
      throw new Error(`Table ${table} missing.`);
    }
  }
}

async function testCryptography() {
  console.log('--- Test 3: Password Hashing (Bcrypt) ---');
  const password = 'scrub_premium_2026';
  const hash = await bcrypt.hash(password, 10);
  console.log('Generated hash successfully.');

  const match = await bcrypt.compare(password, hash);
  if (match) {
    console.log('[PASS] Bcrypt password match verified.');
  } else {
    console.log('[FAIL] Bcrypt hashing mismatch!');
    throw new Error('Bcrypt verification failed.');
  }

  const mismatch = await bcrypt.compare('wrong_pass', hash);
  if (!mismatch) {
    console.log('[PASS] Bcrypt negative match verified.');
  } else {
    console.log('[FAIL] Bcrypt matched a wrong password!');
    throw new Error('Bcrypt security leak.');
  }
}

async function testAuthTokens() {
  console.log('--- Test 4: Token Signature and Verification (JWT) ---');
  const secret = 'test_jwt_secret_cavani_123';
  const payload = { id: 42, email: 'dr.smith@hospital.com', role: 'ADMIN' };
  
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  console.log('Token signed successfully.');

  const decoded = jwt.verify(token, secret);
  if (decoded.id === 42 && decoded.role === 'ADMIN') {
    console.log('[PASS] JWT decoding and claim structure verified.');
  } else {
    console.log('[FAIL] JWT verification failed.');
    throw new Error('JWT verification mismatch.');
  }
}

async function runAllTests() {
  console.log('Starting automated checks for caVani components...');
  try {
    await testDatabase();
    await testCryptography();
    await testAuthTokens();
    console.log('\n===========================================');
    console.log('All backend automated checks PASSED successfully!');
    console.log('===========================================');
    
    // Close sqlite database connection if open
    if (db.getDbType() === 'sqlite') {
      db.getSqliteInstance().close();
    } else {
      await db.getPgPool().end();
    }
    process.exit(0);
  } catch (err) {
    console.error('\n[ERROR] One or more automated tests failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests();
}
