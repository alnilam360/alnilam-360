import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { MatrizAtCasoService } from '../../../../core/services/matriz-at-caso.service';
import {
  CatalogoItemAt, SedeLite, Gravedad, TipoEvento, Metodologia, Vinculacion,
  MatrizAtCaso, DIAS_CARGADOS_MUERTE,
} from '../../../../core/models/matriz-at.model';

interface AccionForm {
  id?: string;
  descripcion_accion: string;
  responsable_texto: string;
  fecha_compromiso: string | null;
  estado?: 'pendiente' | 'en_progreso' | 'cerrada';
  fecha_cierre?: string | null;
}

@Component({
  selector: 'app-caso-wizard',
  standalone: false,
  templateUrl: './caso-wizard.component.html',
})
export class CasoWizardComponent implements OnInit {
  @Input() empresaId!: string;
  /** Si se pasa, el wizard edita ese caso en lugar de crear uno nuevo. */
  @Input() casoEditar: MatrizAtCaso | null = null;
  @Output() cerrar = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<void>();

  get modoEditar(): boolean { return !!this.casoEditar; }
  private accionIdsOriginales: string[] = [];

  readonly paso = signal(1);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly diasMuerte = DIAS_CARGADOS_MUERTE;

  sedes: SedeLite[] = [];
  peligros: CatalogoItemAt[] = [];
  agentes: CatalogoItemAt[] = [];
  mecanismos: CatalogoItemAt[] = [];
  partes: CatalogoItemAt[] = [];
  tipos: CatalogoItemAt[] = [];
  sitios: CatalogoItemAt[] = [];
  responsables: CatalogoItemAt[] = [];

  // Filtros de búsqueda para catálogos FURAT (listas largas)
  q = { agente: '', mecanismo: '', parte: '' };

  archivo: File | null = null;
  previewUrl: string | null = null;

  // Modelo del caso en edición
  form: Partial<MatrizAtCaso> = {
    tipo_evento: 'accidente_trabajo',
    fecha_hora_evento: this.ahoraLocal(),
    trabajador_vinculacion: 'directo',
    reportado_arl: false,
    causo_muerte: false,
    estado_caso: 'reportado',
  };

  investigacion = {
    metodologia: null as Metodologia | null,
    actos_inseguros: '',
    condiciones_inseguras: '',
    factores_personales: '',
    factores_trabajo: '',
    responsable_texto: '',
    fecha_investigacion: null as string | null,
    conclusiones: '',
  };

  acciones: AccionForm[] = [];

  readonly vinculaciones: Vinculacion[] = ['directo', 'temporal', 'contratista', 'aprendiz', 'otro'];
  readonly metodologias: { k: Metodologia; l: string }[] = [
    { k: 'arbol_causas', l: 'Árbol de causas' },
    { k: 'cinco_porques', l: '5 porqués' },
    { k: 'espina_pescado', l: 'Espina de pescado (Ishikawa)' },
  ];

  constructor(private svc: MatrizAtCasoService) {}

  async ngOnInit(): Promise<void> {
    try {
      const [sedes, peligros, agentes, mecanismos, partes, tipos, sitios, responsables] = await Promise.all([
        this.svc.getSedes(this.empresaId),
        this.svc.getPeligros(),
        this.svc.getAgentes(),
        this.svc.getMecanismos(),
        this.svc.getPartesCuerpo(),
        this.svc.getTiposLesion(),
        this.svc.getSitios(),
        this.svc.getResponsables(),
      ]);
      this.sedes = sedes; this.peligros = peligros; this.agentes = agentes;
      this.mecanismos = mecanismos; this.partes = partes; this.tipos = tipos; this.sitios = sitios;
      this.responsables = responsables;
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudieron cargar los catálogos.');
    }
    if (this.casoEditar) this.prefill(this.casoEditar);
  }

  private prefill(c: MatrizAtCaso): void {
    this.form = {
      ...c,
      // datetime-local necesita 'YYYY-MM-DDTHH:mm' local
      fecha_hora_evento: this.aLocal(c.fecha_hora_evento),
    };
    if (c.investigacion) {
      const iv = c.investigacion;
      this.investigacion = {
        metodologia: iv.metodologia,
        actos_inseguros: (iv.causas_inmediatas?.actos_inseguros ?? []).join('\n'),
        condiciones_inseguras: (iv.causas_inmediatas?.condiciones_inseguras ?? []).join('\n'),
        factores_personales: (iv.causas_basicas?.factores_personales ?? []).join('\n'),
        factores_trabajo: (iv.causas_basicas?.factores_trabajo ?? []).join('\n'),
        responsable_texto: iv.responsable_texto ?? '',
        fecha_investigacion: iv.fecha_investigacion,
        conclusiones: iv.conclusiones ?? '',
      };
    }
    this.acciones = (c.acciones ?? []).map((a) => ({
      id: a.id,
      descripcion_accion: a.descripcion_accion,
      responsable_texto: a.responsable_texto ?? '',
      fecha_compromiso: a.fecha_compromiso,
      estado: a.estado,
      fecha_cierre: a.fecha_cierre,
    }));
    this.accionIdsOriginales = this.acciones.filter((a) => a.id).map((a) => a.id!);
  }

  private aLocal(iso: string): string {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }

  // ── Navegación ──
  avanzar(): void { if (this.paso() < 4) this.paso.set(this.paso() + 1); }
  retroceder(): void { if (this.paso() > 1) this.paso.set(this.paso() - 1); }

  get esMortal(): boolean { return this.form.clasificacion_gravedad === 'mortal'; }

  get reporteInmediatoArl(): boolean {
    return this.svc.esReporteInmediatoArl(this.form.clasificacion_gravedad ?? null);
  }
  get limiteArl(): string | null {
    if (!this.form.fecha_hora_evento || this.reporteInmediatoArl) return null;
    return this.svc.fechaLimiteReporteArl(this.form.fecha_hora_evento);
  }
  get limiteInvestigacion(): string | null {
    if (this.form.tipo_evento !== 'accidente_trabajo' || !this.form.fecha_hora_evento) return null;
    return this.svc.fechaLimiteInvestigacion(this.form.fecha_hora_evento);
  }

  filtrar(list: CatalogoItemAt[], q: string): CatalogoItemAt[] {
    const s = q.trim().toLowerCase();
    return s ? list.filter((i) => i.nombre.toLowerCase().includes(s)) : list;
  }

  // ── Foto ──
  get esNativo(): boolean { return Capacitor.isNativePlatform(); }

  onArchivo(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0] ?? null;
    this.archivo = f;
    this.previewUrl = f ? URL.createObjectURL(f) : null;
  }

  /** Captura con la cámara nativa (Capacitor) en dispositivo; en web se usa el input. */
  async tomarFoto(): Promise<void> {
    try {
      const photo = await Camera.getPhoto({
        quality: 70, resultType: CameraResultType.DataUrl, source: CameraSource.Camera,
      });
      if (!photo.dataUrl) return;
      const blob = await (await fetch(photo.dataUrl)).blob();
      this.archivo = new File([blob], `foto_${Date.now()}.jpg`, { type: blob.type || 'image/jpeg' });
      this.previewUrl = photo.dataUrl;
    } catch {
      // Usuario canceló la captura.
    }
  }

  agregarAccion(): void {
    this.acciones.push({ descripcion_accion: '', responsable_texto: '', fecha_compromiso: null });
  }
  quitarAccion(i: number): void { this.acciones.splice(i, 1); }

  private hayInvestigacion(): boolean {
    const iv = this.investigacion;
    return !!(iv.metodologia || iv.actos_inseguros || iv.condiciones_inseguras ||
      iv.factores_personales || iv.factores_trabajo || iv.conclusiones || iv.fecha_investigacion);
  }

  private lineas(s: string): string[] {
    return s.split('\n').map((x) => x.trim()).filter(Boolean);
  }

  async guardar(): Promise<void> {
    this.error.set(null);
    const payload: Partial<MatrizAtCaso> = {
      sede_id: this.form.sede_id ?? null,
      tipo_evento: this.form.tipo_evento as TipoEvento,
      fecha_hora_evento: new Date(this.form.fecha_hora_evento!).toISOString(),
      trabajador_nombre: this.form.trabajador_nombre ?? '',
      trabajador_documento: this.form.trabajador_documento ?? null,
      trabajador_cargo: this.form.trabajador_cargo ?? null,
      trabajador_vinculacion: this.form.trabajador_vinculacion ?? null,
      area_proceso: this.form.area_proceso ?? null,
      actividad_al_momento: this.form.actividad_al_momento ?? null,
      clasificacion_gravedad: this.form.clasificacion_gravedad ?? null,
      tipo_accidente: this.form.tipo_accidente ?? null,
      causo_muerte: this.form.clasificacion_gravedad === 'mortal' ? true : (this.form.causo_muerte ?? false),
      lugar_ocurrencia: this.form.lugar_ocurrencia ?? null,
      reportado_arl: this.form.reportado_arl ?? false,
      fecha_reporte_arl: this.form.fecha_reporte_arl ?? null,
      furat_radicado: this.form.furat_radicado ?? null,
      peligro_id: this.form.peligro_id ?? null,
      agente_id: this.form.agente_id ?? null,
      mecanismo_id: this.form.mecanismo_id ?? null,
      parte_cuerpo_id: this.form.parte_cuerpo_id ?? null,
      tipo_lesion_id: this.form.tipo_lesion_id ?? null,
      sitio_ocurrencia_id: this.form.sitio_ocurrencia_id ?? null,
      descripcion_evento: this.form.descripcion_evento ?? null,
      dias_incapacidad: this.esMortal ? null : (this.form.dias_incapacidad ?? null),
    };

    try {
      this.guardando.set(true);
      const casoId = this.modoEditar ? await this.guardarEdicion(payload) : await this.guardarNuevo(payload);
      if (casoId) await this.guardarInvestigacionYAcciones(casoId);
      this.guardado.emit();
    } catch (e: any) {
      this.error.set(e?.message ?? 'No se pudo guardar el caso.');
    } finally {
      this.guardando.set(false);
    }
  }

  private async guardarNuevo(payload: Partial<MatrizAtCaso>): Promise<string> {
    const caso = {
      ...payload,
      empresa_id: this.empresaId,
      foto_sitio_url: null, dias_cargados: null, dias_cargados_id: null,
      estado_caso: this.hayInvestigacion() ? 'en_investigacion' : 'reportado',
    } as MatrizAtCaso;
    const creado = await this.svc.crearCaso(caso);
    if (this.archivo && creado.id) {
      const path = await this.svc.subirEvidencia(this.empresaId, creado.id, this.archivo);
      await this.svc.actualizarCaso(creado.id, { foto_sitio_url: path });
    }
    return creado.id!;
  }

  private async guardarEdicion(payload: Partial<MatrizAtCaso>): Promise<string> {
    const id = this.casoEditar!.id!;
    const cambios: Partial<MatrizAtCaso> = { ...payload, estado_caso: this.form.estado_caso };
    if (this.archivo) {
      cambios.foto_sitio_url = await this.svc.subirEvidencia(this.empresaId, id, this.archivo);
    }
    await this.svc.actualizarCaso(id, cambios);
    return id;
  }

  private async guardarInvestigacionYAcciones(casoId: string): Promise<void> {
    if (this.hayInvestigacion()) {
      await this.svc.upsertInvestigacion({
        caso_id: casoId,
        metodologia: this.investigacion.metodologia,
        causas_inmediatas: {
          actos_inseguros: this.lineas(this.investigacion.actos_inseguros),
          condiciones_inseguras: this.lineas(this.investigacion.condiciones_inseguras),
        },
        causas_basicas: {
          factores_personales: this.lineas(this.investigacion.factores_personales),
          factores_trabajo: this.lineas(this.investigacion.factores_trabajo),
        },
        responsable_id: null,
        responsable_texto: this.investigacion.responsable_texto || null,
        fecha_investigacion: this.investigacion.fecha_investigacion,
        fuera_de_plazo: false,
        conclusiones: this.investigacion.conclusiones || null,
      });
    }

    // Sincronizar acciones (crear / actualizar / eliminar)
    const idsVigentes = this.acciones.filter((a) => a.id).map((a) => a.id!);
    for (const idOrig of this.accionIdsOriginales) {
      if (!idsVigentes.includes(idOrig)) await this.svc.eliminarAccion(idOrig);
    }
    for (const a of this.acciones) {
      if (!a.descripcion_accion.trim()) continue;
      const datos = {
        caso_id: casoId,
        descripcion_accion: a.descripcion_accion,
        responsable_id: null,
        responsable_rol_id: null,
        responsable_texto: a.responsable_texto || null,
        fecha_compromiso: a.fecha_compromiso,
        fecha_cierre: a.fecha_cierre ?? null,
        estado: a.estado ?? 'pendiente',
        evidencia_url: null,
      };
      if (a.id) await this.svc.actualizarAccion(a.id, datos);
      else await this.svc.crearAccion(datos);
    }
    this.accionIdsOriginales = idsVigentes;
  }

  private ahoraLocal(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }
}
