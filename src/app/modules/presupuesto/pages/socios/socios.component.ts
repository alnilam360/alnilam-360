import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PresupuestoService } from '../../../../core/services/presupuesto.service';
import { Empresa } from '../../../../core/models/models';
import {
  PresupuestoPeriodo, PresupuestoSocio, repartoPresupuestadoSocio, sumaPorcentajes,
} from '../../../../core/models/presupuesto.model';
import { formatearCOP } from '../../funciones/resumen.funcion';

@Component({
  selector: 'app-presupuesto-socios',
  standalone: false,
  templateUrl: './socios.component.html',
  styleUrls: ['./socios.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class SociosComponent implements OnInit {
  private service = inject(PresupuestoService);

  readonly cop = formatearCOP;
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  errorForm = signal<string | null>(null);
  esAdmin = signal(false);
  empresas = signal<Empresa[]>([]);
  empresaId = signal('');
  socios = signal<PresupuestoSocio[]>([]);
  periodos = signal<PresupuestoPeriodo[]>([]);
  periodoId = signal('');
  saldoFinal = signal<number | null>(null);
  modalAbierto = signal(false);
  editandoId = signal<string | null>(null);
  socioAEliminar = signal<PresupuestoSocio | null>(null);

  // Fracción 0..1 (el form trabaja en % y se divide entre 100 al guardar).
  sumaPct = computed(() => Math.round(sumaPorcentajes(this.socios()) * 10000) / 100);
  sumaOk = computed(() => this.sumaPct() === 100);
  filas = computed(() => this.socios().map(s => ({
    socio: s,
    pct: Math.round(s.porcentaje * 10000) / 100,
    reparto: this.saldoFinal() === null ? null : repartoPresupuestadoSocio(this.saldoFinal()!, s.porcentaje),
  })));
  trackSocio = (_: number, f: { socio: PresupuestoSocio }) => f.socio.id;

  form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    porcentaje: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(100)] }),
    activo: new FormControl(true, { nonNullable: true }),
  });

  async ngOnInit(): Promise<void> {
    try {
      const ctx = await this.service.resolverContextoEmpresa();
      this.esAdmin.set(ctx.esAdmin);
      this.empresas.set(ctx.empresas);
      await this.cargar(ctx.empresaId);
    } catch (e) {
      this.fallar(e);
    }
  }

  async cargar(empresaId: string): Promise<void> {
    this.empresaId.set(empresaId);
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.socios.set(empresaId ? await this.service.listarSocios(empresaId) : []);
      const periodos = empresaId ? await this.service.listarPeriodos(empresaId) : [];
      this.periodos.set(periodos);
      await this.elegirPeriodo(periodos[0]?.id ?? '');
      this.cargando.set(false);
    } catch (e) {
      this.fallar(e);
    }
  }

  async elegirPeriodo(id: string): Promise<void> {
    this.periodoId.set(id);
    try {
      this.saldoFinal.set(id ? (await this.service.getResumen(id))?.saldo_final ?? 0 : null);
    } catch (e) {
      this.saldoFinal.set(null);
      this.error.set((e as { message?: string })?.message ?? 'No se pudo calcular el reparto');
    }
  }

  abrir(s?: PresupuestoSocio): void {
    this.errorForm.set(null);
    this.editandoId.set(s?.id ?? null);
    this.form.reset({
      nombre: s?.nombre ?? '', porcentaje: s ? Math.round(s.porcentaje * 10000) / 100 : 0, activo: s?.activo ?? true,
    });
    this.modalAbierto.set(true);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.errorForm.set(null);
    const v = this.form.getRawValue();
    const datos = { nombre: v.nombre.trim(), porcentaje: v.porcentaje / 100, activo: v.activo };
    const id = this.editandoId();
    try {
      if (id) await this.service.actualizarSocio(id, datos);
      else await this.service.crearSocio(this.empresaId(), datos);
      this.modalAbierto.set(false);
      this.socios.set(await this.service.listarSocios(this.empresaId()));
    } catch (e) {
      this.errorForm.set((e as { message?: string })?.message ?? 'No se pudo guardar');
    }
    this.guardando.set(false);
  }

  async eliminar(): Promise<void> {
    const s = this.socioAEliminar();
    if (!s) return;
    try {
      await this.service.eliminarSocio(s.id);
      this.socios.set(await this.service.listarSocios(this.empresaId()));
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'No se pudo eliminar');
    }
    this.socioAEliminar.set(null);
  }

  private fallar(e: unknown): void {
    this.error.set((e as { message?: string })?.message ?? 'No se pudieron cargar los socios');
    this.cargando.set(false);
  }
}
