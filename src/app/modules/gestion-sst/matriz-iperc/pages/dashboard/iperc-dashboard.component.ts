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
            this.empresa = this.empresasDisponibles.find(e => e.id === empresaId)
                ?? await this.svc.getEmpresaPorId(empresaId);
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
            const desc = `Eliminado: [${reg.proceso}] ${reg.peligro?.descripcion || reg.peligro_descripcion || '—'} · Nivel ${reg.nivel_intervencion} · NR ${reg.nivel_riesgo}`;
            await this.svc.eliminar(reg.id);
            if (this.empresaSeleccionadaId) {
                await this.svc.registrarCambio({
                    empresa_id: this.empresaSeleccionadaId,
                    registro_id: null,
                    descripcion: desc
                }).catch(() => {});
            }
            this.successMsg = 'Registro eliminado.';
            if (this.empresaSeleccionadaId) await this.cargarDatos(this.empresaSeleccionadaId);
            setTimeout(() => this.successMsg = null, 3000);
        } catch (err: any) { this.errorMsg = err?.message ?? 'Error eliminando.'; }
    }

    // ========================================================================
    // Exportar Excel — Reporte Profesional GTC 45
    // ========================================================================

    async exportarExcel(): Promise<void> {
        if (!this.registros.length) return;

        const { Workbook } = await import('exceljs');
        const wb = new Workbook();
        wb.creator = 'Alnilam 360 · SG-SST';
        wb.created = new Date();

        const empresa = this.empresa?.nombre ?? 'Empresa';
        const TOTAL = 44;
        const NOW = new Date();

        const cnt = { I: 0, II: 0, III: 0, IV: 0 };
        this.registros.forEach(r => {
            if (r.nivel_intervencion === 'I') cnt.I++;
            else if (r.nivel_intervencion === 'II') cnt.II++;
            else if (r.nivel_intervencion === 'III') cnt.III++;
            else if (r.nivel_intervencion === 'IV') cnt.IV++;
        });

        const ws = wb.addWorksheet('Matriz IPERC', {
            properties: { tabColor: { argb: 'FF1D4ED8' } },
            pageSetup: {
                paperSize: 9, orientation: 'landscape',
                fitToPage: true, fitToWidth: 1, fitToHeight: 0,
                printTitlesRow: '1:6',
            },
            headerFooter: {
                oddFooter: '&L&"Calibri"&8Alnilam 360 · SG-SST — CONFIDENCIAL&C&"Calibri,Bold"&8MATRIZ IPERC GTC 45&R&"Calibri"&8Pág. &P de &N  ·  &D',
            },
            views: [{ state: 'frozen', xSplit: 4, ySplit: 6 }]
        });

        // ── Paleta de colores ─────────────────────────────────────────────────
        const C = {
            h1:  'FF061E35',   // cabecera oscura
            h2:  'FF0D2D4E',   // título
            h3:  'FF1A3C5E',   // barra info
            sec: 'FF1D4ED8',   // sección header
            sub: 'FF2563EB',   // sub-header
            acc: 'FF93C5FD',   // acento letras fila 1
            wh:  'FFFFFFFF',
            alt: 'FFF8FAFC',   // fila alterna (muy sutil)
            bTh: 'FFD1D5DB',   // borde thin datos
            bSc: 'FF1E3A5F',   // borde sección (medium)
            // Semáforo datos
            I_bg:   'FFFEE2E2', I_tx:   'FF991B1B',
            II_bg:  'FFFFF7ED', II_tx:  'FF92400E',
            III_bg: 'FFFEFCE8', III_tx: 'FF854D0E',
            IV_bg:  'FFECFDF5', IV_tx:  'FF065F46',
            // Bloques semáforo header fila 3
            I_hbg:   'FFFDE8E8', I_htx:   'FF7F0000',
            II_hbg:  'FFFEF3C7', II_htx:  'FF7C2D12',
            III_hbg: 'FFFEFCE8', III_htx: 'FF713F12',
            IV_hbg:  'FFDCFCE7', IV_htx:  'FF166534',
        };

        // ── Helpers ───────────────────────────────────────────────────────────
        const bdr = (color: string, style: 'thin' | 'medium' = 'thin') =>
            ({ style, color: { argb: color } });
        const fillSolid = (argb: string) =>
            ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });
        const f = (opts: any) => ({ name: 'Calibri', ...opts });
        const nivelStyle: Record<string, { bg: string; tx: string }> = {
            I:   { bg: C.I_bg,   tx: C.I_tx   },
            II:  { bg: C.II_bg,  tx: C.II_tx  },
            III: { bg: C.III_bg, tx: C.III_tx },
            IV:  { bg: C.IV_bg,  tx: C.IV_tx  },
        };

        // INP text → color (GTC-45: Muy Alto / Alto / Medio / Bajo)
        const inpStyleMap: Record<string, { bg: string; tx: string }> = {
            'muy alto': nivelStyle['I'],  'ma': nivelStyle['I'],
            'alto':     nivelStyle['II'], 'a':  nivelStyle['II'],
            'medio':    nivelStyle['III'],'m':  nivelStyle['III'],
            'bajo':     nivelStyle['IV'], 'b':  nivelStyle['IV'],
        };
        const getInpStyle = (val: any): { bg: string; tx: string } | null =>
            val ? (inpStyleMap[String(val).toLowerCase().trim()] ?? null) : null;
        const SECTION_STARTS = new Set([7, 11, 14, 22, 30, 35, 43, 44]);

        // ── FILA 1: Cabecera organización ─────────────────────────────────────
        ws.mergeCells(1, 1, 1, TOTAL);
        const f1 = ws.getCell(1, 1);
        f1.value = 'SISTEMA DE GESTIÓN EN SEGURIDAD Y SALUD EN EL TRABAJO  ·  SG-SST  ·  GTC 45';
        f1.font = f({ color: { argb: C.acc }, size: 9 }) as any;
        f1.fill = fillSolid(C.h1) as any;
        f1.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 } as any;
        ws.getRow(1).height = 20;

        // ── FILA 2: Título principal ──────────────────────────────────────────
        ws.mergeCells(2, 1, 2, TOTAL);
        const f2 = ws.getCell(2, 1);
        f2.value = 'IDENTIFICACIÓN DE PELIGROS, VALORACIÓN DE RIESGOS Y DETERMINACIÓN DE CONTROLES';
        f2.font = f({ bold: true, color: { argb: C.wh }, size: 15 }) as any;
        f2.fill = fillSolid(C.h2) as any;
        f2.alignment = { horizontal: 'center', vertical: 'middle' } as any;
        ws.getRow(2).height = 42;

        // ── FILA 3: Info empresa + bloques semáforo ───────────────────────────
        ws.mergeCells(3, 1, 3, 26);
        const f3 = ws.getCell(3, 1);
        f3.value = `Empresa: ${empresa}   ·   Fecha: ${NOW.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}   ·   Total: ${this.registros.length} registro${this.registros.length !== 1 ? 's' : ''}`;
        f3.font = f({ color: { argb: C.wh }, size: 9, italic: true }) as any;
        f3.fill = fillSolid(C.h3) as any;
        f3.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 } as any;

        const semBlocks: [number, number, string, number, string, string][] = [
            [27, 30, 'NO ACEPTABLE',      cnt.I,   C.I_hbg,   C.I_htx   ],
            [31, 35, 'CTRL. ESPECÍFICO',  cnt.II,  C.II_hbg,  C.II_htx  ],
            [36, 40, 'MEJORABLE',         cnt.III, C.III_hbg, C.III_htx ],
            [41, 44, 'ACEPTABLE',         cnt.IV,  C.IV_hbg,  C.IV_htx  ],
        ];
        semBlocks.forEach(([c1, c2, label, count, bg, tx]) => {
            ws.mergeCells(3, c1, 3, c2);
            const cell = ws.getCell(3, c1);
            cell.value = `${label}\n${count}`;
            cell.font = f({ bold: true, color: { argb: tx }, size: 11 }) as any;
            cell.fill = fillSolid(bg) as any;
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } as any;
            cell.border = {
                top: bdr(C.bSc, 'medium'), bottom: bdr(C.bSc, 'medium'),
                left: bdr(C.bSc, 'medium'), right: bdr(C.bSc, 'medium')
            } as any;
        });
        ws.getRow(3).height = 38;

        // ── FILA 4: Línea separadora ──────────────────────────────────────────
        ws.mergeCells(4, 1, 4, TOTAL);
        ws.getCell(4, 1).fill = fillSolid(C.sub) as any;
        ws.getRow(4).height = 3;

        // ── FILAS 5-6: Encabezados ────────────────────────────────────────────
        const tryMerge = (r1: number, c1: number, r2: number, c2: number) => {
            try { ws.mergeCells(r1, c1, r2, c2); } catch {}
        };
        // 2-row merges (columnas sin sub-header)
        for (const [r1,c1,r2,c2] of [
            [5,1,6,1],[5,2,6,2],[5,3,6,3],[5,4,6,4],
            [5,7,6,7],[5,8,6,8],[5,9,6,9],[5,10,6,10],
            [5,21,6,21],[5,42,6,42],[5,43,6,43],[5,44,6,44]
        ] as [number,number,number,number][]) tryMerge(r1,c1,r2,c2);
        // 1-row merges (secciones con sub-headers)
        for (const [r1,c1,r2,c2] of [
            [5,5,5,6],[5,11,5,13],[5,14,5,20],[5,22,5,29],[5,30,5,34],[5,35,5,41]
        ] as [number,number,number,number][]) tryMerge(r1,c1,r2,c2);

        const hdrBdr = {
            top: bdr(C.h1, 'medium'), bottom: bdr(C.h1, 'medium'),
            left: bdr(C.h3),           right: bdr(C.h3)
        };
        const subBdr = {
            top: bdr(C.h3), bottom: bdr(C.h1, 'medium'),
            left: bdr(C.h3), right: bdr(C.h3)
        };
        const hdrAlign = { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true };

        const secHeaders: [number, string][] = [
            [1,'PROCESO / SUBPROCESO'],[2,'ACTIVIDAD'],[3,'TAREA(S)'],[4,'CARGO(S)'],
            [5,'TIPO DE ACTIVIDAD'],[7,'CLASIFICACIÓN DEL PELIGRO'],
            [8,'DESCRIPCIÓN DEL PELIGRO'],[9,'FUENTE DEL PELIGRO'],[10,'EFECTOS POSIBLES'],
            [11,'CONTROL EXISTENTE'],[14,'EVALUACIÓN DEL RIESGO'],
            [21,'ACEPTABILIDAD DEL RIESGO'],[22,'CRITERIOS PARA ESTABLECER CONTROLES'],
            [30,'MEDIDAS DE INTERVENCIÓN'],[35,'EVALUACIÓN DEL RIESGO POST-CONTROLES'],
            [42,'ACEPTABILIDAD POST'],[43,'FACTOR DE REDUCCIÓN'],[44,'NOTA DE ACTUALIZACIÓN']
        ];
        secHeaders.forEach(([col, val]) => {
            const cell = ws.getCell(5, col);
            cell.value = val;
            cell.font = f({ bold: true, color: { argb: C.wh }, size: 9 }) as any;
            cell.fill = fillSolid(C.sec) as any;
            cell.alignment = hdrAlign as any;
            cell.border = hdrBdr as any;
        });
        ws.getRow(5).height = 38;

        for (let c = 1; c <= TOTAL; c++) {
            try {
                const cell = ws.getCell(6, c);
                cell.font = f({ bold: true, color: { argb: C.wh }, size: 8 }) as any;
                cell.fill = fillSolid(C.sub) as any;
                cell.alignment = hdrAlign as any;
                cell.border = subBdr as any;
            } catch {}
        }
        const subHeaders: [number, string][] = [
            [5,'RUTINARIA'],[6,'NO RUTINARIA'],
            [11,'FUENTE'],[12,'MEDIO'],[13,'INDIVIDUO'],
            [14,'ND'],[15,'NE'],[16,'NP'],[17,'INP'],[18,'NC'],[19,'NRI'],[20,'INR'],
            [22,'PERSONAL DIRECTO'],[23,'TEMPORALES / COOPERATIVAS'],
            [24,'CONTRATISTAS'],[25,'VISITANTES'],[26,'N. EXPUESTOS'],
            [27,'HORAS EXPOSICIÓN'],[28,'PEOR CONSECUENCIA'],[29,'REQ. LEGAL'],
            [30,'ELIMINACIÓN'],[31,'SUSTITUCIÓN'],[32,'CONTROL DE INGENIERÍA'],
            [33,'CONTROL ADMINISTRATIVO'],[34,'EPP'],
            [35,'ND'],[36,'NE'],[37,'NP'],[38,'INP'],[39,'NC'],[40,'NRf'],[41,'INR']
        ];
        subHeaders.forEach(([col, val]) => { try { ws.getCell(6, col).value = val; } catch {} });
        ws.getRow(6).height = 54;

        // ── DATOS (fila 7+) ───────────────────────────────────────────────────
        const NUM_COLS = new Set([14,15,16,18,19,22,23,24,25,26,27,35,36,37,39,40]);
        const CTR_COLS = new Set([5,6,20,21,29,41,42,43]);
        const BOLD_COLS = new Set([19,20,21,40,41,42]);

        this.registros.forEach((r, idx) => {
            const ROW = idx + 7;
            const bg = idx % 2 === 0 ? C.wh : C.alt;
            const nv = r.nivel_intervencion ?? '';
            const nvPost = r.nivel_intervencion_post ?? '';
            const np = (r.nivel_deficiencia ?? 0) * (r.nivel_exposicion ?? 0);
            const npPost = r.nd_post != null && r.ne_post != null ? r.nd_post * r.ne_post : null;
            const totalExp = (r.expuestos_directos ?? 0) + (r.expuestos_temporales ?? 0)
                + (r.expuestos_contratistas ?? 0) + (r.expuestos_visitantes ?? 0);

            const vals: any[] = [
                r.proceso ?? '', r.actividad ?? '', r.tareas ?? '', r.cargo ?? '',
                r.es_rutinaria ? 'X' : '', r.es_rutinaria ? '' : 'X',
                r.peligro?.clasificacion ?? '',
                r.peligro_descripcion ?? r.peligro?.descripcion ?? '',
                r.fuente_peligro ?? '', r.efectos_posibles ?? '',
                r.control_fuente ?? '', r.control_medio ?? '', r.control_individuo ?? '',
                r.nivel_deficiencia ?? '', r.nivel_exposicion ?? '', np,
                r.interpretacion_np ?? '', r.nivel_consecuencia ?? '',
                r.nivel_riesgo ?? '', nv, r.aceptabilidad ?? '',
                r.expuestos_directos ?? 0, r.expuestos_temporales ?? 0,
                r.expuestos_contratistas ?? 0, r.expuestos_visitantes ?? 0,
                totalExp, r.horas_exposicion ?? '', r.peor_consecuencia ?? '',
                r.requisitos_legales ? 'SI' : 'NO',
                r.eliminacion ?? '', r.sustitucion ?? '',
                r.controles_ingenieria ?? '', r.controles_administrativos ?? '', r.epp ?? '',
                r.nd_post ?? '', r.ne_post ?? '', npPost ?? '',
                r.interpretacion_np_post ?? '', r.nc_post ?? '',
                r.nr_post ?? '', nvPost, r.aceptabilidad_post ?? '',
                r.factor_reduccion != null ? `${r.factor_reduccion.toFixed(1)}%` : '',
                r.actualizacion_nota ?? ''
            ];

            vals.forEach((val, ci) => {
                const col = ci + 1;
                const cell = ws.getCell(ROW, col);
                cell.value = val;

                let cellBg = bg;
                let cellTx = 'FF1E293B';
                let bold = BOLD_COLS.has(col);

                if ((col === 20 || col === 21) && nv && nivelStyle[nv]) {
                    cellBg = nivelStyle[nv].bg; cellTx = nivelStyle[nv].tx; bold = true;
                }
                if ((col === 41 || col === 42) && nvPost && nivelStyle[nvPost]) {
                    cellBg = nivelStyle[nvPost].bg; cellTx = nivelStyle[nvPost].tx; bold = true;
                }
                // INP columns — color por nivel de probabilidad
                if (col === 17 || col === 38) {
                    const s = getInpStyle(val);
                    if (s) { cellBg = s.bg; cellTx = s.tx; bold = true; }
                }

                cell.font = f({ size: 9, color: { argb: cellTx }, bold }) as any;
                cell.fill = fillSolid(cellBg) as any;
                cell.border = {
                    top: bdr(C.bTh), bottom: bdr(C.bTh),
                    left: SECTION_STARTS.has(col) ? bdr(C.bSc, 'medium') : bdr(C.bTh),
                    right: bdr(C.bTh)
                } as any;
                cell.alignment = (NUM_COLS.has(col)
                    ? { horizontal: 'center', vertical: 'top' }
                    : CTR_COLS.has(col)
                        ? { horizontal: 'center', vertical: 'top', wrapText: true }
                        : { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 }
                ) as any;
            });

            ws.getRow(ROW).height = 55;
        });

        // ── ANCHOS DE COLUMNA ─────────────────────────────────────────────────
        const WIDTHS = [
            32,18,26,16, 9,11,
            22,30,22,28,
            20,20,22,
            6,6,6,10,6,8,8, 26,
            13,18,11,10,11,14,24,9,
            22,22,24,24,20,
            6,6,6,10,6,8,8, 26,
            18,30
        ];
        WIDTHS.forEach((w, i) => ws.getColumn(i + 1).width = w);

        // ── DESCARGAR ─────────────────────────────────────────────────────────
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer as ArrayBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Matriz_IPERC_${empresa.replace(/\s+/g, '_')}_${NOW.toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
