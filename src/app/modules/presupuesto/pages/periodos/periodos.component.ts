import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PresupuestoService } from '../../../../core/services/presupuesto.service';
import { Empresa } from '../../../../core/models/models';
import { PresupuestoPeriodo } from '../../../../core/models/presupuesto.model';
import { formatearCOP } from '../../funciones/resumen.funcion';

@Component({
  selector: 'app-presupuesto-periodos',
  standalone: false,
  templateUrl: './periodos.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
})
export class PeriodosComponent implements OnInit {
  private service = inject(PresupuestoService);

  readonly cop = formatearCOP;
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  errorForm = signal<string | null>(null);
  esAdmin = signal(false);
  empresas = signal<Empresa[]>([]);
  empresaId = signal('');
  periodos = signal<PresupuestoPeriodo[]>([]);
  modalAbierto = signal(false);
  editandoId = signal<string | null>(null);

  form = new FormGroup({
    mes: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)] }),
    saldo_inicial: new FormControl(0, { nonNullable: true, validators: [Validators.required] }),
    facturado: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
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
      this.periodos.set(empresaId ? await this.service.listarPeriodos(empresaId) : []);
      this.cargando.set(false);
    } catch (e) {
      this.fallar(e);
    }
  }

  abrir(p?: PresupuestoPeriodo): void {
    this.errorForm.set(null);
    this.editandoId.set(p?.id ?? null);
    this.form.reset({ mes: p?.mes ?? '', saldo_inicial: p?.saldo_inicial ?? 0, facturado: p?.facturado ?? 0 });
    p ? this.form.controls.mes.disable() : this.form.controls.mes.enable();
    this.modalAbierto.set(true);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.errorForm.set(null);
    const { mes, saldo_inicial, facturado } = this.form.getRawValue();
    const id = this.editandoId();
    try {
      if (id) await this.service.actualizarPeriodo(id, { saldo_inicial, facturado });
      else await this.service.crearPeriodo(this.empresaId(), { mes, saldo_inicial, facturado });
      this.modalAbierto.set(false);
      await this.cargar(this.empresaId());
    } catch (e) {
      this.errorForm.set((e as { message?: string })?.message ?? 'No se pudo guardar');
    }
    this.guardando.set(false);
  }

  private fallar(e: unknown): void {
    this.error.set((e as { message?: string })?.message ?? 'No se pudieron cargar los periodos');
    this.cargando.set(false);
  }
}
