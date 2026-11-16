import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { CapacitacionService, NuevaSesion } from '../../services/capacitacion.service';
import { TenantService } from '../../../../../core/services/tenant.service';
import { SedesService } from '../../../../../core/services/sedes.service';
import { Sede } from '../../../../../core/models/models';
import { CapEstadoSesion, CapSesion, CapTema } from '../../../../../core/models/capacitacion.model';

type SesionForm = FormGroup<{
  tema_id: FormControl<string>;
  fecha: FormControl<string>;
  facilitador: FormControl<string>;
  modalidad: FormControl<string>;
  horas: FormControl<number | null>;
  sede_id: FormControl<string>;
  area_trabajo: FormControl<string>;
  evidencia_url: FormControl<string>;
  estado: FormControl<CapEstadoSesion>;
}>;

@Component({
  selector: 'app-sesion-form-modal',
  templateUrl: './sesion-form-modal.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class SesionFormModalComponent implements OnInit {
  @Input() sesion: CapSesion | null = null;
  @Input() temas: CapTema[] = [];
  @Output() guardado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();

  private svc = inject(CapacitacionService);
  private sedesSvc = inject(SedesService);
  private tenant = inject(TenantService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(NonNullableFormBuilder);

  sedes: Sede[] = [];
  guardando = false;
  errorMsg: string | null = null;
  readonly estados: CapEstadoSesion[] = ['programada', 'dictada', 'cancelada'];
  form: SesionForm = this.fb.group({
    tema_id: this.fb.control('', Validators.required),
    fecha: this.fb.control('', Validators.required),
    facilitador: this.fb.control(''),
    modalidad: this.fb.control(''),
    horas: new FormControl<number | null>(null, [Validators.min(0)]),
    sede_id: this.fb.control(''),
    area_trabajo: this.fb.control(''),
    evidencia_url: this.fb.control(''),
    estado: this.fb.control<CapEstadoSesion>('programada'),
  });

  async ngOnInit(): Promise<void> {
    if (this.sesion) this.form.patchValue(this.aForm(this.sesion));
    try {
      const empresaId = await this.tenant.getEmpresaTenantId();
      if (empresaId) this.sedes = await this.sedesSvc.getSedesByEmpresa(empresaId);
    } catch (e) { this.errorMsg = this.msg(e); }
    this.cdr.markForCheck();
  }

  private aForm(s: CapSesion) {
    return {
      tema_id: s.tema_id, fecha: s.fecha, facilitador: s.facilitador ?? '', modalidad: s.modalidad ?? '',
      horas: s.horas ?? null, sede_id: s.sede_id ?? '', area_trabajo: s.area_trabajo ?? '',
      evidencia_url: s.evidencia_url ?? '', estado: s.estado,
    };
  }

  private payload(): NuevaSesion {
    const v = this.form.getRawValue();
    return {
      tema_id: v.tema_id, fecha: v.fecha, facilitador: v.facilitador.trim() || null,
      modalidad: v.modalidad.trim() || null, horas: v.horas, sede_id: v.sede_id || null,
      area_trabajo: v.area_trabajo.trim() || null, evidencia_url: v.evidencia_url.trim() || null, estado: v.estado,
    };
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando) { this.form.markAllAsTouched(); return; }
    this.guardando = true; this.errorMsg = null;
    try {
      if (this.sesion?.id) await this.svc.actualizarSesion(this.sesion.id, this.payload());
      else await this.svc.crearSesion(this.payload());
      this.guardado.emit();
    } catch (e) {
      this.errorMsg = this.msg(e);
    } finally {
      this.guardando = false;
    }
  }

  private msg(e: unknown): string {
    return e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error al guardar la sesión.';
  }
}
