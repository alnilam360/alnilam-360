import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { SaludService } from '../../services/salud.service';
import { AlertaVencimientoService } from '../../../../../core/services/alerta-vencimiento.service';
import { EstadoVencimientoInfo } from '../../../../../core/models/politica-sst.model';
import { SaludCoberturaRow } from '../../../../../core/models/salud.model';
import { PENDIENTE_LABEL, TIPO_EXAMEN_LABEL } from '../../funciones/etiquetas.funcion';

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

  readonly pendienteLabel = PENDIENTE_LABEL;
  readonly tipoLabel = TIPO_EXAMEN_LABEL;
  anio = new Date().getFullYear();
  loading = true;
  errorMsg: string | null = null;
  filas: FilaCobertura[] = [];
  pctVigente = 0;
  vencidos = 0;
  pendientes = 0;
  seleccionado: SaludCoberturaRow | null = null;

  ngOnInit(): Promise<void> { return this.cargar(); }

  async cargar(): Promise<void> {
    try {
      const rows = await this.svc.getCobertura(this.anio);
      this.filas = rows.map(row => ({ row, alerta: this.alertas.calcularAlerta(row.proximo) }));
      const vigentes = rows.filter(r => r.estado_vigencia === 'vigente' || r.estado_vigencia === 'por_vencer').length;
      this.pctVigente = rows.length ? Math.round((vigentes / rows.length) * 100) : 0;
      this.vencidos = rows.filter(r => r.estado_vigencia === 'vencido').length;
      this.pendientes = rows.filter(r => r.pendientes.length > 0).length;
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
