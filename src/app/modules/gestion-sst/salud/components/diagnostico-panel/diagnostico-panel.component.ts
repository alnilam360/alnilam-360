import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { SaludDiagnosticoRow } from '../../../../../core/models/salud.model';

const ETIQUETAS: Record<string, Record<string, string>> = {
  aptitud: { apto: 'Apto', apto_con_restricciones: 'Apto con restricciones', aplazado: 'Aplazado', remitido: 'Remitido', sin_concepto: 'Sin concepto' },
  vigencia: { vigente: 'Vigente', por_vencer: 'Por vencer', vencido: 'Vencido', sin_examen: 'Sin examen' },
  restricciones: { activas: 'Restricciones activas', recomendaciones_activas: 'Recomendaciones activas' },
  poblacion: { activos: 'Trabajadores activos' },
};

export interface ItemDiagnostico { clave: string; etiqueta: string; n: number; pct: number; }
export interface GruposDiagnostico {
  aptitud: ItemDiagnostico[]; vigencia: ItemDiagnostico[];
  restricciones: ItemDiagnostico[]; poblacion: ItemDiagnostico[];
}

@Component({
  selector: 'app-diagnostico-panel',
  templateUrl: './diagnostico-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DiagnosticoPanelComponent implements OnChanges {
  @Input() filas: SaludDiagnosticoRow[] = [];

  grupos: GruposDiagnostico = { aptitud: [], vigencia: [], restricciones: [], poblacion: [] };
  vacio = true;

  ngOnChanges(): void {
    const g: GruposDiagnostico = { aptitud: [], vigencia: [], restricciones: [], poblacion: [] };
    for (const cat of Object.keys(g) as (keyof GruposDiagnostico)[]) {
      const delGrupo = this.filas.filter(f => f.categoria === cat && ETIQUETAS[cat][f.subcategoria]);
      const total = delGrupo.reduce((s, f) => s + f.n, 0);
      g[cat] = delGrupo.map(f => ({
        clave: f.subcategoria, etiqueta: ETIQUETAS[cat][f.subcategoria], n: f.n,
        pct: total ? Math.round((f.n / total) * 100) : 0, // solo para el ancho de la barra
      }));
    }
    this.grupos = g;
    this.vacio = this.filas.every(f => !f.n);
  }

  trackByClave(_: number, i: ItemDiagnostico): string { return i.clave; }
}
