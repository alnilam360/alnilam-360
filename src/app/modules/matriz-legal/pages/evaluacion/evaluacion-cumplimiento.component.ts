import { Component, OnInit, inject, signal } from '@angular/core';
import { TenantService } from '../../../../core/services/tenant.service';
import { MatrizLegalService } from '../../../../core/services/matriz-legal.service';
import { Empresa } from '../../../../core/models/models';
import {
  EvaluacionCumplimiento,
  EstadoCumplimiento,
  ESTADO_LABEL,
  DOMINIO_LABEL,
} from '../../../../core/models/matriz-legal.model';

@Component({
  selector: 'app-evaluacion-cumplimiento',
  standalone: false,
  templateUrl: './evaluacion-cumplimiento.component.html',
  styleUrls: ['./evaluacion-cumplimiento.component.scss'],
})
export class EvaluacionCumplimientoComponent implements OnInit {
  private tenant = inject(TenantService);
  private service = inject(MatrizLegalService);

  readonly DOMINIO_LABEL = DOMINIO_LABEL;
  readonly ESTADO_LABEL = ESTADO_LABEL;
  /** Filas visibles del tablero (TOTAL se muestra aparte). */
  readonly estadosFila: EstadoCumplimiento[] = ['CUMPLE', 'EN_PROCESO', 'NO_CUMPLE', 'NO_APLICA'];

  cargando = signal<boolean>(true);
  esAdmin = signal<boolean>(false);
  empresas = signal<Empresa[]>([]);
  empresaId = signal<string>('');
  evaluacion = signal<EvaluacionCumplimiento | null>(null);

  async ngOnInit(): Promise<void> {
    this.esAdmin.set(await this.tenant.isAdministrador());
    const lista = await this.tenant.listarEmpresasDisponibles();
    this.empresas.set(lista);
    let empId = (await this.tenant.getEmpresaTenantId()) || '';
    if (!empId && lista.length > 0) empId = lista[0].id || '';
    this.empresaId.set(empId);
    await this.cargar();
  }

  async onEmpresaChange(id: string): Promise<void> {
    this.empresaId.set(id);
    await this.cargar();
  }

  async cargar(): Promise<void> {
    const empId = this.empresaId();
    if (!empId) { this.cargando.set(false); return; }
    this.cargando.set(true);
    try {
      this.evaluacion.set(await this.service.obtenerEvaluacion(empId));
    } catch (e) {
      console.error('Error cargando evaluación de cumplimiento:', e);
    } finally {
      this.cargando.set(false);
    }
  }

  pct(valor: number | null): string {
    return valor == null ? '—' : `${(valor * 100).toFixed(1)}%`;
  }

  /** Clase de color según nivel de cumplimiento (semáforo). */
  pctClase(valor: number | null): string {
    if (valor == null) return 'is-null';
    if (valor >= 0.9) return 'is-ok';
    if (valor >= 0.7) return 'is-warn';
    return 'is-bad';
  }
}
