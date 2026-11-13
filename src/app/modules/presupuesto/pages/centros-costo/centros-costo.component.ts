import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { PresupuestoService } from '../../../../core/services/presupuesto.service';
import { PresupuestoCentroService } from '../../../../core/services/presupuesto-centro.service';
import { Empresa } from '../../../../core/models/models';
import { PresupuestoCentroCosto } from '../../../../core/models/presupuesto.model';

@Component({
  selector: 'app-presupuesto-centros-costo',
  standalone: false,
  templateUrl: './centros-costo.component.html',
  styleUrls: ['./centros-costo.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class CentrosCostoComponent implements OnInit {
  private service = inject(PresupuestoService);
  private centroService = inject(PresupuestoCentroService);

  readonly trackById = (_: number, c: { id: string }) => c.id;
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  errorForm = signal<string | null>(null);
  esAdmin = signal(false);
  empresas = signal<Empresa[]>([]);
  empresaId = signal('');
  centros = signal<PresupuestoCentroCosto[]>([]);
  modalAbierto = signal(false);
  editandoId = signal<string | null>(null);
  aEliminar = signal<PresupuestoCentroCosto | null>(null);

  form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    codigo: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(30)] }),
    activo: new FormControl(true, { nonNullable: true }),
  });

  async ngOnInit(): Promise<void> {
    try {
      const ctx = await this.service.resolverContextoEmpresa();
      this.esAdmin.set(ctx.esAdmin);
      this.empresas.set(ctx.empresas);
      await this.cargar(ctx.empresaId);
    } catch (e) {
      this.fallar(e, 'No se pudieron cargar los centros de costo');
    }
  }

  async cargar(empresaId: string): Promise<void> {
    this.empresaId.set(empresaId);
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.centros.set(empresaId ? await this.centroService.listarCentros(empresaId) : []);
      this.cargando.set(false);
    } catch (e) {
      this.centros.set([]);
      this.fallar(e, 'No se pudieron cargar los centros de costo');
    }
  }

  abrir(c?: PresupuestoCentroCosto): void {
    this.errorForm.set(null);
    this.editandoId.set(c?.id ?? null);
    this.form.reset({ nombre: c?.nombre ?? '', codigo: c?.codigo ?? '', activo: c?.activo ?? true });
    this.modalAbierto.set(true);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.errorForm.set(null);
    const v = this.form.getRawValue();
    const datos = { nombre: v.nombre.trim(), codigo: v.codigo.trim() || null, activo: v.activo };
    const id = this.editandoId();
    try {
      if (id) await this.centroService.actualizarCentro(id, datos);
      else await this.centroService.crearCentro(this.empresaId(), datos);
      this.modalAbierto.set(false);
      this.centros.set(await this.centroService.listarCentros(this.empresaId()));
    } catch (e) {
      this.errorForm.set((e as { message?: string })?.message ?? 'No se pudo guardar');
    }
    this.guardando.set(false);
  }

  async eliminar(): Promise<void> {
    const c = this.aEliminar();
    if (!c) return;
    this.guardando.set(true);
    try {
      await this.centroService.eliminarCentro(c.id);
      this.centros.set(await this.centroService.listarCentros(this.empresaId()));
    } catch (e) {
      this.error.set((e as { message?: string })?.message ?? 'No se pudo eliminar');
    }
    this.aEliminar.set(null);
    this.guardando.set(false);
  }

  private fallar(e: unknown, porDefecto: string): void {
    this.error.set((e as { message?: string })?.message ?? porDefecto);
    this.cargando.set(false);
  }
}
