import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TenantService } from '../../../../core/services/tenant.service';
import { MatrizLegalService } from '../../../../core/services/matriz-legal.service';
import { Empresa } from '../../../../core/models/models';
import {
  DOMINIOS,
  DOMINIO_LABEL,
  Dominio,
  EvaluacionCumplimiento,
  MatrizLegalConfig,
  ResumenDominio,
} from '../../../../core/models/matriz-legal.model';

@Component({
  selector: 'app-matriz-legal-dashboard',
  standalone: false,
  templateUrl: './matriz-legal-dashboard.component.html',
  styleUrls: ['./matriz-legal-dashboard.component.scss'],
})
export class MatrizLegalDashboardComponent implements OnInit {
  private tenant = inject(TenantService);
  private service = inject(MatrizLegalService);
  private router = inject(Router);

  readonly DOMINIO_LABEL = DOMINIO_LABEL;

  cargando = signal<boolean>(true);
  guardandoConfig = signal<boolean>(false);
  esAdmin = signal<boolean>(false);

  empresas = signal<Empresa[]>([]);
  empresaId = signal<string>('');

  evaluacion = signal<EvaluacionCumplimiento | null>(null);
  config = signal<MatrizLegalConfig | null>(null);

  // Formulario del encabezado (hoja MENU).
  editandoEncabezado = signal<boolean>(false);
  formConfig = signal<MatrizLegalConfig>(this.configVacia(''));

  dominios: Dominio[] = [...DOMINIOS];

  async ngOnInit(): Promise<void> {
    await this.inicializarTenant();
    await this.cargar();
  }

  private configVacia(empresaId: string): MatrizLegalConfig {
    return {
      empresa_id: empresaId,
      codigo_formato: null,
      version: null,
      fecha_actualizacion: null,
      responsable_actualizacion: null,
      fecha_verificacion: null,
      responsable_verificacion: null,
    };
  }

  async inicializarTenant(): Promise<void> {
    this.esAdmin.set(await this.tenant.isAdministrador());
    const lista = await this.tenant.listarEmpresasDisponibles();
    this.empresas.set(lista);
    let empId = (await this.tenant.getEmpresaTenantId()) || '';
    if (!empId && lista.length > 0) empId = lista[0].id || '';
    this.empresaId.set(empId);
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
      const [ev, cfg] = await Promise.all([
        this.service.obtenerEvaluacion(empId),
        this.service.getConfig(empId),
      ]);
      this.evaluacion.set(ev);
      this.config.set(cfg);
      this.formConfig.set(cfg ? { ...cfg } : this.configVacia(empId));
    } catch (e) {
      console.error('Error cargando Matriz Legal:', e);
    } finally {
      this.cargando.set(false);
    }
  }

  dominioResumen(dom: Dominio): ResumenDominio | undefined {
    return this.evaluacion()?.porDominio.find(d => d.dominio === dom);
  }

  pct(valor: number | null): string {
    return valor == null ? '—' : `${(valor * 100).toFixed(1)}%`;
  }

  // ── Encabezado editable ─────────────────────────────────────────────────────
  abrirEdicionEncabezado(): void {
    const cfg = this.config();
    this.formConfig.set(cfg ? { ...cfg } : this.configVacia(this.empresaId()));
    this.editandoEncabezado.set(true);
  }

  cancelarEdicionEncabezado(): void {
    this.editandoEncabezado.set(false);
  }

  patchConfig<K extends keyof MatrizLegalConfig>(campo: K, valor: MatrizLegalConfig[K]): void {
    this.formConfig.update(c => ({ ...c, [campo]: valor }));
  }

  async guardarEncabezado(): Promise<void> {
    this.guardandoConfig.set(true);
    try {
      const saved = await this.service.upsertConfig({ ...this.formConfig(), empresa_id: this.empresaId() });
      this.config.set(saved);
      this.editandoEncabezado.set(false);
    } catch (e) {
      console.error('Error guardando encabezado de la matriz legal:', e);
      alert('No se pudo guardar el encabezado.');
    } finally {
      this.guardandoConfig.set(false);
    }
  }

  // ── Navegación ──────────────────────────────────────────────────────────────
  irARequisitos(componenteId?: string): void {
    this.router.navigate(['/matriz-legal/requisitos'], {
      queryParams: componenteId ? { componente: componenteId } : {},
    });
  }

  irAEvaluacion(): void { this.router.navigate(['/matriz-legal/evaluacion']); }
  irACatalogos(): void { this.router.navigate(['/matriz-legal/catalogos']); }
}
