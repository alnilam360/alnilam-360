import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PresupuestoMovimiento, PresupuestoSubrubro } from '../../../../core/models/presupuesto.model';
import { fechaAInput, fechaAISO, sumar } from '../../funciones/capturas.funcion';
import { CapturaBase } from '../captura-base';

const RUBROS_GASTO = [2000, 3000, 4000];
const montoCtrl = () => new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] });

@Component({
  selector: 'app-presupuesto-gastos',
  standalone: false,
  templateUrl: './gastos.component.html',
  styleUrls: ['./gastos.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class GastosComponent extends CapturaBase<PresupuestoMovimiento> {
  subrubros = signal<PresupuestoSubrubro[]>([]);
  nombres = computed(() => new Map(this.subrubros().map(s => [s.codigo, s.nombre])));
  totalPresup = computed(() => sumar(this.filas(), f => f.presupuestado));
  totalEjec = computed(() => sumar(this.filas(), f => f.ejecutado));

  readonly form = new FormGroup({
    subrubro_codigo: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fecha: new FormControl('', { nonNullable: true }),
    detalle: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    presupuestado: montoCtrl(),
    ejecutado: montoCtrl(),
  });

  override async ngOnInit(): Promise<void> {
    try {
      const todos = await this.service.getSubrubros();
      this.subrubros.set(todos.filter(s => RUBROS_GASTO.includes(s.rubro_codigo)));
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'No se pudo cargar el catálogo');
    }
    await super.ngOnInit();
  }

  abrir(m?: PresupuestoMovimiento): void {
    this.form.reset({
      subrubro_codigo: m?.subrubro_codigo ?? null, fecha: fechaAInput(m?.fecha), detalle: m?.detalle ?? '',
      presupuestado: m?.presupuestado ?? 0, ejecutado: m?.ejecutado ?? 0,
    });
    this.abrirModal(m?.id ?? null);
  }

  protected listar(e: string, p: string) { return this.service.listarMovimientos(e, p); }
  protected borrar(id: string) { return this.service.eliminarMovimiento(id); }

  protected async persistir(id: string | null): Promise<void> {
    const v = this.form.getRawValue();
    const datos = {
      subrubro_codigo: v.subrubro_codigo as number, fecha: fechaAISO(v.fecha), detalle: v.detalle.trim(),
      presupuestado: v.presupuestado, ejecutado: v.ejecutado,
    };
    if (id) await this.service.actualizarMovimiento(id, datos);
    else await this.service.crearMovimiento(this.empresaId(), this.periodoId(), datos);
  }
}
