import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { VerificacionesService } from '../../../../core/services/verificaciones.service';
import { Empresa } from '../../../../core/models/models';
import {
  EstadoVerificacion, ProgramaVerificacionRow, TipoVerificacion, VerificacionPlantilla,
} from '../../../../core/models/verificacion.model';
import { estadoPrograma, resumenPrograma } from '../../funciones/programa.funcion';

const BADGE = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ';
const CLASE_ESTADO: Record<EstadoVerificacion, string> = {
  programada: 'bg-sky-500/20 text-sky-400',
  en_curso: 'bg-amber-500/20 text-amber-400',
  cerrada: 'bg-emerald-500/20 text-emerald-400',
  cancelada: 'bg-slate-500/20 text-slate-400',
};
const ETIQUETA_ESTADO: Record<EstadoVerificacion, string> = {
  programada: 'Programada', en_curso: 'En curso', cerrada: 'Cerrada', cancelada: 'Cancelada',
};
const ETIQUETA_TIPO: Record<TipoVerificacion, string> = { inspeccion: 'Inspección', auditoria_interna: 'Auditoría interna' };

@Component({
  selector: 'app-auditorias-cockpit',
  standalone: false,
  templateUrl: './cockpit.component.html',
  styleUrls: ['./cockpit.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CockpitComponent implements OnInit {
  private service = inject(VerificacionesService);

  readonly trackById = (_: number, f: ProgramaVerificacionRow) => f.verificacion_id;
  readonly tipos = Object.entries(ETIQUETA_TIPO).map(([valor, etiqueta]) => ({ valor: valor as TipoVerificacion, etiqueta }));
  readonly estados = Object.entries(ETIQUETA_ESTADO).map(([valor, etiqueta]) => ({ valor: valor as EstadoVerificacion, etiqueta }));
  readonly hoy = new Date().toISOString().slice(0, 10);
  readonly anios = [0, 1, 2, 3].map(i => new Date().getFullYear() + 1 - i);

  cargando = signal(true);
  error = signal<string | null>(null);
  esAdmin = signal(false);
  empresas = signal<Empresa[]>([]);
  empresaId = signal('');
  anio = signal(new Date().getFullYear());
  filas = signal<ProgramaVerificacionRow[]>([]);
  filtroTipo = signal<TipoVerificacion | null>(null);
  filtroEstado = signal<EstadoVerificacion | null>(null);
  plantillas = signal<VerificacionPlantilla[]>([]);
  modalAbierto = signal(false);
  guardando = signal(false);
  errorGuardar = signal<string | null>(null);

  form = new FormGroup({
    tipo: new FormControl<TipoVerificacion>('inspeccion', { nonNullable: true, validators: Validators.required }),
    subtipo: new FormControl<string>('', { nonNullable: true }),
    titulo: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    plantilla_id: new FormControl<string>('', { nonNullable: true }),
    responsable_texto: new FormControl<string>('', { nonNullable: true }),
    fecha_programada: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
  });

  visibles = computed(() => {
    const t = this.filtroTipo();
    const e = this.filtroEstado();
    return this.filas().filter(f => (!t || f.tipo === t) && (!e || f.estado === e));
  });
  resumen = computed(() => resumenPrograma(this.filas(), this.hoy));
  plantillasTipo = computed(() => this.plantillas().filter(p => p.tipo === this.tipoForm()));
  private tipoForm = signal<TipoVerificacion>('inspeccion');

  async ngOnInit(): Promise<void> {
    try {
      const ctx = await this.service.resolverContextoEmpresa();
      this.esAdmin.set(ctx.esAdmin);
      this.empresas.set(ctx.empresas);
      await this.cambiarEmpresa(ctx.empresaId);
    } catch (e) {
      this.fallar(e);
    }
  }

  async cambiarEmpresa(empresaId: string): Promise<void> {
    this.empresaId.set(empresaId);
    this.plantillas.set([]);
    await this.cargar();
  }

  async cambiarAnio(anio: number): Promise<void> {
    this.anio.set(Number(anio));
    await this.cargar();
  }

  async cargar(): Promise<void> {
    const empresaId = this.empresaId();
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.filas.set(empresaId ? await this.service.getPrograma(empresaId, this.anio()) : []);
      this.cargando.set(false);
    } catch (e) {
      this.fallar(e);
    }
  }

  async abrirModal(): Promise<void> {
    this.errorGuardar.set(null);
    this.form.reset();
    this.tipoForm.set('inspeccion');
    this.modalAbierto.set(true);
    if (this.plantillas().length > 0) return;
    try {
      this.plantillas.set(await this.service.listarPlantillas(this.empresaId()));
    } catch (e) {
      this.errorGuardar.set(this.mensaje(e, 'No se pudieron cargar las plantillas'));
    }
  }

  alCambiarTipo(): void {
    this.tipoForm.set(this.form.controls.tipo.value);
    this.form.controls.plantilla_id.setValue('');
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando()) return;
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.errorGuardar.set(null);
    try {
      await this.service.crearVerificacion({
        empresa_id: this.empresaId(), tipo: v.tipo, subtipo: v.subtipo.trim() || null, titulo: v.titulo.trim(),
        plantilla_id: v.plantilla_id || null, sede_id: null, responsable_id: null,
        responsable_texto: v.responsable_texto.trim() || null,
        fecha_programada: `${v.fecha_programada}T12:00:00Z`, fecha_ejecucion: null, estado: 'programada',
        alcance: null, criterios: null, puntaje: null, observaciones: null,
      });
      this.modalAbierto.set(false);
      await this.cargar();
    } catch (e) {
      this.errorGuardar.set(this.mensaje(e, 'No se pudo guardar la verificación'));
    } finally {
      this.guardando.set(false);
    }
  }

  async cancelar(f: ProgramaVerificacionRow): Promise<void> {
    if (!confirm(`¿Cancelar "${f.titulo}"?`)) return;
    try {
      await this.service.cancelarVerificacion(f.verificacion_id);
      await this.cargar();
    } catch (e) {
      this.error.set(this.mensaje(e, 'No se pudo cancelar la verificación'));
    }
  }

  puedeCancelar(f: ProgramaVerificacionRow): boolean { return f.estado === 'programada' || f.estado === 'en_curso'; }
  etiquetaTipo(t: TipoVerificacion): string { return ETIQUETA_TIPO[t]; }
  etiquetaEstado(e: EstadoVerificacion): string { return ETIQUETA_ESTADO[e]; }
  claseEstado(f: ProgramaVerificacionRow): string {
    const vencida = estadoPrograma(f, this.hoy) === 'vencida';
    return BADGE + (vencida ? 'bg-rose-500/20 text-rose-400' : CLASE_ESTADO[f.estado]);
  }

  private mensaje(e: unknown, defecto: string): string { return (e as { message?: string })?.message ?? defecto; }

  private fallar(e: unknown): void {
    this.error.set(this.mensaje(e, 'No se pudo cargar el programa'));
    this.cargando.set(false);
  }
}
