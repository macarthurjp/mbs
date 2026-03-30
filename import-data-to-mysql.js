/**
 * Script para IMPORTAR datos a MySQL desde archivos JSON
 * Ejecutar DESPUÉS del despliegue en producción
 *
 * Uso: node import-data-to-mysql.js
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Configuración de MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true
};

const exportDir = path.join(__dirname, 'data-export');

console.log('🚀 Iniciando importación de datos a MySQL...\n');

/**
 * Mapeo de usuarios de Supabase auth.users a user_profiles
 */
async function importUserProfiles(connection) {
  console.log('👤 Importando perfiles de usuario...');

  const filename = path.join(exportDir, 'user_profiles.json');
  if (!fs.existsSync(filename)) {
    console.log('   ⚠ No hay datos de user_profiles para importar');
    return 0;
  }

  const profiles = JSON.parse(fs.readFileSync(filename, 'utf8'));

  let imported = 0;
  for (const profile of profiles) {
    try {
      await connection.execute(
        `INSERT IGNORE INTO users (id, email, username, full_name, password_hash, role, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          profile.id,
          profile.email || `user_${profile.id}@boutique.com`,
          profile.username,
          profile.full_name,
          '$2a$10$default.hash.placeholder', // Hash temporal, debe cambiarse
          profile.role || 'cajero',
          profile.active ? 1 : 0,
          profile.created_at,
          profile.updated_at
        ]
      );
      imported++;
    } catch (err) {
      console.error(`   ❌ Error importando usuario ${profile.username}:`, err.message);
    }
  }

  console.log(`   ✓ ${imported}/${profiles.length} usuarios importados`);
  return imported;
}

/**
 * Importa clientes
 */
async function importClients(connection) {
  console.log('👥 Importando clientes...');

  const filename = path.join(exportDir, 'clients.json');
  if (!fs.existsSync(filename)) {
    console.log('   ⚠ No hay datos de clientes para importar');
    return 0;
  }

  const clients = JSON.parse(fs.readFileSync(filename, 'utf8'));

  let imported = 0;
  for (const client of clients) {
    try {
      await connection.execute(
        `INSERT INTO clients (id, name, phone, address, email, id_number, notes, payment_behavior, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          client.id,
          client.name,
          client.phone,
          client.address,
          client.email,
          client.id_number,
          client.notes,
          client.payment_behavior || 'good',
          client.active ? 1 : 0,
          client.created_at,
          client.updated_at
        ]
      );
      imported++;
    } catch (err) {
      console.error(`   ❌ Error importando cliente ${client.name}:`, err.message);
    }
  }

  console.log(`   ✓ ${imported}/${clients.length} clientes importados`);
  return imported;
}

/**
 * Importa productos
 */
async function importProducts(connection) {
  console.log('📦 Importando productos...');

  const filename = path.join(exportDir, 'products.json');
  if (!fs.existsSync(filename)) {
    console.log('   ⚠ No hay datos de productos para importar');
    return 0;
  }

  const products = JSON.parse(fs.readFileSync(filename, 'utf8'));

  let imported = 0;
  for (const product of products) {
    try {
      await connection.execute(
        `INSERT INTO products (id, name, category, size, color, purchase_price, sale_price, stock, min_stock, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          product.id,
          product.name,
          product.category,
          product.size,
          product.color,
          product.purchase_price,
          product.sale_price,
          product.stock || 0,
          product.min_stock || 5,
          product.active ? 1 : 0,
          product.created_at,
          product.updated_at
        ]
      );
      imported++;
    } catch (err) {
      console.error(`   ❌ Error importando producto ${product.name}:`, err.message);
    }
  }

  console.log(`   ✓ ${imported}/${products.length} productos importados`);
  return imported;
}

/**
 * Importa ventas
 */
async function importSales(connection) {
  console.log('💰 Importando ventas...');

  const filename = path.join(exportDir, 'sales.json');
  if (!fs.existsSync(filename)) {
    console.log('   ⚠ No hay datos de ventas para importar');
    return 0;
  }

  const sales = JSON.parse(fs.readFileSync(filename, 'utf8'));

  let imported = 0;
  for (const sale of sales) {
    try {
      await connection.execute(
        `INSERT INTO sales (id, client_id, user_id, total_amount, payment_method, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          sale.id,
          sale.client_id,
          sale.user_id,
          sale.total_amount,
          sale.payment_method,
          sale.notes,
          sale.created_at
        ]
      );
      imported++;
    } catch (err) {
      console.error(`   ❌ Error importando venta ${sale.id}:`, err.message);
    }
  }

  console.log(`   ✓ ${imported}/${sales.length} ventas importadas`);
  return imported;
}

/**
 * Importa items de venta
 */
async function importSaleItems(connection) {
  console.log('📋 Importando items de venta...');

  const filename = path.join(exportDir, 'sale_items.json');
  if (!fs.existsSync(filename)) {
    console.log('   ⚠ No hay datos de items de venta para importar');
    return 0;
  }

  const items = JSON.parse(fs.readFileSync(filename, 'utf8'));

  let imported = 0;
  for (const item of items) {
    try {
      await connection.execute(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, subtotal, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.sale_id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.subtotal,
          item.created_at
        ]
      );
      imported++;
    } catch (err) {
      console.error(`   ❌ Error importando item ${item.id}:`, err.message);
    }
  }

  console.log(`   ✓ ${imported}/${items.length} items importados`);
  return imported;
}

/**
 * Importa cuentas corrientes
 */
async function importCurrentAccounts(connection) {
  console.log('💳 Importando cuentas corrientes...');

  const filename = path.join(exportDir, 'current_accounts.json');
  if (!fs.existsSync(filename)) {
    console.log('   ⚠ No hay datos de cuentas corrientes para importar');
    return 0;
  }

  const accounts = JSON.parse(fs.readFileSync(filename, 'utf8'));

  let imported = 0;
  for (const account of accounts) {
    try {
      await connection.execute(
        `INSERT INTO current_accounts (id, client_id, sale_id, amount, balance, type, payment_method, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          account.id,
          account.client_id,
          account.sale_id,
          account.amount,
          account.balance,
          account.type,
          account.payment_method,
          account.notes,
          account.created_at
        ]
      );
      imported++;
    } catch (err) {
      console.error(`   ❌ Error importando cuenta corriente ${account.id}:`, err.message);
    }
  }

  console.log(`   ✓ ${imported}/${accounts.length} cuentas corrientes importadas`);
  return imported;
}

/**
 * Importa movimientos de caja
 */
async function importCashboxMovements(connection) {
  console.log('💵 Importando movimientos de caja...');

  const filename = path.join(exportDir, 'cashbox_movements.json');
  if (!fs.existsSync(filename)) {
    console.log('   ⚠ No hay datos de movimientos de caja para importar');
    return 0;
  }

  const movements = JSON.parse(fs.readFileSync(filename, 'utf8'));

  let imported = 0;
  for (const movement of movements) {
    try {
      await connection.execute(
        `INSERT INTO cashbox_movements (id, user_id, type, category, amount, description, reference, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movement.id,
          movement.user_id,
          movement.type,
          movement.category,
          movement.amount,
          movement.description,
          movement.reference,
          movement.created_at
        ]
      );
      imported++;
    } catch (err) {
      console.error(`   ❌ Error importando movimiento ${movement.id}:`, err.message);
    }
  }

  console.log(`   ✓ ${imported}/${movements.length} movimientos de caja importados`);
  return imported;
}

/**
 * Importa movimientos de cuenta
 */
async function importAccountMovements(connection) {
  console.log('📊 Importando movimientos de cuenta...');

  const filename = path.join(exportDir, 'account_movements.json');
  if (!fs.existsSync(filename)) {
    console.log('   ⚠ No hay datos de movimientos de cuenta para importar');
    return 0;
  }

  const movements = JSON.parse(fs.readFileSync(filename, 'utf8'));

  let imported = 0;
  for (const movement of movements) {
    try {
      await connection.execute(
        `INSERT INTO account_movements (id, client_id, sale_id, type, amount, balance_after, payment_method, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          movement.id,
          movement.client_id,
          movement.sale_id,
          movement.type,
          movement.amount,
          movement.balance_after,
          movement.payment_method,
          movement.notes,
          movement.created_at
        ]
      );
      imported++;
    } catch (err) {
      console.error(`   ❌ Error importando movimiento de cuenta ${movement.id}:`, err.message);
    }
  }

  console.log(`   ✓ ${imported}/${movements.length} movimientos de cuenta importados`);
  return imported;
}

/**
 * Función principal
 */
async function main() {
  // Verificar que existe el directorio de exportación
  if (!fs.existsSync(exportDir)) {
    console.error('❌ Error: No se encontró el directorio "data-export/"');
    console.error('   Asegúrate de haber transferido los datos exportados al servidor');
    process.exit(1);
  }

  // Conectar a MySQL
  console.log('🔌 Conectando a MySQL...');
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Conectado a MySQL\n');
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
    console.error('   Verifica las credenciales en el archivo .env');
    process.exit(1);
  }

  const results = {};

  try {
    // Importar en orden (respetando dependencias)
    results.users = await importUserProfiles(connection);
    results.clients = await importClients(connection);
    results.products = await importProducts(connection);
    results.sales = await importSales(connection);
    results.sale_items = await importSaleItems(connection);
    results.current_accounts = await importCurrentAccounts(connection);
    results.cashbox_movements = await importCashboxMovements(connection);
    results.account_movements = await importAccountMovements(connection);

    // Resumen
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE IMPORTACIÓN');
    console.log('═══════════════════════════════════════════════════\n');

    let total = 0;
    for (const [table, count] of Object.entries(results)) {
      console.log(`  ✓ ${table.padEnd(25)} ${count} registros`);
      total += count;
    }

    console.log('\n═══════════════════════════════════════════════════');
    console.log(`✓ Total de registros importados: ${total}`);
    console.log('═══════════════════════════════════════════════════\n');

    console.log('⚠ IMPORTANTE:');
    console.log('   Los usuarios importados tienen un hash de contraseña temporal.');
    console.log('   Deben restablecer sus contraseñas desde el panel de administración.\n');

    console.log('✓ Importación completada exitosamente\n');

  } catch (err) {
    console.error('❌ Error durante la importación:', err);
  } finally {
    await connection.end();
    console.log('🔌 Conexión cerrada');
  }
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
