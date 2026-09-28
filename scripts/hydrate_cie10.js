const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://waxskthuhlynvsjxgczc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndheHNrdGh1aGx5bnZzanhnY3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MjgzMzgsImV4cCI6MjA4ODAwNDMzOH0.PiH_6OT1_eUwah_FjaMCG4lpwOhvkmvoq59Eq5PnAIM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FRECUENTES = new Set([
  'G560', 'M545', 'M544', 'M542', 'M511', 'M512', 'M654', 'M658', 'M659',
  'M770', 'M771', 'M751', 'M750', 'M752', 'M700', 'H903', 'H905', 'H833',
  'J450', 'J459', 'J60', 'J61', 'L230', 'L240', 'L250', 'F430', 'F431',
  'F412', 'F329', 'S600', 'S601', 'S610', 'S626', 'S630', 'S934', 'S900',
  'S910', 'S920', 'S835', 'S800', 'S810', 'S820', 'S000', 'S050', 'T140', 'T143'
]);

async function main() {
  console.log('Reading Indicadores AT-EL LIFERAN.xlsx...');
  const wb = XLSX.readFile('Indicadores AT-EL LIFERAN.xlsx');
  const ws = wb.Sheets['Código del Diagnóstico'];
  if (!ws) throw new Error('Sheet "Código del Diagnóstico" not found');

  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log('Total rows in sheet:', data.length);

  const records = [];
  const seen = new Set();

  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0] || !row[1]) continue;
    const codigo = String(row[0]).trim().toUpperCase();
    const descripcion = String(row[1]).trim().toUpperCase();

    if (seen.has(codigo)) continue;
    seen.add(codigo);

    const capitulo = codigo.length > 0 ? codigo[0] : null;
    const es_frecuente = FRECUENTES.has(codigo);

    records.push({
      codigo,
      descripcion,
      capitulo,
      es_frecuente,
      activo: true
    });
  }

  console.log(`Parsed ${records.length} unique CIE-10 records.`);

  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('catalogo_cie10')
      .upsert(batch, { onConflict: 'codigo' });

    if (error) {
      console.error(`Error in batch ${i} - ${i + batch.length}:`, error);
      throw error;
    }

    inserted += batch.length;
    console.log(`Progress: ${inserted}/${records.length} (${Math.round((inserted/records.length)*100)}%)`);
  }

  console.log('\nHydration completed successfully!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
