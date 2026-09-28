import { Component, OnInit, signal } from '@angular/core';
import { TenantService } from '../../../../core/services/tenant.service';
import { Empresa } from '../../../../core/models/models';

export interface ItemEPR {
  id: string;
  categoria: 'Estructura' | 'Proceso' | 'Resultado';
  num: number;
  descripcion: string;
  estado: 'Cumple' | 'No Cumple' | 'No Aplica';
  observacion?: string;
}

const ITEMS_BASE_EPR: Omit<ItemEPR, 'estado' | 'observacion'>[] = [
  // ESTRUCTURA (11 ítems según Excel y Decreto 1072)
  { id: 'E1', categoria: 'Estructura', num: 1, descripcion: 'La política de seguridad y salud en el trabajo y que esté comunicada al COPASST' },
  { id: 'E2', categoria: 'Estructura', num: 2, descripcion: 'Los objetivos y metas de seguridad y salud en el trabajo' },
  { id: 'E3', categoria: 'Estructura', num: 3, descripcion: 'El plan de trabajo anual en seguridad y salud en el trabajo y su cronograma' },
  { id: 'E4', categoria: 'Estructura', num: 4, descripcion: 'La asignación de responsabilidades de los distintos niveles de la empresa' },
  { id: 'E5', categoria: 'Estructura', num: 5, descripcion: 'La asignación de recursos humanos, físicos y financieros para el SG-SST' },
  { id: 'E6', categoria: 'Estructura', num: 6, descripcion: 'La definición del método para identificar los peligros y evaluar y valorar los riesgos' },
  { id: 'E7', categoria: 'Estructura', num: 7, descripcion: 'La conformación y funcionamiento del COPASST o Vigía de SST' },
  { id: 'E8', categoria: 'Estructura', num: 8, descripcion: 'Los documentos que soportan el SG-SST debidamente actualizados y disponibles' },
  { id: 'E9', categoria: 'Estructura', num: 9, descripcion: 'La existencia de un plan para la prevención, preparación y respuesta ante emergencias' },
  { id: 'E10', categoria: 'Estructura', num: 10, descripcion: 'La matriz de requisitos legales aplicables debidamente actualizada' },
  { id: 'E11', categoria: 'Estructura', num: 11, descripcion: 'El programa de capacitación anual en SST con inducción y reinducción' },

  // PROCESO (7 ítems según Excel)
  { id: 'P1', categoria: 'Proceso', num: 1, descripcion: 'Evaluación inicial del Sistema de Gestión de la Seguridad y Salud en el Trabajo' },
  { id: 'P2', categoria: 'Proceso', num: 2, descripcion: 'Ejecución del plan de trabajo anual en SST frente a lo programado' },
  { id: 'P3', categoria: 'Proceso', num: 3, descripcion: 'Ejecución del programa de capacitación en SST frente a lo programado' },
  { id: 'P4', categoria: 'Proceso', num: 4, descripcion: 'Intervención de los peligros identificados y los riesgos priorizados' },
  { id: 'P5', categoria: 'Proceso', num: 5, descripcion: 'Evaluación de las condiciones de salud y de trabajo de la población trabajadora' },
  { id: 'P6', categoria: 'Proceso', num: 6, descripcion: 'Ejecución de las acciones preventivas, correctivas y de mejora' },
  { id: 'P7', categoria: 'Proceso', num: 7, descripcion: 'Investigación de los incidentes, accidentes de trabajo y enfermedades laborales' },

  // RESULTADO (6 ítems según Excel)
  { id: 'R1', categoria: 'Resultado', num: 1, descripcion: 'Cumplimiento de los objetivos en seguridad y salud en el trabajo' },
  { id: 'R2', categoria: 'Resultado', num: 2, descripcion: 'Cumplimiento del plan de trabajo anual en SST al cierre del año' },
  { id: 'R3', categoria: 'Resultado', num: 3, descripcion: 'Evaluación de las no conformidades detectadas en las auditorías' },
  { id: 'R4', categoria: 'Resultado', num: 4, descripcion: 'Comportamiento de la frecuencia y severidad de los accidentes de trabajo' },
  { id: 'R5', categoria: 'Resultado', num: 5, descripcion: 'Comportamiento del ausentismo laboral por causas médicas y laborales' },
  { id: 'R6', categoria: 'Resultado', num: 6, descripcion: 'Revisión por la alta dirección y planes de mejora derivados' }
];

type TabEPR = 'evaluacion' | 'indicadores' | 'analisis';

@Component({
  selector: 'app-sg-sst-epr',
  standalone: false,
  templateUrl: './sg-sst-epr.component.html',
  styleUrls: ['./sg-sst-epr.component.scss']
})
export class SgSstEprComponent implements OnInit {
  readonly inicializando = signal(true);
  readonly esAdmin = signal(false);
  readonly empresas = signal<Empresa[]>([]);
  readonly empresaId = signal<string | null>(null);
  readonly anio = signal<number>(new Date().getFullYear());
  readonly tab = signal<TabEPR>('indicadores');

  readonly aniosDisponibles: number[] = [];

  items: ItemEPR[] = [];
  filtroCategoria: 'Todos' | 'Estructura' | 'Proceso' | 'Resultado' = 'Todos';

  constructor(private tenant: TenantService) {
    const y = new Date().getFullYear();
    for (let a = y; a >= y - 4; a--) this.aniosDisponibles.push(a);
  }

  async ngOnInit(): Promise<void> {
    this.esAdmin.set(await this.tenant.isAdministrador());
    this.empresas.set(await this.tenant.listarEmpresasDisponibles());

    if (this.esAdmin()) {
      this.empresaId.set(this.empresas()[0]?.id ?? null);
    } else {
      this.empresaId.set(await this.tenant.getEmpresaTenantId());
    }

    this.cargarItems();
    this.inicializando.set(false);
  }

  cargarItems(): void {
    const key = `epr_eval_${this.empresaId()}_${this.anio()}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        this.items = JSON.parse(saved);
        return;
      } catch (e) {}
    }

    this.items = ITEMS_BASE_EPR.map(b => ({
      ...b,
      estado: 'Cumple',
      observacion: ''
    }));
  }

  guardarEvaluacion(): void {
    const key = `epr_eval_${this.empresaId()}_${this.anio()}`;
    localStorage.setItem(key, JSON.stringify(this.items));
    alert('Evaluación E-P-R guardada correctamente');
  }

  // Cálculos porcentuales según Excel
  pctCategoria(cat: 'Estructura' | 'Proceso' | 'Resultado'): number {
    const subset = this.items.filter(i => i.categoria === cat && i.estado !== 'No Aplica');
    if (subset.length === 0) return 100;
    const cumplidos = subset.filter(i => i.estado === 'Cumple').length;
    return Number(((cumplidos / subset.length) * 100).toFixed(1));
  }

  get pctEstructura(): number { return this.pctCategoria('Estructura'); }
  get pctProceso(): number { return this.pctCategoria('Proceso'); }
  get pctResultado(): number { return this.pctCategoria('Resultado'); }

  get pctGlobal(): number {
    const aplicables = this.items.filter(i => i.estado !== 'No Aplica');
    if (aplicables.length === 0) return 100;
    const cumplidos = aplicables.filter(i => i.estado === 'Cumple').length;
    return Number(((cumplidos / aplicables.length) * 100).toFixed(1));
  }

  get filteredItems(): ItemEPR[] {
    if (this.filtroCategoria === 'Todos') return this.items;
    return this.items.filter(i => i.categoria === this.filtroCategoria);
  }
}
