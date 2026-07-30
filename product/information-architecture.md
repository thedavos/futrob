# Futrob — Arquitectura de información

**Objetivo:** estructura coherente entre landing, aplicación operativa y portal público para el MVP centrado en FC Clubs y datos EA.

**Fuente:** [prd.md](/product/prd.md)

## 1. Principios

1. **Organización → competición → operación.** El shell deja claro el contexto activo.
2. **Enfrentamiento como centro operativo.** Calendario, partidos oficiales, candidatos EA, selección, reprogramación, disputa y auditoría se conectan desde un `Encounter` identificable.
3. **Una estructura competitiva, una modalidad piloto.** FC Clubs define labels y datos; futuras modalidades no deben forzar otra navegación base.
4. **Operar y observar son experiencias distintas.** La app autenticada privilegia excepciones y acciones; el portal privilegia seguimiento.
5. **Profundidad máxima práctica de tres niveles.** Organización, competición y recurso; tabs dentro del recurso para el resto.
6. **Estado preservado.** Volver del detalle conserva búsqueda, filtros, vista y scroll.

## 2. Mapa global

```text
Futrob
├── Landing pública
│   ├── Producto
│   ├── Cómo funciona (EA → candidatos → selección → oficial)
│   ├── Para organizadores / capitanes
│   └── CTA de acceso
├── Autenticación
├── Aplicación autenticada
│   ├── Espacio personal del jugador
│   │   ├── Mis partidos
│   │   ├── Mis estadísticas
│   │   ├── Datos de juego
│   │   └── Invitaciones y organizaciones
│   ├── Inicio de organización
│   ├── Competiciones
│   ├── Equipos y jugadores de organización
│   ├── Notificaciones
│   ├── Organización / roles
│   └── Configuración personal
├── Superusuario (plataforma)
└── Portal público de competición
    ├── Portada
    ├── Información y reglamento
    ├── Equipos y plantillas públicas
    ├── Calendario / próximos enfrentamientos
    ├── Resultados
    ├── Tabla
    ├── Bracket
    ├── Rankings
    └── Perfiles públicos
```

## 3. Landing

Debe demostrar en pocos scrolls: Futrob opera competiciones EA SPORTS FC Clubs, obtiene partidos desde EA, deja que los capitanes elijan cuáles cuentan y publica resultados confiables.

### Header

- Logo Futrob.
- Anclas: Producto, Cómo funciona, Ejemplo público.
- Acciones: Iniciar sesión, Crear competición.

### Hero

- Marca Futrob como señal dominante.
- Una promesa: operación completa de ligas/copas Clubs con datos EA.
- Una frase de apoyo sobre selección auditable de partidos oficiales.
- CTA primaria: crear competición; secundaria: ver competición pública.
- Visual dominante del producto (Match Center / candidatos), no collage de cards.

### Secciones siguientes (una job por sección)

1. Flujo EA → candidatos → selección → confirmación.
2. Reprogramación controlada.
3. Rankings y portal para espectadores.
4. CTA final.

## 4. Shell autenticado

### Onboarding autenticado

Después del registro, el usuario pasa directamente por onboarding: al ser una cuenta nueva no se
consulta estado previo ni membresías. Después del login, la plataforma consulta primero
`actor_onboarding`; si está incompleto vuelve al onboarding y, solo si está completo, consulta
membresías para resolver el destino. En onboarding puede:

- crear una organización;
- aceptar una invitación;
- continuar como jugador hacia `/player` sin organización.

La tercera opción completa y persiste el onboarding personal; no requiere invitación y deja
disponibles las otras dos opciones para más adelante. El estado se consulta en cada entrada a
`/player`: un actor incompleto vuelve a `/onboarding`, mientras que un actor completo y sin
membresías usa `/player` como destino posterior al acceso.

### Espacio personal del jugador

Es el destino posterior al onboarding cuando el usuario elige continuar como jugador. No requiere
crear una organización ni aceptar una invitación.

- **Inicio personal:** resumen de partidos recientes, estadísticas destacadas y estado de vinculación de la cuenta de juego.
- **Mis partidos:** historial individual ordenado por fecha, competición, equipo y resultado; solo partidos permitidos por la proyección personal.
- **Mis estadísticas:** goles, asistencias, rating, MVP y otras métricas disponibles; se distingue dato oficial de dato incompleto.
- **Datos de juego:** vincular o actualizar identificador de jugador, plataforma y edición.
- **Invitaciones y organizaciones:** aceptar una invitación o crear una organización como acciones secundarias.

La vista personal no muestra disputas, payloads EA crudos, tokens ni datos administrativos de organizaciones en las que el actor no sea miembro.

### Navegación de organización

- Inicio
- Competiciones
- Equipos
- Jugadores
- Notificaciones
- Organización (miembros, roles)
- Ajustes

### Navegación dentro de competición

| Destino            | Propósito                                       |
| ------------------ | ----------------------------------------------- |
| Overview           | Estado operativo, pendientes, salud EA resumida |
| Fixture / Jornadas | Enfrentamientos programados                     |
| Match Center       | Detalle operativo del Encounter                 |
| Standings          | Tabla oficial                                   |
| Bracket            | Eliminación (si aplica)                         |
| Rankings           | Goleadores, asistencias, rating, rendimiento    |
| Teams / Rosters    | Inscripciones y plantillas                      |
| Disputes           | Desacuerdos y revisión                          |
| Analytics          | Premium / operativa                             |
| Rules / Settings   | Reglamento y configuración                      |

Mobile: hasta cinco destinos frecuentes + “Más”.

## 5. Match Center (recurso central)

Ruta conceptual: `/orgs/:orgId/competitions/:competitionId/encounters/:encounterId`

### Cabecera

- Ambos Teams, jornada/ronda, horario (zona de competición), estado del Encounter.
- Acciones según permiso: reprogramar, proponer selección, confirmar, escalar, anular.

### Tabs / secciones

1. **Overview** — resumen de serie (independiente o agregado) y próximos pasos.
2. **Official matches** — slots 1..N con horario propio y estado.
3. **EA candidates** — lista de partidos EA con stats y asignación a slots.
4. **Selection** — propuesta, preview, confirmaciones.
5. **Schedule** — historial de reprogramaciones.
6. **Stats** — estadísticas oficiales cuando existan.
7. **Dispute / History** — disputas y auditoría (permiso).

## 6. Flujos críticos

### Inscripción y club EA

Equipos → crear/editar Team → buscar club EA → seleccionar → esperar aprobación del organizador.

### Reprogramación

Encounter → solicitar cambio (encuentro o partido) → rival responde → aceptación actualiza horarios → notificaciones.

### Oficialización

Sync EA → candidatos → capitán asigna → preview → rival confirma → aprobado → proyecciones.

### Registro de jugador independiente

Registro → onboarding → continuar como jugador → crear perfil personal → vincular identificador de juego (opcional en el primer paso) → espacio personal → consultar partidos/estadísticas cuando existan → aceptar invitación o crear organización más adelante.

### Acceso de usuario existente

Login → consultar `actor_onboarding` → si está incompleto, onboarding → si está completo, consultar
membresías → resolver espacio personal, organización única o selector de organizaciones.

## 7. Portal público

Sin sidebar administrativo. Header de competición + tabs horizontales sticky. Solo contenido publicado. Deep links a enfrentamientos muestran proyección pública, nunca candidatos internos ni acciones de capitán.

## 8. Estados vacíos y permisos

- Ruta no aplicable al formato: omitir.
- Ruta aplicable sin datos: empty state con siguiente acción.
- Jugador sin partidos vinculados: empty state que permite configurar o revisar su identificador de juego; no se exige invitación.
- Sin permiso: 403 con salida segura; no disfrazar como vacío.
