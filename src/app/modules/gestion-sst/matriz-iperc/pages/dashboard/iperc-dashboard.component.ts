import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatrizIperc, NivelIntervencion } from '../../../../../core/models/iperc.model';
import { IpercService } from '../../../../../core/services/iperc.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Empresa } from '../../../../../core/models/models';

interface StatNivel { nivel: string; label: string; icon: string; color: string; bg: string; border: string; count: number; }

@Component({
    selector: 'app-iperc-dashboard',
    templateUrl: './iperc-dashboard.component.html',
    styleUrls: ['./iperc-dashboard.component.scss'],
    standalone: false
})
export class IpercDashboardComponent implements OnInit {

    loading = true;
    inicializando = true;
    errorMsg: string | null = null;
    successMsg: string | null = null;

    esAdmin = false;
    empresasDisponibles: Empresa[] = [];
    empresaSeleccionadaId: string | null = null;
    empresa: Empresa | null = null;

    registros: MatrizIperc[] = [];
    registrosFiltrados: MatrizIperc[] = [];
    filtroNivel: string | null = null;
    filtroProceso = '';

    stats: StatNivel[] = [
        { nivel: 'I', label: 'No Aceptable', icon: 'skull-outline', color: 'text-red-400', bg: 'bg-red-500/12', border: 'border-red-500/30', count: 0 },
        { nivel: 'II', label: 'Control esp.', icon: 'warning-outline', color: 'text-orange-400', bg: 'bg-orange-500/12', border: 'border-orange-500/30', count: 0 },
        { nivel: 'III', label: 'Mejorable', icon: 'alert-outline', color: 'text-yellow-400', bg: 'bg-yellow-500/12', border: 'border-yellow-500/30', count: 0 },
        { nivel: 'IV', label: 'Aceptable', icon: 'checkmark-circle-outline', color: 'text-emerald-400', bg: 'bg-emerald-500/12', border: 'border-emerald-500/30', count: 0 },
    ];

    constructor(
        private svc: IpercService,
        private auth: AuthService,
        private router: Router
    ) { }

    async ngOnInit(): Promise<void> { await this.inicializar(); }

    private async inicializar(): Promise<void> {
        this.inicializando = true;
        try {
            await this.auth.waitForReady();
            await this.auth.waitForProfile();
            this.esAdmin = await this.svc.isAdministrador();
            if (this.esAdmin) {
                this.empresasDisponibles = await this.svc.listarEmpresasDisponibles();
            } else {
                const id = await this.svc.getEmpresaTenantId();
                if (id) { this.empresaSeleccionadaId = id; await this.cargarDatos(id); }
                else { this.errorMsg = 'No se pudo determinar la empresa.'; }
            }
        } catch (err: any) { this.errorMsg = err?.message ?? 'Error inicializando.'; }
        finally { this.inicializando = false; this.loading = false; }
    }

    async onSeleccionEmpresa(id: string | null): Promise<void> {
        this.empresaSeleccionadaId = id;
        this.registros = []; this.registrosFiltrados = []; this.empresa = null;
        if (id) await this.cargarDatos(id);
    }

    async cargarDatos(empresaId: string): Promise<void> {
        this.loading = true; this.errorMsg = null;
        try {
            const empresas = await this.svc.listarEmpresasDisponibles();
            this.empresa = empresas.find(e => e.id === empresaId) ?? null;
            this.registros = await this.svc.listarPorEmpresa(empresaId);
            this.actualizarStats();
            this.aplicarFiltros();
        } catch (err: any) { this.errorMsg = err?.message ?? 'Error cargando datos.'; }
        finally { this.loading = false; }
    }

    private actualizarStats(): void {
        for (const s of this.stats) {
            s.count = this.registros.filter(r => r.nivel_intervencion === s.nivel).length;
        }
    }

    aplicarFiltros(): void {
        let list = [...this.registros];
        if (this.filtroNivel) list = list.filter(r => r.nivel_intervencion === this.filtroNivel);
        if (this.filtroProceso) list = list.filter(r => r.proceso.toLowerCase().includes(this.filtroProceso.toLowerCase()));
        this.registrosFiltrados = list;
    }

    filtrarPorNivel(nivel: string | null): void {
        this.filtroNivel = this.filtroNivel === nivel ? null : nivel;
        this.aplicarFiltros();
    }

    nuevoRegistro(): void {
        this.router.navigate(['/gestion-sst/matriz-iperc/nuevo'], {
            queryParams: this.empresaSeleccionadaId ? { empresa: this.empresaSeleccionadaId } : {}
        });
    }

    editarRegistro(reg: MatrizIperc): void {
        this.router.navigate(['/gestion-sst/matriz-iperc', reg.id, 'editar']);
    }

    async eliminarRegistro(reg: MatrizIperc): Promise<void> {
        if (!reg.id || !confirm('¿Eliminar este registro de la matriz?')) return;
        try {
            await this.svc.eliminar(reg.id);
            this.successMsg = 'Registro eliminado.';
            if (this.empresaSeleccionadaId) await this.cargarDatos(this.empresaSeleccionadaId);
            setTimeout(() => this.successMsg = null, 3000);
        } catch (err: any) { this.errorMsg = err?.message ?? 'Error eliminando.'; }
    }

    // Helpers UI
    semaforoClasses(nivel: string | null | undefined): string {
        switch (nivel) {
            case 'I': return 'bg-red-500/15 text-red-400 border-red-500/30';
            case 'II': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
            case 'III': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
            case 'IV': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            default: return 'bg-dark-accent text-dark-text border-dark-border';
        }
    }

    semaforoBar(nivel: string | null | undefined): string {
        switch (nivel) {
            case 'I': return 'bg-red-500';
            case 'II': return 'bg-orange-500';
            case 'III': return 'bg-yellow-500';
            case 'IV': return 'bg-emerald-500';
            default: return 'bg-dark-text';
        }
    }
}
