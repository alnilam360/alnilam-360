import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TenantService } from '../../../../core/services/tenant.service';
import { MatrizLegalService } from '../../../../core/services/matriz-legal.service';
import { Empresa } from '../../../../core/models/models';
import {
  MatrizLegalComponente,
  MatrizLegalRequisito,
  TipoNorma,
  FiltrosRequisito,
  Dominio,
  EstadoCumplimiento,
  ESTADOS_CUMPLIMIENTO,
  ESTADO_LABEL,
  ESTADO_COLOR,
  DOMINIOS,
  DOMINIO_LABEL,
} from '../../../../core/models/matriz-legal.model';

@Component({
  selector: 'app-requisitos-list',
  standalone: false,
  templateUrl: './requisitos-list.component.html',
  styleUrls: ['./requisitos-list.component.scss'],
})
export class RequisitosListComponent implements OnInit {
  private tenant = inject(TenantService);
  private service = inject(MatrizLegalService);
  private route = inject(ActivatedRoute);

  readonly DOMINIOS = [...DOMINIOS];
  readonly DOMINIO_LABEL = DOMINIO_LABEL;
  readonly estados = ESTADOS_CUMPLIMIENTO;
  readonly ESTADO_LABEL = ESTADO_LABEL;
  readonly ESTADO_COLOR = ESTADO_COLOR;

  cargando = signal<boolean>(true);
  guardando = signal<boolean>(false);
  exportando = signal<boolean>(false);
  esAdmin = signal<boolean>(false);

  empresas = signal<Empresa[]>([]);
  empresaId = signal<string>('');

  componentes = signal<MatrizLegalComponente[]>([]);
  tiposNorma = signal<TipoNorma[]>([]);
  requisitos = signal<MatrizLegalRequisito[]>([]);

  // Filtros
  fDominio = signal<Dominio | ''>('');
  fComponente = signal<string>('');
  fTipoNorma = signal<string>('');
  fEstado = signal<EstadoCumplimiento | ''>('');
  fTexto = signal<string>('');

  // Modal
  modalAbierto = signal<boolean>(false);
  requisitoEnEdicion = signal<MatrizLegalRequisito | null>(null);

  async ngOnInit(): Promise<void> {
    await this.inicializarTenant();
    const compParam = this.route.snapshot.queryParamMap.get('componente');
    if (compParam) this.fComponente.set(compParam);
    await this.cargarCatalogos();
    await this.cargar();
  }

  async inicializarTenant(): Promise<void> {
    this.esAdmin.set(await this.tenant.isAdministrador());
    const lista = await this.tenant.listarEmpresasDisponibles();
    this.empresas.set(lista);
    let empId = (await this.tenant.getEmpresaTenantId()) || '';
    if (!empId && lista.length > 0) empId = lista[0].id || '';
    this.empresaId.set(empId);
  }

  async cargarCatalogos(): Promise<void> {
    const empId = this.empresaId();
    if (!empId) return;
    try {
      const [comps, tipos] = await Promise.all([
        this.service.getComponentes(empId),
        this.service.getTiposNorma(),
      ]);
      this.componentes.set(comps);
      this.tiposNorma.set(tipos);
    } catch (e) {
      console.error('Error cargando catálogos:', e);
    }
  }

  componentesFiltrados(): MatrizLegalComponente[] {
    const dom = this.fDominio();
    return this.componentes().filter(c => c.activo && (!dom || c.dominio === dom));
  }

  private filtros(): FiltrosRequisito {
    return {
      dominio: this.fDominio() || undefined,
      componenteId: this.fComponente() || undefined,
      tipoNormaId: this.fTipoNorma() || undefined,
      estado: this.fEstado() || undefined,
      texto: this.fTexto().trim() || undefined,
    };
  }

  async cargar(): Promise<void> {
    const empId = this.empresaId();
    if (!empId) { this.cargando.set(false); return; }
    this.cargando.set(true);
    try {
      const reqs = await this.service.listarRequisitos(empId, this.filtros());
      this.requisitos.set(reqs);
    } catch (e) {
      console.error('Error cargando requisitos:', e);
    } finally {
      this.cargando.set(false);
    }
  }

  async onEmpresaChange(id: string): Promise<void> {
    this.empresaId.set(id);
    this.fComponente.set('');
    await this.cargarCatalogos();
    await this.cargar();
  }

  onDominioChange(d: Dominio | ''): void {
    this.fDominio.set(d);
    this.fComponente.set('');
    this.cargar();
  }

  limpiarFiltros(): void {
    this.fDominio.set('');
    this.fComponente.set('');
    this.fTipoNorma.set('');
    this.fEstado.set('');
    this.fTexto.set('');
    this.cargar();
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────
  nuevoRequisito(): void {
    this.requisitoEnEdicion.set(null);
    this.modalAbierto.set(true);
  }

  editarRequisito(r: MatrizLegalRequisito): void {
    this.requisitoEnEdicion.set({ ...r });
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
    this.requisitoEnEdicion.set(null);
  }

  async onGuardarRequisito(req: MatrizLegalRequisito): Promise<void> {
    this.guardando.set(true);
    try {
      if (req.id) {
        await this.service.actualizarRequisito(req.id, req);
      } else {
        await this.service.crearRequisito(req);
      }
      this.cerrarModal();
      await this.cargar();
    } catch (e: any) {
      console.error('Error guardando requisito:', e);
      alert(e?.message || 'No se pudo guardar el requisito.');
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminarRequisito(r: MatrizLegalRequisito): Promise<void> {
    if (!r.id) return;
    const ok = confirm(`¿Eliminar el requisito "${r.descripcion_requisito.slice(0, 60)}…"?`);
    if (!ok) return;
    try {
      await this.service.eliminarRequisito(r.id);
      await this.cargar();
    } catch (e) {
      console.error('Error eliminando requisito:', e);
      alert('No se pudo eliminar el requisito.');
    }
  }

  async exportar(): Promise<void> {
    this.exportando.set(true);
    try {
      const emp = this.empresas().find(e => e.id === this.empresaId())?.nombre || 'Empresa';
      await this.service.exportarRequisitosExcel(this.requisitos(), emp);
    } catch (e) {
      console.error('Error exportando:', e);
      alert('No se pudo generar el Excel.');
    } finally {
      this.exportando.set(false);
    }
  }

  nombreNorma(r: MatrizLegalRequisito): string {
    const partes = [r.tipo_norma?.nombre, r.numero, r.anio ? `de ${r.anio}` : null].filter(Boolean);
    return partes.join(' ') || '—';
  }
}
