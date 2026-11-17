/**
 * Suma `n` días hábiles (lun-vie) a una fecha YYYY-MM-DD, operando en UTC para que no se desfase.
 * shortcut: no descuenta festivos de Colombia, subir a un calendario de festivos si se exige exactitud legal.
 */
export function diasHabilesDesde(fechaIso: string, n: number): string {
  const [y, m, d] = fechaIso.slice(0, 10).split('-').map(Number);
  const f = new Date(Date.UTC(y, m - 1, d));
  let restan = n;
  while (restan > 0) {
    f.setUTCDate(f.getUTCDate() + 1);
    const dia = f.getUTCDay();
    if (dia !== 0 && dia !== 6) restan--;
  }
  return f.toISOString().slice(0, 10);
}
