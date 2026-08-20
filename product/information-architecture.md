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
│   │   ├── Mis partidos (Recientes + Todos)
│   │   │   └── Detalle de ProviderMatch
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

### Layout

La app autenticada (fuera de onboarding) usa un marco único:

```text
sidebar izquierda | command bar + contenido con scroll + action bar opcional
```

Regiones de la sidebar (scroll independiente del contenido central):

1. **Header sticky:** fila de cuenta (avatar + nombre abreviado + colapsar) y selector de contexto.
2. **Content (scroll):** tareas del espacio activo (placeholder hasta que existan colas de dominio).
3. **Footer sticky:** navegación General (Inicio, Competiciones, …).

Desktop admite colapso a **icon rail** (focus mode); el control de colapso vive en el header de la sidebar. Mobile usa Sheet con las mismas regiones.

El command bar muestra la identidad del jugador (identificador de juego y club seleccionado) y acciones contextuales (stubs cuando el handler aún no existe). La action bar inferior solo aparece cuando una página registra acciones.

### Selector de contexto (único)

Un control en el header de la sidebar agrupa:

- **Espacio personal**
- **Competiciones** (accesibles al actor)
- **Clubes EA** (asociaciones del PlayerProfile + Añadir club). Elegir un club deja el espacio personal activo y fija el `ExternalClub` de contexto: Mis partidos consulta solo ese club.
- **Organización** (memberships + Crear organización)

Solo un ítem está activo. El club elegido es el ítem activo del espacio personal. El valor inicial sigue el `ONBOARDING_PATH` completado:

- `player` → Espacio personal
- `organization` → organización creada
- `invitation` → competición de la invitación

Visitas posteriores pueden recordar la última selección en el cliente. La URL y el selector se mantienen alineados.

### Onboarding autenticado

Después del registro, el usuario pasa directamente por onboarding: al ser una cuenta nueva no se
consulta estado previo ni membresías. Después del login, la plataforma consulta primero
`actor_onboarding`; si está incompleto vuelve al onboarding y, solo si está completo, consulta
membresías para resolver el destino. En onboarding puede:

- crear una organización y una primera competición en borrador;
- aceptar una invitación a una competición y navegar directamente a ella;
- continuar como jugador hacia `/player` sin organización.

Los tres caminos aseguran un perfil personal de jugador. El identificador de EA es opcional y se
configura en el paso **Cuenta** o posteriormente desde Datos de juego. Los recorridos son:

- Organizador: Intención → Organización → Competición → Cuenta → Confirmar.
- Invitación: Intención → Invitación → Cuenta → Confirmar.
- Jugador: Intención → Cuenta → Club → Confirmar.

El paso **Club** permite asociar un `ExternalClub` al `PlayerProfile`. Más asociaciones se
añaden después desde el selector de contexto. Es opcional y no crea un
Team de competición, una inscripción ni una membresía de plantilla. `/onboarding/club` es la ruta
canónica. `/onboarding/team` solo redirige para recuperar sesiones o marcadores anteriores.

La competición inicial solicita identidad, edición, plataforma, región, timezone y formato, nace
como `draft` con reglas seguras y continúa en su pantalla de configuración. No se publican equipos,
stages ni fixture durante onboarding.

La tercera opción completa y persiste el onboarding personal; no requiere invitación y deja
disponibles las otras dos opciones para más adelante. El estado se consulta en cada entrada a
`/player`: un actor incompleto vuelve a `/onboarding`, mientras que un actor completo y sin
membresías usa `/player` como destino posterior al acceso.

### Espacio personal del jugador

Es el destino posterior al onboarding cuando el usuario elige continuar como jugador. No requiere
crear una organización ni aceptar una invitación.

**General (personal):** Inicio · Competiciones · Clubes EA · Invitaciones.

- **Inicio personal:** resumen de partidos recientes, estadísticas destacadas y estado de vinculación de la cuenta de juego.
- **Mis partidos:** una lista de `ProviderMatch` del `ExternalClub` seleccionado en el selector de contexto (requiere `PlayerExternalClubAssociation`; si hay varios, el primero hasta que el jugador elija otro). Recientes = últimos 7 días de calendario; Todos = el conjunto que trae el proveedor. Recientes y Todos marcan el tipo de partido (liga, playoff, amistoso) y las tarjetas de la aparición cuando el jugador alineó con ese club. Si no alineó con ese club (identificador en el rival o ausente del partido), la fila permanece con el badge «No jugaste» y sin estadísticas personales; el marcador y el W/D/L siguen el club seleccionado. Un badge de hat-trick, póker o repóker aparece cuando la aparición del club seleccionado tiene 3, 4 o 5+ goles. El historial oficial no vive aquí: está en Mis estadísticas y en `GET /players/me/matches`.
- **Detalle de partido personal:** `/player/matches/:providerKey/:externalMatchId` abre desde una fila de Mis partidos y conserva `view` y `sort` al volver. Busca solo en la misma ventana final de 50 `ProviderMatch`: no es un registro persistido ni un acceso directo del proveedor. Un breadcrumb (Mis partidos → clubes) sustituye el enlace de volver; debajo reutiliza la misma fila de marcador de Mis partidos, sin el enlace de abrir el partido ni la franja de aparición. La fila puede aparecer desde la caché de la lista, pero el detalle consulta su recurso para obtener las plantillas completas. Debajo, pestañas tipo pills cubren Resumen (comparación de equipos, rendimiento personal y destacados), Jugadores (plantillas) y Datos del partido. Presenta primero el club seleccionado y después el rival; dentro de cada plantilla ordena por rating descendente, deja ratings desconocidos al final y muestra todas las estadísticas persistidas sin convertir `null` en cero. Si el jugador participó, el resumen muestra su rendimiento; si no participó, la fila y el panel de rendimiento indican «No jugaste» sin destacar una fila. Una identidad inválida o ausente usa un estado `not_found`; una ventana parcial incompleta conserva el error recuperable del proveedor.
- **Mis estadísticas:** solo agregados oficiales.
- **Competiciones / Clubes EA:** listados; al abrir una entidad se activa el grupo Contexto.
- **Datos de juego:** vincular o actualizar identificador de jugador (subdestino desde Clubes EA o perfil).
- **Invitaciones:** aceptar una invitación o crear una organización como acciones secundarias.

La vista personal no muestra disputas, payloads EA crudos, tokens ni datos administrativos de organizaciones en las que el actor no sea miembro.

### Navegación de organización (General)

- Inicio
- Competiciones
- Equipos
- Jugadores
- Invitaciones
- Organización (miembros, roles)
- Ajustes

### Navegación dentro de competición (Contexto activo)

| Destino         | Propósito                                       |
| --------------- | ----------------------------------------------- |
| Resumen         | Estado operativo, pendientes, salud EA resumida |
| Calendario      | Enfrentamientos programados                     |
| Enfrentamientos | Detalle operativo del Encounter                 |
| Clasificación   | Tabla oficial                                   |
| Bracket         | Eliminación (si aplica)                         |
| Rankings        | Goleadores, asistencias, rating, rendimiento    |
| Equipos         | Inscripciones y plantillas                      |
| Disputas        | Desacuerdos y revisión                          |
| Analíticas      | Premium / operativa                             |
| Reglamento      | Reglamento y configuración                      |

Mobile: Sheet con la misma sidebar; nada crítico solo en sidebar oculta (selector accesible).

### Menú de cuenta

En la cabecera de la sidebar: Perfil · Enviar feedback · Contáctanos · Configuración · Cerrar sesión.

La navegación General vive en el footer sticky de la sidebar.

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

Equipos → crear/editar Team → buscar club EA → seleccionar asociación operativa → gestionar inscripción. La selección no verifica cuenta ni propiedad.

### Reprogramación

Encounter → solicitar cambio (encuentro o partido) → rival responde → aceptación actualiza horarios → notificaciones.

### Oficialización

Sync EA → candidatos → capitán asigna → preview → rival confirma → aprobado → proyecciones.

### Registro de jugador independiente

Registro → onboarding → continuar como jugador → vincular identificador de juego y club externo (ambos opcionales) → confirmar → crear o asegurar el perfil personal → espacio personal → consultar Recientes (si hay club asociado) y Oficiales/estadísticas cuando existan → aceptar invitación o crear organización más adelante.

### Acceso de usuario existente

Login → consultar `actor_onboarding` → si está incompleto, onboarding → si está completo, consultar
membresías → resolver espacio personal, organización única o selector de organizaciones.

## 7. Portal público

Sin sidebar administrativo. Header de competición + tabs horizontales sticky. Solo contenido publicado. Deep links a enfrentamientos muestran proyección pública, nunca candidatos internos ni acciones de capitán.

## 8. Estados vacíos y permisos

- Ruta no aplicable al formato: omitir.
- Ruta aplicable sin datos: empty state con siguiente acción.
- Jugador sin club asociado en Mis partidos: empty state para asociar un club; el identificador de juego no alcanza.
- Jugador sin partidos recientes y con partidos más antiguos: empty de Recientes con acción hacia Todos.
- Jugador sin partidos oficiales: empty state en Mis estadísticas que explica que aparecen al aprobar un resultado que coincida; no se exige invitación.
- Sin permiso: 403 con salida segura; no disfrazar como vacío.
