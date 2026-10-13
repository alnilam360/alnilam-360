import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TenantService } from '../../../core/services/tenant.service';
import { PoliticaSstService } from '../../../core/services/politica-sst.service';
import { ObjetivoSstService } from '../../../core/services/objetivo-sst.service';
import {
  CatalogoResponsablePlanItem,
  IndicadorDisponible,
  ObjetivoSst,
  PoliticaSst,
  PoliticaSstEstado,
  TrabajadorSimple
} from '../../../core/models/politica-sst.model';
import { Empresa } from '../../../core/models/models';
import { AccionFlujo, DocumentoFlujoAprobacionComponent } from '../../../shared/components/documento-flujo-aprobacion/documento-flujo-aprobacion.component';
import { BadgeVencimientoComponent } from '../../../shared/components/badge-vencimiento/badge-vencimiento.component';
import { MicroProgressComponent } from '../../../shared/components/micro-progress/micro-progress.component';
import { DocumentoHistorialVersionesComponent } from '../../../shared/components/documento-historial-versiones/documento-historial-versiones.component';

@Component({
  selector: 'app-politica-sst',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    TableModule,
    ButtonModule,
    BadgeVencimientoComponent,
    MicroProgressComponent,
    DocumentoFlujoAprobacionComponent,
    DocumentoHistorialVersionesComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './politica-sst.component.html',
  styleUrls: ['./politica-sst.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PoliticaSstComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tenantService = inject(TenantService);
  private politicaService = inject(PoliticaSstService);
  private objetivoService = inject(ObjetivoSstService);

  // ─── Signals de Estado Principal ──────────────────────────────────────────
  readonly loading = signal<boolean>(true);
  readonly guardando = signal<boolean>(false);
  readonly esAdmin = signal<boolean>(false);
  readonly empresasDisponibles = signal<Empresa[]>([]);
  readonly empresaActual = signal<Empresa | null>(null);

  readonly tabActivo = signal<'politica' | 'objetivos' | 'historial'>('politica');
  readonly politicaActiva = signal<PoliticaSst | null>(null);
  readonly versiones = signal<PoliticaSst[]>([]);
  readonly objetivos = signal<ObjetivoSst[]>([]);
  readonly trabajadores = signal<TrabajadorSimple[]>([]);
  readonly catalogoResponsables = signal<CatalogoResponsablePlanItem[]>([]);
  readonly indicadoresDisponibles = signal<IndicadorDisponible[]>([]);

  // ─── Modales ──────────────────────────────────────────────────────────────
  readonly modalObjetivoVisible = signal<boolean>(false);
  readonly objetivoEnEdicion = signal<ObjetivoSst | null>(null);
  readonly indicadorSeleccionadoInfo = signal<IndicadorDisponible | null>(null);

  // ─── Filtros de Objetivos ─────────────────────────────────────────────────
  readonly filtroEstadoObjetivo = signal<string>('todos');

  // ─── Formularios Reactivos ────────────────────────────────────────────────
  politicaForm!: FormGroup;
  objetivoForm!: FormGroup;

  // ─── Computed Properties ──────────────────────────────────────────────────
  readonly esBorrador = computed(() => this.politicaActiva()?.estado === 'borrador');
  readonly esPublicado = computed(() => this.politicaActiva()?.estado === 'publicado');
  readonly puedeEditarPolitica = computed(() => this.esBorrador());

  readonly totalObjetivos = computed(() => this.objetivos().length);
  readonly objetivosCumplidos = computed(() => this.objetivos().filter(o => o.estado === 'cumplido').length);
  readonly objetivosVigentes = computed(() => this.objetivos().filter(o => o.estado === 'vigente').length);
  readonly objetivosVencidos = computed(() => this.objetivos().filter(o => o.estado === 'vencido' || o.estado === 'no_cumplido').length);

  readonly objetivosFiltrados = computed(() => {
    const f = this.filtroEstadoObjetivo();
    const lista = this.objetivos();
    if (f === 'todos') return lista;
    return lista.filter(o => o.estado === f);
  });

  readonly representanteLegalNombre = computed(() => {
    const e = this.empresaActual();
    return (e?.representante_legal as any)?.nombre || 'Pendiente de registrar en Empresa';
  });

  // ─── Ciclo de Vida ────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    this.initForms();
    await this.cargarContextoEmpresa();
  }

  // ─── Inicialización de Formularios ────────────────────────────────────────
  private initForms(): void {
    this.politicaForm = this.fb.group({
      contenido: ['', [Validators.required, Validators.minLength(20)]],
      alcance: ['', [Validators.required]],
      elaborado_por: [null, [Validators.required]],
      revisado_por: [null, [Validators.required]],
      fecha_elaboracion: [new Date().toISOString().split('T')[0], [Validators.required]]
    });

    this.objetivoForm = this.fb.group({
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      meta_texto: ['', [Validators.required]],
      meta_valor_numerico: [null],
      meta_unidad: ['%'],
      criterio_cumplimiento: ['mayor_igual', [Validators.required]],
      indicador_vinculado_id: [null],
      responsable_id: [null],
      fecha_inicio: [`${new Date().getFullYear()}-01-01`, [Validators.required]],
      fecha_fin: [`${new Date().getFullYear()}-12-31`, [Validators.required]],
      estado: ['vigente', [Validators.required]]
    });

    // Escuchar cambio de indicador para pre-llenar unidad y meta
    this.objetivoForm.get('indicador_vinculado_id')?.valueChanges.subscribe(indId => {
      if (!indId) {
        this.indicadorSeleccionadoInfo.set(null);
        return;
      }
      const ind = this.indicadoresDisponibles().find(i => i.id === indId);
      if (ind) {
        this.indicadorSeleccionadoInfo.set(ind);
        if (ind.meta !== null && ind.meta !== undefined && this.objetivoForm.get('meta_valor_numerico')?.value === null) {
          this.objetivoForm.patchValue({ meta_valor_numerico: ind.meta }, { emitEvent: false });
        }
      }
    });
  }

  // ─── Carga de Datos y Contexto Multi-Tenant ───────────────────────────────
  async cargarContextoEmpresa(): Promise<void> {
    this.loading.set(true);
    try {
      const admin = await this.tenantService.isAdministrador();
      this.esAdmin.set(admin);

      const disponibles = await this.tenantService.listarEmpresasDisponibles();
      this.empresasDisponibles.set(disponibles);

      let empId = await this.tenantService.getEmpresaTenantId();
      if (!empId && disponibles.length > 0 && disponibles[0].id) {
        empId = disponibles[0].id;
      }

      if (empId) {
        const emp = disponibles.find(e => e.id === empId) || await this.tenantService.getEmpresaPorId(empId);
        this.empresaActual.set(emp);
        if (emp.id) {
          await this.cargarDatosCompletos(emp.id);
        }
      }
    } catch (err) {
      console.error('Error al inicializar contexto de empresa:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async onCambiarEmpresa(empresaId: string): Promise<void> {
    const emp = this.empresasDisponibles().find(e => e.id === empresaId);
    if (!emp || !emp.id) return;
    this.empresaActual.set(emp);
    this.loading.set(true);
    try {
      await this.cargarDatosCompletos(emp.id);
    } finally {
      this.loading.set(false);
    }
  }

  async cargarDatosCompletos(empresaId: string): Promise<void> {
    try {
      const [polVigente, hist, trabs, respCat, inds] = await Promise.all([
        this.politicaService.getPoliticaVigente(empresaId),
        this.politicaService.getHistorialVersiones(empresaId),
        this.politicaService.listarTrabajadores(empresaId),
        this.objetivoService.listarResponsablesCatalogo(),
        this.objetivoService.listarIndicadoresDisponibles(empresaId)
      ]);

      this.versiones.set(hist);
      this.trabajadores.set(trabs);
      this.catalogoResponsables.set(respCat);
      this.indicadoresDisponibles.set(inds);

      if (polVigente) {
        this.seleccionarPolitica(polVigente);
      } else {
        // No existe política aún: crear borrador inicial v1 automáticamente
        const nuevo = await this.politicaService.crearNuevaVersion(empresaId, {
          contenido: 'La Alta Dirección se compromete con la protección y promoción de la salud de los trabajadores...',
          alcance: 'Aplica a todos los centros de trabajo, trabajadores directos, contratistas y visitantes.'
        });
        this.versiones.set([nuevo]);
        this.seleccionarPolitica(nuevo);
      }
    } catch (err) {
      console.error('Error cargando datos completos de política:', err);
    }
  }

  seleccionarPolitica(pol: PoliticaSst): void {
    this.politicaActiva.set(pol);
    this.politicaForm.patchValue({
      contenido: pol.contenido || '',
      alcance: pol.alcance || '',
      elaborado_por: pol.elaborado_por || null,
      revisado_por: pol.revisado_por || null,
      fecha_elaboracion: pol.fecha_elaboracion || new Date().toISOString().split('T')[0]
    });

    if (pol.estado !== 'borrador') {
      this.politicaForm.disable();
    } else {
      this.politicaForm.enable();
    }

    this.cargarObjetivosDePolitica(pol.id);
  }

  async cargarObjetivosDePolitica(politicaId: string): Promise<void> {
    const emp = this.empresaActual();
    if (!emp || !emp.id) return;
    try {
      const objs = await this.objetivoService.listarObjetivos(emp.id, politicaId);
      this.objetivos.set(objs);
    } catch (err) {
      console.error('Error cargando objetivos:', err);
    }
  }

  // ─── Acciones de Política SST ─────────────────────────────────────────────
  async guardarBorradorPolitica(): Promise<void> {
    const pol = this.politicaActiva();
    if (!pol || pol.estado !== 'borrador') return;

    if (this.politicaForm.invalid) {
      this.politicaForm.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    try {
      const valores = this.politicaForm.value;
      const actualizada = await this.politicaService.guardarBorrador(pol.id, valores);
      this.politicaActiva.set(actualizada);
      this.actualizarVersionEnLista(actualizada);
    } catch (err: any) {
      alert(`Error al guardar borrador: ${err.message || err}`);
    } finally {
      this.guardando.set(false);
    }
  }

  async onFlujoAccion(accion: AccionFlujo): Promise<void> {
    const pol = this.politicaActiva();
    const emp = this.empresaActual();
    if (!pol || !emp) return;

    this.guardando.set(true);
    try {
      if (accion === 'enviar_revision') {
        if (this.politicaForm.invalid) {
          this.politicaForm.markAllAsTouched();
          alert('Por favor complete los campos obligatorios antes de enviar a revisión.');
          return;
        }
        await this.politicaService.guardarBorrador(pol.id, this.politicaForm.value);
        const res = await this.politicaService.cambiarEstado(pol.id, 'en_revision');
        this.seleccionarPolitica(res);
        this.actualizarVersionEnLista(res);
      } else if (accion === 'devolver_borrador') {
        const res = await this.politicaService.cambiarEstado(pol.id, 'borrador');
        this.seleccionarPolitica(res);
        this.actualizarVersionEnLista(res);
      } else if (accion === 'aprobar') {
        const res = await this.politicaService.cambiarEstado(pol.id, 'aprobado');
        this.seleccionarPolitica(res);
        this.actualizarVersionEnLista(res);
      } else if (accion === 'publicar') {
        const res = await this.politicaService.cambiarEstado(pol.id, 'publicado');
        await this.recargarHistorial();
        this.seleccionarPolitica(res);
      } else if (accion === 'nueva_version') {
        await this.crearNuevaVersionModal();
      }
    } catch (err: any) {
      console.error('Error en flujo de aprobación:', err);
      alert(`No se pudo procesar la acción: ${err.message || err}`);
    } finally {
      this.guardando.set(false);
    }
  }

  async crearNuevaVersionModal(): Promise<void> {
    const emp = this.empresaActual();
    const pol = this.politicaActiva();
    if (!emp || !emp.id) return;

    const confirmar = confirm(
      '¿Desea crear una nueva versión de la Política SST? Nacerá como Borrador y la versión actual seguirá vigente hasta que se publique la nueva.'
    );
    if (!confirmar) return;

    this.loading.set(true);
    try {
      const nueva = await this.politicaService.crearNuevaVersion(emp.id, {
        contenido: pol?.contenido || '',
        alcance: pol?.alcance || '',
        elaborado_por: pol?.elaborado_por || null,
        revisado_por: pol?.revisado_por || null
      });

      // Preguntar si desea copiar los objetivos de la versión anterior (Decisión D7)
      if (pol && this.objetivos().length > 0) {
        const copiar = confirm(
          `¿Desea copiar los ${this.objetivos().length} objetivos vigentes a esta nueva versión v${nueva.version}?`
        );
        if (copiar) {
          await this.objetivoService.copiarObjetivosAVersion(pol.id, nueva.id, emp.id);
        }
      }

      await this.recargarHistorial();
      this.seleccionarPolitica(nueva);
      this.tabActivo.set('politica');
    } catch (err: any) {
      alert(`Error creando nueva versión: ${err.message || err}`);
    } finally {
      this.loading.set(false);
    }
  }

  private actualizarVersionEnLista(pol: PoliticaSst): void {
    const arr = [...this.versiones()];
    const idx = arr.findIndex(v => v.id === pol.id);
    if (idx >= 0) {
      arr[idx] = pol;
      this.versiones.set(arr);
    }
  }

  private async recargarHistorial(): Promise<void> {
    const emp = this.empresaActual();
    if (!emp || !emp.id) return;
    const hist = await this.politicaService.getHistorialVersiones(emp.id);
    this.versiones.set(hist);
  }

  // ─── Gestión de Objetivos y Metas ─────────────────────────────────────────
  abrirModalNuevoObjetivo(): void {
    const pol = this.politicaActiva();
    if (!pol) {
      alert('Debe tener una versión de política seleccionada.');
      return;
    }

    this.objetivoEnEdicion.set(null);
    this.indicadorSeleccionadoInfo.set(null);
    this.objetivoForm.reset({
      descripcion: '',
      meta_texto: '',
      meta_valor_numerico: null,
      meta_unidad: '%',
      criterio_cumplimiento: 'mayor_igual',
      indicador_vinculado_id: null,
      responsable_id: null,
      fecha_inicio: `${new Date().getFullYear()}-01-01`,
      fecha_fin: `${new Date().getFullYear()}-12-31`,
      estado: 'vigente'
    });
    this.modalObjetivoVisible.set(true);
  }

  editarObjetivo(obj: ObjetivoSst): void {
    this.objetivoEnEdicion.set(obj);
    const ind = this.indicadoresDisponibles().find(i => i.id === obj.indicador_vinculado_id);
    this.indicadorSeleccionadoInfo.set(ind || null);

    this.objetivoForm.patchValue({
      descripcion: obj.descripcion,
      meta_texto: obj.meta_texto,
      meta_valor_numerico: obj.meta_valor_numerico,
      meta_unidad: obj.meta_unidad || '%',
      criterio_cumplimiento: obj.criterio_cumplimiento || 'mayor_igual',
      indicador_vinculado_id: obj.indicador_vinculado_id || null,
      responsable_id: obj.responsable_id || null,
      fecha_inicio: obj.fecha_inicio,
      fecha_fin: obj.fecha_fin,
      estado: obj.estado
    });
    this.modalObjetivoVisible.set(true);
  }

  cerrarModalObjetivo(): void {
    this.modalObjetivoVisible.set(false);
    this.objetivoEnEdicion.set(null);
  }

  async guardarObjetivoSubmit(): Promise<void> {
    if (this.objetivoForm.invalid) {
      this.objetivoForm.markAllAsTouched();
      return;
    }

    const emp = this.empresaActual();
    const pol = this.politicaActiva();
    if (!emp || !pol) return;

    this.guardando.set(true);
    try {
      const valores = this.objetivoForm.value;
      const payload: Partial<ObjetivoSst> = {
        ...valores,
        id: this.objetivoEnEdicion()?.id,
        empresa_id: emp.id,
        politica_sst_id: pol.id,
        orden: this.objetivoEnEdicion()?.orden ?? this.objetivos().length
      };

      await this.objetivoService.guardarObjetivo(payload);
      await this.cargarObjetivosDePolitica(pol.id);
      this.cerrarModalObjetivo();
    } catch (err: any) {
      console.error('Error guardando objetivo:', err);
      alert(`No se pudo guardar el objetivo: ${err.message || err}`);
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminarObjetivoConfirm(obj: ObjetivoSst): Promise<void> {
    const ok = confirm(`¿Eliminar el objetivo "${obj.descripcion.substring(0, 50)}..."?`);
    if (!ok) return;

    const pol = this.politicaActiva();
    if (!pol) return;

    try {
      await this.objetivoService.eliminarObjetivo(obj.id);
      await this.cargarObjetivosDePolitica(pol.id);
    } catch (err: any) {
      alert(`Error eliminando objetivo: ${err.message || err}`);
    }
  }

  // ─── Helpers y Utilidades ─────────────────────────────────────────────────
  imprimirPolitica(): void {
    window.print();
  }

  getResponsableLabel(obj: ObjetivoSst): string {
    if (obj.responsable_item?.nombre) return obj.responsable_item.nombre;
    const item = this.catalogoResponsables().find(c => c.id === obj.responsable_id);
    return item?.nombre || 'Sin responsable asignado';
  }

  getEstadoObjetivoClass(estado: string): string {
    switch (estado) {
      case 'cumplido':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'vigente':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'no_cumplido':
      case 'vencido':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  }

  getEstadoObjetivoLabel(estado: string): string {
    switch (estado) {
      case 'cumplido': return 'Cumplido';
      case 'vigente': return 'Vigente';
      case 'no_cumplido': return 'No Cumplido';
      case 'vencido': return 'Vencido';
      default: return estado;
    }
  }
}
