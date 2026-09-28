import { Component, OnInit, ViewChild } from '@angular/core';
import { RolesService } from '../../../../core/services/roles.service';
import { EmpresasService } from '../../../../core/services/empresas.service';
import { Rol, RolPermiso, Empresa } from '../../../../core/models/models';
import { MENU_ITEMS, MenuItem } from '../../../../core/models/menu.model';
import { Table } from 'primeng/table';

export interface ModuloPermisoItem {
    id: string;
    label: string;
    icon: string;
    route?: string;
    level: number;
    parentId?: string;
    parentLabel?: string;
    hasChildren: boolean;
    childrenIds: string[];
    expanded?: boolean;
    puede_ver: boolean;
    puede_crear: boolean;
    puede_editar: boolean;
    puede_eliminar: boolean;
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
    modulosPermisos: ModuloPermisoItem[] = [];

    // Filtro y estado de visualización en el modal
    moduloSearchTerm = '';
    isAllExpanded = true;

    // Resumen de permisos por rol para la tabla principal: rolId -> { total: number, escritura: number }
    rolesPermisosSummary: Record<string, { total: number; escritura: number }> = {};

    constructor(
        private rolesService: RolesService,
        private empresasService: EmpresasService
    ) { }

    ngOnInit(): void {
        this.buildHierarchicalModulos();
        this.loadData();
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

            // Cargar resumen de permisos para los roles cargados
            await this.loadRolesPermisosSummary();
        } catch (error) {
            console.error('Error loading roles:', error);
        } finally {
            this.loading = false;
        }
    }

    private async loadRolesPermisosSummary(): Promise<void> {
        try {
            const summary: Record<string, { total: number; escritura: number }> = {};
            await Promise.all(this.roles.map(async (rol) => {
                if (!rol.id) return;
                try {
                    const perms = await this.rolesService.getPermisosByRol(rol.id);
                    const activos = perms.filter(p => p.puede_ver || p.puede_crear || p.puede_editar || p.puede_eliminar);
                    const conEscritura = perms.filter(p => p.puede_crear || p.puede_editar || p.puede_eliminar);
                    summary[rol.id] = {
                        total: activos.length,
                        escritura: conEscritura.length
                    };
                } catch {
                    summary[rol.id!] = { total: 0, escritura: 0 };
                }
            }));
            this.rolesPermisosSummary = summary;
        } catch (error) {
            console.warn('Error loading permisos summary:', error);
        }
    }

    /**
     * Construye la lista aplanada jerárquica de todos los módulos y submódulos
     * basándose en MENU_ITEMS (omitiendo separadores de sección como _phva_header).
     */
    private buildHierarchicalModulos(): void {
        const flatList: ModuloPermisoItem[] = [];

        const collectChildrenIds = (item: MenuItem): string[] => {
            const ids: string[] = [];
            if (item.children && item.children.length > 0) {
                for (const child of item.children) {
                    if (child.isSectionLabel) continue;
                    ids.push(child.id);
                    ids.push(...collectChildrenIds(child));
                }
            }
            return ids;
        };

        const traverse = (items: MenuItem[], level: number, parent?: MenuItem) => {
            for (const item of items) {
                if (item.isSectionLabel) continue;

                const hasChildren = !!(item.children && item.children.length > 0);
                const childrenIds = collectChildrenIds(item);

                flatList.push({
                    id: item.id,
                    label: item.label,
                    icon: item.icon || (level === 0 ? 'cube-outline' : 'chevron-forward-outline'),
                    route: item.route,
                    level,
                    parentId: parent?.id,
                    parentLabel: parent?.label,
                    hasChildren,
                    childrenIds,
                    expanded: true,
                    puede_ver: false,
                    puede_crear: false,
                    puede_editar: false,
                    puede_eliminar: false
                });

                if (hasChildren && item.children) {
                    traverse(item.children, level + 1, item);
                }
            }
        };

        traverse(MENU_ITEMS, 0);
        this.modulosPermisos = flatList;
    }

    openModal(rol?: Rol): void {
        this.moduloSearchTerm = '';
        this.isAllExpanded = true;

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
        this.moduloSearchTerm = '';
    }

    private async loadPermisos(rolId: string): Promise<void> {
        try {
            const permisos = await this.rolesService.getPermisosByRol(rolId);
            this.modulosPermisos.forEach(m => {
                const found = permisos.find(p => p.modulo_id === m.id);
                if (found) {
                    m.puede_ver = !!found.puede_ver;
                    m.puede_crear = !!found.puede_crear;
                    m.puede_editar = !!found.puede_editar;
                    m.puede_eliminar = !!found.puede_eliminar;
                } else {
                    m.puede_ver = false;
                    m.puede_crear = false;
                    m.puede_editar = false;
                    m.puede_eliminar = false;
                }
            });
        } catch (error) {
            console.error('Error loading permisos:', error);
            this.resetPermisos();
        }
    }

    private resetPermisos(): void {
        this.modulosPermisos.forEach(m => {
            m.puede_ver = false;
            m.puede_crear = false;
            m.puede_editar = false;
            m.puede_eliminar = false;
            m.expanded = true;
        });
    }

    // ==================== LÓGICA DE DEPENDENCIAS CRUD ====================

    /**
     * Cuando cambia el permiso de lectura (Ver):
     * - Si se apaga, apaga automáticamente Crear, Editar y Eliminar del módulo.
     * - Si se enciende y tiene ancestro, activa 'puede_ver' en el ancestro para asegurar visibilidad en menú.
     */
    onVerChange(item: ModuloPermisoItem): void {
        if (!item.puede_ver) {
            item.puede_crear = false;
            item.puede_editar = false;
            item.puede_eliminar = false;

            // Si es un padre con hijos, opcionalmente propagar apagado si el usuario lo desea
            if (item.hasChildren && item.childrenIds.length > 0) {
                this.propagateToDescendants(item, { ver: false, crear: false, editar: false, eliminar: false });
            }
        } else {
            // Asegurar que sus ancestros tengan acceso de visualización
            this.ensureAncestorsVisible(item);
        }
    }

    /**
     * Cuando cambia Crear, Editar o Eliminar:
     * - Si cualquiera se enciende, 'puede_ver' se enciende obligatoriamente.
     * - Asegura que los ancestros también tengan 'puede_ver'.
     */
    onAccionChange(item: ModuloPermisoItem): void {
        if (item.puede_crear || item.puede_editar || item.puede_eliminar) {
            item.puede_ver = true;
            this.ensureAncestorsVisible(item);
        }
    }

    /**
     * Activa recursivamente 'puede_ver' en todos los ancestros de un ítem
     */
    private ensureAncestorsVisible(item: ModuloPermisoItem): void {
        let currentParentId = item.parentId;
        while (currentParentId) {
            const parent = this.modulosPermisos.find(m => m.id === currentParentId);
            if (parent) {
                parent.puede_ver = true;
                currentParentId = parent.parentId;
            } else {
                break;
            }
        }
    }

    /**
     * Propaga permisos hacia todos los descendientes de un módulo padre
     */
    private propagateToDescendants(item: ModuloPermisoItem, perms: { ver: boolean; crear: boolean; editar: boolean; eliminar: boolean }): void {
        if (!item.childrenIds || item.childrenIds.length === 0) return;

        this.modulosPermisos.forEach(m => {
            if (item.childrenIds.includes(m.id)) {
                m.puede_ver = perms.ver;
                m.puede_crear = perms.crear;
                m.puede_editar = perms.editar;
                m.puede_eliminar = perms.eliminar;
            }
        });
    }

    // ==================== ACCIONES POR FILA ====================

    /** Acceso total para la fila y sus hijos */
    setRowFull(item: ModuloPermisoItem): void {
        item.puede_ver = true;
        item.puede_crear = true;
        item.puede_editar = true;
        item.puede_eliminar = true;
        this.ensureAncestorsVisible(item);
        if (item.hasChildren) {
            this.propagateToDescendants(item, { ver: true, crear: true, editar: true, eliminar: true });
        }
    }

    /** Solo lectura para la fila y sus hijos */
    setRowReadOnly(item: ModuloPermisoItem): void {
        item.puede_ver = true;
        item.puede_crear = false;
        item.puede_editar = false;
        item.puede_eliminar = false;
        this.ensureAncestorsVisible(item);
        if (item.hasChildren) {
            this.propagateToDescendants(item, { ver: true, crear: false, editar: false, eliminar: false });
        }
    }

    /** Sin acceso para la fila y sus hijos */
    setRowNone(item: ModuloPermisoItem): void {
        item.puede_ver = false;
        item.puede_crear = false;
        item.puede_editar = false;
        item.puede_eliminar = false;
        if (item.hasChildren) {
            this.propagateToDescendants(item, { ver: false, crear: false, editar: false, eliminar: false });
        }
    }

    // ==================== ACCIONES GLOBALES ====================

    setAllGlobal(mode: 'full' | 'readonly' | 'none'): void {
        this.modulosPermisos.forEach(m => {
            if (mode === 'full') {
                m.puede_ver = true;
                m.puede_crear = true;
                m.puede_editar = true;
                m.puede_eliminar = true;
            } else if (mode === 'readonly') {
                m.puede_ver = true;
                m.puede_crear = false;
                m.puede_editar = false;
                m.puede_eliminar = false;
            } else {
                m.puede_ver = false;
                m.puede_crear = false;
                m.puede_editar = false;
                m.puede_eliminar = false;
            }
        });
    }

    toggleExpandItem(item: ModuloPermisoItem, event?: Event): void {
        if (event) {
            event.stopPropagation();
        }
        item.expanded = !item.expanded;
    }

    toggleExpandAll(): void {
        this.isAllExpanded = !this.isAllExpanded;
        this.modulosPermisos.forEach(m => {
            if (m.hasChildren) {
                m.expanded = this.isAllExpanded;
            }
        });
    }

    // ==================== VISIBILIDAD EN ÁRBOL / BÚSQUEDA ====================

    get filteredModulos(): ModuloPermisoItem[] {
        const query = this.moduloSearchTerm.trim().toLowerCase();

        if (query) {
            // Cuando hay búsqueda activa, expandir y mostrar cualquier ítem que coincida o cuyo ancestro/hijo coincida
            const matchingIds = new Set<string>();

            this.modulosPermisos.forEach(m => {
                if (m.label.toLowerCase().includes(query) || (m.parentLabel && m.parentLabel.toLowerCase().includes(query))) {
                    matchingIds.add(m.id);
                    if (m.parentId) matchingIds.add(m.parentId);
                    m.childrenIds.forEach(cId => matchingIds.add(cId));
                }
            });

            return this.modulosPermisos.filter(m => matchingIds.has(m.id));
        }

        // Sin búsqueda: respetar el colapso jerárquico de carpetas padre
        const collapsedParentIds = new Set<string>();
        this.modulosPermisos.forEach(m => {
            if (m.hasChildren && !m.expanded) {
                m.childrenIds.forEach(id => collapsedParentIds.add(id));
            }
        });

        return this.modulosPermisos.filter(m => !collapsedParentIds.has(m.id));
    }

    // Métricas del modal
    get totalModulosCount(): number {
        return this.modulosPermisos.length;
    }

    get activosVerCount(): number {
        return this.modulosPermisos.filter(m => m.puede_ver).length;
    }

    get activosEscrituraCount(): number {
        return this.modulosPermisos.filter(m => m.puede_crear || m.puede_editar || m.puede_eliminar).length;
    }

    // ==================== GUARDAR Y ELIMINAR ====================

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
                const updated = await this.rolesService.updateRol(this.selectedRol.id!, this.formRol);
                rolId = updated.id!;
            } else {
                const created = await this.rolesService.createRol(this.formRol);
                rolId = created.id!;
            }

            // Preparar permisos granulares para todos los módulos
            const permisosPayload = this.modulosPermisos.map(m => ({
                modulo_id: m.id,
                puede_ver: !!m.puede_ver,
                puede_crear: !!m.puede_crear,
                puede_editar: !!m.puede_editar,
                puede_eliminar: !!m.puede_eliminar
            }));

            await this.rolesService.savePermisos(rolId, permisosPayload);

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

    private getEmptyForm(): Partial<Rol> {
        return {
            nombre: '',
            descripcion: '',
            empresa_id: ''
        };
    }
}

