import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { EstadoRecaudo, PresupuestoRecaudo } from '../../../../core/models/presupuesto.model';
import { fechaAInput, fechaAISO, sumar } from '../../funciones/capturas.funcion';
import { CapturaBase } from '../captura-base';

const PILLS: Record<EstadoRecaudo, string> = {
  pendiente: 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
  cobrado: 'bg-sky-500/10 border border-sky-500/20 text-sky-400',
  pago: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400',
};
const ICONOS: Record<EstadoRecaudo, string> = { pendiente: 'pi-clock', cobrado: 'pi-send', pago: 'pi-check-circle' };

@Component({
  selector: 'app-presupuesto-recaudo',
  standalone: false,
  templateUrl: './recaudo.component.html',
  styleUrls: ['./recaudo.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RecaudoComponent extends CapturaBase<PresupuestoRecaudo> {
  readonly estados: EstadoRecaudo[] = ['pendiente', 'cobrado', 'pago'];
  readonly pill = (e: EstadoRecaudo) => PILLS[e];
  readonly icono = (e: EstadoRecaudo) => ICONOS[e];
  totalRecaudo = computed(() => sumar(this.filas(), f => f.valor));
  totalPago = computed(() => sumar(this.filas().filter(f => f.estado === 'pago'), f => f.valor));

  readonly form = new FormGroup({
    cliente_nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    cliente_nit: new FormControl('', { nonNullable: true }),
    valor: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    estado: new FormControl<EstadoRecaudo>('pendiente', { nonNullable: true }),
    fecha_corte: new FormControl('', { nonNullable: true }),
    fecha_entrega_cuenta_cobro: new FormControl('', { nonNullable: true }),
    fecha_limite_pago: new FormControl('', { nonNullable: true }),
    observaciones: new FormControl('', { nonNullable: true }),
  });

  abrir(r?: PresupuestoRecaudo): void {
    this.form.reset({
      cliente_nombre: r?.cliente_nombre ?? '', cliente_nit: r?.cliente_nit ?? '', valor: r?.valor ?? 0,
      estado: r?.estado ?? 'pendiente', fecha_corte: fechaAInput(r?.fecha_corte),
      fecha_entrega_cuenta_cobro: fechaAInput(r?.fecha_entrega_cuenta_cobro),
      fecha_limite_pago: fechaAInput(r?.fecha_limite_pago), observaciones: r?.observaciones ?? '',
    });
    this.abrirModal(r?.id ?? null);
  }

  protected listar(e: string, p: string) { return this.service.listarRecaudos(e, p); }
  protected borrar(id: string) { return this.service.eliminarRecaudo(id); }

  protected async persistir(id: string | null): Promise<void> {
    const v = this.form.getRawValue();
    const datos = {
      cliente_nombre: v.cliente_nombre.trim(), cliente_nit: v.cliente_nit.trim() || null, valor: v.valor,
      estado: v.estado, fecha_corte: fechaAISO(v.fecha_corte),
      fecha_entrega_cuenta_cobro: fechaAISO(v.fecha_entrega_cuenta_cobro),
      fecha_limite_pago: fechaAISO(v.fecha_limite_pago), observaciones: v.observaciones.trim() || null,
    };
    if (id) await this.service.actualizarRecaudo(id, datos);
    else await this.service.crearRecaudo(this.empresaId(), this.periodoId(), datos);
  }
}
