# Plantilla y convenciones

Inspecciona `docs/adr/README.md` y los archivos existentes antes de asignar un número.
Usa `NNNN-descripcion-breve.md`, siguiendo el idioma y los nombres del registro.
No reutilices IDs históricos ni reserves números para propuestas todavía no creadas.

La plantilla siguiente es una estructura de redacción, no contenido listo para aceptar.
Sustituye los campos entre llaves y omite metadatos o secciones que no correspondan.

```markdown
# ADR-{NNNN}: {elección concreta}

- Estado: Propuesta
- Fecha: {fecha real de creación}
- Actualizada: {solo al revisar una decisión existente}
- Relacionado: {enlaces a decisiones relacionadas}
- Reemplaza: {solo si hay sustitución; especificar alcance parcial si corresponde}
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

{Problema, comportamiento afectado y restricciones verificables.
Referencias a requisitos o tareas que motivan la decisión.}

## Decisión propuesta

{Qué se propone, quién posee el comportamiento y dónde se aplica.
Garantías observables y límites. Distinguir lo elegido de lo pendiente.}

## Consecuencias

{Beneficios, costes, fallos relevantes, impacto en clientes y operación.
Compatibilidad o transición necesaria si cambia un contrato existente.}

## Alternativas consideradas

{Opciones viables y razones concretas a favor/en contra.
No inventar evaluaciones o benchmarks que no se realizaron.}

## Cuestiones pendientes

{Elecciones materiales sin resolver y evidencia necesaria para resolverlas.
Omitir si no hay ninguna; no añadir un trámite artificial de aprobación.}

## Estado de implementación y evidencia

{Qué existe, qué falta y qué se comprobó realmente.}

- {Enlace a contrato, composición o adapter relevante.}
- {Prueba pertinente y si se ejecutó durante el trabajo.}
```

## Adaptación al estado

Para una decisión ya aceptada, usa `Estado: Aceptada` y `## Decisión`, explicando la
base de esa aceptación. Puede ser la instrucción explícita del usuario o la formalización
autorizada de una decisión existente con evidencia. No atribuyas una aprobación a una
persona ni inventes fechas. Una aceptación no implica despliegue.

Para un registro reemplazado, conserva ID, fecha y archivo; añade `Reemplazada por`
con enlace y una nota de alcance antes del contenido histórico. La decisión sucesora
debe enlazar de vuelta. Una sustitución parcial necesita redacción específica; no basta
con intercambiar el estado de toda la página.

## Índice y enlaces

Añade o modifica la fila del índice con título, estado y alcance de implementación.
Actualiza conteos si existen. Los enlaces internos de un ADR parten de `/docs/`,
`/product/`, `/apps/` o `/packages/` según corresponda; verifica el archivo destino.
Enlaza la tarea Notion que motivó el cambio cuando haya sido consultada.

Prefiere referencias a símbolos y archivos actuales frente a números de línea que
envejecen. Los documentos del registro no deben contener rutas absolutas de una máquina
como `/Users/...`. En una respuesta al usuario sí utiliza enlaces locales absolutos.

## Nivel de detalle

Una decisión simple puede resolverse en pocos párrafos. Para consistencia o seguridad,
explica el fallo y su tratamiento: ownership, límite transaccional, idempotencia,
confianza en identidad o aislamiento cuando apliquen. No copies el algoritmo completo,
manuales del proveedor ni instrucciones de arranque que ya tienen un README.
