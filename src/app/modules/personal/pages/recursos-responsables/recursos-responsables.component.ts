import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TenantService } from '../../../../core/services/tenant.service';
import { RecursosResponsablesService } from '../../../../core/services/recursos-responsables.service';
import {
  SstRecurso,
  SstComite,
  SstComiteMiembro,
  SstComiteActa,
  MatrizResponsabilidadRACI,
  PresupuestoResumenRecursos,
  TipoComiteSST,
  TipoRecursoSST,
  RolEnComite,
  TipoRepresentacion,
  TipoMiembro,
  TipoResponsabilidadRACI
} from '../../../../core/models/recursos-responsables.model';
import { Empresa } from '../../../../core/models/models';

export type TabSeccion = 'recursos' | 'copasst' | 'convivencia' | 'brigada' | 'raci';

@Component({
  selector: 'app-recursos-responsables',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  templateUrl: './recursos-responsables.component.html',
  styleUrls: ['./recursos-responsables.component.scss']
})
export class RecursosResponsablesComponent implements OnInit {
  private svc = inject(RecursosResponsablesService);
  private tenant = inject(TenantService);
  private fb = inject(FormBuilder);

  // ─── Estado General & Multi-Tenant ─────────────────────────────────────────
  readonly loading = signal<boolean>(false);
  readonly esAdmin = signal<boolean>(false);
  readonly empresasDisponibles = signal<Empresa[]>([]);
  readonly empresaActual = signal<Empresa | null>(null);
  readonly empresaId = signal<string>('');
  readonly activeTab = signal<TabSeccion>('recursos');
  readonly periodoActual = signal<string>(new Date().getFullYear().toString());
  readonly periodosDisponibles = signal<string[]>(['2026', '2025', '2024', 'todos']);

  // ─── Filtros de Búsqueda Reactivos ─────────────────────────────────────────
  readonly busquedaRecurso = signal<string>('');
  readonly filtroTipoRecurso = signal<string>('todos');
  readonly busquedaMiembro = signal<string>('');
  readonly busquedaActa = signal<string>('');
  readonly filtroFaseRaci = signal<string>('todas');

  // ─── Datos de Recursos ─────────────────────────────────────────────────────
  readonly recursos = signal<SstRecurso[]>([]);
  readonly resumenPresupuesto = computed(() => this.svc.calcularResumenPresupuesto(this.recursos()));

  readonly recursosFiltrados = computed(() => {
    const fTipo = this.filtroTipoRecurso();
    const q = this.busquedaRecurso().toLowerCase().trim();
    let list = this.recursos();

    if (fTipo !== 'todos') {
      list = list.filter(r => r.tipo_recurso === fTipo);
    }
    if (q) {
      list = list.filter(r =>
        r.descripcion.toLowerCase().includes(q) ||
        (r.responsable?.nombre || '').toLowerCase().includes(q) ||
        (r.responsable?.cargo || '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  // ─── Datos de Comités ──────────────────────────────────────────────────────
  readonly comiteCopasst = signal<SstComite | null>(null);
  readonly comiteConvivencia = signal<SstComite | null>(null);
  readonly comiteBrigada = signal<SstComite | null>(null);

  readonly miembrosCopasst = signal<SstComiteMiembro[]>([]);
  readonly miembrosConvivencia = signal<SstComiteMiembro[]>([]);
  readonly miembrosBrigada = signal<SstComiteMiembro[]>([]);

  readonly actasCopasst = signal<SstComiteActa[]>([]);
  readonly actasConvivencia = signal<SstComiteActa[]>([]);
  readonly actasBrigada = signal<SstComiteActa[]>([]);

  // ─── Filtros de Miembros y Actas ──────────────────────────────────────────
  readonly miembrosFiltrados = computed(() => {
    const tab = this.activeTab();
    const q = this.busquedaMiembro().toLowerCase().trim();
    let list: SstComiteMiembro[] = [];

    if (tab === 'copasst') list = this.miembrosCopasst();
    else if (tab === 'convivencia') list = this.miembrosConvivencia();
    else if (tab === 'brigada') list = this.miembrosBrigada();

    if (!q) return list;
    return list.filter(m =>
      (m.trabajador?.nombre || '').toLowerCase().includes(q) ||
      (m.trabajador?.documento || '').toLowerCase().includes(q) ||
      (m.trabajador?.cargo || '').toLowerCase().includes(q) ||
      m.rol_en_comite.toLowerCase().includes(q)
    );
  });

  readonly actasFiltradas = computed(() => {
    const tab = this.activeTab();
    const q = this.busquedaActa().toLowerCase().trim();
    let list: SstComiteActa[] = [];

    if (tab === 'copasst') list = this.actasCopasst();
    else if (tab === 'convivencia') list = this.actasConvivencia();
    else if (tab === 'brigada') list = this.actasBrigada();

    if (!q) return list;
    return list.filter(a =>
      a.numero_acta.toLowerCase().includes(q) ||
      a.temas_tratados.toLowerCase().includes(q) ||
      (a.compromisos || '').toLowerCase().includes(q)
    );
  });

  // ─── Datos de Matriz RACI ──────────────────────────────────────────────────
  readonly matrizRaci = signal<MatrizResponsabilidadRACI[]>([]);
  readonly rolesRaci = [
    'Alta Dirección / Representante Legal',
    'Responsable del SG-SST',
    'COPASST',
    'Comité de Convivencia',
    'Brigada de Emergencia',
    'Jefaturas y Supervisores',
    'Todos los Trabajadores'
  ];

  readonly actividadesRaci = computed(() => {
    const faseFiltro = this.filtroFaseRaci();
    const map = new Map<string, { actividad: string; fase: string; orden: number }>();

    for (const r of this.matrizRaci()) {
      if (!map.has(r.actividad_sst)) {
        map.set(r.actividad_sst, {
          actividad: r.actividad_sst,
          fase: r.fase_phva || 'Planear',
          orden: r.orden || 99
        });
      }
    }

    let arr = Array.from(map.values()).sort((a, b) => a.orden - b.orden);
    if (faseFiltro !== 'todas') {
      arr = arr.filter(a => a.fase.toLowerCase() === faseFiltro.toLowerCase());
    }
    return arr;
  });

  // ─── Catálogo de Trabajadores ─────────────────────────────────────────────
  readonly trabajadoresDisponibles = signal<any[]>([]);

  // ─── Formularios Reactivos & Modales ──────────────────────────────────────
  recursoForm!: FormGroup;
  miembroForm!: FormGroup;
  actaForm!: FormGroup;
  conformacionForm!: FormGroup;
  raciForm!: FormGroup;

  readonly modalRecursoVisible = signal<boolean>(false);
  readonly recursoEnEdicion = signal<SstRecurso | null>(null);

  readonly modalMiembroVisible = signal<boolean>(false);
  readonly miembroTipoComite = signal<TipoComiteSST>('COPASST');
  readonly advertenciaSuperposicion = signal<string | null>(null);
  readonly trabajadorSeleccionadoPreview = signal<any | null>(null);

  readonly modalActaVisible = signal<boolean>(false);
  readonly actaTipoComite = signal<TipoComiteSST>('COPASST');
  readonly archivoActaSeleccionado = signal<File | null>(null);
  readonly asistentesSeleccionados = signal<string[]>([]);

  readonly modalConformacionVisible = signal<boolean>(false);
  readonly conformacionTipoComite = signal<TipoComiteSST>('COPASST');

  readonly modalRaciVisible = signal<boolean>(false);
  readonly raciCeldaEnEdicion = signal<{ actividad: string; rol: string; actual?: MatrizResponsabilidadRACI } | null>(null);

  // ─── Ciclo de Vida ────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    this.initForms();
    await this.cargarContextoEmpresa();
  }

  // ─── Inicialización de Formularios ────────────────────────────────────────
  private initForms(): void {
    this.recursoForm = this.fb.group({
      tipo_recurso: ['financiero', Validators.required],
      descripcion: ['', [Validators.required, Validators.minLength(3)]],
      responsable_gestion: [null],
      monto_presupuestado: [null],
      monto_ejecutado: [0],
      periodo: [this.periodoActual(), Validators.required],
      estado: ['activo', Validators.required],
      observaciones: ['']
    });

    this.miembroForm = this.fb.group({
      trabajador_id: ['', Validators.required],
      rol_en_comite: ['miembro', Validators.required],
      tipo_representacion: ['no_aplica', Validators.required],
      tipo_miembro: ['principal', Validators.required],
      fecha_inicio_participacion: [new Date().toISOString().slice(0, 10), Validators.required]
    });

    this.actaForm = this.fb.group({
      numero_acta: ['', Validators.required],
      fecha_reunion: [new Date().toISOString().slice(0, 10), Validators.required],
      tipo_reunion: ['ordinaria', Validators.required],
      temas_tratados: ['', [Validators.required, Validators.minLength(10)]],
      compromisos: ['']
    });

    this.conformacionForm = this.fb.group({
      fecha_conformacion: [new Date().toISOString().slice(0, 10), Validators.required],
      periodo_anios: [2, [Validators.required, Validators.min(1)]],
      acto_administrativo: ['', Validators.required],
      observaciones: [''],
      migrar_miembros: [true]
    });

    this.raciForm = this.fb.group({
      tipo_responsabilidad: ['R', Validators.required],
      descripcion_responsabilidad: [''],
      trabajador_especifico_id: [null]
    });
  }

  // ─── Carga de Contexto y Datos Multi-Tenant ───────────────────────────────
  async cargarContextoEmpresa(): Promise<void> {
    this.loading.set(true);
    try {
      const admin = await this.tenant.isAdministrador();
      this.esAdmin.set(admin);

      const disponibles = await this.tenant.listarEmpresasDisponibles();
      this.empresasDisponibles.set(disponibles);

      let empId = await this.tenant.getEmpresaTenantId();
      if (!empId && disponibles.length > 0 && disponibles[0].id) {
        empId = disponibles[0].id;
      }

      if (empId) {
        this.empresaId.set(empId);
        const emp = disponibles.find(e => e.id === empId) || await this.tenant.getEmpresaPorId(empId);
        this.empresaActual.set(emp);

        await Promise.all([
          this.cargarRecursos(),
          this.cargarComite('COPASST'),
          this.cargarComite('COMITE_CONVIVENCIA'),
          this.cargarComite('BRIGADA_EMERGENCIA'),
          this.cargarMatrizRACI(),
          this.cargarTrabajadores()
        ]);
      }
    } catch (err) {
      console.error('Error cargando contexto de empresa:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async onCambiarEmpresa(empId: string): Promise<void> {
    if (!empId) return;
    this.empresaId.set(empId);
    const emp = this.empresasDisponibles().find(e => e.id === empId) || await this.tenant.getEmpresaPorId(empId);
    this.empresaActual.set(emp);
    await Promise.all([
      this.cargarRecursos(),
      this.cargarComite('COPASST'),
      this.cargarComite('COMITE_CONVIVENCIA'),
      this.cargarComite('BRIGADA_EMERGENCIA'),
      this.cargarMatrizRACI(),
      this.cargarTrabajadores()
    ]);
  }

  async cargarRecursos(): Promise<void> {
    const list = await this.svc.listarRecursos(this.empresaId(), this.periodoActual());
    this.recursos.set(list);
  }

  async cargarComite(tipo: TipoComiteSST): Promise<void> {
    const comite = await this.svc.obtenerComiteVigente(this.empresaId(), tipo);
    if (tipo === 'COPASST') {
      this.comiteCopasst.set(comite);
      if (comite?.id) {
        const [m, a] = await Promise.all([
          this.svc.listarMiembros(comite.id),
          this.svc.listarActas(comite.id)
        ]);
        this.miembrosCopasst.set(m);
        this.actasCopasst.set(a);
      } else {
        this.miembrosCopasst.set([]);
        this.actasCopasst.set([]);
      }
    } else if (tipo === 'COMITE_CONVIVENCIA') {
      this.comiteConvivencia.set(comite);
      if (comite?.id) {
        const [m, a] = await Promise.all([
          this.svc.listarMiembros(comite.id),
          this.svc.listarActas(comite.id)
        ]);
        this.miembrosConvivencia.set(m);
        this.actasConvivencia.set(a);
      } else {
        this.miembrosConvivencia.set([]);
        this.actasConvivencia.set([]);
      }
    } else if (tipo === 'BRIGADA_EMERGENCIA') {
      this.comiteBrigada.set(comite);
      if (comite?.id) {
        const [m, a] = await Promise.all([
          this.svc.listarMiembros(comite.id),
          this.svc.listarActas(comite.id)
        ]);
        this.miembrosBrigada.set(m);
        this.actasBrigada.set(a);
      } else {
        this.miembrosBrigada.set([]);
        this.actasBrigada.set([]);
      }
    }
  }

  async cargarMatrizRACI(): Promise<void> {
    const raci = await this.svc.listarMatrizRACI(this.empresaId());
    this.matrizRaci.set(raci);
  }

  async cargarTrabajadores(): Promise<void> {
    const workers = await this.svc.buscarTrabajadores(this.empresaId());
    this.trabajadoresDisponibles.set(workers);
  }

  // ─── Control de Pestañas y Filtros ─────────────────────────────────────────
  setTab(tab: TabSeccion): void {
    this.activeTab.set(tab);
  }

  async cambiarPeriodo(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    this.periodoActual.set(select.value);
    await this.cargarRecursos();
  }

  // ─── Gestión de Recursos ──────────────────────────────────────────────────
  abrirModalRecurso(recurso?: SstRecurso): void {
    this.recursoEnEdicion.set(recurso || null);
    if (recurso) {
      this.recursoForm.patchValue({
        tipo_recurso: recurso.tipo_recurso,
        descripcion: recurso.descripcion,
        responsable_gestion: recurso.responsable_gestion || null,
        monto_presupuestado: recurso.monto_presupuestado,
        monto_ejecutado: recurso.monto_ejecutado || 0,
        periodo: recurso.periodo,
        estado: recurso.estado,
        observaciones: recurso.observaciones || ''
      });
    } else {
      this.recursoForm.reset({
        tipo_recurso: 'financiero',
        descripcion: '',
        responsable_gestion: null,
        monto_presupuestado: null,
        monto_ejecutado: 0,
        periodo: this.periodoActual() !== 'todos' ? this.periodoActual() : new Date().getFullYear().toString(),
        estado: 'activo',
        observaciones: ''
      });
    }
    this.modalRecursoVisible.set(true);
  }

  cerrarModalRecurso(): void {
    this.modalRecursoVisible.set(false);
    this.recursoEnEdicion.set(null);
  }

  async guardarRecurso(): Promise<void> {
    if (this.recursoForm.invalid) return;
    this.loading.set(true);
    try {
      const formVal = this.recursoForm.value;
      const payload: Partial<SstRecurso> = {
        ...formVal,
        empresa_id: this.empresaId(),
        id: this.recursoEnEdicion()?.id
      };
      await this.svc.guardarRecurso(payload);
      await this.cargarRecursos();
      this.cerrarModalRecurso();
    } catch (err) {
      console.error('Error guardando recurso:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async eliminarRecurso(id: string): Promise<void> {
    if (!confirm('¿Está seguro de eliminar este recurso asignado?')) return;
    this.loading.set(true);
    try {
      await this.svc.eliminarRecurso(id);
      await this.cargarRecursos();
    } catch (err) {
      console.error('Error eliminando recurso:', err);
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Gestión de Miembros ──────────────────────────────────────────────────
  abrirModalMiembro(tipoComite: TipoComiteSST): void {
    this.miembroTipoComite.set(tipoComite);
    this.advertenciaSuperposicion.set(null);
    this.trabajadorSeleccionadoPreview.set(null);

    const defaultRol = tipoComite === 'BRIGADA_EMERGENCIA' ? 'brigadista' : 'miembro';
    const defaultRep = tipoComite === 'BRIGADA_EMERGENCIA' ? 'no_aplica' : 'empleador';
    const defaultTipoM = tipoComite === 'BRIGADA_EMERGENCIA' ? 'primeros_auxilios' : 'principal';

    this.miembroForm.reset({
      trabajador_id: '',
      rol_en_comite: defaultRol,
      tipo_representacion: defaultRep,
      tipo_miembro: defaultTipoM,
      fecha_inicio_participacion: new Date().toISOString().slice(0, 10)
    });

    this.modalMiembroVisible.set(true);
  }

  cerrarModalMiembro(): void {
    this.modalMiembroVisible.set(false);
    this.advertenciaSuperposicion.set(null);
    this.trabajadorSeleccionadoPreview.set(null);
  }

  async onTrabajadorSeleccionado(trabajadorId: string): Promise<void> {
    if (!trabajadorId) {
      this.advertenciaSuperposicion.set(null);
      this.trabajadorSeleccionadoPreview.set(null);
      return;
    }

    const t = this.trabajadoresDisponibles().find(w => w.id === trabajadorId);
    this.trabajadorSeleccionadoPreview.set(t || null);

    const comite = this.getComitePorTipo(this.miembroTipoComite());
    if (comite?.id) {
      const esValido = await this.svc.validarParticipacionActiva(
        this.empresaId(),
        this.miembroTipoComite(),
        trabajadorId,
        comite.id
      );
      if (!esValido) {
        this.advertenciaSuperposicion.set(
          'Alerta: Este trabajador ya tiene una participación activa en otro comité vigente de este mismo tipo.'
        );
      } else {
        this.advertenciaSuperposicion.set(null);
      }
    }
  }

  async guardarMiembro(): Promise<void> {
    if (this.miembroForm.invalid) return;
    const comite = this.getComitePorTipo(this.miembroTipoComite());
    if (!comite?.id) {
      alert('Debe conformar primero el comité antes de asignarle integrantes.');
      return;
    }

    this.loading.set(true);
    try {
      const val = this.miembroForm.value;
      await this.svc.agregarMiembro({
        comite_id: comite.id,
        trabajador_id: val.trabajador_id,
        rol_en_comite: val.rol_en_comite,
        tipo_representacion: val.tipo_representacion,
        tipo_miembro: val.tipo_miembro,
        fecha_inicio_participacion: val.fecha_inicio_participacion
      });
      await this.cargarComite(this.miembroTipoComite());
      this.cerrarModalMiembro();
    } catch (err) {
      console.error('Error guardando miembro de comité:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async retirarMiembro(id: string, tipoComite: TipoComiteSST): Promise<void> {
    if (!confirm('¿Desea dar de baja a este integrante del comité?')) return;
    this.loading.set(true);
    try {
      await this.svc.retirarMiembro(id);
      await this.cargarComite(tipoComite);
    } catch (err) {
      console.error('Error retirando miembro:', err);
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Gestión de Actas ──────────────────────────────────────────────────────
  abrirModalActa(tipoComite: TipoComiteSST): void {
    const comite = this.getComitePorTipo(tipoComite);
    if (!comite?.id) {
      alert('Debe conformar el comité antes de registrar actas.');
      return;
    }

    this.actaTipoComite.set(tipoComite);
    this.archivoActaSeleccionado.set(null);

    const miembros = this.getMiembrosPorTipo(tipoComite);
    const activosIds = miembros.filter(m => m.activo).map(m => m.trabajador_id);
    this.asistentesSeleccionados.set(activosIds);

    const proxNum = (comite.actas_count || 0) + 1;
    const numFormateado = `Acta No. ${proxNum.toString().padStart(3, '0')}-${new Date().getFullYear()}`;

    this.actaForm.reset({
      numero_acta: numFormateado,
      fecha_reunion: new Date().toISOString().slice(0, 10),
      tipo_reunion: 'ordinaria',
      temas_tratados: '',
      compromisos: ''
    });

    this.modalActaVisible.set(true);
  }

  cerrarModalActa(): void {
    this.modalActaVisible.set(false);
    this.archivoActaSeleccionado.set(null);
  }

  onArchivoActaChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoActaSeleccionado.set(input.files[0]);
    }
  }

  toggleAsistente(trabajadorId: string): void {
    const list = [...this.asistentesSeleccionados()];
    const idx = list.indexOf(trabajadorId);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(trabajadorId);
    }
    this.asistentesSeleccionados.set(list);
  }

  async guardarActa(): Promise<void> {
    if (this.actaForm.invalid) return;
    const comite = this.getComitePorTipo(this.actaTipoComite());
    if (!comite?.id) return;

    this.loading.set(true);
    try {
      const val = this.actaForm.value;
      await this.svc.guardarActa(
        {
          comite_id: comite.id,
          numero_acta: val.numero_acta,
          fecha_reunion: val.fecha_reunion,
          tipo_reunion: val.tipo_reunion,
          temas_tratados: val.temas_tratados,
          compromisos: val.compromisos
        },
        this.asistentesSeleccionados(),
        this.archivoActaSeleccionado() || undefined
      );

      await this.cargarComite(this.actaTipoComite());
      this.cerrarModalActa();
    } catch (err) {
      console.error('Error guardando acta:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async eliminarActa(id: string, tipoComite: TipoComiteSST): Promise<void> {
    if (!confirm('¿Está seguro de eliminar esta acta de reunión?')) return;
    this.loading.set(true);
    try {
      await this.svc.eliminarActa(id);
      await this.cargarComite(tipoComite);
    } catch (err) {
      console.error('Error eliminando acta:', err);
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Gestión de Conformaciones ─────────────────────────────────────────────
  abrirModalConformacion(tipoComite: TipoComiteSST): void {
    this.conformacionTipoComite.set(tipoComite);
    const aniosDefecto = tipoComite === 'BRIGADA_EMERGENCIA' ? 1 : 2;

    this.conformacionForm.reset({
      fecha_conformacion: new Date().toISOString().slice(0, 10),
      periodo_anios: aniosDefecto,
      acto_administrativo: '',
      observaciones: '',
      migrar_miembros: true
    });

    this.modalConformacionVisible.set(true);
  }

  cerrarModalConformacion(): void {
    this.modalConformacionVisible.set(false);
  }

  async guardarConformacion(): Promise<void> {
    if (this.conformacionForm.invalid) return;
    this.loading.set(true);
    try {
      const val = this.conformacionForm.value;
      const comiteAnterior = this.getComitePorTipo(this.conformacionTipoComite());

      const payload: Partial<SstComite> = {
        empresa_id: this.empresaId(),
        tipo_comite: this.conformacionTipoComite(),
        fecha_conformacion: val.fecha_conformacion,
        periodo_anios: val.periodo_anios,
        acto_administrativo: val.acto_administrativo,
        observaciones: val.observaciones,
        estado: 'vigente'
      };

      if (comiteAnterior?.id) {
        await this.svc.iniciarNuevaConformacion(comiteAnterior.id, payload, val.migrar_miembros);
      } else {
        await this.svc.guardarComite(payload);
      }

      await this.cargarComite(this.conformacionTipoComite());
      this.cerrarModalConformacion();
    } catch (err) {
      console.error('Error guardando conformación de comité:', err);
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Gestión de Matriz RACI ────────────────────────────────────────────────
  getRaciValor(actividad: string, rol: string): MatrizResponsabilidadRACI | undefined {
    return this.matrizRaci().find(r => r.actividad_sst === actividad && r.rol_cargo === rol);
  }

  abrirModalRaci(actividad: string, rol: string): void {
    const actual = this.getRaciValor(actividad, rol);
    this.raciCeldaEnEdicion.set({ actividad, rol, actual });

    this.raciForm.reset({
      tipo_responsabilidad: actual?.tipo_responsabilidad || 'R',
      descripcion_responsabilidad: actual?.descripcion_responsabilidad || '',
      trabajador_especifico_id: actual?.trabajador_especifico_id || null
    });

    this.modalRaciVisible.set(true);
  }

  cerrarModalRaci(): void {
    this.modalRaciVisible.set(false);
    this.raciCeldaEnEdicion.set(null);
  }

  async ciclarRaciRapido(actividad: string, rol: string, event: MouseEvent): Promise<void> {
    event.stopPropagation();
    const actual = this.getRaciValor(actividad, rol);
    const ciclo: Array<TipoResponsabilidadRACI | null> = ['R', 'A', 'C', 'I', null];

    let proxTipo: TipoResponsabilidadRACI | null = 'R';
    if (actual) {
      const idx = ciclo.indexOf(actual.tipo_responsabilidad);
      proxTipo = ciclo[(idx + 1) % ciclo.length];
    }

    try {
      if (proxTipo === null && actual?.id) {
        await this.svc.eliminarAsignacionRACI(actual.id);
      } else if (proxTipo) {
        await this.svc.guardarAsignacionRACI({
          empresa_id: this.empresaId(),
          actividad_sst: actividad,
          rol_cargo: rol,
          tipo_responsabilidad: proxTipo
        });
      }
      await this.cargarMatrizRACI();
    } catch (err) {
      console.error('Error ciclando RACI:', err);
    }
  }

  async guardarAsignacionRaci(): Promise<void> {
    if (this.raciForm.invalid) return;
    const celda = this.raciCeldaEnEdicion();
    if (!celda) return;

    this.loading.set(true);
    try {
      const val = this.raciForm.value;
      await this.svc.guardarAsignacionRACI({
        empresa_id: this.empresaId(),
        actividad_sst: celda.actividad,
        rol_cargo: celda.rol,
        tipo_responsabilidad: val.tipo_responsabilidad,
        descripcion_responsabilidad: val.descripcion_responsabilidad,
        trabajador_especifico_id: val.trabajador_especifico_id
      });

      await this.cargarMatrizRACI();
      this.cerrarModalRaci();
    } catch (err) {
      console.error('Error guardando celda RACI:', err);
    } finally {
      this.loading.set(false);
    }
  }

  // ─── Helpers de Selección y Formato ────────────────────────────────────────
  getComitePorTipo(tipo: TipoComiteSST): SstComite | null {
    if (tipo === 'COPASST') return this.comiteCopasst();
    if (tipo === 'COMITE_CONVIVENCIA') return this.comiteConvivencia();
    if (tipo === 'BRIGADA_EMERGENCIA') return this.comiteBrigada();
    return null;
  }

  getMiembrosPorTipo(tipo: TipoComiteSST): SstComiteMiembro[] {
    if (tipo === 'COPASST') return this.miembrosCopasst();
    if (tipo === 'COMITE_CONVIVENCIA') return this.miembrosConvivencia();
    if (tipo === 'BRIGADA_EMERGENCIA') return this.miembrosBrigada();
    return [];
  }

  getActasPorTipo(tipo: TipoComiteSST): SstComiteActa[] {
    if (tipo === 'COPASST') return this.actasCopasst();
    if (tipo === 'COMITE_CONVIVENCIA') return this.actasConvivencia();
    if (tipo === 'BRIGADA_EMERGENCIA') return this.actasBrigada();
    return [];
  }

  formatMoney(amount?: number | null): string {
    if (amount === undefined || amount === null) return '$ 0';
    return '$ ' + Math.round(amount).toLocaleString('es-CO');
  }

  getInitials(name?: string | null): string {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
}
