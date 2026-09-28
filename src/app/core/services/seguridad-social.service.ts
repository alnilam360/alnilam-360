import { Injectable, signal, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { CatalogoSeguridadSocial } from '../models/models';

/**
 * Fallback estático en caso de desconexión o latencia de red.
 * Garantiza hidratación instantánea y cero fallas en UI.
 */
const DEFAULT_EPS: CatalogoSeguridadSocial[] = [
    { tipo: 'EPS', codigo: 'EPS001', nombre: 'EPS Sanitas', sigla: 'SANITAS', regimen: 'Contributivo / Subsidiado', orden: 10, activo: true },
    { tipo: 'EPS', codigo: 'EPS002', nombre: 'EPS SURA (Suramericana)', sigla: 'SURA', regimen: 'Contributivo / Subsidiado', orden: 20, activo: true },
    { tipo: 'EPS', codigo: 'EPS003', nombre: 'Nueva EPS', sigla: 'NUEVA EPS', regimen: 'Contributivo / Subsidiado', orden: 30, activo: true },
    { tipo: 'EPS', codigo: 'EPS004', nombre: 'Compensar EPS', sigla: 'COMPENSAR', regimen: 'Contributivo / Subsidiado', orden: 40, activo: true },
    { tipo: 'EPS', codigo: 'EPS005', nombre: 'Salud Total EPS', sigla: 'SALUD TOTAL', regimen: 'Contributivo / Subsidiado', orden: 50, activo: true },
    { tipo: 'EPS', codigo: 'EPS006', nombre: 'Famisanar EPS', sigla: 'FAMISANAR', regimen: 'Contributivo / Subsidiado', orden: 60, activo: true },
    { tipo: 'EPS', codigo: 'EPS007', nombre: 'Coosalud EPS', sigla: 'COOSALUD', regimen: 'Contributivo / Subsidiado', orden: 70, activo: true },
    { tipo: 'EPS', codigo: 'EPS008', nombre: 'Mutual Ser EPS', sigla: 'MUTUAL SER', regimen: 'Contributivo / Subsidiado', orden: 80, activo: true },
    { tipo: 'EPS', codigo: 'EPS009', nombre: 'Capital Salud EPS', sigla: 'CAPITAL SALUD', regimen: 'Subsidiado / Contributivo', orden: 90, activo: true },
    { tipo: 'EPS', codigo: 'EPS010', nombre: 'Asmet Salud EPS', sigla: 'ASMET SALUD', regimen: 'Subsidiado / Contributivo', orden: 100, activo: true },
    { tipo: 'EPS', codigo: 'EPS011', nombre: 'Savia Salud EPS', sigla: 'SAVIA SALUD', regimen: 'Subsidiado / Contributivo', orden: 110, activo: true },
    { tipo: 'EPS', codigo: 'EPS012', nombre: 'Emssanar EPS', sigla: 'EMSSANAR', regimen: 'Subsidiado / Contributivo', orden: 120, activo: true },
    { tipo: 'EPS', codigo: 'EPS013', nombre: 'Servicio Occidental de Salud (S.O.S. EPS)', sigla: 'S.O.S.', regimen: 'Contributivo', orden: 130, activo: true },
    { tipo: 'EPS', codigo: 'EPS014', nombre: 'Aliansalud EPS', sigla: 'ALIANSALUD', regimen: 'Contributivo', orden: 140, activo: true },
    { tipo: 'EPS', codigo: 'EPS015', nombre: 'Comfenalco Valle EPS', sigla: 'COMFENALCO', regimen: 'Contributivo / Subsidiado', orden: 150, activo: true },
    { tipo: 'EPS', codigo: 'EPS016', nombre: 'Cajacopi EPS', sigla: 'CAJACOPI', regimen: 'Subsidiado / Contributivo', orden: 160, activo: true },
    { tipo: 'EPS', codigo: 'EPS017', nombre: 'Capresoca EPS', sigla: 'CAPRESOCA', regimen: 'Subsidiado / Contributivo', orden: 170, activo: true },
    { tipo: 'EPS', codigo: 'EPS018', nombre: 'Salud Mía EPS', sigla: 'SALUD MIA', regimen: 'Contributivo', orden: 180, activo: true },
    { tipo: 'EPS', codigo: 'EPS019', nombre: 'EPS Familiar de Colombia', sigla: 'FAMILIAR', regimen: 'Subsidiado', orden: 190, activo: true },
    { tipo: 'EPS', codigo: 'EPS020', nombre: 'Comfachocó EPS', sigla: 'COMFACHOCO', regimen: 'Subsidiado', orden: 200, activo: true },
    { tipo: 'EPS', codigo: 'EPS021', nombre: 'Comfaoriente EPS', sigla: 'COMFAORIENTE', regimen: 'Subsidiado', orden: 210, activo: true },
    { tipo: 'EPS', codigo: 'EPS022', nombre: 'Dusakawi EPSI', sigla: 'DUSAKAWI', regimen: 'Indígena', orden: 220, activo: true },
    { tipo: 'EPS', codigo: 'EPS023', nombre: 'Asociación Indígena del Cauca (AIC EPSI)', sigla: 'AIC', regimen: 'Indígena', orden: 230, activo: true },
    { tipo: 'EPS', codigo: 'EPS024', nombre: 'Anas Wayuu EPSI', sigla: 'ANAS WAYUU', regimen: 'Indígena', orden: 240, activo: true },
    { tipo: 'EPS', codigo: 'EPS025', nombre: 'Mallamas EPSI', sigla: 'MALLAMAS', regimen: 'Indígena', orden: 250, activo: true },
    { tipo: 'EPS', codigo: 'EPS026', nombre: 'Pijaos Salud EPSI', sigla: 'PIJAOS SALUD', regimen: 'Indígena', orden: 260, activo: true },
    { tipo: 'EPS', codigo: 'EPS027', nombre: 'Fondo de Pasivo Social de Ferrocarriles Nacionales', sigla: 'FPS FERROCARRILES', regimen: 'Excepción / Especial', orden: 270, activo: true },
    { tipo: 'EPS', codigo: 'EPS028', nombre: 'Dirección General de Sanidad Militar y Policial', sigla: 'SANIDAD FUERZAS MILITARES', regimen: 'Excepción / Especial', orden: 280, activo: true },
    { tipo: 'EPS', codigo: 'EPS029', nombre: 'Fondo Nacional del Magisterio (FOMAG)', sigla: 'FOMAG', regimen: 'Excepción / Especial', orden: 290, activo: true }
];

const DEFAULT_ARL: CatalogoSeguridadSocial[] = [
    { tipo: 'ARL', codigo: 'ARL001', nombre: 'Positiva Compañía de Seguros S.A.', sigla: 'POSITIVA', regimen: 'Pública', orden: 10, activo: true },
    { tipo: 'ARL', codigo: 'ARL002', nombre: 'Seguros de Riesgos Laborales Suramericana S.A. (ARL SURA)', sigla: 'ARL SURA', regimen: 'Privada', orden: 20, activo: true },
    { tipo: 'ARL', codigo: 'ARL003', nombre: 'AXA Colpatria Seguros S.A.', sigla: 'AXA COLPATRIA', regimen: 'Privada', orden: 30, activo: true },
    { tipo: 'ARL', codigo: 'ARL004', nombre: 'Colmena Seguros (Colmena Riesgos Laborales)', sigla: 'COLMENA', regimen: 'Privada', orden: 40, activo: true },
    { tipo: 'ARL', codigo: 'ARL005', nombre: 'Compañía de Seguros Bolívar S.A.', sigla: 'BOLIVAR', regimen: 'Privada', orden: 50, activo: true },
    { tipo: 'ARL', codigo: 'ARL006', nombre: 'Seguros de Vida Alfa S.A.', sigla: 'ALFA', regimen: 'Privada', orden: 60, activo: true },
    { tipo: 'ARL', codigo: 'ARL007', nombre: 'La Equidad Seguros de Vida Organismo Cooperativo', sigla: 'LA EQUIDAD', regimen: 'Cooperativa / Privada', orden: 70, activo: true },
    { tipo: 'ARL', codigo: 'ARL008', nombre: 'Mapfre Colombia Vida Seguros S.A.', sigla: 'MAPFRE', regimen: 'Privada', orden: 80, activo: true },
    { tipo: 'ARL', codigo: 'ARL009', nombre: 'Liberty Seguros de Vida S.A.', sigla: 'LIBERTY', regimen: 'Privada', orden: 90, activo: true },
    { tipo: 'ARL', codigo: 'ARL010', nombre: 'Compañía de Seguros de Vida Aurora S.A.', sigla: 'AURORA', regimen: 'Privada', orden: 100, activo: true },
    { tipo: 'ARL', codigo: 'ARL011', nombre: 'Compañía de Seguros Colsanitas S.A.', sigla: 'COLSANITAS', regimen: 'Privada', orden: 110, activo: true }
];

const DEFAULT_PENSIONES: CatalogoSeguridadSocial[] = [
    { tipo: 'PENSION', codigo: 'AFP001', nombre: 'Colpensiones (Administradora Colombiana de Pensiones)', sigla: 'COLPENSIONES', regimen: 'Público (RPM)', orden: 10, activo: true },
    { tipo: 'PENSION', codigo: 'AFP002', nombre: 'Porvenir S.A.', sigla: 'PORVENIR', regimen: 'Privado (RAIS)', orden: 20, activo: true },
    { tipo: 'PENSION', codigo: 'AFP003', nombre: 'Protección S.A.', sigla: 'PROTECCION', regimen: 'Privado (RAIS)', orden: 30, activo: true },
    { tipo: 'PENSION', codigo: 'AFP004', nombre: 'Colfondos S.A.', sigla: 'COLFONDOS', regimen: 'Privado (RAIS)', orden: 40, activo: true },
    { tipo: 'PENSION', codigo: 'AFP005', nombre: 'Skandia Pensiones y Cesantías S.A.', sigla: 'SKANDIA', regimen: 'Privado (RAIS)', orden: 50, activo: true },
    { tipo: 'PENSION', codigo: 'AFP006', nombre: 'Fondo Nacional de Prestaciones Sociales del Magisterio (FOMAG)', sigla: 'FOMAG', regimen: 'Régimen Especial', orden: 60, activo: true },
    { tipo: 'PENSION', codigo: 'AFP007', 'nombre': 'Caja de Retiro de las Fuerzas Militares (CREMIL)', sigla: 'CREMIL', regimen: 'Régimen Especial', orden: 70, activo: true },
    { tipo: 'PENSION', codigo: 'AFP008', 'nombre': 'Caja de Sueldos de Retiro de la Policía Nacional (CASUR)', sigla: 'CASUR', regimen: 'Régimen Especial', orden: 80, activo: true }
];

@Injectable({
    providedIn: 'root'
})
export class SeguridadSocialService {
    private sb = inject(SupabaseClientService);

    private _epsList = signal<CatalogoSeguridadSocial[]>(DEFAULT_EPS);
    private _arlList = signal<CatalogoSeguridadSocial[]>(DEFAULT_ARL);
    private _pensionesList = signal<CatalogoSeguridadSocial[]>(DEFAULT_PENSIONES);
    private _cargando = signal(false);
    private _cargado = false;

    readonly epsList = this._epsList.asReadonly();
    readonly arlList = this._arlList.asReadonly();
    readonly pensionesList = this._pensionesList.asReadonly();
    readonly cargando = this._cargando.asReadonly();

    /**
     * Carga catálogos desde Supabase con fallback reactivo
     */
    async cargarCatalogos(): Promise<void> {
        if (this._cargado) return;
        this._cargando.set(true);

        try {
            const { data, error } = await this.sb.client
                .from('catalogo_seguridad_social')
                .select('*')
                .eq('activo', true)
                .order('orden', { ascending: true })
                .order('nombre', { ascending: true });

            if (error) {
                console.warn('Uso de catálogo estático de seguridad social por error en consulta:', error.message);
                return;
            }

            if (data && data.length > 0) {
                const items = data as CatalogoSeguridadSocial[];
                const eps = items.filter(i => i.tipo === 'EPS');
                const arl = items.filter(i => i.tipo === 'ARL');
                const pension = items.filter(i => i.tipo === 'PENSION');

                if (eps.length) this._epsList.set(eps);
                if (arl.length) this._arlList.set(arl);
                if (pension.length) this._pensionesList.set(pension);
            }
            this._cargado = true;
        } catch (err) {
            console.warn('Error cargando catálogo de seguridad social, manteniendo fallback:', err);
        } finally {
            this._cargando.set(false);
        }
    }
}
