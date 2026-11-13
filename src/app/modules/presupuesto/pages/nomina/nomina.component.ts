import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PresupuestoNomina } from '../../../../core/models/presupuesto.model';
import { netoNomina, sumar, totalDeducciones, totalDevengado } from '../../funciones/capturas.funcion';
import { CapturaBase } from '../captura-base';

const monto = () => new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] });
const texto = () => new FormControl('', { nonNullable: true });

type CampoMonto = keyof Pick<PresupuestoNomina,
  'sueldo_basico' | 'dias_trabajados' | 'dev_basico' | 'dev_auxilio_transporte' | 'dev_auxilio_comunicacion'
  | 'dev_rodamiento' | 'dev_bono_adicional' | 'ded_salud' | 'ded_pension' | 'ded_otras' | 'pago_nomina'>;
interface Campo { k: CampoMonto; label: string }

@Component({
  selector: 'app-presupuesto-nomina',
  standalone: false,
  templateUrl: './nomina.component.html',
  styleUrls: ['./nomina.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class NominaComponent extends CapturaBase<PresupuestoNomina> {
  readonly devengado = totalDevengado;
  readonly deducciones = totalDeducciones;
  readonly neto = netoNomina;
  readonly camposDev: Campo[] = [
    { k: 'dev_basico', label: 'Básico' }, { k: 'dev_auxilio_transporte', label: 'Aux. transporte' },
    { k: 'dev_auxilio_comunicacion', label: 'Aux. comunicación' }, { k: 'dev_rodamiento', label: 'Rodamiento' },
    { k: 'dev_bono_adicional', label: 'Bono adicional' },
  ];
  readonly camposDed: Campo[] = [
    { k: 'ded_salud', label: 'Salud' }, { k: 'ded_pension', label: 'Pensión' }, { k: 'ded_otras', label: 'Otras' },
  ];
  totalNeto = computed(() => sumar(this.filas(), netoNomina));
  totalPago = computed(() => sumar(this.filas(), f => f.pago_nomina));

  readonly form = new FormGroup({
    cargo: texto(), nombre_trabajador: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    cedula: texto(), sueldo_basico: monto(), dias_trabajados: monto(),
    dev_basico: monto(), dev_auxilio_transporte: monto(), dev_auxilio_comunicacion: monto(),
    dev_rodamiento: monto(), dev_bono_adicional: monto(),
    ded_salud: monto(), ded_pension: monto(), ded_otras: monto(), pago_nomina: monto(),
  });

  abrir(n?: PresupuestoNomina): void {
    this.form.reset(n ? { ...n, cargo: n.cargo ?? '', cedula: n.cedula ?? '' } : {});
    this.abrirModal(n?.id ?? null);
  }

  netoForm(): number { return netoNomina(this.form.getRawValue()); }

  protected listar(e: string, p: string) { return this.service.listarNominas(e, p); }
  protected borrar(id: string) { return this.service.eliminarNomina(id); }

  protected async persistir(id: string | null): Promise<void> {
    const v = this.form.getRawValue();
    const datos = { ...v, nombre_trabajador: v.nombre_trabajador.trim(), cargo: v.cargo.trim() || null, cedula: v.cedula.trim() || null };
    if (id) await this.service.actualizarNomina(id, datos);
    else await this.service.crearNomina(this.empresaId(), this.periodoId(), datos);
  }
}
