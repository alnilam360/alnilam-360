#!/usr/bin/env node
// Crea un plan + su tracker con el siguiente número libre.
// Uso: node tools/plan/nuevo-plan.mjs <slug> "<Título>"
import { readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR_PLANES = join(ROOT, 'gestion', 'fase_de_desarrollo');
const DIR_TRACKER = join(ROOT, 'gestion', 'tracker');

/** Normaliza un slug: minúsculas, sin acentos, guiones. */
export function slugify(texto) {
  return String(texto)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Extrae el NN inicial de un nombre de archivo, o null. */
export function numeroDe(nombre) {
  const m = /^(\d{2,})_/.exec(nombre);
  return m ? parseInt(m[1], 10) : null;
}

/** Siguiente número libre (max+1) mirando varios directorios. Devuelve string "NN". */
export function siguienteNumero(listas) {
  let max = 0;
  for (const lista of listas) {
    for (const nombre of lista) {
      const n = numeroDe(nombre);
      if (n !== null && n > max) max = n;
    }
  }
  return String(max + 1).padStart(2, '0');
}

function leerDir(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

export function cuerpoPlan({ num, slug, titulo, fecha }) {
  return `# Plan ${num} — ${titulo}

> Fecha: ${fecha} · Tracker: [gestion/tracker/${num}_${slug}.md](../tracker/${num}_${slug}.md)

## Objetivo
<!-- Qué resultado de negocio se logra. -->

## Enfoque arquitectónico
<!-- Decisión y trade-offs. Reglas que aplican (.claude/rules/...). -->

## Archivos a crear/modificar
<!-- ruta — qué cambia. Un archivo = un dueño. -->

## Cambios de BD / SQL / RLS
<!-- Migración AAAA_MM_DD_NN_<slug>.sql, policies, funciones. Idempotente. -->

## Reglas de negocio
<!-- Fórmulas, constantes, redondeos. -->

## Casos de prueba
<!-- Entradas → salida esperada, casos borde (0, null, negativos, .5, fin de mes). -->
`;
}

export function cuerpoTracker({ num, slug, titulo, fecha }) {
  return `# Tracker ${num} — ${titulo}

> Plan: [gestion/fase_de_desarrollo/${num}_${slug}_plan.md](../fase_de_desarrollo/${num}_${slug}_plan.md) · Iniciado: ${fecha}
> Estados: \`- [ ]\` pendiente · \`- [~]\` en curso · \`- [x]\` hecho. Única fuente de verdad.

## Checklist
- [ ] Diseño / contrato acordado
- [ ] Implementación
- [ ] Validación (build + lint + tests headless)
- [ ] Commit  <!-- marcar [x] con fecha, va en el mismo commit -->
`;
}

export function main(argv, hoy = new Date()) {
  const [slugRaw, titulo] = argv;
  if (!slugRaw || !titulo) {
    console.error('Uso: node tools/plan/nuevo-plan.mjs <slug> "<Título>"');
    process.exit(1);
  }
  const slug = slugify(slugRaw);
  const num = siguienteNumero([leerDir(DIR_PLANES), leerDir(DIR_TRACKER)]);
  const fecha = hoy.toISOString().slice(0, 10);

  mkdirSync(DIR_PLANES, { recursive: true });
  mkdirSync(DIR_TRACKER, { recursive: true });
  const planPath = join(DIR_PLANES, `${num}_${slug}_plan.md`);
  const trackerPath = join(DIR_TRACKER, `${num}_${slug}.md`);
  if (existsSync(planPath) || existsSync(trackerPath)) {
    console.error(`Ya existe un plan/tracker con número ${num}; abortando.`);
    process.exit(1);
  }
  writeFileSync(planPath, cuerpoPlan({ num, slug, titulo, fecha }));
  writeFileSync(trackerPath, cuerpoTracker({ num, slug, titulo, fecha }));
  console.log(`Creado plan:    gestion/fase_de_desarrollo/${num}_${slug}_plan.md`);
  console.log(`Creado tracker: gestion/tracker/${num}_${slug}.md`);
  return { num, slug, planPath, trackerPath };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('nuevo-plan.mjs')) {
  main(process.argv.slice(2));
}
