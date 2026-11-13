import { Directive, OnInit, inject, signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { Empresa } from '../../../core/models/models';
import { PresupuestoPeriodo } from '../../../core/models/presupuesto.model';
import { PresupuestoService } from '../../../core/services/presupuesto.service';
import { claseVariacion, formatearCOP, formatearVariacionPct, variacionPct } from '../funciones/resumen.funcion';

/** Estado y flujo comunes de las pantallas de captura (empresa + periodo + CRUD en modal). */
@Directive()
export abstract class CapturaBase<T extends { id: string }> implements OnInit {
  protected service = inject(PresupuestoService);
  abstract readonly form: AbstractControl;

  readonly cop = formatearCOP;
  readonly variacionPct = variacionPct;
  readonly pct = formatearVariacionPct;
  readonly claseVar = claseVariacion;
  readonly trackById = (_: number, f: { id: string }) => f.id;
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  errorForm = signal<string | null>(null);
  esAdmin = signal(false);
  empresas = signal<Empresa[]>([]);
  empresaId = signal('');
  periodos = signal<PresupuestoPeriodo[]>([]);
  periodoId = signal('');
  filas = signal<T[]>([]);
  modalAbierto = signal(false);
  editandoId = signal<string | null>(null);
  aEliminar = signal<T | null>(null);

  protected abstract listar(empresaId: string, periodoId: string): Promise<T[]>;
  protected abstract persistir(id: string | null): Promise<void>;
  protected abstract borrar(id: string): Promise<void>;

  async ngOnInit(): Promise<void> {
    try {
      const ctx = await this.service.resolverContextoEmpresa();
      this.esAdmin.set(ctx.esAdmin);
      this.empresas.set(ctx.empresas);
      await this.elegirEmpresa(ctx.empresaId);
    } catch (e) {
      this.fallar(e, 'No se pudo cargar el contexto');
    }
  }

  async elegirEmpresa(empresaId: string): Promise<void> {
    this.empresaId.set(empresaId);
    try {
      const periodos = empresaId ? await this.service.listarPeriodos(empresaId) : [];
      this.periodos.set(periodos);
      await this.elegirPeriodo(periodos[0]?.id ?? '');
    } catch (e) {
      this.fallar(e, 'No se pudieron cargar los periodos');
    }
  }

  async elegirPeriodo(periodoId: string): Promise<void> {
    this.periodoId.set(periodoId);
    await this.recargar();
  }

  async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const filas = this.periodoId() ? await this.listar(this.empresaId(), this.periodoId()) : [];
      this.filas.set(filas);
      this.cargando.set(false);
    } catch (e) {
      this.filas.set([]);
      this.fallar(e, 'No se pudieron cargar los registros');
    }
  }

  protected abrirModal(id: string | null): void {
    this.errorForm.set(null);
    this.editandoId.set(id);
    this.modalAbierto.set(true);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.errorForm.set(null);
    try {
      await this.persistir(this.editandoId());
      this.modalAbierto.set(false);
      await this.recargar();
    } catch (e) {
      this.errorForm.set(this.mensaje(e, 'No se pudo guardar'));
    }
    this.guardando.set(false);
  }

  async eliminar(): Promise<void> {
    const fila = this.aEliminar();
    if (!fila) return;
    this.guardando.set(true);
    try {
      await this.borrar(fila.id);
      this.aEliminar.set(null);
      await this.recargar();
    } catch (e) {
      this.aEliminar.set(null);
      this.error.set(this.mensaje(e, 'No se pudo eliminar'));
    }
    this.guardando.set(false);
  }

  private fallar(e: unknown, porDefecto: string): void {
    this.error.set(this.mensaje(e, porDefecto));
    this.cargando.set(false);
  }

  private mensaje(e: unknown, porDefecto: string): string {
    return (e as { message?: string })?.message ?? porDefecto;
  }
}
