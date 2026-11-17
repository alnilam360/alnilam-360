import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { SaludService } from '../../services/salud.service';
import { AlertaVencimientoService } from '../../../../../core/services/alerta-vencimiento.service';
import { EstadoVencimientoInfo } from '../../../../../core/models/politica-sst.model';
import { SaludCoberturaRow, SaludDiagnosticoRow } from '../../../../../core/models/salud.model';
import { SedesService } from '../../../../../core/services/sedes.service';
import { TenantService } from '../../../../../core/services/tenant.service';
import { Sede } from '../../../../../core/models/models';
import { PENDIENTE_LABEL, TIPO_EXAMEN_LABEL } from '../../funciones/etiquetas.funcion';

const sinTildes = (t: string): string => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface FilaCobertura { row: SaludCoberturaRow; alerta: EstadoVencimientoInfo; }

@Component({
  selector: 'app-salud-dashboard',
  templateUrl: './salud-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class SaludDashboardComponent implements OnInit {
  private svc = inject(SaludService);
  private alertas = inject(AlertaVencimientoService);
  private cdr = inject(ChangeDetectorRef);
  private sedesSvc = inject(SedesService);
  private tenant = inject(TenantService);

  readonly pendienteLabel = PENDIENTE_LABEL;
  readonly tipoLabel = TIPO_EXAMEN_LABEL;
  anio = new Date().getFullYear();
  readonly anios = Array.from({ length: 6 }, (_, i) => this.anio - 4 + i);
  sedes: Sede[] = [];
  sedeId = '';
  busqueda = '';
  filasVisibles: FilaCobertura[] = [];
  loading = true;
  errorMsg: string | null = null;
  filas: FilaCobertura[] = [];
  pctVigente = 0;
  vencidos = 0;
  pendientes = 0;
  seleccionado: SaludCoberturaRow | null = null;
  diagnostico: SaludDiagnosticoRow[] = [];

  async ngOnInit(): Promise<void> {
    await Promise.all([this.cargar(), this.cargarSedes()]);
  }

  private async cargarSedes(): Promise<void> {
    try {
      const empresaId = await this.tenant.getEmpresaTenantId();
      if (empresaId) this.sedes = await this.sedesSvc.getSedesByEmpresa(empresaId);
    } catch {
      this.sedes = []; // el filtro de sede es opcional: no rompe el dashboard
    }
    this.cdr.detectChanges();
  }

  onAnio(valor: string): void { this.anio = Number(valor); this.loading = true; void this.cargar(); }
  onSede(valor: string): void { this.sedeId = valor; this.aplicarFiltros(); }
  onBusqueda(valor: string): void { this.busqueda = valor; this.aplicarFiltros(); }

  aplicarFiltros(): void {
    const q = sinTildes(this.busqueda.trim());
    this.filasVisibles = this.filas.filter(({ row }) =>
      (!this.sedeId || row.sede_id === this.sedeId) &&
      (!q || sinTildes(row.nombre ?? '').includes(q) || sinTildes(row.cargo ?? '').includes(q)));
    const rows = this.filasVisibles.map(f => f.row);
    const vigentes = rows.filter(r => r.estado_vigencia === 'vigente' || r.estado_vigencia === 'por_vencer').length;
    this.pctVigente = rows.length ? Math.round((vigentes / rows.length) * 100) : 0;
    this.vencidos = rows.filter(r => r.estado_vigencia === 'vencido').length;
    this.pendientes = rows.filter(r => r.pendientes.length > 0).length;
  }

  async cargar(): Promise<void> {
    try {
      // el diagnóstico es complementario: si falla, queda [] y no rompe el dashboard
      const [rows, diag] = await Promise.all([
        this.svc.getCobertura(this.anio),
        this.svc.getDiagnostico(this.anio).catch((): SaludDiagnosticoRow[] => []),
      ]);
      this.diagnostico = diag;
      this.filas = rows.map(row => ({ row, alerta: this.alertas.calcularAlerta(row.proximo) }));
      this.aplicarFiltros();
      this.errorMsg = null;
    } catch (e) {
      this.errorMsg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error cargando la cobertura de exámenes.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // la promesa resuelve fuera de la zona (sesión Supabase)
    }
  }

  trackByTrabajador(_: number, f: FilaCobertura): string { return f.row.trabajador_id; }
}
