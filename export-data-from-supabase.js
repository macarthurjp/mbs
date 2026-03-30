/**
 * Script para EXPORTAR datos de Supabase a archivos JSON
 * Ejecutar ANTES del despliegue en producción
 *
 * Uso: node export-data-from-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY requeridas en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Directorio de exportación
const exportDir = path.join(__dirname, 'data-export');
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

console.log('🚀 Iniciando exportación de datos de Supabase...\n');

/**
 * Exporta una tabla completa
 */
async function exportTable(tableName, orderBy = 'created_at') {
  console.log(`📦 Exportando tabla: ${tableName}...`);

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderBy, { ascending: true });

    if (error) {
      console.error(`   ❌ Error en ${tableName}:`, error.message);
      return { success: false, count: 0 };
    }

    const filename = path.join(exportDir, `${tableName}.json`);
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));

    console.log(`   ✓ ${data.length} registros exportados a ${tableName}.json`);
    return { success: true, count: data.length };
  } catch (err) {
    console.error(`   ❌ Error inesperado en ${tableName}:`, err.message);
    return { success: false, count: 0 };
  }
}

/**
 * Función principal
 */
async function main() {
  const results = {};

  // Orden de exportación (respetando dependencias)
  const tables = [
    { name: 'user_profiles', order: 'created_at' },
    { name: 'clients', order: 'created_at' },
    { name: 'products', order: 'created_at' },
    { name: 'sales', order: 'created_at' },
    { name: 'sale_items', order: 'created_at' },
    { name: 'current_accounts', order: 'created_at' },
    { name: 'cashbox_movements', order: 'created_at' },
    { name: 'account_movements', order: 'created_at' }
  ];

  for (const table of tables) {
    const result = await exportTable(table.name, table.order);
    results[table.name] = result;
  }

  // Resumen
  console.log('\n═══════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE EXPORTACIÓN');
  console.log('═══════════════════════════════════════════════════\n');

  let totalRecords = 0;
  for (const [table, result] of Object.entries(results)) {
    const status = result.success ? '✓' : '✗';
    console.log(`  ${status} ${table.padEnd(25)} ${result.count} registros`);
    totalRecords += result.count;
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`✓ Total de registros exportados: ${totalRecords}`);
  console.log(`✓ Archivos guardados en: ${exportDir}`);
  console.log('═══════════════════════════════════════════════════\n');

  // Crear archivo de metadatos
  const metadata = {
    export_date: new Date().toISOString(),
    source: 'Supabase',
    tables: results,
    total_records: totalRecords
  };

  fs.writeFileSync(
    path.join(exportDir, '_metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log('✓ Exportación completada\n');
  console.log('📝 SIGUIENTE PASO:');
  console.log('   Transfiere la carpeta "data-export/" al servidor:');
  console.log('   rsync -avz data-export/ root@servidor:/opt/boutique-pos/data-export/\n');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
