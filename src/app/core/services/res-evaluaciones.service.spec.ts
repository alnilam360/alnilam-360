import { ResEvaluacionesService } from './res-evaluaciones.service';

/**
 * Tests unitarios para la función pura determinarTipoEvaluacion()
 * Regla Resolución 0312 de 2019:
 *   <= 10  empleados, riesgo I/II/III  => '7'
 *   11-50  empleados, riesgo I/II/III  => '21'
 *   >  50  empleados (cualquier riesgo) => '60'
 *   riesgo IV o V (cualquier tamaño)   => '60'
 */
describe('ResEvaluacionesService.determinarTipoEvaluacion', () => {

    // Instanciar sin inyectar dependencias: el método es puro
    const svc = new (ResEvaluacionesService as any)(null, null) as ResEvaluacionesService;
    const det = (n: number, r: string | null) =>
        svc.determinarTipoEvaluacion(n, r).tipo;

    // ── Grupo 7 ───────────────────────────────────────────────────────────────
    describe('Grupo 7 (≤10 trabajadores, riesgo I/II/III)', () => {
        it('1 trabajador riesgo I  → 7',  () => expect(det(1,  'I')).toBe('7'));
        it('10 trabajadores riesgo I → 7', () => expect(det(10, 'I')).toBe('7'));
        it('10 trabajadores riesgo II → 7',() => expect(det(10, 'II')).toBe('7'));
        it('10 trabajadores riesgo III→ 7',() => expect(det(10, 'III')).toBe('7'));
        it('0 trabajadores → 7 (borde)',  () => expect(det(0,  'II')).toBe('7'));
        it('riesgo en minúsculas → 7',    () => expect(det(5,  'ii')).toBe('7'));
        it('riesgo null → 7',             () => expect(det(5,  null)).toBe('7'));
        it('riesgo vacío → 7',            () => expect(det(5,  '')).toBe('7'));
    });

    // ── Grupo 21 ──────────────────────────────────────────────────────────────
    describe('Grupo 21 (11-50 trabajadores, riesgo I/II/III)', () => {
        it('11 trabajadores riesgo I → 21',  () => expect(det(11, 'I')).toBe('21'));
        it('11 trabajadores riesgo II → 21', () => expect(det(11, 'II')).toBe('21'));
        it('11 trabajadores riesgo III → 21',() => expect(det(11, 'III')).toBe('21'));
        it('50 trabajadores riesgo I → 21',  () => expect(det(50, 'I')).toBe('21'));
        it('50 trabajadores riesgo III → 21',() => expect(det(50, 'III')).toBe('21'));
        it('25 trabajadores riesgo II → 21', () => expect(det(25, 'II')).toBe('21'));
    });

    // ── Grupo 60 (>50 trabajadores) ───────────────────────────────────────────
    describe('Grupo 60 (>50 trabajadores, cualquier riesgo)', () => {
        it('51 trabajadores riesgo I → 60',   () => expect(det(51, 'I')).toBe('60'));
        it('51 trabajadores riesgo III → 60',  () => expect(det(51, 'III')).toBe('60'));
        it('100 trabajadores riesgo II → 60',  () => expect(det(100,'II')).toBe('60'));
        it('1000 trabajadores riesgo I → 60',  () => expect(det(1000,'I')).toBe('60'));
    });

    // ── Grupo 60 (riesgo IV o V, cualquier tamaño) ────────────────────────────
    describe('Grupo 60 (riesgo IV o V, cualquier tamaño)', () => {
        it('1 trabajador riesgo IV → 60',   () => expect(det(1,  'IV')).toBe('60'));
        it('10 trabajadores riesgo IV → 60', () => expect(det(10, 'IV')).toBe('60'));
        it('11 trabajadores riesgo IV → 60', () => expect(det(11, 'IV')).toBe('60'));
        it('50 trabajadores riesgo IV → 60', () => expect(det(50, 'IV')).toBe('60'));
        it('51 trabajadores riesgo IV → 60', () => expect(det(51, 'IV')).toBe('60'));
        it('1 trabajador riesgo V → 60',    () => expect(det(1,  'V')).toBe('60'));
        it('10 trabajadores riesgo V → 60',  () => expect(det(10, 'V')).toBe('60'));
        it('50 trabajadores riesgo V → 60',  () => expect(det(50, 'V')).toBe('60'));
        it('riesgo iv minúsculas → 60',     () => expect(det(5,  'iv')).toBe('60'));
        it('riesgo v minúsculas → 60',      () => expect(det(5,  'v')).toBe('60'));
    });

    // ── Borde III vs IV (riesgo crítico de clasificación) ─────────────────────
    describe('Borde riesgo III vs IV', () => {
        it('10 trabajadores riesgo III → 7  (no 60)', () => expect(det(10, 'III')).toBe('7'));
        it('10 trabajadores riesgo IV  → 60 (no 7)',  () => expect(det(10, 'IV')).toBe('60'));
        it('50 trabajadores riesgo III → 21 (no 60)', () => expect(det(50, 'III')).toBe('21'));
        it('50 trabajadores riesgo IV  → 60 (no 21)', () => expect(det(50, 'IV')).toBe('60'));
        it('11 trabajadores riesgo III → 21 (no 60)', () => expect(det(11, 'III')).toBe('21'));
        it('11 trabajadores riesgo IV  → 60 (no 21)', () => expect(det(11, 'IV')).toBe('60'));
    });

    // ── Entradas defensivas ───────────────────────────────────────────────────
    describe('Entradas defensivas', () => {
        it('decimales → trunca a entero', () => expect(det(10.9, 'I')).toBe('7'));
        it('negativos → trata como 0',   () => expect(det(-5,  'II')).toBe('7'));
        it('NaN → trata como 0',         () => expect(det(NaN, 'I')).toBe('7'));
        it('undefined nivel → no explota', () =>
            expect(svc.determinarTipoEvaluacion(5, undefined).tipo).toBe('7'));
    });

    // ── motivo es auditeable ──────────────────────────────────────────────────
    describe('Campo motivo (auditable)', () => {
        it('motivo no vacío para grupo 7',  () => expect(svc.determinarTipoEvaluacion(5, 'I').motivo.length).toBeGreaterThan(0));
        it('motivo no vacío para grupo 21', () => expect(svc.determinarTipoEvaluacion(20,'II').motivo.length).toBeGreaterThan(0));
        it('motivo no vacío para grupo 60', () => expect(svc.determinarTipoEvaluacion(51,'I').motivo.length).toBeGreaterThan(0));
        it('motivo menciona riesgo IV',     () => expect(svc.determinarTipoEvaluacion(5, 'IV').motivo).toContain('IV'));
    });
});
