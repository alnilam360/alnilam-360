import { Component, OnInit, ViewChild } from '@angular/core';
import { RolesService } from '../../../../core/services/roles.service';
import { EmpresasService } from '../../../../core/services/empresas.service';
import { Rol, RolPermiso, Empresa } from '../../../../core/models/models';
import { MENU_ITEMS, MenuItem } from '../../../../core/models/menu.model';
import { Table } from 'primeng/table';

interface ModuloPermiso {
    id: string;
    label: string;
    icon: string;
    puede_ver: boolean;
}

@Component({
    selector: 'app-roles',
    templateUrl: './roles.component.html',
    styleUrls: ['./roles.component.scss'],
    standalone: false
})
export class RolesComponent implements OnInit {
    @ViewChild('dt') dt!: Table;

    roles: Rol[] = [];
    empresas: Empresa[] = [];
    loading = true;
    showModal = false;
    selectedRol: Rol | null = null;

    formRol: Partial<Rol> = this.getEmptyForm();
    modulosPermisos: ModuloPermiso[] = [];

    constructor(
        private rolesService: RolesService,
        private empresasService: EmpresasService
    ) { }

    ngOnInit(): void {
        this.loadData();
        this.buildModulosList();
    }

    private async loadData(): Promise<void> {
        this.loading = true;
        try {
            const [roles, empresas] = await Promise.all([
                this.rolesService.getRoles(),
                this.empresasService.getEmpresas()
            ]);
            this.roles = roles;
            this.empresas = empresas;
        } catch (error) {
            console.error('Error loading roles:', error);
        } finally {
            this.loading = false;
        }
    }

    /**
     * Construye la lista de módulos del sidebar para los checkboxes.
     * Solo toma el primer nivel de MENU_ITEMS.
     */
    private buildModulosList(): void {
        this.modulosPermisos = MENU_ITEMS.map(item => ({
            id: item.id,
            label: item.label,
            icon: item.icon || 'cube-outline',
            puede_ver: false
        }));
    }

    openModal(rol?: Rol): void {
        if (rol) {
            this.selectedRol = rol;
            this.formRol = {
                nombre: rol.nombre,
                descripcion: rol.descripcion,
                empresa_id: rol.empresa_id
            };
            this.loadPermisos(rol.id!);
        } else {
            this.selectedRol = null;
            this.formRol = this.getEmptyForm();
            this.resetPermisos();
        }
        this.showModal = true;
    }

    closeModal(): void {
        this.showModal = false;
        this.selectedRol = null;
        this.formRol = this.getEmptyForm();
        this.resetPermisos();
    }

    async saveRol(): Promise<void> {
        try {
            if (!this.formRol.nombre?.trim()) {
                alert('El nombre del rol es requerido.');
                return;
            }
            if (!this.formRol.empresa_id) {
                alert('Debe seleccionar una empresa.');
                return;
            }

            let rolId: string;

            if (this.selectedRol) {
                // Actualizar
                const updated = await this.rolesService.updateRol(this.selectedRol.id!, this.formRol);
                rolId = updated.id!;
            } else {
                // Crear
                const created = await this.rolesService.createRol(this.formRol);
                rolId = created.id!;
            }

            // Guardar permisos
            const permisos = this.modulosPermisos.map(m => ({
                modulo_id: m.id,
                puede_ver: m.puede_ver
            }));
            await this.rolesService.savePermisos(rolId, permisos);

            this.closeModal();
            await this.loadData();
        } catch (error: any) {
            console.error('Error saving rol:', error);
            alert('Error al guardar el rol: ' + (error.message || error));
        }
    }

    async deleteRol(id: string): Promise<void> {
        if (!confirm('¿Está seguro de eliminar este rol? Los usuarios asignados quedarán sin rol.')) {
            return;
        }
        try {
            await this.rolesService.deleteRol(id);
            await this.loadData();
        } catch (error: any) {
            console.error('Error deleting rol:', error);
            alert('Error al eliminar el rol: ' + (error.message || error));
        }
    }

    getEmpresaNombre(rol: Rol): string {
        const empresa = this.empresas.find(e => e.id === rol.empresa_id);
        return empresa?.nombre || '—';
    }

    onGlobalFilter(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.dt.filterGlobal(target.value, 'contains');
    }

    toggleSelectAll(checked: boolean): void {
        this.modulosPermisos.forEach(m => m.puede_ver = checked);
    }

    get allSelected(): boolean {
        return this.modulosPermisos.every(m => m.puede_ver);
    }

    get someSelected(): boolean {
        return this.modulosPermisos.some(m => m.puede_ver) && !this.allSelected;
    }

    private async loadPermisos(rolId: string): Promise<void> {
        try {
            const permisos = await this.rolesService.getPermisosByRol(rolId);
            this.modulosPermisos.forEach(m => {
                const found = permisos.find(p => p.modulo_id === m.id);
                m.puede_ver = found ? found.puede_ver : false;
            });
        } catch (error) {
            console.error('Error loading permisos:', error);
            this.resetPermisos();
        }
    }

    private resetPermisos(): void {
        this.modulosPermisos.forEach(m => m.puede_ver = false);
    }

    private getEmptyForm(): Partial<Rol> {
        return {
            nombre: '',
            descripcion: '',
            empresa_id: ''
        };
    }
}
