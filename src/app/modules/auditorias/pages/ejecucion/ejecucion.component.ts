import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VerificacionesService } from '../../../../core/services/verificaciones.service';
import { IndicadoresExcelService } from '../../../../core/services/indicadores-excel.service';
import {
  ClasificacionHallazgo, EstadoHallazgo, Hallazgo, JerarquiaControl, ResultadoItem, SeveridadHallazgo,
  Verificacion, VerificacionRespuesta,
} from '../../../../core/models/verificacion.model';
import { derivarHallazgos, porcentajeCumplimiento, puedeCerrar } from '../../funciones/ejecucion.funcion';

@Component({
  selector: 'app-auditorias-ejecucion',
  standalone: false,
  templateUrl: './ejecucion.component.html',
  styleUrls: ['./ejecucion.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class EjecucionComponent implements OnInit {
  private service = inject(VerificacionesService);
  private route = inject(ActivatedRoute);
  private excel = inject(IndicadoresExcelService);

  readonly trackById = (_: number, x: { id?: string }) => x.id ?? '';
  readonly trackHallazgo = (_: number, h: Hallazgo) => h.id ?? h.respuesta_id ?? '';
  readonly resultados: { valor: ResultadoItem; etiqueta: string; clase: string }[] = [
    { valor: 'cumple', etiqueta: 'Cumple', clase: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
    { valor: 'no_cumple', etiqueta: 'No cumple', clase: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
    { valor: 'no_aplica', etiqueta: 'No aplica', clase: 'bg-slate-500/20 text-slate-400 border-slate-500/40' },
  ];
  readonly clasificaciones: ClasificacionHallazgo[] = ['tecnico', 'documental', 'operativo', 'administrativo'];
  readonly severidades: SeveridadHallazgo[] = ['baja', 'media', 'alta', 'critica'];
  readonly estadosH: EstadoHallazgo[] = ['abierto', 'en_progreso', 'cerrado'];
  readonly jerarquias: JerarquiaControl[] = ['fuente', 'medio', 'individuo'];

  cargando = signal(true);
  error = signal<string | null>(null);
  errorAccion = signal<string | null>(null);
  enVuelo = signal(false);
  verificacion = signal<Verificacion | null>(null);
  respuestas = signal<VerificacionRespuesta[]>([]);
  hallazgos = signal<Hallazgo[]>([]);
  errorHallazgo = signal<Record<string, string>>({});
  textoNuevo = '';

  editable = computed(() => {
    const e = this.verificacion()?.estado;
    return e === 'programada' || e === 'en_curso';
  });
  porcentaje = computed(() => porcentajeCumplimiento(this.respuestas()));
  respondidos = computed(() => this.respuestas().filter(r => r.resultado !== null).length);
  cerrable = computed(() => this.editable() && puedeCerrar(this.respuestas()));

  async ngOnInit(): Promise<void> {
    await this.cargar(true);
  }

  async cargar(iniciar = false): Promise<void> {
    this.error.set(null);
    try {
      const id = this.route.snapshot.paramMap.get('id') ?? '';
      let d = await this.service.getVerificacion(id);
      if (iniciar && d.respuestas.length === 0 && d.verificacion.plantilla_id && d.verificacion.estado !== 'cancelada') {
        await this.service.iniciarEjecucion(d.verificacion);
        d = await this.service.getVerificacion(id);
      }
      this.verificacion.set(d.verificacion);
      this.respuestas.set(d.respuestas);
      this.hallazgos.set(d.hallazgos);
    } catch (e) {
      this.error.set(this.mensaje(e, 'No se pudo cargar la verificación'));
    } finally {
      this.cargando.set(false);
    }
  }

  /** Ejecuta una acción con el control en vuelo y muestra el error real del servidor. */
  private async correr(accion: () => Promise<void>, defecto: string): Promise<void> {
    if (this.enVuelo()) return;
    this.enVuelo.set(true);
    this.errorAccion.set(null);
    try {
      await accion();
    } catch (e) {
      this.errorAccion.set(this.mensaje(e, defecto));
    } finally {
      this.enVuelo.set(false);
    }
  }

  private reemplazar(nueva: VerificacionRespuesta): void {
    this.respuestas.update(l => l.map(r => (r.id === nueva.id ? nueva : r)));
  }

  setResultado(r: VerificacionRespuesta, resultado: ResultadoItem): Promise<void> {
    return this.guardar({ ...r, resultado });
  }

  guardarObservacion(r: VerificacionRespuesta, texto: string): Promise<void> {
    return this.guardar({ ...r, observacion: texto.trim() || null });
  }

  private guardar(r: VerificacionRespuesta): Promise<void> {
    return this.correr(async () => this.reemplazar(await this.service.guardarRespuesta(r)), 'No se pudo guardar la respuesta');
  }

  subirFoto(r: VerificacionRespuesta, ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const v = this.verificacion();
    if (!file || !v) return Promise.resolve();
    return this.correr(async () => {
      const path = await this.service.subirEvidencia(v.empresa_id, v.id as string, file);
      this.reemplazar(await this.service.guardarRespuesta({ ...r, evidencia_url: path }));
    }, 'No se pudo subir la evidencia');
  }

  verEvidencia(path: string): Promise<void> {
    return this.correr(async () => {
      window.open(await this.service.urlFirmadaEvidencia(path), '_blank', 'noopener');
    }, 'No se pudo abrir la evidencia');
  }

  agregarItem(): Promise<void> {
    const texto = this.textoNuevo.trim();
    const v = this.verificacion();
    if (!texto || !v) return Promise.resolve();
    return this.correr(async () => {
      const orden = this.respuestas().reduce((m, r) => Math.max(m, r.orden), 0) + 1;
      const nueva = await this.service.agregarItemManual(v.id as string, orden, texto);
      this.respuestas.update(l => [...l, nueva]);
      this.textoNuevo = '';
    }, 'No se pudo agregar el ítem');
  }

  // ── Hallazgos ───────────────────────────────────────────────────────────────
  sugerirHallazgos(): void {
    const v = this.verificacion();
    if (!v) return;
    const nuevos: Hallazgo[] = derivarHallazgos(this.respuestas(), this.hallazgos()).map(s => ({
      empresa_id: v.empresa_id, verificacion_id: v.id as string, respuesta_id: s.respuesta_id, descripcion: s.item_texto,
      clasificacion: null, severidad: null, estandar_id: null, responsable_id: null, responsable_texto: null,
      fecha_compromiso: null, jerarquia: null, estado: 'abierto', fecha_cierre: null, eficacia_verificada: false,
      fecha_verificacion: null, evidencia_cierre_url: null,
    }));
    this.hallazgos.update(l => [...l, ...nuevos]);
  }

  fechaHallazgo(h: Hallazgo, campo: 'fecha_compromiso' | 'fecha_cierre' | 'fecha_verificacion', valor: string): void {
    h[campo] = valor ? `${valor}T12:00:00Z` : null;
  }

  guardarHallazgo(h: Hallazgo): Promise<void> {
    const clave = h.id ?? h.respuesta_id ?? 'nuevo';
    if (h.estado === 'cerrado' && !h.fecha_cierre) {
      this.errorHallazgo.update(m => ({ ...m, [clave]: 'Un hallazgo cerrado exige fecha de cierre' }));
      return Promise.resolve();
    }
    this.errorHallazgo.update(m => ({ ...m, [clave]: '' }));
    return this.correr(async () => {
      if (h.id) await this.service.actualizarHallazgo(h.id, h);
      else await this.service.crearHallazgo(h);
      await this.recargarHallazgos();
    }, 'No se pudo guardar el hallazgo');
  }

  quitarHallazgo(h: Hallazgo): Promise<void> {
    if (!h.id) {
      this.hallazgos.update(l => l.filter(x => x !== h));
      return Promise.resolve();
    }
    return this.correr(async () => {
      await this.service.eliminarHallazgo(h.id as string);
      await this.recargarHallazgos();
    }, 'No se pudo eliminar el hallazgo');
  }

  private async recargarHallazgos(): Promise<void> {
    this.hallazgos.set((await this.service.getVerificacion(this.verificacion()?.id as string)).hallazgos);
  }

  cerrar(): Promise<void> {
    return this.correr(async () => {
      await this.service.cerrarVerificacion2(this.verificacion()?.id as string);
      await this.cargar();
    }, 'No se pudo cerrar la verificación');
  }

  exportar(): Promise<void> {
    const v = this.verificacion();
    if (!v) return Promise.resolve();
    return this.correr(async () => {
      const ctx = await this.service.resolverContextoEmpresa();
      const hs = this.hallazgos();
      const estandaresPorId: Record<string, string> = {};
      if (hs.some(h => h.estandar_id)) {
        for (const e of await this.service.listarEstandares()) estandaresPorId[e.id] = e.item;
      }
      await this.excel.exportarInformeVerificacion({
        empresaNombre: ctx.empresas.find(e => e.id === v.empresa_id)?.nombre ?? '',
        verificacion: v, respuestas: this.respuestas(), hallazgos: hs, estandaresPorId,
      });
    }, 'No se pudo exportar el informe');
  }

  private mensaje(e: unknown, defecto: string): string { return (e as { message?: string })?.message ?? defecto; }
}
