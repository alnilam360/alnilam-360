import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { VerificacionesService } from '../../../../core/services/verificaciones.service';
import { Empresa } from '../../../../core/models/models';
import {
  EstandarLite, TipoVerificacion, VerificacionPlantilla, VerificacionPlantillaItem,
} from '../../../../core/models/verificacion.model';

@Component({
  selector: 'app-auditorias-plantillas',
  standalone: false,
  templateUrl: './plantillas.component.html',
  styleUrls: ['./plantillas.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class PlantillasComponent implements OnInit {
  private service = inject(VerificacionesService);

  readonly trackById = (_: number, x: { id?: string }) => x.id ?? '';
  readonly tipos: { valor: TipoVerificacion; etiqueta: string }[] = [
    { valor: 'inspeccion', etiqueta: 'Inspección' }, { valor: 'auditoria_interna', etiqueta: 'Auditoría interna' },
  ];

  cargando = signal(true);
  error = signal<string | null>(null);
  enVuelo = signal(false);
  esAdmin = signal(false);
  empresas = signal<Empresa[]>([]);
  empresaId = signal('');
  plantillas = signal<VerificacionPlantilla[]>([]);
  seleccionada = signal<VerificacionPlantilla | null>(null);
  items = signal<VerificacionPlantillaItem[]>([]);
  estandares = signal<EstandarLite[]>([]);
  editandoPlantilla = signal<string | null>(null); // id | 'nueva' | null
  editandoItem = signal<string | null>(null); // id | 'nuevo' | null

  esPropia = computed(() => !!this.seleccionada()?.empresa_id);
  esAuditoria = computed(() => this.seleccionada()?.tipo === 'auditoria_interna');

  formPlantilla = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    tipo: new FormControl<TipoVerificacion>('inspeccion', { nonNullable: true }),
    subtipo: new FormControl('', { nonNullable: true }),
    activo: new FormControl(true, { nonNullable: true }),
  });
  formItem = new FormGroup({
    orden: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    texto: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(300)] }),
    categoria: new FormControl('', { nonNullable: true }),
    estandar_id: new FormControl('', { nonNullable: true }),
  });

  async ngOnInit(): Promise<void> {
    try {
      const ctx = await this.service.resolverContextoEmpresa();
      this.esAdmin.set(ctx.esAdmin);
      this.empresas.set(ctx.empresas);
      await this.cambiarEmpresa(ctx.empresaId);
    } catch (e) {
      this.error.set(this.mensaje(e, 'No se pudieron cargar las plantillas'));
    } finally {
      this.cargando.set(false);
    }
  }

  async cambiarEmpresa(empresaId: string): Promise<void> {
    this.empresaId.set(empresaId);
    this.seleccionada.set(null);
    this.items.set([]);
    await this.recargar();
  }

  private async recargar(): Promise<void> {
    this.plantillas.set(this.empresaId() ? await this.service.listarPlantillas(this.empresaId()) : []);
  }

  /** Ejecuta con el control en vuelo y muestra el error real del servidor. */
  private async correr(accion: () => Promise<void>, defecto: string): Promise<void> {
    if (this.enVuelo()) return;
    this.enVuelo.set(true);
    this.error.set(null);
    try {
      await accion();
    } catch (e) {
      this.error.set(this.mensaje(e, defecto));
    } finally {
      this.enVuelo.set(false);
    }
  }

  abrir(p: VerificacionPlantilla): Promise<void> {
    return this.correr(async () => {
      this.seleccionada.set(p);
      this.editandoPlantilla.set(null);
      this.editandoItem.set(null);
      this.items.set(await this.service.itemsPlantilla(p.id as string));
      if (p.tipo === 'auditoria_interna' && this.estandares().length === 0) this.estandares.set(await this.service.listarEstandares());
    }, 'No se pudo abrir la plantilla');
  }

  clonar(p: VerificacionPlantilla): Promise<void> {
    return this.correr(async () => {
      const id = await this.service.clonarPlantilla(p.id as string, this.empresaId());
      await this.recargar();
      const copia = this.plantillas().find(x => x.id === id);
      if (copia) await this.abrir(copia);
    }, 'No se pudo clonar la plantilla');
  }

  // ── Plantilla ───────────────────────────────────────────────────────────────
  nuevaPlantilla(): void {
    this.formPlantilla.reset({ nombre: '', tipo: 'inspeccion', subtipo: '', activo: true });
    this.editandoPlantilla.set('nueva');
  }

  editarPlantilla(p: VerificacionPlantilla): void {
    this.formPlantilla.reset({ nombre: p.nombre, tipo: p.tipo, subtipo: p.subtipo ?? '', activo: p.activo });
    this.editandoPlantilla.set(p.id as string);
  }

  guardarPlantilla(): Promise<void> {
    if (this.formPlantilla.invalid) return Promise.resolve();
    const v = this.formPlantilla.getRawValue();
    const base = { nombre: v.nombre.trim(), subtipo: v.subtipo.trim() || null, activo: v.activo };
    return this.correr(async () => {
      const id = this.editandoPlantilla();
      if (id === 'nueva') {
        const p = await this.service.crearPlantilla({ ...base, tipo: v.tipo, empresa_id: this.empresaId() });
        await this.recargar();
        this.editandoPlantilla.set(null);
        await this.abrir(p);
        return;
      }
      await this.service.actualizarPlantilla(id as string, base);
      await this.recargar();
      this.seleccionada.set(this.plantillas().find(x => x.id === id) ?? null);
      this.editandoPlantilla.set(null);
    }, 'No se pudo guardar la plantilla');
  }

  // ── Ítems ───────────────────────────────────────────────────────────────────
  nuevoItem(): void {
    const orden = this.items().reduce((m, i) => Math.max(m, i.orden), 0) + 1;
    this.formItem.reset({ orden, texto: '', categoria: '', estandar_id: '' });
    this.editandoItem.set('nuevo');
  }

  editarItem(i: VerificacionPlantillaItem): void {
    this.formItem.reset({ orden: i.orden, texto: i.texto, categoria: i.categoria ?? '', estandar_id: i.estandar_id ?? '' });
    this.editandoItem.set(i.id as string);
  }

  guardarItem(): Promise<void> {
    const p = this.seleccionada();
    if (this.formItem.invalid || !p) return Promise.resolve();
    const v = this.formItem.getRawValue();
    const campos = {
      orden: v.orden, texto: v.texto.trim(), categoria: v.categoria.trim() || null,
      estandar_id: this.esAuditoria() && v.estandar_id ? v.estandar_id : null,
    };
    return this.correr(async () => {
      const id = this.editandoItem();
      if (id === 'nuevo') await this.service.crearItem({ ...campos, plantilla_id: p.id as string, activo: true });
      else await this.service.actualizarItem(id as string, campos);
      this.items.set(await this.service.itemsPlantilla(p.id as string));
      this.editandoItem.set(null);
    }, 'No se pudo guardar el ítem');
  }

  quitarItem(i: VerificacionPlantillaItem): Promise<void> {
    return this.correr(async () => {
      await this.service.eliminarItem(i.id as string);
      this.items.update(l => l.filter(x => x.id !== i.id));
    }, 'No se pudo eliminar el ítem');
  }

  private mensaje(e: unknown, defecto: string): string { return (e as { message?: string })?.message ?? defecto; }
}
