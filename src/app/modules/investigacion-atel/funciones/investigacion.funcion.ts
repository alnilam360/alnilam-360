import { EquipoInvestigadorMiembro, EquipoSugerido } from '../../../core/models/matriz-at.model';

export function esGrave(gravedad: string | null, causoMuerte: boolean): boolean {
  return causoMuerte || gravedad === 'grave' || gravedad === 'mortal';
}

/** Art. 12: para cerrar se exige ≥1 acción con responsable y fecha de compromiso. */
export function puedeCerrar(
  acciones: { responsable_texto?: string | null; responsable_id?: string | null; fecha_compromiso: string | null }[],
): boolean {
  return acciones.some((a) => !!(a.responsable_texto?.trim() || a.responsable_id) && !!a.fecha_compromiso);
}

const norm = (s: string): string => s.trim().toLowerCase();

export function fusionarEquipo(
  actual: EquipoInvestigadorMiembro[],
  sugeridos: EquipoSugerido[],
): EquipoInvestigadorMiembro[] {
  const resultado = [...actual];
  const existe = (s: EquipoSugerido): boolean => resultado.some((m) =>
    s.trabajador_id ? m.trabajador_id === s.trabajador_id : norm(m.nombre) === norm(s.nombre) && norm(m.rol) === norm(s.rol));
  for (const s of sugeridos) {
    if (existe(s)) continue;
    resultado.push({
      ...(s.trabajador_id ? { trabajador_id: s.trabajador_id } : {}),
      nombre: s.nombre, rol: s.rol, fuente: s.fuente,
    });
  }
  return resultado;
}
