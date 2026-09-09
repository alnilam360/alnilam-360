import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TenantService } from '../../../../core/services/tenant.service';
import { Empresa } from '../../../../core/models/models';
import { FiltrosCaso } from '../../../../core/models/matriz-at.model';

type Tab = 'matriz' | 'indicadores' | 'parametros';

@Component({
  selector: 'app-accidentalidad-shell',
  standalone: false,
  templateUrl: './accidentalidad-shell.component.html',
})
export class AccidentalidadShellComponent implements OnInit {
  readonly inicializando = signal(true);
  readonly esAdmin = signal(false);
  readonly empresas = signal<Empresa[]>([]);
  readonly empresaId = signal<string | null>(null);
  readonly anio = signal<number>(new Date().getFullYear());
  readonly tab = signal<Tab>('indicadores');
  readonly filtroMatriz = signal<FiltrosCaso>({});
  /** Este módulo solo cubre accidentalidad; otras rutas de indicadores siguen pendientes. */
  readonly soportado = signal(true);

  readonly aniosDisponibles: number[] = [];

  constructor(private tenant: TenantService, private route: ActivatedRoute) {
    const y = new Date().getFullYear();
    for (let a = y; a >= y - 4; a--) this.aniosDisponibles.push(a);
  }

  async ngOnInit(): Promise<void> {
    const tipo = this.route.snapshot.data['tipo'];
    this.soportado.set(tipo === 'matriz' || tipo === 'indicadores');
    this.tab.set(tipo === 'matriz' ? 'matriz' : 'indicadores');
    if (!this.soportado()) { this.inicializando.set(false); return; }

    this.esAdmin.set(await this.tenant.isAdministrador());
    this.empresas.set(await this.tenant.listarEmpresasDisponibles());

    if (this.esAdmin()) {
      this.empresaId.set(this.empresas()[0]?.id ?? null);
    } else {
      this.empresaId.set(await this.tenant.getEmpresaTenantId());
    }
    this.inicializando.set(false);
  }

  /** Drill-down desde el tablero: abre la matriz filtrada por área o parte del cuerpo. */
  nombreEmpresa(): string {
    return this.empresas().find((e) => e.id === this.empresaId())?.nombre ?? '';
  }

  onDrill(ev: { tipo: 'area'; value: string } | { tipo: 'parte'; ids: string[]; zona: string }): void {
    if (ev.tipo === 'area') this.filtroMatriz.set({ areaProceso: ev.value });
    else this.filtroMatriz.set({ parteCuerpoIds: ev.ids, parteCuerpoZona: ev.zona });
    this.tab.set('matriz');
  }
}
