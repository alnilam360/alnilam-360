import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from './supabase-client.service';
import { TenantService } from './tenant.service';
import {
  SstRecurso,
  SstComite,
  SstComiteMiembro,
  SstComiteActa,
  SstComiteActaAsistente,
  MatrizResponsabilidadRACI,
  PresupuestoResumenRecursos,
  TipoComiteSST,
  EstadoComiteSST,
  TipoResponsabilidadRACI
} from '../models/recursos-responsables.model';

@Injectable({
  providedIn: 'root'
})
export class RecursosResponsablesService {
  private sb = inject(SupabaseClientService);
  private tenant = inject(TenantService);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. RECURSOS ASIGNADOS AL SG-SST
  // ═══════════════════════════════════════════════════════════════════════════

  async listarRecursos(empresaId: string, periodo?: string): Promise<SstRecurso[]> {
    if (!empresaId) return [];
    let query = this.sb.client
      .from('sst_recurso')
      .select(`
        *,
        responsable:trabajadores!responsable_gestion(id, nombre, cargo, documento, area_trabajo)
      `)
      .eq('empresa_id', empresaId);

    if (periodo && periodo !== 'todos') {
      query = query.eq('periodo', periodo);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error listando recursos SST:', error);
      throw error;
    }
    return (data as SstRecurso[]) || [];
  }

  async guardarRecurso(recurso: Partial<SstRecurso>): Promise<SstRecurso> {
    const payload: any = {
      empresa_id: recurso.empresa_id,
      tipo_recurso: recurso.tipo_recurso,
      descripcion: recurso.descripcion?.trim(),
      responsable_gestion: recurso.responsable_gestion || null,
      monto_presupuestado: recurso.tipo_recurso === 'financiero' && recurso.monto_presupuestado !== undefined
        ? Number(recurso.monto_presupuestado)
        : null,
      monto_ejecutado: recurso.monto_ejecutado !== undefined ? Number(recurso.monto_ejecutado) : 0,
      periodo: recurso.periodo || new Date().getFullYear().toString(),
      estado: recurso.estado || 'activo',
      observaciones: recurso.observaciones?.trim() || null
    };

    if (recurso.id) {
      const { data, error } = await this.sb.client
        .from('sst_recurso')
        .update(payload)
        .eq('id', recurso.id)
        .select(`*, responsable:trabajadores!responsable_gestion(id, nombre, cargo, documento, area_trabajo)`)
        .single();
      if (error) throw error;
      return data as SstRecurso;
    } else {
      const { data, error } = await this.sb.client
        .from('sst_recurso')
        .insert(payload)
        .select(`*, responsable:trabajadores!responsable_gestion(id, nombre, cargo, documento, area_trabajo)`)
        .single();
      if (error) throw error;
      return data as SstRecurso;
    }
  }

  async eliminarRecurso(id: string): Promise<void> {
    const { error } = await this.sb.client
      .from('sst_recurso')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  calcularResumenPresupuesto(recursos: SstRecurso[]): PresupuestoResumenRecursos {
    let totalPresupuestado = 0;
    let totalEjecutado = 0;

    const porTipo = {
      humano: { presupuestado: 0, ejecutado: 0, cantidad: 0 },
      financiero: { presupuestado: 0, ejecutado: 0, cantidad: 0 },
      tecnico_tecnologico: { presupuestado: 0, ejecutado: 0, cantidad: 0 },
      fisico_locativo: { presupuestado: 0, ejecutado: 0, cantidad: 0 }
    };

    for (const r of recursos) {
      const tipo = r.tipo_recurso;
      if (porTipo[tipo]) {
        porTipo[tipo].cantidad += 1;
        const p = Number(r.monto_presupuestado) || 0;
        const e = Number(r.monto_ejecutado) || 0;
        porTipo[tipo].presupuestado += p;
        porTipo[tipo].ejecutado += e;
        totalPresupuestado += p;
        totalEjecutado += e;
      }
    }

    const saldoDisponible = Math.max(0, totalPresupuestado - totalEjecutado);
    const porcentajeEjecucion = totalPresupuestado > 0
      ? Math.min(100, Math.round((totalEjecutado / totalPresupuestado) * 100))
      : 0;

    return {
      totalPresupuestado,
      totalEjecutado,
      saldoDisponible,
      porcentajeEjecucion,
      porTipo
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. COMITÉS Y BRIGADAS SST
  // ═══════════════════════════════════════════════════════════════════════════

  async obtenerComiteVigente(empresaId: string, tipo: TipoComiteSST): Promise<SstComite | null> {
    if (!empresaId) return null;
    const { data, error } = await this.sb.client
      .from('sst_comite')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('tipo_comite', tipo)
      .order('fecha_conformacion', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(`Error obteniendo comité vigente para ${tipo}:`, error);
      throw error;
    }

    if (!data) return null;

    const comite = data as SstComite;
    return this.enriquecerComiteConMetricas(comite);
  }

  async listarHistoricoComites(empresaId: string, tipo: TipoComiteSST): Promise<SstComite[]> {
    if (!empresaId) return [];
    const { data, error } = await this.sb.client
      .from('sst_comite')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('tipo_comite', tipo)
      .order('fecha_conformacion', { ascending: false });

    if (error) throw error;
    return (data as SstComite[]) || [];
  }

  async guardarComite(comite: Partial<SstComite>): Promise<SstComite> {
    const payload: any = {
      empresa_id: comite.empresa_id,
      tipo_comite: comite.tipo_comite,
      nombre_personalizado: comite.nombre_personalizado?.trim() || null,
      fecha_conformacion: comite.fecha_conformacion,
      fecha_vigencia_fin: comite.fecha_vigencia_fin,
      periodo_anios: comite.periodo_anios || (comite.tipo_comite === 'BRIGADA_EMERGENCIA' ? 1 : 2),
      acto_administrativo: comite.acto_administrativo?.trim() || null,
      estado: comite.estado || 'vigente',
      periodicidad_actas: comite.periodicidad_actas || (comite.tipo_comite === 'COPASST' ? 'mensual' : 'trimestral'),
      observaciones: comite.observaciones?.trim() || null
    };

    if (comite.id) {
      const { data, error } = await this.sb.client
        .from('sst_comite')
        .update(payload)
        .eq('id', comite.id)
        .select('*')
        .single();
      if (error) throw error;
      return this.enriquecerComiteConMetricas(data as SstComite);
    } else {
      const { data, error } = await this.sb.client
        .from('sst_comite')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      return this.enriquecerComiteConMetricas(data as SstComite);
    }
  }

  async iniciarNuevaConformacion(
    comiteAnteriorId: string,
    nuevoComite: Partial<SstComite>,
    migrarMiembros: boolean
  ): Promise<SstComite> {
    // 1. Marcar el comité anterior como vencido
    await this.sb.client
      .from('sst_comite')
      .update({ estado: 'vencido' })
      .eq('id', comiteAnteriorId);

    // 2. Crear nuevo comité
    const comiteCreado = await this.guardarComite({
      ...nuevoComite,
      estado: 'vigente'
    });

    // 3. Migrar miembros activos si se solicitó
    if (migrarMiembros && comiteCreado.id) {
      const miembrosAnteriores = await this.listarMiembros(comiteAnteriorId);
      const nuevosMiembros = miembrosAnteriores
        .filter(m => m.activo)
        .map(m => ({
          comite_id: comiteCreado.id,
          trabajador_id: m.trabajador_id,
          rol_en_comite: m.rol_en_comite,
          tipo_representacion: m.tipo_representacion,
          tipo_miembro: m.tipo_miembro,
          fecha_inicio_participacion: comiteCreado.fecha_conformacion,
          activo: true
        }));

      if (nuevosMiembros.length > 0) {
        await this.sb.client
          .from('sst_comite_miembro')
          .insert(nuevosMiembros);
      }
    }

    return comiteCreado;
  }

  private async enriquecerComiteConMetricas(comite: SstComite): Promise<SstComite> {
    const hoy = new Date();
    const fin = new Date(comite.fecha_vigencia_fin);
    const diffMs = fin.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    comite.dias_restantes = diasRestantes;
    comite.por_vencer = diasRestantes > 0 && diasRestantes <= 60;

    if (diasRestantes < 0 && comite.estado === 'vigente') {
      comite.estado = 'vencido';
      // Auto-actualizar estado vencido si procede
      this.sb.client
        .from('sst_comite')
        .update({ estado: 'vencido' })
        .eq('id', comite.id)
        .then();
    }

    // Contar miembros activos
    const { count: miembrosCount } = await this.sb.client
      .from('sst_comite_miembro')
      .select('id', { count: 'exact', head: true })
      .eq('comite_id', comite.id)
      .eq('activo', true);
    comite.miembros_count = miembrosCount || 0;

    // Obtener última acta
    const { data: actas } = await this.sb.client
      .from('sst_comite_acta')
      .select('fecha_reunion')
      .eq('comite_id', comite.id)
      .order('fecha_reunion', { ascending: false })
      .limit(1);

    if (actas && actas.length > 0) {
      comite.ultima_acta_fecha = actas[0].fecha_reunion;
      const alerta = this.verificarAlertaPeriodicidad(comite, comite.ultima_acta_fecha);
      comite.alerta_acta_pendiente = alerta.alertaPendiente;
    } else {
      // Sin actas aún registradas
      comite.ultima_acta_fecha = null;
      const alerta = this.verificarAlertaPeriodicidad(comite, comite.fecha_conformacion);
      comite.alerta_acta_pendiente = alerta.alertaPendiente;
    }

    // Contar actas totales
    const { count: actasCount } = await this.sb.client
      .from('sst_comite_acta')
      .select('id', { count: 'exact', head: true })
      .eq('comite_id', comite.id);
    comite.actas_count = actasCount || 0;

    return comite;
  }

  verificarAlertaPeriodicidad(
    comite: SstComite,
    ultimaFecha?: string | null
  ): { alertaPendiente: boolean; diasDesdeUltima: number; periodicidadDias: number } {
    let periodicidadDias = 30; // COPASST mensual
    if (comite.periodicidad_actas === 'trimestral' || comite.tipo_comite === 'COMITE_CONVIVENCIA' || comite.tipo_comite === 'BRIGADA_EMERGENCIA') {
      periodicidadDias = 90;
    } else if (comite.periodicidad_actas === 'bimestral') {
      periodicidadDias = 60;
    } else if (comite.periodicidad_actas === 'semestral') {
      periodicidadDias = 180;
    }

    if (!ultimaFecha) {
      return { alertaPendiente: true, diasDesdeUltima: 999, periodicidadDias };
    }

    const fechaUltima = new Date(ultimaFecha);
    const hoy = new Date();
    const diffMs = hoy.getTime() - fechaUltima.getTime();
    const diasDesdeUltima = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      alertaPendiente: diasDesdeUltima > periodicidadDias,
      diasDesdeUltima,
      periodicidadDias
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MIEMBROS DE COMITÉS
  // ═══════════════════════════════════════════════════════════════════════════

  async listarMiembros(comiteId: string): Promise<SstComiteMiembro[]> {
    if (!comiteId) return [];
    const { data, error } = await this.sb.client
      .from('sst_comite_miembro')
      .select(`
        *,
        trabajador:trabajadores!trabajador_id(id, documento, nombre, cargo, area_trabajo, eps, arl, telefono)
      `)
      .eq('comite_id', comiteId)
      .order('activo', { ascending: false })
      .order('rol_en_comite', { ascending: true });

    if (error) {
      console.error('Error listando miembros de comité:', error);
      throw error;
    }
    return (data as SstComiteMiembro[]) || [];
  }

  async validarParticipacionActiva(
    empresaId: string,
    tipoComite: TipoComiteSST,
    trabajadorId: string,
    comiteActualId: string
  ): Promise<boolean> {
    // Verifica si el trabajador ya tiene una participación activa en otro comité vigente del mismo tipo
    const { data, error } = await this.sb.client
      .from('sst_comite_miembro')
      .select(`
        id,
        comite:sst_comite!comite_id(id, empresa_id, tipo_comite, estado)
      `)
      .eq('trabajador_id', trabajadorId)
      .eq('activo', true);

    if (error) return true;

    const tieneSuperposicion = (data as any[] || []).some(m => {
      const c = m.comite;
      return (
        c &&
        c.empresa_id === empresaId &&
        c.tipo_comite === tipoComite &&
        c.estado === 'vigente' &&
        c.id !== comiteActualId
      );
    });

    return !tieneSuperposicion; // true si es válido (sin superposición)
  }

  async agregarMiembro(miembro: Partial<SstComiteMiembro>): Promise<SstComiteMiembro> {
    const payload = {
      comite_id: miembro.comite_id,
      trabajador_id: miembro.trabajador_id,
      rol_en_comite: miembro.rol_en_comite || 'miembro',
      tipo_representacion: miembro.tipo_representacion || 'no_aplica',
      tipo_miembro: miembro.tipo_miembro || 'principal',
      fecha_inicio_participacion: miembro.fecha_inicio_participacion || new Date().toISOString().slice(0, 10),
      activo: true
    };

    const { data, error } = await this.sb.client
      .from('sst_comite_miembro')
      .upsert(payload, { onConflict: 'comite_id, trabajador_id' })
      .select(`
        *,
        trabajador:trabajadores!trabajador_id(id, documento, nombre, cargo, area_trabajo, eps, arl, telefono)
      `)
      .single();

    if (error) throw error;
    return data as SstComiteMiembro;
  }

  async actualizarMiembro(id: string, campos: Partial<SstComiteMiembro>): Promise<SstComiteMiembro> {
    const { data, error } = await this.sb.client
      .from('sst_comite_miembro')
      .update(campos)
      .eq('id', id)
      .select(`
        *,
        trabajador:trabajadores!trabajador_id(id, documento, nombre, cargo, area_trabajo, eps, arl, telefono)
      `)
      .single();

    if (error) throw error;
    return data as SstComiteMiembro;
  }

  async retirarMiembro(id: string, fechaFin?: string): Promise<void> {
    const { error } = await this.sb.client
      .from('sst_comite_miembro')
      .update({
        activo: false,
        fecha_fin_participacion: fechaFin || new Date().toISOString().slice(0, 10)
      })
      .eq('id', id);
    if (error) throw error;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ACTAS DE REUNIÓN PERIÓDICA
  // ═══════════════════════════════════════════════════════════════════════════

  async listarActas(comiteId: string): Promise<SstComiteActa[]> {
    if (!comiteId) return [];
    const { data, error } = await this.sb.client
      .from('sst_comite_acta')
      .select(`
        *,
        asistentes:sst_comite_acta_asistente(
          id, trabajador_id, miembro_id, asistio, observacion,
          trabajador:trabajadores!trabajador_id(id, nombre, documento, cargo)
        )
      `)
      .eq('comite_id', comiteId)
      .order('fecha_reunion', { ascending: false });

    if (error) {
      console.error('Error listando actas:', error);
      throw error;
    }
    return (data as SstComiteActa[]) || [];
  }

  async guardarActa(
    acta: Partial<SstComiteActa>,
    asistentesTrabajadorIds: string[],
    archivo?: File
  ): Promise<SstComiteActa> {
    let archivoUrl = acta.archivo_acta_url || null;

    // Subida de archivo a Supabase Storage bucket sst-actas
    if (archivo) {
      const fileName = `${acta.comite_id}/${Date.now()}_${archivo.name.replace(/\s+/g, '_')}`;
      const { data: uploadData, error: uploadError } = await this.sb.client.storage
        .from('sst-actas')
        .upload(fileName, archivo, { upsert: true });

      if (uploadError) {
        console.error('Error subiendo archivo de acta a Storage:', uploadError);
        throw uploadError;
      }

      const { data: publicUrlData } = this.sb.client.storage
        .from('sst-actas')
        .getPublicUrl(uploadData.path);

      archivoUrl = publicUrlData.publicUrl;
    }

    const payload: any = {
      comite_id: acta.comite_id,
      numero_acta: acta.numero_acta?.trim(),
      fecha_reunion: acta.fecha_reunion,
      tipo_reunion: acta.tipo_reunion || 'ordinaria',
      temas_tratados: acta.temas_tratados?.trim(),
      compromisos: acta.compromisos?.trim() || null,
      compromisos_detalle: acta.compromisos_detalle || [],
      archivo_acta_url: archivoUrl
    };

    let actaGuardada: SstComiteActa;

    if (acta.id) {
      const { data, error } = await this.sb.client
        .from('sst_comite_acta')
        .update(payload)
        .eq('id', acta.id)
        .select('*')
        .single();
      if (error) throw error;
      actaGuardada = data as SstComiteActa;
    } else {
      const { data, error } = await this.sb.client
        .from('sst_comite_acta')
        .insert(payload)
        .select('*')
        .single();
      if (error) throw error;
      actaGuardada = data as SstComiteActa;
    }

    // Gestionar asistentes
    if (asistentesTrabajadorIds && asistentesTrabajadorIds.length > 0 && actaGuardada.id) {
      // Eliminar asistentes existentes en caso de edición
      await this.sb.client
        .from('sst_comite_acta_asistente')
        .delete()
        .eq('acta_id', actaGuardada.id);

      const filasAsistentes = asistentesTrabajadorIds.map(tId => ({
        acta_id: actaGuardada.id,
        trabajador_id: tId,
        asistio: true
      }));

      await this.sb.client
        .from('sst_comite_acta_asistente')
        .insert(filasAsistentes);
    }

    return actaGuardada;
  }

  async eliminarActa(id: string): Promise<void> {
    const { error } = await this.sb.client
      .from('sst_comite_acta')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. MATRIZ DE RESPONSABILIDADES SST (RACI)
  // ═══════════════════════════════════════════════════════════════════════════

  async listarMatrizRACI(empresaId: string): Promise<MatrizResponsabilidadRACI[]> {
    if (!empresaId) return [];
    const { data, error } = await this.sb.client
      .from('matriz_responsabilidades_sst')
      .select(`
        *,
        trabajador:trabajadores!trabajador_especifico_id(id, nombre, cargo)
      `)
      .eq('empresa_id', empresaId)
      .order('orden', { ascending: true })
      .order('actividad_sst', { ascending: true });

    if (error) {
      console.error('Error listando matriz RACI:', error);
      throw error;
    }

    const registros = (data as MatrizResponsabilidadRACI[]) || [];

    // Si la empresa no tiene matriz RACI sembrada, sembrar automáticamente la base
    if (registros.length === 0) {
      return this.sembrarMatrizBaseRACI(empresaId);
    }

    return registros;
  }

  async guardarAsignacionRACI(asignacion: Partial<MatrizResponsabilidadRACI>): Promise<MatrizResponsabilidadRACI> {
    const payload = {
      empresa_id: asignacion.empresa_id,
      actividad_sst: asignacion.actividad_sst?.trim(),
      fase_phva: asignacion.fase_phva || 'Planear',
      rol_cargo: asignacion.rol_cargo?.trim(),
      trabajador_especifico_id: asignacion.trabajador_especifico_id || null,
      tipo_responsabilidad: asignacion.tipo_responsabilidad || 'R',
      descripcion_responsabilidad: asignacion.descripcion_responsabilidad?.trim() || null,
      orden: asignacion.orden || 1
    };

    const { data, error } = await this.sb.client
      .from('matriz_responsabilidades_sst')
      .upsert(payload, { onConflict: 'empresa_id, actividad_sst, rol_cargo' })
      .select(`
        *,
        trabajador:trabajadores!trabajador_especifico_id(id, nombre, cargo)
      `)
      .single();

    if (error) throw error;
    return data as MatrizResponsabilidadRACI;
  }

  async eliminarAsignacionRACI(id: string): Promise<void> {
    const { error } = await this.sb.client
      .from('matriz_responsabilidades_sst')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  async sembrarMatrizBaseRACI(empresaId: string): Promise<MatrizResponsabilidadRACI[]> {
    const actividadesBase = [
      { actividad: 'Definir y divulgar la Política y Objetivos de SST', fase: 'Planear', orden: 1 },
      { actividad: 'Asignar recursos financieros, técnicos y humanos para SST', fase: 'Planear', orden: 2 },
      { actividad: 'Elaborar y actualizar la Matriz IPERC (GTC 45)', fase: 'Planear', orden: 3 },
      { actividad: 'Formular el Plan Anual de Trabajo en SST', fase: 'Planear', orden: 4 },
      { actividad: 'Conformar y capacitar el COPASST / Vigía SST', fase: 'Hacer', orden: 5 },
      { actividad: 'Conformar el Comité de Convivencia Laboral', fase: 'Hacer', orden: 6 },
      { actividad: 'Estructurar y dotar la Brigada de Emergencias', fase: 'Hacer', orden: 7 },
      { actividad: 'Ejecutar el Plan de Capacitación y Entrenamiento', fase: 'Hacer', orden: 8 },
      { actividad: 'Realizar inspecciones planeadas y de seguridad', fase: 'Hacer', orden: 9 },
      { actividad: 'Reportar e investigar Incidentes y Accidentes de Trabajo', fase: 'Verificar', orden: 10 },
      { actividad: 'Monitorear la Matriz de Indicadores de Gestión SST', fase: 'Verificar', orden: 11 },
      { actividad: 'Auditoría interna anual y Revisión por la Alta Dirección', fase: 'Verificar', orden: 12 },
      { actividad: 'Definir y cerrar Planes de Acción y Acciones Correctivas', fase: 'Actuar', orden: 13 },
      { actividad: 'Ejecución del Plan de Mejora Continua', fase: 'Actuar', orden: 14 }
    ];

    const rolesBase = [
      'Alta Dirección / Representante Legal',
      'Responsable del SG-SST',
      'COPASST',
      'Comité de Convivencia',
      'Brigada de Emergencia',
      'Jefaturas y Supervisores',
      'Todos los Trabajadores'
    ];

    // Matriz típica de SG-SST según Decreto 1072/2015 Art. 2.2.4.6.8
    const matrizDefault: Array<{ actIdx: number; rol: string; raci: TipoResponsabilidadRACI }> = [
      // 1. Política
      { actIdx: 0, rol: 'Alta Dirección / Representante Legal', raci: 'A' },
      { actIdx: 0, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 0, rol: 'COPASST', raci: 'C' },
      { actIdx: 0, rol: 'Todos los Trabajadores', raci: 'I' },
      // 2. Recursos
      { actIdx: 1, rol: 'Alta Dirección / Representante Legal', raci: 'A' },
      { actIdx: 1, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 1, rol: 'COPASST', raci: 'I' },
      // 3. IPERC
      { actIdx: 2, rol: 'Alta Dirección / Representante Legal', raci: 'A' },
      { actIdx: 2, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 2, rol: 'COPASST', raci: 'C' },
      { actIdx: 2, rol: 'Jefaturas y Supervisores', raci: 'C' },
      { actIdx: 2, rol: 'Todos los Trabajadores', raci: 'I' },
      // 4. Plan Anual
      { actIdx: 3, rol: 'Alta Dirección / Representante Legal', raci: 'A' },
      { actIdx: 3, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 3, rol: 'COPASST', raci: 'C' },
      // 5. COPASST
      { actIdx: 4, rol: 'Alta Dirección / Representante Legal', raci: 'A' },
      { actIdx: 4, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 4, rol: 'COPASST', raci: 'R' },
      { actIdx: 4, rol: 'Todos los Trabajadores', raci: 'I' },
      // 6. Convivencia
      { actIdx: 5, rol: 'Alta Dirección / Representante Legal', raci: 'A' },
      { actIdx: 5, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 5, rol: 'Comité de Convivencia', raci: 'R' },
      // 7. Brigada
      { actIdx: 6, rol: 'Alta Dirección / Representante Legal', raci: 'A' },
      { actIdx: 6, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 6, rol: 'Brigada de Emergencia', raci: 'R' },
      // 8. Capacitación
      { actIdx: 7, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 7, rol: 'Jefaturas y Supervisores', raci: 'C' },
      { actIdx: 7, rol: 'Todos los Trabajadores', raci: 'I' },
      // 9. Inspecciones
      { actIdx: 8, rol: 'COPASST', raci: 'R' },
      { actIdx: 8, rol: 'Responsable del SG-SST', raci: 'A' },
      { actIdx: 8, rol: 'Jefaturas y Supervisores', raci: 'C' },
      // 10. Accidentes
      { actIdx: 9, rol: 'Alta Dirección / Representante Legal', raci: 'I' },
      { actIdx: 9, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 9, rol: 'COPASST', raci: 'R' },
      { actIdx: 9, rol: 'Jefaturas y Supervisores', raci: 'C' },
      // 11. Indicadores
      { actIdx: 10, rol: 'Alta Dirección / Representante Legal', raci: 'A' },
      { actIdx: 10, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 10, rol: 'COPASST', raci: 'C' },
      // 12. Auditoría
      { actIdx: 11, rol: 'Alta Dirección / Representante Legal', raci: 'R' },
      { actIdx: 11, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 11, rol: 'COPASST', raci: 'I' },
      // 13. Planes Acción
      { actIdx: 12, rol: 'Alta Dirección / Representante Legal', raci: 'A' },
      { actIdx: 12, rol: 'Responsable del SG-SST', raci: 'R' },
      { actIdx: 12, rol: 'COPASST', raci: 'C' },
      { actIdx: 12, rol: 'Jefaturas y Supervisores', raci: 'R' },
      // 14. Mejora
      { actIdx: 13, rol: 'Alta Dirección / Representante Legal', raci: 'A' },
      { actIdx: 13, rol: 'Responsable del SG-SST', raci: 'R' }
    ];

    const recordsToInsert = matrizDefault.map(item => ({
      empresa_id: empresaId,
      actividad_sst: actividadesBase[item.actIdx].actividad,
      fase_phva: actividadesBase[item.actIdx].fase,
      rol_cargo: item.rol,
      tipo_responsabilidad: item.raci,
      orden: actividadesBase[item.actIdx].orden
    }));

    const { data, error } = await this.sb.client
      .from('matriz_responsabilidades_sst')
      .upsert(recordsToInsert, { onConflict: 'empresa_id, actividad_sst, rol_cargo' })
      .select('*')
      .order('orden', { ascending: true });

    if (error) {
      console.warn('Advertencia sembrando matriz base:', error);
      return [];
    }

    return (data as MatrizResponsabilidadRACI[]) || [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. BÚSQUEDA DE TRABAJADORES (Consumo sin duplicar del módulo Trabajadores)
  // ═══════════════════════════════════════════════════════════════════════════

  async buscarTrabajadores(empresaId: string, filtro?: string): Promise<any[]> {
    if (!empresaId) return [];
    let query = this.sb.client
      .from('trabajadores')
      .select('id, documento, nombre, cargo, area_trabajo, eps, arl, telefono, activo')
      .eq('empresa_id', empresaId)
      .eq('activo', true);

    if (filtro && filtro.trim().length > 0) {
      const f = `%${filtro.trim()}%`;
      query = query.or(`nombre.ilike.${f},documento.ilike.${f},cargo.ilike.${f}`);
    }

    const { data, error } = await query.order('nombre', { ascending: true }).limit(50);
    if (error) {
      console.error('Error buscando trabajadores:', error);
      return [];
    }
    return data || [];
  }
}
