import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatrizAtCasoService } from '../../../../core/services/matriz-at-caso.service';
import { InvestigacionAtelService } from '../../../../core/services/investigacion-atel.service';
import { IndicadoresExcelService } from '../../../../core/services/indicadores-excel.service';
import {
  EquipoInvestigadorMiembro, EstadoAccion, InformeInvestigacion, MatrizAtAccion, MatrizAtCaso,
  MatrizAtInvestigacion, Metodologia,
} from '../../../../core/models/matriz-at.model';
import { esGrave, fusionarEquipo, puedeCerrar } from '../../funciones/investigacion.funcion';

interface AccionForm {
  id?: string;
  descripcion_accion: string;
  responsable_texto: string;
  fecha_compromiso: string | null;
  estado: EstadoAccion;
  fecha_cierre: string | null;
  jerarquia: 'fuente' | 'medio' | 'individuo' | null;
  eficacia_verificada: boolean;
  fecha_verificacion: string | null;
}

@Component({
  selector: 'app-investigacion-detalle',
  standalone: false,
  templateUrl: './investigacion-detalle.component.html',
  styleUrls: ['./investigacion-detalle.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class InvestigacionDetalleComponent implements OnInit {
  private readonly svc = inject(MatrizAtCasoService);
  private readonly atel = inject(InvestigacionAtelService);
  private readonly excel = inject(IndicadoresExcelService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly caso = signal<MatrizAtCaso | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly exportando = signal(false);
  readonly equipo = signal<EquipoInvestigadorMiembro[]>([]);
  readonly esGraveCaso = computed(() => {
    const c = this.caso();
    return !!c && esGrave(c.clasificacion_gravedad, c.causo_muerte);
  });

  nuevoMiembro = { nombre: '', rol: '' };
  acciones: AccionForm[] = [];
  private idsOriginales: string[] = [];
  inv = {
    metodologia: null as Metodologia | null,
    actos_inseguros: '', condiciones_inseguras: '', factores_personales: '', factores_trabajo: '',
    responsable_texto: '', fecha_investigacion: null as string | null, conclusiones: '',
  };

  readonly metodologias: { k: Metodologia; l: string }[] = [
    { k: 'arbol_causas', l: 'Árbol de causas' },
    { k: 'cinco_porques', l: '5 porqués' },
    { k: 'espina_pescado', l: 'Espina de pescado (Ishikawa)' },
  ];

  async ngOnInit(): Promise<void> {
    try {
      const c = await this.svc.getCaso(this.route.snapshot.paramMap.get('casoId') ?? '');
      this.prefill(c);
      this.caso.set(c);
    } catch (e) {
      this.error.set((e as Error)?.message ?? 'No se pudo cargar el caso.');
    } finally {
      this.cargando.set(false);
    }
  }

  private prefill(c: MatrizAtCaso): void {
    const iv = c.investigacion;
    if (iv) {
      this.inv = {
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
    this.equipo.set(iv?.equipo_investigador ?? []);
    this.acciones = (c.acciones ?? []).map((a) => ({
      id: a.id, descripcion_accion: a.descripcion_accion, responsable_texto: a.responsable_texto ?? '',
      fecha_compromiso: a.fecha_compromiso, estado: a.estado, fecha_cierre: a.fecha_cierre,
      jerarquia: a.jerarquia ?? null, eficacia_verificada: a.eficacia_verificada,
      fecha_verificacion: a.fecha_verificacion ?? null,
    }));
    this.idsOriginales = this.acciones.filter((a) => a.id).map((a) => a.id!);
  }

  // ── Equipo ──
  async sugerir(): Promise<void> {
    const c = this.caso();
    if (!c) return;
    try {
      this.equipo.set(fusionarEquipo(this.equipo(), await this.atel.sugerirEquipo(c.empresa_id)));
    } catch (e) {
      this.error.set((e as Error)?.message ?? 'No se pudo sugerir el equipo.');
    }
  }
  agregarMiembro(): void {
    const { nombre, rol } = this.nuevoMiembro;
    if (!nombre.trim() || !rol.trim()) return;
    this.equipo.update((l) => [...l, { nombre: nombre.trim(), rol: rol.trim(), fuente: 'manual' }]);
    this.nuevoMiembro = { nombre: '', rol: '' };
  }
  quitarMiembro(i: number): void { this.equipo.update((l) => l.filter((_, k) => k !== i)); }

  // ── Acciones ──
  agregarAccion(): void {
    this.acciones.push({
      descripcion_accion: '', responsable_texto: '', fecha_compromiso: null, estado: 'pendiente',
      fecha_cierre: null, jerarquia: null, eficacia_verificada: false, fecha_verificacion: null,
    });
  }
  quitarAccion(i: number): void { this.acciones.splice(i, 1); }
  puedeCerrarYa(): boolean { return puedeCerrar(this.acciones); }

  estadoPlazo(): string { const c = this.caso(); return c ? this.svc.estadoInvestigacion(c) : 'no_aplica'; }

  irIperc(): void { this.router.navigate(['/gestion-sst/matriz-iperc']); }

  // ── Guardado ──
  private hayInvestigacion(): boolean {
    const iv = this.inv;
    return !!(iv.metodologia || iv.actos_inseguros || iv.condiciones_inseguras || iv.factores_personales ||
      iv.factores_trabajo || iv.conclusiones || iv.fecha_investigacion || this.equipo().length);
  }
  private lineas(s: string): string[] { return s.split('\n').map((x) => x.trim()).filter(Boolean); }

  private async persistir(casoId: string): Promise<void> {
    const c = this.caso()!;
    if (this.hayInvestigacion()) {
      const limite = this.svc.fechaLimiteInvestigacion(c.fecha_hora_evento);
      await this.svc.upsertInvestigacion({
        caso_id: casoId, metodologia: this.inv.metodologia,
        causas_inmediatas: { actos_inseguros: this.lineas(this.inv.actos_inseguros), condiciones_inseguras: this.lineas(this.inv.condiciones_inseguras) },
        causas_basicas: { factores_personales: this.lineas(this.inv.factores_personales), factores_trabajo: this.lineas(this.inv.factores_trabajo) },
        responsable_id: null, responsable_texto: this.inv.responsable_texto || null,
        fecha_investigacion: this.inv.fecha_investigacion,
        fuera_de_plazo: !!this.inv.fecha_investigacion && this.inv.fecha_investigacion > limite,
        conclusiones: this.inv.conclusiones || null, equipo_investigador: this.equipo(),
      });
    }
    await this.sincronizarAcciones(casoId);
  }

  private async sincronizarAcciones(casoId: string): Promise<void> {
    const vigentes = this.acciones.filter((a) => a.id).map((a) => a.id!);
    for (const id of this.idsOriginales) if (!vigentes.includes(id)) await this.svc.eliminarAccion(id);
    for (const a of this.acciones) {
      if (!a.descripcion_accion.trim()) continue;
      const datos: MatrizAtAccion = {
        caso_id: casoId, descripcion_accion: a.descripcion_accion, responsable_id: null, responsable_rol_id: null,
        responsable_texto: a.responsable_texto || null, fecha_compromiso: a.fecha_compromiso,
        fecha_cierre: a.fecha_cierre, estado: a.estado, evidencia_url: null, jerarquia: a.jerarquia,
        eficacia_verificada: a.eficacia_verificada, fecha_verificacion: a.fecha_verificacion,
      };
      if (a.id) await this.svc.actualizarAccion(a.id, datos);
      else await this.svc.crearAccion(datos);
    }
    this.idsOriginales = vigentes;
  }

  // ── Export informe oficial ──
  private armarInvestigacion(c: MatrizAtCaso): MatrizAtInvestigacion | null {
    if (!this.hayInvestigacion()) return null;
    return {
      caso_id: c.id ?? '', metodologia: this.inv.metodologia,
      causas_inmediatas: { actos_inseguros: this.lineas(this.inv.actos_inseguros), condiciones_inseguras: this.lineas(this.inv.condiciones_inseguras) },
      causas_basicas: { factores_personales: this.lineas(this.inv.factores_personales), factores_trabajo: this.lineas(this.inv.factores_trabajo) },
      responsable_id: null, responsable_texto: this.inv.responsable_texto || null,
      fecha_investigacion: this.inv.fecha_investigacion, fuera_de_plazo: c.investigacion?.fuera_de_plazo ?? false,
      conclusiones: this.inv.conclusiones || null, equipo_investigador: this.equipo(),
    };
  }

  private async resolverNombres(c: MatrizAtCaso): Promise<InformeInvestigacion['nombres']> {
    const [pel, age, mec, par, les, sit] = await Promise.all([
      this.svc.getPeligros(), this.svc.getAgentes(), this.svc.getMecanismos(),
      this.svc.getPartesCuerpo(), this.svc.getTiposLesion(), this.svc.getSitios(),
    ]);
    const nom = (l: { id: string; nombre: string }[], id: string | null) => l.find((x) => x.id === id)?.nombre;
    return {
      peligro: nom(pel, c.peligro_id), agente: nom(age, c.agente_id), mecanismo: nom(mec, c.mecanismo_id),
      parteCuerpo: nom(par, c.parte_cuerpo_id), sitio: nom(sit, c.sitio_ocurrencia_id),
      tipoLesion: c.tipo_lesion?.nombre ?? nom(les, c.tipo_lesion_id),
    };
  }

  /** Usa el estado actual del formulario (causas, equipo y acciones aún sin guardar), no lo persistido. */
  async exportarInforme(): Promise<void> {
    const c = this.caso();
    if (!c || this.exportando()) return;
    this.error.set(null);
    this.exportando.set(true);
    try {
      const [nombres, emp] = await Promise.all([this.resolverNombres(c), this.svc.getEmpresaPorId(c.empresa_id)]);
      const acciones = this.acciones.filter((a) => a.descripcion_accion.trim())
        .map((a) => ({ ...a, caso_id: c.id ?? '', responsable_id: null, responsable_rol_id: null, evidencia_url: null }));
      await this.excel.exportarInformeInvestigacion({
        empresaNombre: emp?.nombre ?? '', caso: c, nombres, investigacion: this.armarInvestigacion(c), acciones,
      });
    } catch (e) {
      this.error.set((e as Error)?.message ?? 'No se pudo exportar el informe.');
    } finally {
      this.exportando.set(false);
    }
  }

  async guardar(cerrar = false): Promise<void> {
    const id = this.caso()?.id;
    if (!id || this.guardando() || (cerrar && !this.puedeCerrarYa())) return;
    this.error.set(null);
    this.guardando.set(true);
    try {
      await this.persistir(id);
      if (cerrar) await this.svc.actualizarCaso(id, { estado_caso: 'cerrado' });
      await this.router.navigate(['/investigacion-atel']);
    } catch (e) {
      this.error.set((e as Error)?.message ?? 'No se pudo guardar la investigación.');
    } finally {
      this.guardando.set(false);
    }
  }
}
