import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { TrabajadoresService } from '../../../../core/services/trabajadores.service';
import { SeguridadSocialService } from '../../../../core/services/seguridad-social.service';
import { SedesService } from '../../../../core/services/sedes.service';
import { TenantService } from '../../../../core/services/tenant.service';
import { Trabajador, calcularEdad, CatalogoSeguridadSocial, Empresa, Sede } from '../../../../core/models/models';

@Component({
  selector: 'app-trabajadores',
  standalone: false,
  templateUrl: './trabajadores.component.html',
  styleUrls: ['./trabajadores.component.scss']
})
export class TrabajadoresComponent implements OnInit {
  @Input() empresaId?: string;
  @Input() sedeId?: string;
  @Input() sedeNombre = '';
  @Output() cerrar = new EventEmitter<void>();

  private seguridadSocialService = inject(SeguridadSocialService);
  private trabajadoresService = inject(TrabajadoresService);
  private sedesService = inject(SedesService);
  private tenantService = inject(TenantService);

  readonly epsList = this.seguridadSocialService.epsList;
  readonly arlList = this.seguridadSocialService.arlList;
  readonly pensionesList = this.seguridadSocialService.pensionesList;

  isModal = false;
  esAdmin = false;
  empresas: Empresa[] = [];
  sedes: Sede[] = [];
  filtroSedeId = '';

  trabajadores: Trabajador[] = [];
  loading = true;
  searchQuery = '';

  showFormModal = false;
  selectedTrabajador: Trabajador | null = null;
  form: Partial<Trabajador> = this.getEmptyForm();

  async ngOnInit(): Promise<void> {
    this.isModal = !!this.sedeId;
    this.seguridadSocialService.cargarCatalogos();

    if (this.isModal && this.sedeId) {
      await this.loadTrabajadores();
    } else {
      // Modo Página autónoma
      this.esAdmin = await this.tenantService.isAdministrador();
      this.empresas = await this.tenantService.listarEmpresasDisponibles();

      if (!this.empresaId) {
        if (this.esAdmin && this.empresas.length > 0) {
          this.empresaId = this.empresas[0].id!;
        } else {
          this.empresaId = (await this.tenantService.getEmpresaTenantId()) || '';
        }
      }

      await this.loadSedes();
      await this.loadTrabajadores();
    }
  }

  async onEmpresaChange(id: string): Promise<void> {
    this.empresaId = id;
    this.filtroSedeId = '';
    await this.loadSedes();
    await this.loadTrabajadores();
  }

  async onFiltroSedeChange(sedeId: string): Promise<void> {
    this.filtroSedeId = sedeId;
    await this.loadTrabajadores();
  }

  async loadSedes(): Promise<void> {
    if (!this.empresaId) {
      this.sedes = [];
      return;
    }
    try {
      this.sedes = await this.sedesService.getSedesByEmpresa(this.empresaId);
    } catch (err) {
      console.error('Error cargando sedes:', err);
    }
  }

  async loadTrabajadores(): Promise<void> {
    this.loading = true;
    try {
      if (this.isModal && this.sedeId) {
        this.trabajadores = await this.trabajadoresService.getBySede(this.sedeId);
      } else if (this.filtroSedeId) {
        this.trabajadores = await this.trabajadoresService.getBySede(this.filtroSedeId);
      } else if (this.empresaId) {
        this.trabajadores = await this.trabajadoresService.getByEmpresa(this.empresaId);
      } else {
        this.trabajadores = [];
      }
    } catch (error) {
      console.error('Error loading trabajadores:', error);
    } finally {
      this.loading = false;
    }
  }

  isItemInList(name: string | null | undefined, list: CatalogoSeguridadSocial[]): boolean {
    if (!name) return true;
    return list.some(item => item.nombre.trim().toLowerCase() === name.trim().toLowerCase());
  }

  get filteredTrabajadores(): Trabajador[] {
    if (!this.searchQuery.trim()) return this.trabajadores;
    const q = this.searchQuery.toLowerCase();
    return this.trabajadores.filter(t =>
      t.nombre.toLowerCase().includes(q) ||
      t.documento.toLowerCase().includes(q) ||
      (t.cargo?.toLowerCase().includes(q)) ||
      (t.area_trabajo?.toLowerCase().includes(q)) ||
      (t.sede?.nombre?.toLowerCase().includes(q))
    );
  }

  get countActivos(): number {
    return this.trabajadores.filter(t => t.activo).length;
  }

  get countRetirados(): number {
    return this.trabajadores.filter(t => !t.activo).length;
  }

  calcEdad(fecha: string | null | undefined): number | null {
    return calcularEdad(fecha);
  }

  // ==================== FORM MODAL ====================

  openFormModal(trabajador?: Trabajador): void {
    this.selectedTrabajador = trabajador || null;
    this.form = trabajador
      ? JSON.parse(JSON.stringify(trabajador))
      : this.getEmptyForm();

    // Asignar sede por defecto si está filtrada o es modal
    if (!this.form.sede_id) {
      this.form.sede_id = this.sedeId || this.filtroSedeId || (this.sedes[0]?.id ?? '');
    }

    this.showFormModal = true;
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.selectedTrabajador = null;
  }

  async saveTrabajador(): Promise<void> {
    if (!this.form.sede_id && !this.sedeId) {
      alert('Debe seleccionar la sede a la que pertenece el trabajador.');
      return;
    }

    try {
      const payload: Partial<Trabajador> = {
        empresa_id: this.empresaId!,
        sede_id: this.sedeId || this.form.sede_id!,
        documento: this.form.documento,
        nombre: this.form.nombre,
        fecha_nacimiento: this.form.fecha_nacimiento || null,
        fecha_ingreso: this.form.fecha_ingreso || null,
        cargo: this.form.cargo || null,
        area_trabajo: this.form.area_trabajo || null,
        eps: this.form.eps || null,
        arl: this.form.arl || null,
        fondo_pensiones: this.form.fondo_pensiones || null,
        telefono: this.form.telefono || null,
        activo: this.form.activo ?? true,
      };

      if (this.selectedTrabajador?.id) {
        await this.trabajadoresService.update(this.selectedTrabajador.id, payload);
      } else {
        await this.trabajadoresService.create(payload);
      }
      this.closeFormModal();
      await this.loadTrabajadores();
    } catch (error: any) {
      console.error('Error saving trabajador:', error);
      const msg = error?.message || 'Error desconocido';
      if (msg.includes('trabajadores_empresa_documento_uq')) {
        alert('Ya existe un trabajador con este documento en la empresa.');
      } else {
        alert('No se pudo guardar: ' + msg);
      }
    }
  }

  async deleteTrabajador(id: string, nombre: string): Promise<void> {
    if (!confirm(`¿Eliminar a "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await this.trabajadoresService.delete(id);
      await this.loadTrabajadores();
    } catch (error) {
      console.error('Error deleting trabajador:', error);
    }
  }

  async toggleActivo(trabajador: Trabajador): Promise<void> {
    try {
      await this.trabajadoresService.update(trabajador.id!, {
        activo: !trabajador.activo
      });
      await this.loadTrabajadores();
    } catch (error) {
      console.error('Error toggling estado:', error);
    }
  }

  getEmptyForm(): Partial<Trabajador> {
    return {
      documento: '',
      nombre: '',
      sede_id: this.sedeId || this.filtroSedeId || '',
      fecha_nacimiento: null,
      fecha_ingreso: null,
      cargo: '',
      area_trabajo: '',
      eps: '',
      arl: '',
      fondo_pensiones: '',
      telefono: '',
      activo: true,
    };
  }
}
