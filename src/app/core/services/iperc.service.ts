import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { AuthService } from './auth.service';
import {
    MatrizIperc, PeligroCatalogo,
    NivelDeficiencia, NivelExposicion, NivelConsecuencia,
    NivelIntervencion, Aceptabilidad
} from '../models/iperc.model';
import { Empresa, Usuario } from '../models/models';

// ============================================================================
// IpercService — CRUD + Motor GTC 45
// ============================================================================
@Injectable({ providedIn: 'root' })
export class IpercService {

    constructor(
        private sb: SupabaseClientService,
        private auth: AuthService
    ) { }

    // ========================================================================
    // Auth / Tenant helpers
    // ========================================================================

    private async getPerfilSeguro(): Promise<Usuario | null> {
        let perfil = this.auth.currentPerfil;
        if (perfil) return perfil;
        perfil = await this.auth.waitForProfile();
        return perfil ?? null;
    }

    async isAdministrador(): Promise<boolean> {
        const perfil = await this.getPerfilSeguro();
        if (!perfil) return false;
        const rol = ((perfil as any).rol_data?.nombre ?? perfil.rol ?? '')
            .toString().trim().toUpperCase();
        return ['ADMINISTRADOR', 'ADMIN', 'SUPER ADMIN', 'SUPERADMIN'].includes(rol);
    }

    async listarEmpresasDisponibles(): Promise<Empresa[]> {
        if (await this.isAdministrador()) {
            const { data, error } = await this.sb.client
                .from('empresas').select('*').order('nombre', { ascending: true });
            if (error) throw error;
            return (data as Empresa[]) ?? [];
        }
        const perfil = await this.getPerfilSeguro();
        if (!perfil?.empresa_id) return [];
        const { data, error } = await this.sb.client
            .from('empresas').select('*').eq('id', perfil.empresa_id).single();
        if (error) return [];
        return [data as Empresa];
    }

    async getEmpresaTenantId(): Promise<string | null> {
        const perfil = await this.getPerfilSeguro();
        return perfil?.empresa_id ?? null;
    }

    // ========================================================================
    // Motor GTC 45 (Lógica Pura)
    // ========================================================================

    /** NP = ND × NE */
    calcularNP(nd: NivelDeficiencia, ne: NivelExposicion): number {
        return nd * ne;
    }

    /** Interpretación del Nivel de Probabilidad */
    interpretarNP(np: number): string {
        if (np >= 24) return 'Muy Alto';
        if (np >= 10) return 'Alto';
        if (np >= 6) return 'Medio';
        return 'Bajo';
    }

    /** NR = NP × NC */
    calcularNR(np: number, nc: NivelConsecuencia): number {
        return np * nc;
    }

    /** Clasificación del Nivel de Intervención (I–IV) según tabla GTC 45 */
    clasificarNR(nr: number): NivelIntervencion {
        if (nr >= 600) return 'I';
        if (nr >= 150) return 'II';
        if (nr >= 40) return 'III';
        return 'IV';
    }

    /** Aceptabilidad según nivel de intervención */
    determinarAceptabilidad(nivel: NivelIntervencion): Aceptabilidad {
        switch (nivel) {
            case 'I': return 'No Aceptable';
            case 'II': return 'Aceptable con control específico';
            case 'III': return 'Mejorable';
            case 'IV': return 'Aceptable';
        }
    }

    /** Evaluación completa: recibe ND, NE, NC y retorna todo */
    evaluarRiesgo(nd: NivelDeficiencia, ne: NivelExposicion, nc: NivelConsecuencia) {
        const np = this.calcularNP(nd, ne);
        const nr = this.calcularNR(np, nc);
        const interpretacionNp = this.interpretarNP(np);
        const nivelIntervencion = this.clasificarNR(nr);
        const aceptabilidad = this.determinarAceptabilidad(nivelIntervencion);
        return { np, nr, interpretacionNp, nivelIntervencion, aceptabilidad };
    }

    /** Color semáforo por nivel de intervención */
    colorNivel(nivel: NivelIntervencion | string | null | undefined): string {
        switch (nivel) {
            case 'I': return 'red';
            case 'II': return 'orange';
            case 'III': return 'yellow';
            case 'IV': return 'green';
            default: return 'gray';
        }
    }

    // ========================================================================
    // CRUD Matriz IPERC
    // ========================================================================

    private readonly SELECT_QUERY = `
        *,
        peligro:sst_peligros_catalogo(id, clasificacion, descripcion, efectos_posibles)
    `.trim();

    async listarPorEmpresa(empresaId: string): Promise<MatrizIperc[]> {
        const { data, error } = await this.sb.client
            .from('sst_matriz_iperc')
            .select(this.SELECT_QUERY)
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data as unknown as MatrizIperc[]) ?? [];
    }

    async obtenerPorId(id: string): Promise<MatrizIperc | null> {
        const { data, error } = await this.sb.client
            .from('sst_matriz_iperc')
            .select(this.SELECT_QUERY)
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        return (data as unknown as MatrizIperc) ?? null;
    }

    async crear(registro: Omit<MatrizIperc, 'id' | 'nivel_probabilidad' | 'nivel_riesgo' | 'created_at' | 'updated_at'>): Promise<MatrizIperc> {
        const { data, error } = await this.sb.client
            .from('sst_matriz_iperc')
            .insert(registro)
            .select(this.SELECT_QUERY)
            .single();
        if (error) throw error;
        return data as unknown as MatrizIperc;
    }

    async actualizar(id: string, patch: Partial<MatrizIperc>): Promise<MatrizIperc> {
        // Excluir campos generados
        const { nivel_probabilidad, nivel_riesgo, ...rest } = patch;
        const { data, error } = await this.sb.client
            .from('sst_matriz_iperc')
            .update(rest)
            .eq('id', id)
            .select(this.SELECT_QUERY)
            .single();
        if (error) throw error;
        return data as unknown as MatrizIperc;
    }

    async eliminar(id: string): Promise<void> {
        const { error } = await this.sb.client
            .from('sst_matriz_iperc').delete().eq('id', id);
        if (error) throw error;
    }

    // ========================================================================
    // Catálogo de peligros
    // ========================================================================

    async listarPeligros(): Promise<PeligroCatalogo[]> {
        const { data, error } = await this.sb.client
            .from('sst_peligros_catalogo')
            .select('*')
            .eq('activo', true)
            .order('clasificacion', { ascending: true })
            .order('descripcion', { ascending: true });
        if (error) throw error;
        return (data as PeligroCatalogo[]) ?? [];
    }

    /** Agrupa peligros por clasificación para el selector */
    agruparPeligros(peligros: PeligroCatalogo[]): { clasificacion: string; items: PeligroCatalogo[] }[] {
        const mapa = new Map<string, PeligroCatalogo[]>();
        for (const p of peligros) {
            const lista = mapa.get(p.clasificacion) ?? [];
            lista.push(p);
            mapa.set(p.clasificacion, lista);
        }
        return Array.from(mapa.entries()).map(([clasificacion, items]) => ({ clasificacion, items }));
    }

    // ========================================================================
    // Estadísticas
    // ========================================================================

    async contarPorNivel(empresaId: string): Promise<Record<string, number>> {
        const { data, error } = await this.sb.client
            .from('sst_matriz_iperc')
            .select('nivel_intervencion')
            .eq('empresa_id', empresaId);
        if (error) throw error;
        const rows = data ?? [];
        return {
            I: rows.filter(r => r.nivel_intervencion === 'I').length,
            II: rows.filter(r => r.nivel_intervencion === 'II').length,
            III: rows.filter(r => r.nivel_intervencion === 'III').length,
            IV: rows.filter(r => r.nivel_intervencion === 'IV').length,
            total: rows.length
        };
    }
}
