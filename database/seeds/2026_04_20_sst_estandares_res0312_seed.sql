-- ============================================================================
-- Alnilam 360 - Seed: 60 estándares mínimos SST (Resolución 0312 de 2019)
-- ----------------------------------------------------------------------------
-- Ciclo PHVA:
--   Planear   -> Estándares 1.x (Recursos) y 2.x (Gestión Integral)
--   Hacer     -> Estándares 3.x (Salud), 4.x (Peligros/Riesgos), 5.x (Amenazas)
--   Verificar -> Estándar 6.x
--   Actuar    -> Estándar 7.x
--
-- aplica_para:
--   {'7'}        -> Sólo para las empresas de hasta 10 trabajadores con riesgo I,II,III
--   {'7','21','60'} -> Aplica a los 3 universos
--   {'21','60'}  -> 11 a 50 trabajadores (riesgo I,II,III) y 60 (todo lo demás)
--   {'60'}       -> Sólo universo completo (>50 trabajadores o riesgo IV/V)
-- ============================================================================

INSERT INTO public.sst_estandares_catalogo
    (ciclo_phva, item, descripcion_estandar, marco_legal, modo_verificacion, aplica_para, peso, orden)
VALUES
-- ============================================================
-- I. PLANEAR - 1. RECURSOS (10%)
-- ============================================================
('Planear', '1.1.1',
 'Responsable del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST',
 'Resolución 0312/2019 Art. 16 / Decreto 1072/2015 Art. 2.2.4.6.8',
 'Verificar el documento de asignación del responsable del SG-SST: hoja de vida con soportes, licencia en SST y curso virtual de 50 horas.',
 ARRAY['7','21','60']::aplica_para_enum[], 0.5, 101),

('Planear', '1.1.2',
 'Responsabilidades en el Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST',
 'Decreto 1072/2015 Art. 2.2.4.6.8 y 2.2.4.6.10',
 'Revisar documento/matriz de asignación de responsabilidades a todos los niveles de la organización y su socialización.',
 ARRAY['21','60']::aplica_para_enum[], 0.5, 102),

('Planear', '1.1.3',
 'Asignación de recursos para el Sistema de Gestión en Seguridad y Salud en el Trabajo SG-SST',
 'Decreto 1072/2015 Art. 2.2.4.6.8 numeral 4',
 'Verificar presupuesto del SG-SST asignado, firmado por la alta dirección y ejecución del mismo.',
 ARRAY['21','60']::aplica_para_enum[], 0.5, 103),

('Planear', '1.1.4',
 'Afiliación al Sistema de Seguridad Social Integral',
 'Decreto 1072/2015 / Ley 100/1993 / Decreto 1295/1994',
 'Verificar planillas de pago (PILA) de los últimos 6 meses a EPS, AFP y ARL para todos los trabajadores.',
 ARRAY['7','21','60']::aplica_para_enum[], 0.5, 104),

('Planear', '1.1.5',
 'Pago de pensión de trabajadores de alto riesgo',
 'Decreto 2090/2003',
 'Solicitar planilla PILA con la cotización especial para actividades de alto riesgo cuando aplique.',
 ARRAY['21','60']::aplica_para_enum[], 0.5, 105),

('Planear', '1.1.6',
 'Conformación del COPASST / Vigía de SST',
 'Resolución 2013/1986 / Decreto 1295/1994 Art. 63',
 'Acta de conformación del COPASST o designación del Vigía, acta de votación, constancia de la inscripción al Mintrabajo cuando aplique.',
 ARRAY['21','60']::aplica_para_enum[], 0.5, 106),

('Planear', '1.1.7',
 'Capacitación del COPASST / Vigía de SST',
 'Resolución 2013/1986 / Decreto 1072/2015',
 'Plan de capacitación del COPASST, registros de asistencia y evaluaciones.',
 ARRAY['21','60']::aplica_para_enum[], 0.5, 107),

('Planear', '1.1.8',
 'Conformación del Comité de Convivencia Laboral',
 'Resolución 652/2012 / Resolución 1356/2012',
 'Acta de conformación, actas de reuniones trimestrales y plan de trabajo del comité.',
 ARRAY['21','60']::aplica_para_enum[], 0.5, 108),

('Planear', '1.2.1',
 'Programa de Capacitación promoción y prevención PYP',
 'Decreto 1072/2015 Art. 2.2.4.6.11',
 'Programa de capacitación anual, registros de asistencia, temas dictados y evaluaciones.',
 ARRAY['7','21','60']::aplica_para_enum[], 2.0, 121),

('Planear', '1.2.2',
 'Capacitación, Inducción y Reinducción en Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST',
 'Decreto 1072/2015 Art. 2.2.4.6.11',
 'Registros de inducción y reinducción firmados por los trabajadores nuevos y antiguos.',
 ARRAY['21','60']::aplica_para_enum[], 2.0, 122),

('Planear', '1.2.3',
 'Responsables del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST con curso virtual de 50 horas',
 'Resolución 4927/2016 / Resolución 0312/2019',
 'Certificado del curso virtual de 50 horas del responsable del SG-SST emitido por entidad autorizada.',
 ARRAY['21','60']::aplica_para_enum[], 2.0, 123),

-- ============================================================
-- I. PLANEAR - 2. GESTIÓN INTEGRAL DEL SG-SST (15%)
-- ============================================================
('Planear', '2.1.1',
 'Política del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST firmada, fechada y comunicada al COPASST / Vigía',
 'Decreto 1072/2015 Art. 2.2.4.6.5, 2.2.4.6.6, 2.2.4.6.7',
 'Política de SST escrita, actualizada anualmente, firmada por representante legal y socializada.',
 ARRAY['21','60']::aplica_para_enum[], 1.0, 201),

('Planear', '2.2.1',
 'Objetivos definidos, claros, medibles, cuantificables, con metas, documentados, revisados del SG-SST',
 'Decreto 1072/2015 Art. 2.2.4.6.18',
 'Documento con objetivos del SG-SST, indicadores de cumplimiento y revisión periódica.',
 ARRAY['21','60']::aplica_para_enum[], 1.0, 202),

('Planear', '2.3.1',
 'Evaluación e identificación de prioridades',
 'Decreto 1072/2015 Art. 2.2.4.6.16',
 'Evaluación inicial del SG-SST (autoevaluación de estándares mínimos) documentada.',
 ARRAY['60']::aplica_para_enum[], 1.0, 203),

('Planear', '2.4.1',
 'Plan que identifica objetivos, metas, responsabilidad, recursos con cronograma y firmado',
 'Decreto 1072/2015 Art. 2.2.4.6.17',
 'Plan anual de trabajo del SG-SST firmado por representante legal y responsable, con recursos y cronograma.',
 ARRAY['7','21','60']::aplica_para_enum[], 2.0, 204),

('Planear', '2.5.1',
 'Archivo o retención documental del Sistema de Gestión en Seguridad y Salud en el Trabajo SG-SST',
 'Decreto 1072/2015 Art. 2.2.4.6.13',
 'Procedimiento/mecanismo de archivo y retención documental del SG-SST (mínimo 20 años para registros).',
 ARRAY['21','60']::aplica_para_enum[], 2.0, 205),

('Planear', '2.6.1',
 'Rendición sobre el desempeño',
 'Decreto 1072/2015 Art. 2.2.4.6.8 numeral 3',
 'Evidencia de rendición de cuentas de los responsables del SG-SST, al menos anual.',
 ARRAY['60']::aplica_para_enum[], 1.0, 206),

('Planear', '2.7.1',
 'Matriz legal',
 'Decreto 1072/2015 Art. 2.2.4.6.8 numeral 7',
 'Matriz de requisitos legales aplicables actualizada, con responsables y evidencias de cumplimiento.',
 ARRAY['60']::aplica_para_enum[], 2.0, 207),

('Planear', '2.8.1',
 'Mecanismos de comunicación, auto reporte en Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST',
 'Decreto 1072/2015 Art. 2.2.4.6.14',
 'Procedimiento de comunicación interna y externa y canales de auto reporte de condiciones de trabajo/salud.',
 ARRAY['60']::aplica_para_enum[], 1.0, 208),

('Planear', '2.9.1',
 'Identificación, evaluación, para adquisición de productos y servicios en Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST',
 'Decreto 1072/2015 Art. 2.2.4.6.27',
 'Procedimiento que integra requisitos SST al proceso de compras y adquisiciones.',
 ARRAY['60']::aplica_para_enum[], 1.0, 209),

('Planear', '2.10.1',
 'Evaluación y selección de proveedores y contratistas',
 'Decreto 1072/2015 Art. 2.2.4.6.28',
 'Procedimiento de evaluación, selección y seguimiento a proveedores/contratistas en SST.',
 ARRAY['60']::aplica_para_enum[], 2.0, 210),

('Planear', '2.11.1',
 'Evaluación del impacto de cambios internos y externos en el Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST',
 'Decreto 1072/2015 Art. 2.2.4.6.26',
 'Procedimiento de gestión del cambio con registros de evaluación del impacto SST ante cambios.',
 ARRAY['60']::aplica_para_enum[], 1.0, 211),

-- ============================================================
-- II. HACER - 3. GESTIÓN DE LA SALUD (20%)
-- ============================================================
('Hacer', '3.1.1',
 'Evaluación Médica Ocupacional',
 'Resolución 2346/2007 / Decreto 1072/2015',
 'Evaluaciones médicas de ingreso, periódicas y de retiro realizadas por médico con licencia en SST.',
 ARRAY['7','21','60']::aplica_para_enum[], 1.0, 301),

('Hacer', '3.1.2',
 'Actividades de Promoción y Prevención en Salud',
 'Decreto 1072/2015 / Resolución 2346/2007',
 'Programa de actividades de promoción y prevención, registros de asistencia y evaluaciones.',
 ARRAY['21','60']::aplica_para_enum[], 1.0, 302),

('Hacer', '3.1.3',
 'Información al médico de los perfiles de cargo',
 'Resolución 2346/2007 Art. 5',
 'Profesiograma / Perfil de cargo con descripción de tareas y factores de riesgo entregado al médico evaluador.',
 ARRAY['60']::aplica_para_enum[], 1.0, 303),

('Hacer', '3.1.4',
 'Realización de los exámenes médicos ocupacionales: Peligros, periodicidad y comunicación al trabajador',
 'Resolución 2346/2007',
 'Evaluaciones médicas ocupacionales según perfil de riesgos, con periodicidad y notificación al trabajador.',
 ARRAY['60']::aplica_para_enum[], 1.0, 304),

('Hacer', '3.1.5',
 'Custodia de Historias Clínicas',
 'Resolución 1995/1999 / Resolución 2346/2007',
 'Contrato con IPS o médico con licencia para custodia reservada de historias clínicas ocupacionales.',
 ARRAY['60']::aplica_para_enum[], 1.0, 305),

('Hacer', '3.1.6',
 'Restricciones y recomendaciones médico laborales',
 'Decreto 1072/2015',
 'Procedimiento y registros de atención a restricciones, recomendaciones y reubicación laboral.',
 ARRAY['60']::aplica_para_enum[], 1.0, 306),

('Hacer', '3.1.7',
 'Estilos de vida y entornos saludables (controles tabaquismo, alcoholismo, farmacodependencia y otros)',
 'Decreto 1072/2015 Art. 2.2.4.6.24',
 'Programa de estilos de vida saludable con actividades documentadas y registros de participación.',
 ARRAY['60']::aplica_para_enum[], 1.0, 307),

('Hacer', '3.1.8',
 'Servicios de higiene: Suministro de agua potable, servicios sanitarios y disposición de basuras',
 'Resolución 2400/1979',
 'Inspección visual y registros del estado de baños, lavamanos, agua potable y manejo de residuos.',
 ARRAY['60']::aplica_para_enum[], 1.0, 308),

('Hacer', '3.1.9',
 'Eliminación adecuada de residuos sólidos, líquidos o gaseosos',
 'Resolución 2400/1979 / Decreto 1076/2015',
 'Programa de gestión de residuos, rutas de recolección y certificados de disposición final.',
 ARRAY['60']::aplica_para_enum[], 1.0, 309),

('Hacer', '3.2.1',
 'Reporte de los accidentes de trabajo y enfermedad laboral a la ARL, EPS y Dirección Territorial del Ministerio de Trabajo',
 'Resolución 156/2005 / Decreto 1072/2015',
 'FURAT/FUREL reportados dentro de los plazos legales a ARL, EPS y Mintrabajo cuando aplique.',
 ARRAY['21','60']::aplica_para_enum[], 2.0, 321),

('Hacer', '3.2.2',
 'Investigación de Incidentes, Accidentes de Trabajo y Enfermedades cuando sean diagnosticadas como Laborales',
 'Resolución 1401/2007',
 'Procedimiento y equipo investigador; actas y planes de acción de investigaciones realizadas.',
 ARRAY['21','60']::aplica_para_enum[], 2.0, 322),

('Hacer', '3.2.3',
 'Registro y análisis estadístico de Incidentes, Accidentes de Trabajo y Enfermedad Laboral',
 'Resolución 0312/2019 Art. 30',
 'Registros estadísticos consolidados de AT/EL con análisis de tendencias y causas.',
 ARRAY['60']::aplica_para_enum[], 1.0, 323),

('Hacer', '3.3.1',
 'Medición de la severidad de los Accidentes de Trabajo y Enfermedad Laboral',
 'Resolución 0312/2019 Art. 30',
 'Indicador anual de severidad calculado conforme a la norma.',
 ARRAY['21','60']::aplica_para_enum[], 1.0, 331),

('Hacer', '3.3.2',
 'Medición de la frecuencia de los Incidentes, Accidentes de Trabajo y Enfermedad Laboral',
 'Resolución 0312/2019 Art. 30',
 'Indicador anual de frecuencia calculado conforme a la norma.',
 ARRAY['21','60']::aplica_para_enum[], 1.0, 332),

('Hacer', '3.3.3',
 'Medición de la mortalidad de Accidentes de Trabajo y Enfermedad Laboral',
 'Resolución 0312/2019 Art. 30',
 'Indicador anual de mortalidad por AT/EL.',
 ARRAY['21','60']::aplica_para_enum[], 1.0, 333),

('Hacer', '3.3.4',
 'Medición de la prevalencia de incidentes, Accidentes de Trabajo y Enfermedad Laboral',
 'Resolución 0312/2019 Art. 30',
 'Indicador anual de prevalencia de EL.',
 ARRAY['60']::aplica_para_enum[], 1.0, 334),

('Hacer', '3.3.5',
 'Medición de la incidencia de Incidentes, Accidentes de Trabajo y Enfermedad Laboral',
 'Resolución 0312/2019 Art. 30',
 'Indicador anual de incidencia de EL.',
 ARRAY['60']::aplica_para_enum[], 1.0, 335),

('Hacer', '3.3.6',
 'Medición del ausentismo por incidentes, Accidentes de Trabajo y Enfermedad Laboral',
 'Resolución 0312/2019 Art. 30',
 'Indicador anual de ausentismo por causa médica.',
 ARRAY['21','60']::aplica_para_enum[], 1.0, 336),

-- ============================================================
-- II. HACER - 4. GESTIÓN DE PELIGROS Y RIESGOS (30%)
-- ============================================================
('Hacer', '4.1.1',
 'Metodología para la identificación, evaluación y valoración de peligros',
 'Decreto 1072/2015 Art. 2.2.4.6.15 / GTC 45',
 'Matriz de identificación de peligros, evaluación y valoración de riesgos actualizada con metodología documentada.',
 ARRAY['7','21','60']::aplica_para_enum[], 4.0, 401),

('Hacer', '4.1.2',
 'Identificación de peligros con participación de todos los niveles de la empresa',
 'Decreto 1072/2015 Art. 2.2.4.6.15',
 'Evidencia de participación de trabajadores y COPASST en la identificación de peligros.',
 ARRAY['21','60']::aplica_para_enum[], 4.0, 402),

('Hacer', '4.1.3',
 'Identificación y priorización de la naturaleza de los peligros (Metodología adicional, cancerígenos y otros)',
 'Decreto 1072/2015 / Resolución 2346/2007',
 'Identificación específica de peligros por naturaleza (físicos, químicos, biológicos, psicosociales, etc.).',
 ARRAY['60']::aplica_para_enum[], 3.0, 403),

('Hacer', '4.1.4',
 'Realización mediciones ambientales, químicas, físicas y biológicas',
 'Decreto 1072/2015 Art. 2.2.4.6.15',
 'Informes de mediciones higiénicas realizadas por laboratorio acreditado cuando aplique.',
 ARRAY['60']::aplica_para_enum[], 4.0, 404),

('Hacer', '4.2.1',
 'Se implementan las medidas de prevención y control de peligros',
 'Decreto 1072/2015 Art. 2.2.4.6.24',
 'Controles jerárquicos (eliminación, sustitución, ingeniería, administrativos, EPP) aplicados a los peligros priorizados.',
 ARRAY['7','21','60']::aplica_para_enum[], 2.5, 421),

('Hacer', '4.2.2',
 'Se verifica aplicación de las medidas de prevención y control',
 'Decreto 1072/2015',
 'Inspecciones, auditorías o verificaciones documentadas sobre la eficacia de controles implementados.',
 ARRAY['60']::aplica_para_enum[], 2.5, 422),

('Hacer', '4.2.3',
 'Hay procedimientos, instructivos, fichas, protocolos',
 'Decreto 1072/2015',
 'Procedimientos seguros de trabajo, instructivos y fichas de seguridad disponibles y divulgados.',
 ARRAY['60']::aplica_para_enum[], 2.5, 423),

('Hacer', '4.2.4',
 'Inspección con el COPASST o Vigía',
 'Resolución 2013/1986 / Decreto 1072/2015',
 'Cronograma y actas de inspecciones planeadas ejecutadas con el COPASST o Vigía.',
 ARRAY['60']::aplica_para_enum[], 2.5, 424),

('Hacer', '4.2.5',
 'Mantenimiento periódico de instalaciones, equipos, máquinas, herramientas',
 'Decreto 1072/2015',
 'Programa y registros de mantenimiento preventivo y correctivo de instalaciones y equipos.',
 ARRAY['60']::aplica_para_enum[], 2.5, 425),

('Hacer', '4.2.6',
 'Entrega de Elementos de Protección Personal EPP, se verifica con contratistas y subcontratistas',
 'Resolución 2400/1979 / Decreto 1072/2015',
 'Matriz de EPP, registros de entrega firmados y verificación de uso incluido contratistas.',
 ARRAY['60']::aplica_para_enum[], 2.5, 426),

-- ============================================================
-- II. HACER - 5. GESTIÓN DE AMENAZAS (10%)
-- ============================================================
('Hacer', '5.1.1',
 'Se cuenta con el Plan de Prevención, Preparación y Respuesta ante Emergencias',
 'Decreto 1072/2015 Art. 2.2.4.6.25 / Decreto 2157/2017',
 'Plan de emergencias documentado con análisis de amenazas, vulnerabilidad, rutas de evacuación y MEDEVAC.',
 ARRAY['21','60']::aplica_para_enum[], 5.0, 501),

('Hacer', '5.1.2',
 'Brigada de prevención conformada, capacitada y dotada',
 'Decreto 1072/2015 Art. 2.2.4.6.25',
 'Acta de conformación de brigada, plan de capacitación, registros de simulacros y dotación entregada.',
 ARRAY['21','60']::aplica_para_enum[], 5.0, 502),

-- ============================================================
-- III. VERIFICAR - 6. VERIFICACIÓN DEL SG-SST (5%)
-- ============================================================
('Verificar', '6.1.1',
 'Indicadores estructura, proceso y resultado',
 'Decreto 1072/2015 Art. 2.2.4.6.19 a 2.2.4.6.22',
 'Fichas técnicas y seguimiento a indicadores de estructura, proceso y resultado del SG-SST.',
 ARRAY['60']::aplica_para_enum[], 1.25, 601),

('Verificar', '6.1.2',
 'Las empresa adelanta auditoría por lo menos una vez al año',
 'Decreto 1072/2015 Art. 2.2.4.6.29',
 'Programa de auditoría interna anual, informes y planes de acción.',
 ARRAY['60']::aplica_para_enum[], 1.25, 602),

('Verificar', '6.1.3',
 'Revisión anual por la alta dirección, resultados y alcance de la auditoría',
 'Decreto 1072/2015 Art. 2.2.4.6.31',
 'Acta de revisión por la dirección con resultados y decisiones tomadas.',
 ARRAY['60']::aplica_para_enum[], 1.25, 603),

('Verificar', '6.1.4',
 'Planificación auditorías con el COPASST',
 'Decreto 1072/2015 Art. 2.2.4.6.30',
 'Programa de auditorías firmado con el COPASST y evidencia de su participación.',
 ARRAY['60']::aplica_para_enum[], 1.25, 604),

-- ============================================================
-- IV. ACTUAR - 7. MEJORAMIENTO (10%)
-- ============================================================
('Actuar', '7.1.1',
 'Definir acciones de Promoción y Prevención con base en resultados del Sistema de Gestión de Seguridad y Salud en el Trabajo SG-SST',
 'Decreto 1072/2015 Art. 2.2.4.6.33',
 'Plan de acción con actividades de P y P definidas a partir de los resultados del SG-SST.',
 ARRAY['60']::aplica_para_enum[], 2.5, 701),

('Actuar', '7.1.2',
 'Toma de medidas correctivas, preventivas y de mejora',
 'Decreto 1072/2015 Art. 2.2.4.6.34',
 'Matriz/plan de acciones correctivas y preventivas con responsables, fechas y seguimiento.',
 ARRAY['60']::aplica_para_enum[], 2.5, 702),

('Actuar', '7.1.3',
 'Ejecución de acciones preventivas, correctivas y de mejora de la investigación de incidentes, accidentes de trabajo y enfermedad laboral',
 'Resolución 1401/2007 / Decreto 1072/2015',
 'Seguimiento a la ejecución de planes de acción derivados de investigaciones de AT/EL.',
 ARRAY['60']::aplica_para_enum[], 2.5, 703),

('Actuar', '7.1.4',
 'Implementar medidas y acciones correctivas solicitadas por autoridades y ARL',
 'Decreto 1072/2015',
 'Evidencia de atención a requerimientos de Mintrabajo, ARL u otras autoridades competentes.',
 ARRAY['60']::aplica_para_enum[], 2.5, 704)

ON CONFLICT (item) DO UPDATE SET
    ciclo_phva           = EXCLUDED.ciclo_phva,
    descripcion_estandar = EXCLUDED.descripcion_estandar,
    marco_legal          = EXCLUDED.marco_legal,
    modo_verificacion    = EXCLUDED.modo_verificacion,
    aplica_para          = EXCLUDED.aplica_para,
    peso                 = EXCLUDED.peso,
    orden                = EXCLUDED.orden,
    activo               = true,
    updated_at           = now();
