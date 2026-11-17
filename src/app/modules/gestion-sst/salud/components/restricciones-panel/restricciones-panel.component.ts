import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import { NuevaRestriccion, SaludService } from '../../services/salud.service';
import {
  SaludExamen, SaludRestriccion, SaludRestriccionClase, SaludRestriccionEstado, SaludTemporalidad,
} from '../../../../../core/models/salud.model';
import { diasHabilesDesde } from '../../funciones/ventana-examen.funcion';

type RestForm = FormGroup<{
  clase: FormControl<SaludRestriccionClase>;
  descripcion: FormControl<string>;
  temporalidad: FormControl<SaludTemporalidad | ''>;
  fecha_fin: FormControl<string>;
  responsable: FormControl<string>;
  fecha_limite_accion: FormControl<string>;
  estado: FormControl<SaludRestriccionEstado>;
}>;

@Component({
  selector: 'app-restricciones-panel',
  templateUrl: './restricciones-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: false,
})
export class RestriccionesPanelComponent implements OnInit {
  @Input({ required: true }) examen!: SaludExamen;
  @Output() cerrado = new EventEmitter<void>();

  private svc = inject(SaludService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(NonNullableFormBuilder);
  private destroyRef = inject(DestroyRef);

  readonly estados: SaludRestriccionEstado[] = ['abierta', 'en_gestion', 'cerrada'];
  items: SaludRestriccion[] = [];
  loading = true;
  guardando = false;
  errorMsg: string | null = null;

  form: RestForm = this.fb.group({
    clase: this.fb.control<SaludRestriccionClase>('recomendacion'),
    descripcion: this.fb.control('', Validators.required),
    temporalidad: this.fb.control<SaludTemporalidad | ''>(''),
    fecha_fin: this.fb.control(''),
    responsable: this.fb.control(''),
    fecha_limite_accion: this.fb.control(''),
    estado: this.fb.control<SaludRestriccionEstado>('abierta'),
  });

  ngOnInit(): void {
    // Lazo acción (Res. 1843 Art. 5.f): una restricción sugiere plazo = fecha del examen + 20 días hábiles.
    this.form.controls.clase.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(c => {
      const lim = this.form.controls.fecha_limite_accion;
      if (c === 'restriccion' && !lim.value) lim.setValue(diasHabilesDesde(this.examen.fecha, 20));
    });
    void this.cargar();
  }

  async cargar(): Promise<void> {
    try {
      this.items = await this.svc.getRestricciones(this.examen.id);
      this.errorMsg = null;
    } catch (e) { this.errorMsg = this.msg(e); }
    this.loading = false;
    this.cdr.detectChanges();
  }

  async agregar(): Promise<void> {
    if (this.form.invalid || this.guardando) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const payload: NuevaRestriccion = {
      clase: v.clase, descripcion: v.descripcion.trim(), temporalidad: v.temporalidad || null,
      fecha_fin: v.fecha_fin || null, responsable: v.responsable.trim() || null,
      fecha_limite_accion: v.fecha_limite_accion || null, estado: v.estado,
    };
    await this.ejecutar(async () => { await this.svc.crearRestriccion(this.examen.id, payload); this.form.reset(); });
  }

  cambiarEstado(r: SaludRestriccion, estado: SaludRestriccionEstado): Promise<void> {
    return this.ejecutar(() => this.svc.actualizarRestriccion(r.id, { estado }));
  }

  eliminar(r: SaludRestriccion): Promise<void> {
    return this.ejecutar(() => this.svc.eliminarRestriccion(r.id));
  }

  private async ejecutar(accion: () => Promise<void>): Promise<void> {
    if (this.guardando) return;
    this.guardando = true; this.errorMsg = null;
    try { await accion(); await this.cargar(); } catch (e) { this.errorMsg = this.msg(e); }
    this.guardando = false;
    this.cdr.detectChanges();
  }

  trackById(_: number, r: SaludRestriccion): string { return r.id; }

  private msg(e: unknown): string {
    return e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Error en restricciones.';
  }
}
