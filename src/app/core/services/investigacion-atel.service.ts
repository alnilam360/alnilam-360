import { Injectable } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import { Empresa } from '../models/models';
import { EquipoSugerido, InvestigacionPendiente } from '../models/matriz-at.model';

/** Investigación de AT/EL (Res. 1401/2007): bandeja de casos y plazos (RPC). */
@Injectable({ providedIn: 'root' })
export class InvestigacionAtelService {
  constructor(
    private sb: SupabaseClientService,
    private tenant: TenantService,
  ) {}

  /** Contexto de empresa: admin ve selector; el resto su empresa. */
  async resolverContextoEmpresa(): Promise<{ esAdmin: boolean; empresas: Empresa[]; empresaId: string }> {
    const esAdmin = await this.tenant.isAdministrador();
    const empresas = await this.tenant.listarEmpresasDisponibles();
    const empresaId = (await this.tenant.getEmpresaTenantId()) || empresas[0]?.id || '';
    return { esAdmin, empresas, empresaId };
  }

  async getPendientes(empresaId: string): Promise<InvestigacionPendiente[]> {
    const { data, error } = await this.sb.client.rpc('get_investigaciones_pendientes', { p_empresa_id: empresaId });
    if (error) throw error;
    return (data as unknown as InvestigacionPendiente[]) ?? [];
  }

  async sugerirEquipo(empresaId: string): Promise<EquipoSugerido[]> {
    const { data, error } = await this.sb.client.rpc('sugerir_equipo_investigador', { p_empresa_id: empresaId });
    if (error) throw error;
    return (data as unknown as EquipoSugerido[]) ?? [];
  }
}
