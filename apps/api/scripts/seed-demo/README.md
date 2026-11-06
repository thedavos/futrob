# Seed demo

Cuentas y datos demo para probar los flujos de Futrob en local (web y móvil).

```bash
npm run seed:demo -w @futrob/api              # falla si ya hay datos demo
npm run seed:demo -w @futrob/api -- --reset   # borra lo demo y vuelve a sembrar
npm run seed:demo -w @futrob/api -- --reset-only
```

- Usa `DATABASE_URL` de `apps/api/.env` y aplica las mismas reglas de negocio que la API:
  monta `apps/api` en proceso y llama a `/api/v1` con el SDK. No hace falta tener la API
  levantada.
- Se niega a correr con `NODE_ENV=production` o contra un host de Railway.
- Contraseña de **todas** las cuentas: `Test123`. Los emails son `<cuenta>@demo.futrob.test`.
  Se insertan con el mismo hash scrypt de Better Auth porque el registro exige 8 caracteres;
  el login no valida la longitud.
- `--reset` borra solo lo demo: organizaciones creadas por actores demo, filas que apuntan
  a actores demo, partidos EA con prefijo `7770` y las cuentas `@demo.futrob.test`.
- Las fechas son relativas al momento del seed. Pasados unos días, «Recientes» y los
  plazos dejan de cuadrar: vuelve a sembrar con `--reset`.

## Cuentas

| Cuenta                  | Para probar                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `superadmin`            | Superusuario: roles y planes de organizaciones                                         |
| `nuevo`                 | Registrado sin onboarding: el login entra al onboarding                                |
| `onb-org-pausado`       | Onboarding de organizador detenido en «cuenta de juego»                                |
| `onb-invitacion`        | Onboarding por invitación detenido; el seed imprime el enlace                          |
| `jugador-solo`          | Espacio personal con 2 clubes: hat-trick, póker, repóker, tarjetas, «no jugó»          |
| `jugador-sin-club`      | Espacio personal vacío (sin cuenta EA ni club)                                         |
| `espectador`            | Sin membresías: exploración y portal público                                           |
| `premium`               | Add-on Jugador Premium activo                                                          |
| `org-free`              | Barrio FC (Free) al límite: 1 competición, 12 equipos, cupo de sync agotado            |
| `org-pro`               | Liga Andina (Pro) con 5/5 competiciones activas                                        |
| `org-liga`              | Mega Liga (plan Liga): 36 equipos inscritos y una competición pausada                  |
| `staff`                 | Staff de Liga Andina (entró por invitación)                                            |
| `multi-rol`             | Organizador de Club Multi (Pro en prueba), staff en Liga Andina, capitán en Mundialito |
| `capitan-local`         | Capitana de Cóndores FC: elegir partidos, esperar confirmación, reprogramar            |
| `capitan-visita`        | Capitán de Atlético Pumas: confirmar, disputar, responder contrapropuestas             |
| `subcapitan`            | Subcapitán de Cóndores FC                                                              |
| `capitan-sin-ea`        | Capitán de Halcones Sin Club (Apertura), sin club EA conectado                         |
| `invitado`              | Invitaciones pendientes de plantilla (Cóndores) e inscripción (Apertura)               |
| `invit-vencida`         | Invitación de plantilla vencida e invitación de inscripción revocada                   |
| `jugador01`…`jugador24` | Plantillas de Liga Andina; el primero de cada trío es capitán                          |
| `barrio01`…`barrio12`   | Capitanes de Barrio FC                                                                 |

`superadmin@` recibe el rol directamente, así que el seed funciona aunque la base ya tenga otros
superusuarios. `--reset` solo quita el suyo: los administradores existentes se conservan.

## Competiciones

| Organización               | Competición            | Formato                             | Estado                                                     |
| -------------------------- | ---------------------- | ----------------------------------- | ---------------------------------------------------------- |
| Liga Andina (Pro)          | Copa Borrador          | Liga                                | `draft` con reglas, sin participantes                      |
| Liga Andina                | Apertura Inscripciones | Liga                                | `registration`: aprobadas, pendientes, rechazada           |
| Liga Andina                | Clausura 26            | Liga, 2 partidos, marcador agregado | En curso (ver abajo)                                       |
| Liga Andina                | Copa Relámpago         | Eliminación directa                 | Cuartos jugados, un empate espera al organizador           |
| Liga Andina                | Mundialito             | Grupos + eliminación                | Grupos y semifinales jugados, final por jugar              |
| Liga Andina                | Torneo Verano 25       | Liga + playoffs                     | `finished`                                                 |
| Liga Andina                | Archivo 24             | Liga                                | `archived`                                                 |
| Barrio FC (Free)           | Liga Barrio            | Liga, 12 equipos                    | Dos jornadas oficiales                                     |
| Mega Liga (Liga)           | Superliga              | Grupos + eliminación                | `registration`, 30 aprobadas / 4 pendientes / 2 rechazadas |
| Mega Liga                  | Liga Pausada           | Liga                                | `paused`                                                   |
| Club Multi (Pro en prueba) | Copa Amigos            | Eliminación directa                 | `draft`                                                    |

`finished`, `archived` y `paused` se escriben por SQL: aún no hay comando de producto.
También por SQL: el cupo de sync agotado de Barrio FC, el add-on Premium (sin endpoint) y la
fecha de la invitación vencida (el módulo de equipos no usa el reloj inyectado).

> **Bug conocido:** rechazar una inscripción devuelve `rejected` pero en Postgres se queda
> `pending`. El upsert de `competition-entry.repositories.ts` solo permite pasar de
> `pending` a `approved`. Por eso Apertura y Superliga muestran las inscripciones
> «rechazadas» como pendientes hasta que se corrija.

### Clausura 26

- Jornadas 1–3: oficiales (una con alternativa del rival aprobada por el organizador, una
  anulada por el organizador).
- Jornada 4 (hace 9 días): Cóndores con 5 partidos EA sin selección; Pumas con disputa
  abierta; una disputa en revisión; una confirmación vencida en revisión del organizador.
- Jornada 5 (hace 2 días): Cóndores propuso y espera (vence en ~4 h); Pumas debe
  confirmar; un enfrentamiento sin datos de EA; una disputa resuelta por el organizador.
- Jornada 6: reprogramación abierta (Cóndores), negociación con contrapropuestas (Pumas
  debe responder), una aceptada y aplicada, una vencida y escalada al organizador.
- Jornada 7: reprogramación aplicada solo al partido oficial 2.

## EA falso («Mis partidos» y syncs desde la UI)

«Mis partidos» y los syncs consultan EA en vivo, y los clubes demo no existen en EA.
Para verlos, levanta el EA demo y apunta la API a él:

```bash
npm run demo:ea -w @futrob/api
# apps/api/.env
EA_CLUBS_BASE_URL=http://localhost:8790/api/fc
```

Responde con los datos de `apps/api/.demo/ea-world.json` (los escribe el seed) y reenvía
cualquier otro club al EA real. Quita la variable para volver al EA real.

## Fuera del seed

- Jobs de sync `dead` y salud del proveedor degradada: el circuit breaker de EA es global
  por endpoint, y forzar fallos bloquearía las llamadas reales a EA en local.
- Correlación `ambiguous` de jugadores EA (sí hay `matched` y `unmatched`).
