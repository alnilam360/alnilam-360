-- Seed idempotente: rubros y subrubros del módulo Presupuesto.
INSERT INTO public.presupuesto_rubro (codigo, nombre, orden) VALUES
    (1000, 'Compromisos laborales', 1),
    (2000, 'Costos producción', 2),
    (3000, 'Gastos administrativos', 3),
    (4000, 'Costos financieros', 4),
    (5000, 'Cuentas por pagar', 5)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.presupuesto_subrubro (codigo, rubro_codigo, nombre, orden) VALUES
    (1001, 1000, 'Nómina', 1),
    (2001, 2000, 'Gasto de plataforma', 2),
    (2002, 2000, 'Gasto de proyectos nuevos', 3),
    (2003, 2000, 'Gasto recertificación alturas', 4),
    (3001, 3000, 'Gastos administrativos', 5),
    (3002, 3000, 'Caja menor', 6),
    (4001, 4000, 'Gastos fijos mensuales', 7),
    (5001, 5000, 'Por pagar', 8),
    (5002, 5000, 'Liquidez', 9)
ON CONFLICT (codigo) DO NOTHING;
