import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import {
    MatrizIperc, PeligroCatalogo, IpercHistorial,
    NivelDeficiencia, NivelExposicion, NivelConsecuencia,
    NivelIntervencion, Aceptabilidad
} from '../models/iperc.model';
import { Empresa } from '../models/models';

@Injectable({ providedIn: 'root' })
export class IpercService {

    constructor(
        private sb: SupabaseClientService,
        private tenant: TenantService
    ) { }

    // ========================================================================
    // Tenant helpers (delegate)
    // ========================================================================

    isAdministrador(): Promise<boolean> { return this.tenant.isAdministrador(); }
    listarEmpresasDisponibles(): Promise<Empresa[]> { return this.tenant.listarEmpresasDisponibles(); }
    getEmpresaTenantId(): Promise<string | null> { return this.tenant.getEmpresaTenantId(); }
    getEmpresaPorId(id: string): Promise<Empresa> { return this.tenant.getEmpresaPorId(id); }

    // ========================================================================
    // Motor GTC 45 (Lógica Pura)
    // ========================================================================

    /** NP = ND × NE */
    calcularNP(nd: NivelDeficiencia, ne: NivelExposicion): number {
        return nd * ne;
    }

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

    clasificarNR(nr: number): NivelIntervencion {
        if (nr >= 600) return 'I';
        if (nr >= 150) return 'II';
        if (nr >= 40) return 'III';
        return 'IV';
    }

    determinarAceptabilidad(nivel: NivelIntervencion): Aceptabilidad {
        switch (nivel) {
            case 'I': return 'No Aceptable';
            case 'II': return 'Aceptable con control específico';
            case 'III': return 'Mejorable';
            case 'IV': return 'Aceptable';
        }
    }

    evaluarRiesgo(nd: NivelDeficiencia, ne: NivelExposicion, nc: NivelConsecuencia) {
        const np = this.calcularNP(nd, ne);
        const nr = this.calcularNR(np, nc);
        const interpretacionNp = this.interpretarNP(np);
        const nivelIntervencion = this.clasificarNR(nr);
        const aceptabilidad = this.determinarAceptabilidad(nivelIntervencion);
        return { np, nr, interpretacionNp, nivelIntervencion, aceptabilidad };
    }

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

    async crear(registro: Omit<MatrizIperc, 'id' | 'nivel_probabilidad' | 'nivel_riesgo' | 'np_post' | 'nr_post' | 'peligro' | 'created_at' | 'updated_at'>): Promise<MatrizIperc> {
        const { data, error } = await this.sb.client
            .from('sst_matriz_iperc')
            .insert(registro)
            .select(this.SELECT_QUERY)
            .single();
        if (error) throw error;
        return data as unknown as MatrizIperc;
    }

    async actualizar(id: string, patch: Partial<MatrizIperc>): Promise<MatrizIperc> {
        const { nivel_probabilidad, nivel_riesgo, np_post, nr_post, peligro, ...rest } = patch as any;
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
    // Historial / Control de Cambios
    // ========================================================================

    async registrarCambio(entry: {
        empresa_id: string;
        registro_id?: string | null;
        descripcion: string;
    }): Promise<void> {
        const perfil = await this.tenant.getPerfilSeguro();
        const { error } = await this.sb.client
            .from('sst_matriz_iperc_historial')
            .insert({
                empresa_id: entry.empresa_id,
                registro_id: entry.registro_id ?? null,
                descripcion: entry.descripcion,
                usuario_id: perfil?.id ?? null
            });
        if (error) throw error;
    }

    async listarHistorial(empresaId: string): Promise<IpercHistorial[]> {
        const { data, error } = await this.sb.client
            .from('sst_matriz_iperc_historial')
            .select('*, usuario:usuarios!sst_matriz_iperc_historial_usuario_id_fkey(id, nombre, email)')
            .eq('empresa_id', empresaId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data as unknown as IpercHistorial[]) ?? [];
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
