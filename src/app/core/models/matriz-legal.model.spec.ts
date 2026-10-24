import {
  MatrizLegalComponente,
  MatrizLegalRequisito,
  conteosVacios,
  contarPorEstado,
  construirEvaluacion,
  porcentajeCumplimiento,
  totalAplicable,
} from './matriz-legal.model';

// Dataset sintético (NO los valores del Excel del cliente).
function comp(id: string, dominio: 'SG_SST' | 'AMBIENTAL', nombre: string, orden = 0): MatrizLegalComponente {
  return { id, empresa_id: null, dominio, nombre, orden, activo: true };
}

function req(componente_id: string, estado: MatrizLegalRequisito['estado_cumplimiento']): MatrizLegalRequisito {
  return {
    empresa_id: 'e1',
    componente_id,
    tipo_norma_id: null,
    numero: null, anio: null, fecha_expedicion: null, entidad_emisora: null,
    articulos_aplicables: null, descripcion_requisito: 'x', aplicacion_empresa: null,
    estado_cumplimiento: estado, evidencia_cumplimiento: null, responsable: null,
    fecha_verificacion: null, observaciones: null, es_otra_indole: false,
    vigente: true, norma_deroga: null,
  };
}

describe('matriz-legal.model — funciones puras', () => {
  it('totalAplicable excluye NO_APLICA', () => {
    const c = { CUMPLE: 4, EN_PROCESO: 1, NO_CUMPLE: 1, NO_APLICA: 10 };
    expect(totalAplicable(c)).toBe(6);
  });

  it('porcentajeCumplimiento = CUMPLE / total aplicable', () => {
    expect(porcentajeCumplimiento({ CUMPLE: 3, EN_PROCESO: 0, NO_CUMPLE: 1, NO_APLICA: 5 })).toBeCloseTo(0.75, 5);
  });

  it('porcentajeCumplimiento devuelve null sin requisitos aplicables (guard división por cero)', () => {
    expect(porcentajeCumplimiento(conteosVacios())).toBeNull();
    expect(porcentajeCumplimiento({ CUMPLE: 0, EN_PROCESO: 0, NO_CUMPLE: 0, NO_APLICA: 7 })).toBeNull();
  });

  it('contarPorEstado agrupa correctamente', () => {
    const r = [req('a', 'CUMPLE'), req('a', 'CUMPLE'), req('a', 'NO_CUMPLE'), req('a', 'NO_APLICA')];
    expect(contarPorEstado(r)).toEqual({ CUMPLE: 2, EN_PROCESO: 0, NO_CUMPLE: 1, NO_APLICA: 1 });
  });

  it('construirEvaluacion agrupa por dominio y calcula totales', () => {
    const componentes = [
      comp('sg1', 'SG_SST', 'ATEL', 10),
      comp('sg2', 'SG_SST', 'Emergencias', 20),
      comp('am1', 'AMBIENTAL', 'Agua', 10),
    ];
    const reqs = [
      req('sg1', 'CUMPLE'), req('sg1', 'CUMPLE'), req('sg1', 'EN_PROCESO'),
      req('sg2', 'NO_CUMPLE'),
      req('am1', 'CUMPLE'), req('am1', 'NO_APLICA'),
    ];

    const ev = construirEvaluacion(reqs, componentes);

    const sg = ev.porDominio.find(d => d.dominio === 'SG_SST')!;
    expect(sg.componentes.length).toBe(2);
    expect(sg.conteos).toEqual({ CUMPLE: 2, EN_PROCESO: 1, NO_CUMPLE: 1, NO_APLICA: 0 });
    expect(sg.totalAplicable).toBe(4);
    expect(sg.porcentajeCumplimiento).toBeCloseTo(0.5, 5);

    const am = ev.porDominio.find(d => d.dominio === 'AMBIENTAL')!;
    expect(am.totalAplicable).toBe(1);            // NO_APLICA excluido
    expect(am.porcentajeCumplimiento).toBeCloseTo(1, 5);

    // Gran total
    expect(ev.totalConteos).toEqual({ CUMPLE: 3, EN_PROCESO: 1, NO_CUMPLE: 1, NO_APLICA: 1 });
    expect(ev.totalAplicable).toBe(5);
    expect(ev.porcentajeCumplimiento).toBeCloseTo(3 / 5, 5);
  });

  it('componente sin requisitos aparece con conteos en cero y % null', () => {
    const componentes = [comp('sg1', 'SG_SST', 'ATEL', 10)];
    const ev = construirEvaluacion([], componentes);
    const sg = ev.porDominio.find(d => d.dominio === 'SG_SST')!;
    expect(sg.componentes[0].totalAplicable).toBe(0);
    expect(sg.componentes[0].porcentajeCumplimiento).toBeNull();
  });
});
