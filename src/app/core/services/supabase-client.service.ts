import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseClientService {
    private _client: SupabaseClient;

    constructor() {
        this._client = createClient(
            environment.supabaseUrl,
            environment.supabaseKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false,
                    storageKey: 'sb-alnilam360-auth-token',
                    flowType: 'implicit',
                    // Bypass Navigator.locks para evitar NavigatorLockAcquireTimeoutError
                    // Seguro para aplicaciones single-tab
                    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
                        return await fn();
                    }
                }
            }
        );
    }

    get client(): SupabaseClient {
        return this._client;
    }
}
