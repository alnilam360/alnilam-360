import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { CapacitacionService } from '../../services/capacitacion.service';
import { TenantService } from '../../../../../core/services/tenant.service';
import { TrabajadoresService } from '../../../../../core/services/trabajadores.service';
import { CapAsistencia, CapSesion } from '../../../../../core/models/capacitacion.model';

type FilaForm = FormGroup<{
  trabajador_id: FormControl<string>;
  nombre: FormControl<string>;
  asistio: FormControl<boolean>;
  nota_evaluacion: FormControl<number | null>;
  aprobado: FormControl<boolean>;
}>;

@Component({
  selector: 'app-asistencia-panel',
  templateUrl: './asistencia-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class AsistenciaPanelComponent implements OnInit {
  @Input({ required: true }) sesion!: CapSesion;
  @Output() cerrado = new EventEmitter<void>();

  private svc = inject(CapacitacionService);
  private trabajadoresSvc = inject(TrabajadoresService);
  private tenant = inject(TenantService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(NonNullableFormBuilder);

  filas = new FormArray<FilaForm>([]);
  cargando = true;
  guardando = false;
  errorMsg: string | null = null;
  okMsg: string | null = null;

  async ngOnInit(): Promise<void> {
    try {
      const empresaId = await this.tenant.getEmpresaTenantId();
      if (!empresaId || !this.sesion.id) return;
      const [trabajadores, asistencia] = await Promise.all([
        this.trabajadoresSvc.getByEmpresa(empresaId),
        this.svc.getAsistencia(this.sesion.id),
      ]);
      const porTrab = new Map(asistencia.map(a => [a.trabajador_id, a]));
      trabajadores
        .filter(t => t.id && t.activo && (!this.sesion.sede_id || t.sede_id === this.sesion.sede_id))
        .forEach(t => this.filas.push(this.nuevaFila(t.id as string, t.nombre, porTrab.get(t.id as string))));
    } catch (e) {
      this.errorMsg = this.msg(e);
    } finally {
      this.cargando = false;
      this.cdr.markForCheck();
    }
  }

  private nuevaFila(id: string, nombre: string, a?: CapAsistencia): FilaForm {
    return this.fb.group({
      trabajador_id: this.fb.control(id),
      nombre: this.fb.control(nombre),
      asistio: this.fb.control(!!a?.asistio),
      nota_evaluacion: new FormControl<number | null>(a?.nota_evaluacion ?? null, [Validators.min(0), Validators.max(100)]),
      aprobado: this.fb.control(!!a?.aprobado),
    });
  }

  async guardar(): Promise<void> {
    if (this.filas.invalid || this.guardando || !this.sesion.id) return;
    this.guardando = true; this.errorMsg = null; this.okMsg = null;
    try {
      const filas = this.filas.getRawValue().map(f => ({
        empresa_id: this.sesion.empresa_id, sesion_id: this.sesion.id as string,
        trabajador_id: f.trabajador_id, asistio: f.asistio, nota_evaluacion: f.nota_evaluacion, aprobado: f.aprobado,
      }));
      await this.svc.guardarAsistencia(this.sesion.id, filas);
      this.okMsg = 'Asistencia guardada.';
    } catch (e) {
      this.errorMsg = this.msg(e);
    } finally {
      this.guardando = false;
    }
  }

  trackFila(_: number, f: FilaForm): string {
    return f.controls.trabajador_id.value;
  }

  private msg(e: unknown): string {
    return e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error con la asistencia.';
  }
}
