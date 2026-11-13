import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PresupuestoCuentaPorPagar } from '../../../../core/models/presupuesto.model';
import { fechaAInput, fechaAISO, saldoPorPagar, sumar } from '../../funciones/capturas.funcion';
import { CapturaConCentros } from '../captura-con-centros';

const montoCtrl = () => new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] });

@Component({
  selector: 'app-presupuesto-cuentas-por-pagar',
  standalone: false,
  templateUrl: './cuentas-por-pagar.component.html',
  styleUrls: ['./cuentas-por-pagar.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CuentasPorPagarComponent extends CapturaConCentros<PresupuestoCuentaPorPagar> {
  readonly saldo = saldoPorPagar;
  totalPorPagar = computed(() => sumar(this.filas(), f => f.por_pagar));
  totalPresup = computed(() => sumar(this.filas(), f => f.presupuestado));
  totalEjec = computed(() => sumar(this.filas(), f => f.ejecutado));
  totalSaldo = computed(() => sumar(this.filas(), saldoPorPagar));

  readonly form = new FormGroup({
    fecha: new FormControl('', { nonNullable: true }),
    detalle: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    centro_costo_id: new FormControl<string | null>(null),
    por_pagar: montoCtrl(),
    presupuestado: montoCtrl(),
    ejecutado: montoCtrl(),
  });

  abrir(c?: PresupuestoCuentaPorPagar): void {
    this.form.reset({
      fecha: fechaAInput(c?.fecha), detalle: c?.detalle ?? '', centro_costo_id: c?.centro_costo_id ?? null, por_pagar: c?.por_pagar ?? 0,
      presupuestado: c?.presupuestado ?? 0, ejecutado: c?.ejecutado ?? 0,
    });
    this.abrirModal(c?.id ?? null);
  }

  protected listar(e: string, p: string) { return this.service.listarCuentasPorPagar(e, p); }
  protected borrar(id: string) { return this.service.eliminarCuentaPorPagar(id); }

  protected async persistir(id: string | null): Promise<void> {
    const v = this.form.getRawValue();
    const datos = { ...v, fecha: fechaAISO(v.fecha), detalle: v.detalle.trim() };
    if (id) await this.service.actualizarCuentaPorPagar(id, datos);
    else await this.service.crearCuentaPorPagar(this.empresaId(), this.periodoId(), datos);
  }
}
