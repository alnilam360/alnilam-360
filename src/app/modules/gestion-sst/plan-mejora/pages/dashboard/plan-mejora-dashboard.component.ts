import { Component, OnInit } from '@angular/core';
import { Empresa, Usuario } from '../../../../../core/models/models';
import { SstPlanMejora, EstadoPlanMejora } from '../../../../../core/models/plan-mejora.model';
import { PlanMejoraService } from '../../../../../core/services/plan-mejora.service';
import { AuthService } from '../../../../../core/services/auth.service';

interface FiltroEstado {
    label: string;
    value: EstadoPlanMejora | null;
    icon: string;
    color: string;
    count: number;
}

@Component({
    selector: 'app-plan-mejora-dashboard',
    templateUrl: './plan-mejora-dashboard.component.html',
    styleUrls: ['./plan-mejora-dashboard.component.scss'],
    standalone: false
})
export class PlanMejoraDashboardComponent implements OnInit {

    loading = true;
    inicializando = true;
    errorMsg: string | null = null;
    successMsg: string | null = null;

    esAdmin = false;
    empresasDisponibles: Empresa[] = [];
    empresaSeleccionadaId: string | null = null;
    empresa: Empresa | null = null;

    hallazgos: SstPlanMejora[] = [];
    hallazgosFiltrados: SstPlanMejora[] = [];

    filtros: FiltroEstado[] = [
        { label: 'Todos', value: null, icon: 'layers-outline', color: 'text-brand-primary', count: 0 },
        { label: 'Pendientes', value: 'Pendiente', icon: 'alert-circle-outline', color: 'text-amber-400', count: 0 },
        { label: 'En Proceso', value: 'En Proceso', icon: 'sync-outline', color: 'text-blue-400', count: 0 },
        { label: 'Cerrados', value: 'Cerrado', icon: 'checkmark-circle-outline', color: 'text-emerald-400', count: 0 }
    ];
    filtroActivo: EstadoPlanMejora | null = null;

    // Modal
    showModal = false;
    hallazgoSeleccionado: SstPlanMejora | null = null;
    usuariosEmpresa: Partial<Usuario>[] = [];
    saving = false;
    uploading = false;

    // Campos editables del modal
    modalAccion = '';
    modalResponsableId: string | null = null;
    modalFechaCierre = '';
    modalPresupuesto: number | null = null;
    modalEstado: EstadoPlanMejora = 'Pendiente';
    modalNotasCierre = '';
    modalEvidenciaUrl: string | null = null;

    constructor(
        private svc: PlanMejoraService,
        private auth: AuthService
    ) { }

    async ngOnInit(): Promise<void> {
        await this.inicializar();
    }

    // ========================================================================
    // Inicialización
    // ========================================================================

    private async inicializar(): Promise<void> {
        this.inicializando = true;
        this.loading = true;
        this.errorMsg = null;
        try {
            await this.auth.waitForReady();
            await this.auth.waitForProfile();
            this.esAdmin = await this.svc.isAdministrador();

            if (this.esAdmin) {
                this.empresasDisponibles = await this.svc.listarEmpresasDisponibles();
            } else {
                const empresaId = await this.svc.getEmpresaTenantId();
                if (empresaId) {
                    this.empresaSeleccionadaId = empresaId;
                    await this.cargarDatos(empresaId);
                } else {
                    this.errorMsg = 'No se pudo determinar la empresa del usuario.';
                }
            }
        } catch (err: any) {
            this.errorMsg = err?.message || 'Error inicializando el módulo.';
        } finally {
            this.inicializando = false;
            this.loading = false;
        }
    }

    async onSeleccionEmpresa(empresaId: string | null): Promise<void> {
        this.empresaSeleccionadaId = empresaId;
        this.hallazgos = [];
        this.hallazgosFiltrados = [];
        this.empresa = null;
        if (!empresaId) return;
        await this.cargarDatos(empresaId);
    }

    async cargarDatos(empresaId: string): Promise<void> {
        this.loading = true;
        this.errorMsg = null;
        try {
            const empresas = await this.svc.listarEmpresasDisponibles();
            this.empresa = empresas.find(e => e.id === empresaId) ?? null;
            this.hallazgos = await this.svc.listarPorEmpresa(empresaId);
            this.actualizarContadores();
            this.aplicarFiltro(this.filtroActivo);
        } catch (err: any) {
            this.errorMsg = err?.message || 'Error cargando datos.';
        } finally {
            this.loading = false;
        }
    }

    // ========================================================================
    // Filtros
    // ========================================================================

    aplicarFiltro(estado: EstadoPlanMejora | null): void {
        this.filtroActivo = estado;
        this.hallazgosFiltrados = estado
            ? this.hallazgos.filter(h => h.estado === estado)
            : [...this.hallazgos];
    }

    private actualizarContadores(): void {
        this.filtros[0].count = this.hallazgos.length;
        this.filtros[1].count = this.hallazgos.filter(h => h.estado === 'Pendiente').length;
        this.filtros[2].count = this.hallazgos.filter(h => h.estado === 'En Proceso').length;
        this.filtros[3].count = this.hallazgos.filter(h => h.estado === 'Cerrado').length;
    }

    // ========================================================================
    // Modal
    // ========================================================================

    async abrirModal(hallazgo: SstPlanMejora): Promise<void> {
        this.hallazgoSeleccionado = hallazgo;
        this.modalAccion = hallazgo.accion_mejora ?? '';
        this.modalResponsableId = hallazgo.responsable_id ?? null;
        this.modalFechaCierre = hallazgo.fecha_cierre_proyectada ?? '';
        this.modalPresupuesto = hallazgo.presupuesto ?? null;
        this.modalEstado = hallazgo.estado;
        this.modalNotasCierre = hallazgo.notas_cierre ?? '';
        this.modalEvidenciaUrl = hallazgo.evidencia_cierre_url ?? null;

        if (this.empresaSeleccionadaId) {
            this.usuariosEmpresa = await this.svc.listarUsuariosEmpresa(this.empresaSeleccionadaId);
        }
        this.showModal = true;
    }

    cerrarModal(): void {
        if (this.saving) return;
        this.showModal = false;
        this.hallazgoSeleccionado = null;
    }

    async guardarModal(): Promise<void> {
        if (!this.hallazgoSeleccionado?.id) return;
        this.saving = true;
        this.errorMsg = null;
        try {
            await this.svc.actualizar(this.hallazgoSeleccionado.id, {
                accion_mejora: this.modalAccion || null,
                responsable_id: this.modalResponsableId,
                fecha_cierre_proyectada: this.modalFechaCierre || null,
                presupuesto: this.modalPresupuesto,
                estado: this.modalEstado,
                notas_cierre: this.modalNotasCierre || null,
                evidencia_cierre_url: this.modalEvidenciaUrl
            });
            this.successMsg = 'Hallazgo actualizado correctamente.';
            this.cerrarModal();
            if (this.empresaSeleccionadaId) {
                await this.cargarDatos(this.empresaSeleccionadaId);
            }
            setTimeout(() => this.successMsg = null, 3000);
        } catch (err: any) {
            this.errorMsg = err?.message || 'Error guardando cambios.';
        } finally {
            this.saving = false;
        }
    }

    async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || !this.empresaSeleccionadaId) return;

        this.uploading = true;
        try {
            this.modalEvidenciaUrl = await this.svc.subirEvidencia(file, this.empresaSeleccionadaId);
            this.successMsg = 'Evidencia cargada exitosamente.';
            setTimeout(() => this.successMsg = null, 3000);
        } catch (err: any) {
            this.errorMsg = err?.message || 'Error subiendo evidencia.';
        } finally {
            this.uploading = false;
        }
    }

    // ========================================================================
    // Helpers UI
    // ========================================================================

    badgeEstado(estado: EstadoPlanMejora): string {
        return {
            'Pendiente': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
            'En Proceso': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
            'Cerrado': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        }[estado];
    }

    iconEstado(estado: EstadoPlanMejora): string {
        return {
            'Pendiente': 'alert-circle-outline',
            'En Proceso': 'sync-outline',
            'Cerrado': 'checkmark-circle-outline'
        }[estado];
    }

    fechaVencida(fecha: string | null | undefined): boolean {
        if (!fecha) return false;
        return new Date(fecha) < new Date();
    }

    diasRestantes(fecha: string | null | undefined): number | null {
        if (!fecha) return null;
        const diff = new Date(fecha).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
}
