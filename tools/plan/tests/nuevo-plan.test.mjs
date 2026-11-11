// Test del generador de planes. Correr: node --test tools/plan/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify, numeroDe, siguienteNumero, cuerpoPlan, cuerpoTracker
} from '../nuevo-plan.mjs';

test('slugify: minúsculas, sin acentos, guiones', () => {
  assert.equal(slugify('Matriz de Peligros IPERC'), 'matriz-de-peligros-iperc');
  assert.equal(slugify('  Acción  Legal  '), 'accion-legal');
  assert.equal(slugify('ya-es-slug'), 'ya-es-slug');
});

test('numeroDe: extrae NN inicial o null', () => {
  assert.equal(numeroDe('01_matriz_plan.md'), 1);
  assert.equal(numeroDe('12_algo.md'), 12);
  assert.equal(numeroDe('sin-numero.md'), null);
});

test('siguienteNumero: 01 cuando no hay nada', () => {
  assert.equal(siguienteNumero([[], []]), '01');
});

test('siguienteNumero: max+1 entre ambos directorios, sin repetir', () => {
  const planes = ['01_a_plan.md', '03_c_plan.md'];
  const trackers = ['02_b.md', '03_c.md'];
  assert.equal(siguienteNumero([planes, trackers]), '04');
});

test('siguienteNumero: ignora archivos sin número', () => {
  assert.equal(siguienteNumero([['README.md', '05_x_plan.md'], []]), '06');
});

test('cuerpoTracker: el último ítem del checklist es Commit', () => {
  const t = cuerpoTracker({ num: '07', slug: 'demo', titulo: 'Demo', fecha: '2026-11-11' });
  const items = t.split('\n').filter((l) => l.trim().startsWith('- ['));
  assert.ok(items.length >= 1);
  assert.match(items.at(-1), /Commit/);
  assert.match(t, /07_demo_plan\.md/); // enlaza al plan
});

test('cuerpoPlan: enlaza al tracker y trae las secciones clave', () => {
  const p = cuerpoPlan({ num: '07', slug: 'demo', titulo: 'Demo', fecha: '2026-11-11' });
  assert.match(p, /07_demo\.md/);
  for (const sec of ['Objetivo', 'Cambios de BD', 'Casos de prueba']) {
    assert.ok(p.includes(sec), `falta sección ${sec}`);
  }
});
