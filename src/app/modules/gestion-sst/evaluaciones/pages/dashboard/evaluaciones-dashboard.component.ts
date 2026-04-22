import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Empresa } from '../../../../../core/models/models';
import {
    ResolucionTipoEvaluacion,
    SstEvaluacion,
    TipoEvaluacion
} from '../../../../../core/models/res0312.model';
import { ResEvaluacionesService } from '../../../../../core/services/res-evaluaciones.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
    selector: 'app-evaluaciones-dashboard',
    templateUrl: './evaluaciones-dashboard.component.html',
    styleUrls: ['./evaluaciones-dashboard.component.scss'],
    standalone: false
})
export class EvaluacionesDashboardComponent implements OnInit {

    loading = true;
    empresa: Empresa | null = null;
    resolucion: ResolucionTipoEvaluacion | null = null;
    evaluaciones: SstEvaluacion[] = [];
    errorMsg: string | null = null;

    creandoNueva = false;
    showConfirmNueva = false;

    // --- Control de acceso por rol ---
    esAdmin = false;
    /** Empresas disponibles para el administrador en el selector. */
    empresasDisponibles: Empresa[] = [];
    /** Id seleccionado en el dropdown (sólo admin). */
    empresaSeleccionadaId: string | null = null;
    /** Indica si aún estamos resolviendo rol/empresas (separado de loading de datos). */
    inicializando = true;

    constructor(
        private resSvc: ResEvaluacionesService,
        private router: Router,
        private auth: AuthService
    ) { }

    async ngOnInit(): Promise<void> {
        await this.inicializar();
    }

    /**
     * Inicializa el dashboard detectando el rol del usuario:
     *  - Administrador: carga el listado de empresas y muestra selector.
     *    No carga datos hasta que el admin elija una empresa.
     *  - Usuario normal: carga automáticamente su empresa y evaluaciones.
     */
    private async inicializar(): Promise<void> {
        this.inicializando = true;
        this.loading = true;
        this.errorMsg = null;
        try {
            // Esperar a que el AuthService termine de restaurar la sesión
            // Y que el perfil del usuario esté cargado completamente.
            await this.auth.waitForReady();
            await this.auth.waitForProfile();
            this.esAdmin = await this.resSvc.isAdministrador();
            console.log('[EvaluacionesDashboard] esAdmin =', this.esAdmin);

            if (this.esAdmin) {
                this.empresasDisponibles = await this.resSvc.listarEmpresasDisponibles();
                if (this.empresasDisponibles.length === 0) {
                    this.errorMsg = 'No hay empresas registradas en el sistema.';
                }
                // El admin debe seleccionar explícitamente; no auto-seleccionar.
            } else {
                await this.cargarEmpresa();
            }
        } catch (error: any) {
            console.error('Error inicializando dashboard Res. 0312:', error);
            this.errorMsg = error?.message || 'No fue posible inicializar el dashboard.';
        } finally {
            this.inicializando = false;
            this.loading = false;
        }
    }

    /**
     * Handler del selector de empresa (sólo visible para admins).
     * Carga los datos de la empresa seleccionada.
     */
    async onSeleccionEmpresa(empresaId: string | null): Promise<void> {
        this.empresaSeleccionadaId = empresaId;
        this.empresa = null;
        this.resolucion = null;
        this.evaluaciones = [];
        if (!empresaId) return;
        await this.cargarEmpresa(empresaId);
    }

    /**
     * Carga empresa + tipo de evaluación + historial.
     * Sin argumento usa la empresa del tenant (usuario no-admin).
     */
    async cargarEmpresa(empresaId?: string): Promise<void> {
        this.loading = true;
        this.errorMsg = null;
        try {
            const { empresa, resolucion } = await this.resSvc.getTipoEvaluacionTenant(empresaId);
            this.empresa = empresa;
            this.resolucion = resolucion;
            this.evaluaciones = await this.resSvc.listarEvaluaciones(empresa.id!);
        } catch (error: any) {
            console.error('Error cargando dashboard Res. 0312:', error);
            this.errorMsg = error?.message || 'No fue posible cargar el dashboard.';
            this.empresa = null;
            this.resolucion = null;
            this.evaluaciones = [];
        } finally {
            this.loading = false;
        }
    }

    /** Recarga manteniendo el contexto (empresa seleccionada si es admin). */
    async cargar(): Promise<void> {
        if (this.esAdmin) {
            if (this.empresaSeleccionadaId) {
                await this.cargarEmpresa(this.empresaSeleccionadaId);
            }
        } else {
            await this.cargarEmpresa();
        }
    }

    abrirConfirmNueva(): void {
        if (!this.empresa?.nivel_riesgo) {
            this.errorMsg = 'Debe configurar el nivel de riesgo de la empresa antes de crear una evaluación (Configuración → Empresas).';
            return;
        }
        this.errorMsg = null;
        this.showConfirmNueva = true;
    }

    cerrarConfirmNueva(): void {
        if (this.creandoNueva) return;
        this.showConfirmNueva = false;
    }

    async confirmarNuevaEvaluacion(): Promise<void> {
        if (!this.empresa || !this.resolucion) return;
        this.creandoNueva = true;
        this.errorMsg = null;
        try {
            const { evaluacion } = await this.resSvc.crearEvaluacion({
                empresaId: this.empresa.id!,
                tipo: this.resolucion.tipo
            });
            this.showConfirmNueva = false;
            this.router.navigate(['/gestion-sst/evaluaciones', evaluacion.id]);
        } catch (error: any) {
            console.error('Error creando evaluación:', error);
            this.errorMsg = error?.message || 'No fue posible crear la evaluación.';
        } finally {
            this.creandoNueva = false;
        }
    }

    abrirEvaluacion(ev: SstEvaluacion): void {
        this.router.navigate(['/gestion-sst/evaluaciones', ev.id]);
    }

    async eliminarEvaluacion(ev: SstEvaluacion): Promise<void> {
        if (ev.estado !== 'Borrador') return;
        if (!confirm(`¿Eliminar el borrador de ${ev.tipo_evaluacion} estándares del ${ev.fecha_evaluacion}?`)) return;
        try {
            await this.resSvc.eliminarEvaluacion(ev.id!);
            await this.cargar();
        } catch (error: any) {
            console.error('Error eliminando evaluación:', error);
            this.errorMsg = error?.message || 'No se pudo eliminar la evaluación.';
        }
    }

    badgeEstado(estado: SstEvaluacion['estado']): string {
        return estado === 'Finalizado'
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            : 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    }

    badgeTipo(tipo: TipoEvaluacion): string {
        return {
            '7': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
            '21': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
            '60': 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30'
        }[tipo];
    }

    semaforoPuntaje(puntaje: number): string {
        if (puntaje >= 86) return 'text-emerald-400';
        if (puntaje >= 61) return 'text-amber-400';
        return 'text-red-400';
    }

    criticoPuntaje(puntaje: number): string {
        if (puntaje >= 86) return 'Aceptable';
        if (puntaje >= 61) return 'Moderadamente Aceptable';
        return 'Crítico';
    }
}
