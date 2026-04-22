import { Component, OnInit, ViewChild } from '@angular/core';
import { Table } from 'primeng/table';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { EmpresasService } from '../../../../core/services/empresas.service';
import { RolesService } from '../../../../core/services/roles.service';
import { Usuario, Empresa, Rol } from '../../../../core/models/models';

@Component({
    selector: 'app-usuarios',
    templateUrl: './usuarios.component.html',
    styleUrls: ['./usuarios.component.scss'],
    standalone: false
})
export class UsuariosComponent implements OnInit {
    @ViewChild('dt') dt!: Table;

    usuarios: Usuario[] = [];
    empresas: Empresa[] = [];
    roles: Rol[] = [];
    loading = true;

    showModal = false;
    selectedUsuario: Usuario | null = null;

    formUsuario: Partial<Usuario> = this.getEmptyUsuario();

    constructor(
        private usuariosService: UsuariosService,
        private empresasService: EmpresasService,
        private rolesService: RolesService
    ) { }

    ngOnInit(): void {
        this.loadData();
    }

    async loadData(): Promise<void> {
        this.loading = true;
        try {
            const [usuarios, empresas, roles] = await Promise.all([
                this.usuariosService.getUsuarios(),
                this.empresasService.getEmpresas(),
                this.rolesService.getRoles()
            ]);
            this.usuarios = usuarios;
            this.empresas = empresas;
            this.roles = roles;
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            this.loading = false;
        }
    }

    getEmptyUsuario(): Partial<Usuario> {
        return {
            nombre: '',
            email: '',
            telefono: '',
            rol_id: '',
            cargo: '',
            empresa_id: '',
            estado: true
        };
    }

    onGlobalFilter(event: Event): void {
        const input = event.target as HTMLInputElement;
        this.dt.filterGlobal(input.value, 'contains');
    }

    getEmpresaNombre(usuario: Usuario): string {
        return (usuario as any).empresa?.nombre || 'Sin asignar';
    }

    getRolNombre(usuario: Usuario): string {
        if (usuario.rol_id) {
            const rol = this.roles.find(r => r.id === usuario.rol_id);
            return rol?.nombre || usuario.rol || 'Sin rol';
        }
        return usuario.rol || 'Sin rol';
    }

    getRolSeverity(usuario: Usuario): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
        const nombre = this.getRolNombre(usuario).toUpperCase();
        const severities: Record<string, "success" | "secondary" | "info" | "warn" | "danger" | "contrast"> = {
            'ADMINISTRADOR': 'danger',
            'COORDINADOR': 'warn',
            'USUARIO': 'info',
            'AUDITOR': 'contrast',
            'CONSULTOR': 'secondary'
        };
        return severities[nombre] || 'info';
    }

    getEstadoSeverity(estado: boolean): "success" | "danger" {
        return estado ? 'success' : 'danger';
    }

    /** Filtra los roles según la empresa seleccionada */
    get rolesFiltrados(): Rol[] {
        if (!this.formUsuario.empresa_id) return this.roles;
        return this.roles.filter(r => r.empresa_id === this.formUsuario.empresa_id);
    }

    // ==================== MODAL ====================

    openModal(): void {
        this.selectedUsuario = null;
        this.formUsuario = this.getEmptyUsuario();
        this.showModal = true;
    }

    editUsuario(usuario: Usuario): void {
        this.selectedUsuario = usuario;
        this.formUsuario = {
            nombre: usuario.nombre,
            email: usuario.email,
            telefono: usuario.telefono,
            rol_id: usuario.rol_id || '',
            cargo: usuario.cargo,
            empresa_id: usuario.empresa_id,
            estado: usuario.estado
        };
        this.showModal = true;
    }

    closeModal(): void {
        this.showModal = false;
        this.selectedUsuario = null;
    }

    async saveUsuario(): Promise<void> {
        try {
            if (this.selectedUsuario && this.selectedUsuario.id) {
                await this.usuariosService.updateUsuario(this.selectedUsuario.id, this.formUsuario);
            } else {
                await this.usuariosService.createUsuario(this.formUsuario);
            }
            this.closeModal();
            await this.loadData();
        } catch (error) {
            console.error('Error saving usuario:', error);
        }
    }

    async deleteUsuario(id: string): Promise<void> {
        try {
            await this.usuariosService.deleteUsuario(id);
            await this.loadData();
        } catch (error) {
            console.error('Error deleting usuario:', error);
        }
    }

    async toggleEstado(usuario: Usuario): Promise<void> {
        try {
            await this.usuariosService.updateUsuario(usuario.id!, { estado: !usuario.estado });
            await this.loadData();
        } catch (error) {
            console.error('Error toggling estado:', error);
        }
    }
}
