import { readFileSync } from 'node:fs';
import pg from 'pg';
const env = {};
for (const line of readFileSync('.env','utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
  if (m) env[m[1]] = (m[2]||'').replace(/^["']|["']$/g,'');
}
const c = new pg.Client({ connectionString: env.DATABASE_URL });
await c.connect();
const q = async (s,p=[]) => (await c.query(s,p)).rows;

const has = async (t) => (await q(`select to_regclass($1) is not null as p`,[`public.${t}`]))[0].p;
console.log('');
console.log('  טבלאות:');
for (const t of ['networking_profiles','networking_profiles_links','participants_links','networking_blocks','networking_reports']) {
  console.log(`    ${t.padEnd(28)} ${await has(t) ? 'קיימת' : '—'}`);
}
console.log('');
console.log('  עמודות ב-participants:');
for (const col of ['headline','bio','interests','contact_prefs_directory','contact_prefs_meetings']) {
  const r = await q(`select 1 from information_schema.columns where table_name='participants' and column_name=$1`,[col]);
  console.log(`    ${col.padEnd(28)} ${r.length ? 'קיימת' : '—'}`);
}
if (await has('networking_profiles')) {
  const [{n}] = await q(`select count(*)::int n from networking_profiles`);
  console.log('');
  console.log(`  שורות ב-networking_profiles: ${n}`);
}
console.log('');
console.log('  מיגרציות שרצו:');
for (const r of await q(`select name, batch from payload_migrations order by id`)) {
  console.log(`    ${String(r.name).padEnd(24)} batch ${r.batch}`);
}
console.log('');
console.log('  אילוצים על payload_locked_documents_rels שמזכירים networking:');
for (const r of await q(
  `select conname from pg_constraint
    where conrelid = 'public.payload_locked_documents_rels'::regclass
      and conname like '%networking%' order by conname`)) {
  console.log('    ' + r.conname);
}
console.log('');
console.log('  עמודות networking_* ב-payload_locked_documents_rels:');
for (const r of await q(
  `select column_name from information_schema.columns
    where table_name='payload_locked_documents_rels' and column_name like '%networking%'
    order by column_name`)) {
  console.log('    ' + r.column_name);
}
console.log('');
await c.end();
