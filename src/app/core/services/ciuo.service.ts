import { Injectable, signal, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { CatalogoCiuoOficio } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CiuoService {

    private sb = inject(SupabaseClientService);

    private _catalogo = signal<CatalogoCiuoOficio[]>([]);
    private _cargando = signal(false);
    private _error = signal<string | null>(null);

    readonly catalogo = this._catalogo.asReadonly();
    readonly cargando = this._cargando.asReadonly();
    readonly error = this._error.asReadonly();

    async cargarCatalogo(): Promise<void> {
        if (this._catalogo().length > 0) return;
        this._cargando.set(true);
        this._error.set(null);
        try {
            const { data, error } = await this.sb.client
                .from('catalogo_ciuo_oficios')
                .select('*')
                .eq('activo', true)
                .order('codigo_ciuo')
                .order('descripcion_oficio');
            if (error) throw error;
            this._catalogo.set((data as CatalogoCiuoOficio[]) ?? []);
        } catch (err: any) {
            this._error.set(err?.message || 'Error cargando catálogo CIUO-08');
        } finally {
            this._cargando.set(false);
        }
    }

    buscarOficios(query: string): CatalogoCiuoOficio[] {
        const todos = this._catalogo();
        if (!query?.trim()) return todos.slice(0, 50);
        const q = this.normalizar(query.trim());
        return todos.filter(o =>
            this.normalizar(o.descripcion_oficio).includes(q) ||
            o.codigo_ciuo.includes(q)
        ).slice(0, 50);
    }

    etiqueta(o: CatalogoCiuoOficio): string {
        return `${o.codigo_ciuo} — ${o.descripcion_oficio}`;
    }

    private normalizar(s: string): string {
        return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }
}
