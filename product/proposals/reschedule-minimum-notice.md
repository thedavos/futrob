# Propuesta: antelación mínima de reprogramación

**Estado:** fronteras validadas el 2026-10-12. No implementada. Sin ID DEC en
[open-decisions.md](/product/open-decisions.md).
**Tarea:** 6. Precisar `minimumRescheduleNoticeHours`.
**Validación:** responsable de producto, este hilo. Se adoptan las respuestas
recomendadas de la §11.
**Checkout observado:** `github/main` @ `79776dd6`.
**Fuera de este corte:** DEC-032, DEC-033 y cualquier cambio a
[open-decisions.md](/product/open-decisions.md) o
[scheduling-reschedule-negotiation.md](/docs/architecture/scheduling-reschedule-negotiation.md).

Este archivo es el contrato de las pruebas del desarrollo posterior. Cada vector usa
instantes literales y un resultado concreto. No se escriben tests sobre este texto.

## 1. La regla en lenguaje sencillo

El reglamento de cada etapa ya pide un aviso mínimo en horas. Hoy ese número se guarda
y no se aplica.

La regla validada es esta:

> No puedes cambiar un horario que todavía no ha llegado si faltan menos de N horas
> para ese horario. Tampoco puedes dejar el nuevo horario a menos de N horas vista.
> Exactamente N horas cuenta. Un milisegundo menos, no. Si el horario actual ya pasó
> y el slot sigue pendiente, solo se exige el aviso del nuevo horario. Rechazar no
> mira esta regla. Aceptar sí, otra vez, con el reloj de ese momento.

Ejemplo corto. Aviso de 12 horas. El partido está el 13 de octubre a las 20:00 UTC.
A las 08:00:00.000 UTC del mismo día todavía puedes proponer un cambio a una fecha
lejana. A las 08:00:00.001 UTC ya no. Si el partido actual es en una semana pero
propones jugar en 1 hora, también se bloquea.

## 2. Qué hay hoy

Observado en este checkout:

- Competitions guarda `minimumRescheduleNoticeHours` por etapa. Entero `>= 0`.
  Default de alta de draft: `12`. La UI lo etiqueta «Aviso mínimo (horas)».
- Scheduling lo lee como `minimumNoticeHours` en `CompetitionRescheduleRulesPort`.
  El port dice que la semántica de aplicación no está decidida.
- Crear y contraproponer ya exigen fecha futura, distinta de la actual y en la zona
  de la competición. Código
  `scheduling.invalid_schedule_change_date`. HTTP 400.
- El aceptar que aplica el horario vuelve a exigir que la fecha aceptada siga en el
  futuro. Si ya pasó, la solicitud queda `open` y el horario no cambia.
- Las reglas se releen en cada comando. No se congelan en la solicitud. Validado el
  2026-10-05 en el corte de negociación.
- Rechazar no mueve el horario.
- La edición auditada del fixture (`encounters.schedule.manage`) es otro camino. No
  pasa por `ScheduleChangeRequest`.

El hueco abierto está escrito en la arquitectura de negociación: antelación respecto
del horario actual, del propuesto o de ambos. [#107](https://github.com/thedavos/futrob/issues/107)
deja la antelación mínima pendiente y pide no inventar la regla al implementar.

Fuentes: [prd.md](/product/prd.md) §6–11, [mvp-requirements.md](/product/mvp-requirements.md)
FR-08 y FTR-SCH-001…003, [domain-glossary.md](/product/domain-glossary.md) §6,
[acceptance-criteria.md](/product/acceptance-criteria.md) AC-SCH-001 y AC-SCH-002,
DEC-030, DEC-031 y DEC-034 en [open-decisions.md](/product/open-decisions.md).

## 3. Las tres lecturas

N es `minimumRescheduleNoticeHours` de la etapa vigente. El reloj es el de la API
(`ClockPort`) al ejecutar el comando. La holgura es una duración exacta de
`N × 3_600_000` milisegundos. No son horas de calendario ni la hora del cliente.

Un instante objetivo `T` cumple el aviso si y solo si
`T.getTime() - now.getTime() >= N × 3_600_000`.
En el milisegundo exacto del límite, cumple. Un milisegundo después, no.

| Opción | Qué mira | Qué evita | Qué deja pasar |
| --- | --- | --- | --- |
| **A. Solo actual** | Cada horario vigente que el alcance movería. | Cancelar un partido que empieza pronto. | Proponer un partido nuevo dentro de N horas si el actual está lejos. |
| **B. Solo propuesto** | El horario nuevo, y cada slot que resultaría de aplicarlo. | Citar a los equipos con menos de N horas. | Cancelar el partido de esta noche y moverlo a la semana que viene. |
| **C. Ambos** | A y B a la vez. | Los dos abusos. | Nada de lo anterior, salvo el caso «horario actual ya pasado» de la §5. |

A y B no son equivalentes. Un mismo comando puede cumplir una y fallar la otra.
Los vectores V6-07 y V6-08 lo muestran.

## 4. Decisión validada

**Opción C**, con estas fronteras. Validada el 2026-10-12.

1. **Aviso del actual.** Si un slot que el alcance movería tiene horario vigente
   `T_actual > now`, exige `T_actual - now >= N horas`.
2. **Aviso del propuesto.** El `proposedStartAt` y cada horario resultante de un
   slot movido deben cumplir `T_nuevo - now >= N horas`.
3. **Horario actual ya pasado o igual a `now`.** No se exige el aviso del actual.
   Sigue el aviso del propuesto y la regla ya vigente «la fecha nueva debe ser
   futura y distinta». Así un Encounter pendiente que se pasó de hora todavía se
   puede mover a una cita con aviso.
4. **Inclusivo en el límite.** Exactamente N horas cumple.
5. **Cero desactiva el aviso.** `N = 0` no aplica ni el aviso del actual ni el del
   propuesto. Quedan la fecha futura, la diferencia con la actual y el resto de
   guardias (reprogramación permitida, cupo, slot protegido, resultado aprobado).
6. **Mismo camino para capitán, rival y organizador** dentro de
   `ScheduleChangeRequest`. No hay bypass silencioso al aceptar como organizador.
7. **La edición auditada del fixture queda fuera.** El organizador que deba imponer
   un horario de emergencia usa ese camino, no esta negociación.
8. **Se revalida al aplicar.** Crear, contraproponer y aceptar leen el N vigente y
   el reloj de ese comando. Un acuerdo tardío puede fallar aunque la solicitud se
   abriera a tiempo.

Por qué C y no A. En Clubs hay que juntar plantilla. Una cita a 45 minutos vista
es un abuso aunque el partido original sea la semana que viene. A lo permite.

Por qué C y no B. B permite retirar el partido de esta noche cuando los equipos
ya están convocados. Eso es el caso clásico de «antelación mínima».

Por qué el hueco del horario pasado. FTR-SCH-002 bloquea aprobado o finalizado, no
un pendiente que se pasó de hora. Bloquear a los capitanes ahí deja el Encounter
muerto hasta una edición de fixture. Inferred: en FC Clubs el no-show y el fallo
de servidor son frecuentes. C2 (saltar el aviso del actual si `T_actual <= now`)
es la lectura validada. C1 queda descartada. Ver §10.

Este archivo no asigna un ID DEC. El registro canónico sigue en
[open-decisions.md](/product/open-decisions.md). Este hilo no lo edita para no
pisar el corte DEC-032/033.

## 5. Frontera exacta

### Reloj y duración

- `now` es `ClockPort.now()` de la API en el comando. Precisión de milisegundo.
- No cuentan el reloj del navegador, del BFF ni de un runner.
- La zona IANA de la competición solo interpreta la hora de pared del input. Ya
  existe. El aviso no usa esa zona para contar horas.
- `N` es el entero no negativo de la etapa vigente al ejecutar el comando.

### Predicados

Sea `MS = N × 3_600_000`.

- `meetsNotice(T, now) = T.getTime() - now.getTime() >= MS`.
- Slots afectados: los que `rescheduleOfficialMatches` movería para el alcance.
  - `official_match` slot K: solo el slot K.
  - `entire_encounter`: todos los slots del Encounter. El inicio del Encounter
    es el slot más temprano. Mover el Encounter desplaza todos el mismo delta.
- Aviso del actual, si `N > 0`: para cada slot afectado con `T_actual > now`,
  `meetsNotice(T_actual, now)`. Si alguno falla, el comando falla.
- Aviso del actual, si `T_actual <= now`: no se exige para ese slot.
- Aviso del propuesto, si `N > 0`: `meetsNotice(proposedStartAt, now)` y
  `meetsNotice(T_resultante, now)` para cada slot movido. En `entire_encounter`
  el `proposedStartAt` es el nuevo inicio. Los demás slots quedan más tarde, así
  que el inicio nuevo es el más estricto.
- Si `N = 0`, ambos avisos están apagados.
- Si ambos avisos fallan, el comando reporta `anchor=current` y no evalúa el
  propuesto de cara al error. V6-09 usa esa prioridad.

El predicar «distinto del actual» y «estrictamente futuro» no cambia. Un
`proposedStartAt == now` sigue siendo `scheduling.invalid_schedule_change_date`,
no un fallo de aviso.

### Error y HTTP

Fallo de aviso: código estable `scheduling.reschedule_notice_not_met`. Discriminador
`anchor: "current" | "proposed"`. Sin cambio de estado. Sin cambio de horario. Sin
cupo consumido.

HTTP 409, como `rescheduling_disabled` y `reschedule_limit_reached`. No reutilizar
`scheduling.invalid_schedule_change_date` (hoy 400). Ese código sigue para fecha
mal formada, zona distinta, pasado o igual a la actual.

Un replay idempotente que ya dejó recibo no reevalúa el aviso. Devuelve el
resultado guardado. Un reintento sin recibo se evalúa otra vez.

### Comandos

| Comando | ¿Mira el aviso? | Efecto si falla |
| --- | --- | --- |
| Crear solicitud | Sí. Actual y propuesto. | No crea la solicitud. |
| Contraproponer | Sí. Actual vigente y nuevo propuesto. | La solicitud sigue `open`. La propuesta anterior sigue vigente. |
| Aceptar (consienta o aplique) | Sí. Actual vigente y propuesto vigente. | Sin consentimiento nuevo. Si era el último, no aplica. Sigue `open`. |
| Rechazar | No. | Cierra `rejected`. El horario no cambia. |
| Listar o leer | No. | Sin efecto. |

Aceptar se mira aunque falte otra autoridad. Así el primer consentimiento no queda
registrado si el reglamento ya no permite aplicar.

### Contrapropuestas

La propuesta nueva sustituye a la vigente. El aviso no mira la fecha de la
propuesta anterior. Mira el horario vigente de los slots y la fecha nueva.

Una contrapropuesta que falla el aviso no cierra la solicitud. El rival puede
enviar otra fecha o rechazar.

### Cambio de reglamento

El N se lee en cada comando. No se guarda en la solicitud.

Si el N vigente sube, un aceptar posterior puede fallar. Si baja a 0, el aviso
deja de aplicarse. DEC-081 dice que publicar bloquea las reglas. En una
competición publicada el releer suele ser un no-op. El contrato de aplicación
sigue siendo «N vigente, no N de cuando se abrió».

DEC-034 (fecha límite tras la cual solo el organizador actúa) es otra regla. No
se define aquí. El aviso N no es esa fecha límite.

DEC-021 (confirmación de selección) no comparte constante, job ni error con este
aviso.

DEC-032 y DEC-033 (TTL y escalada de la solicitud) no se definen aquí. Hay una
tensión si ambos defaults quedan en 12 horas. Ver §11.

### Alcance Encounter / slot

- `official_match` slot K compara solo el horario vigente y el propuesto de K.
  El otro slot puede estar dentro de la ventana y no bloquea.
- `entire_encounter` compara todos los slots. Si el más temprano está dentro de
  la ventana, el Encounter no se mueve. Eso coincide con «el inicio del
  Encounter es el slot más temprano».
- Un slot protegido, con selección o con resultado aprobado sigue bloqueado por
  la guardia existente. El aviso no la sustituye.

### Fuera de alcance

- Implementar el predicado en código.
- TTL, expiración, estado `escalated` o walkover (DEC-032/033).
- Ligar la edición de fixture al aviso.
- Cambiar el default `12` del draft.
- Notificaciones.
- Pantallas (#124).

## 6. Comparación A / B / C con el mismo reloj

Contexto común, salvo que una fila diga otra cosa:

- `N = 12`
- Zona de competición `America/Lima`, solo para input de pared. Los instantes
  de la tabla son UTC.
- Propuesta lejana `P_far = 2026-10-20T21:00:00.000Z`
- Actual lejano `C_far = 2026-10-20T20:00:00.000Z`

Salidas:

- **Crea:** solicitud `open`, horario intacto, propuesta guardada.
- **Aplica:** solicitud `accepted`, horario = propuesto.
- **Aviso actual:** `scheduling.reschedule_notice_not_met`, `anchor=current`.
- **Aviso propuesto:** el mismo código, `anchor=proposed`.
- **Fecha inválida:** `scheduling.invalid_schedule_change_date`. No es aviso.
- **Rechaza:** `rejected`, horario intacto.

| ID | Acción | `now` | Actual | Propuesto | A | B | C (validada) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V6-01 | Crear | `2026-10-13T07:59:59.999Z` | `2026-10-13T20:00:00.000Z` | `P_far` | Crea | Crea | Crea |
| V6-02 | Crear | `2026-10-13T08:00:00.000Z` | `2026-10-13T20:00:00.000Z` | `P_far` | Crea | Crea | Crea |
| V6-03 | Crear | `2026-10-13T08:00:00.001Z` | `2026-10-13T20:00:00.000Z` | `P_far` | Aviso actual | Crea | Aviso actual |
| V6-04 | Crear | `2026-10-13T07:59:59.999Z` | `C_far` | `2026-10-13T20:00:00.000Z` | Crea | Crea | Crea |
| V6-05 | Crear | `2026-10-13T08:00:00.000Z` | `C_far` | `2026-10-13T20:00:00.000Z` | Crea | Crea | Crea |
| V6-06 | Crear | `2026-10-13T08:00:00.001Z` | `C_far` | `2026-10-13T20:00:00.000Z` | Crea | Aviso propuesto | Aviso propuesto |
| V6-07 | Crear | `2026-10-13T08:00:00.000Z` | `C_far` | `2026-10-13T09:00:00.000Z` | Crea | Aviso propuesto | Aviso propuesto |
| V6-08 | Crear | `2026-10-13T08:00:00.000Z` | `2026-10-13T09:00:00.000Z` | `P_far` | Aviso actual | Crea | Aviso actual |
| V6-09 | Crear | `2026-10-13T08:00:00.000Z` | `2026-10-13T09:00:00.000Z` | `2026-10-13T09:30:00.000Z` | Aviso actual | Aviso propuesto | Aviso actual |

V6-07 es el caso que tumba A. V6-08 es el caso que tumba B. V6-02 y V6-05 son el
límite inclusivo. V6-03 y V6-06 son el milisegundo posterior.

## 7. Cero, contrapropuesta, aceptar, alcance y reglamento

Mismo `N = 12` salvo V6-10 y V6-11.

| ID | Caso | `now` | Resultado C |
| --- | --- | --- | --- |
| V6-10 | Crear con `N = 0`, actual `2026-10-13T09:00:00.000Z`, propuesto `P_far` | `2026-10-13T08:00:00.000Z` | Crea. El aviso está apagado. |
| V6-11 | Crear con `N = 0`, propuesto `2026-10-13T08:00:00.001Z`, actual `C_far` | `2026-10-13T08:00:00.000Z` | Crea. Sigue siendo futuro y distinto. |
| V6-12 | Crear con `N = 0`, propuesto `2026-10-13T08:00:00.000Z` | `2026-10-13T08:00:00.000Z` | Fecha inválida. El cero no relaja «estrictamente futuro». |
| V6-13 | Contraproponer a `P_far` con actual `2026-10-13T20:00:00.000Z` | `2026-10-13T08:00:00.000Z` | Nueva propuesta vigente. Consentimientos previos no cuentan. |
| V6-14 | Contraproponer a `2026-10-13T09:00:00.000Z` con actual `C_far` | `2026-10-13T08:00:00.000Z` | Aviso propuesto. La propuesta anterior sigue vigente. Solicitud `open`. |
| V6-15 | Contraproponer a `P_far` con actual `2026-10-13T09:00:00.000Z` | `2026-10-13T08:00:00.000Z` | Aviso actual. La propuesta anterior sigue vigente. |
| V6-16 | Aceptar (último consentimiento) una propuesta `P_far` creada en V6-01 | `2026-10-13T07:59:59.999Z` | Aplica. Horario = `P_far`. |
| V6-17 | Aceptar la misma solicitud de V6-01 | `2026-10-13T08:00:00.000Z` | Aplica. Sigue en el límite. |
| V6-18 | Aceptar la misma solicitud de V6-01 | `2026-10-13T08:00:00.001Z` | Aviso actual. Sigue `open`. Horario original intacto. |
| V6-19 | Aceptar una propuesta `2026-10-13T20:00:00.000Z` (actual `C_far`) | `2026-10-13T08:00:00.001Z` | Aviso propuesto. Sigue `open`. |
| V6-20 | Rechazar con actual `2026-10-13T09:00:00.000Z` | `2026-10-13T08:00:00.000Z` | `rejected`. Horario intacto. El aviso no actúa. |
| V6-21 | Crear `official_match` slot 2. Slot 1 = `2026-10-13T09:00:00.000Z`. Slot 2 = `2026-10-13T20:00:00.000Z`. Propuesto slot 2 = `P_far` | `2026-10-13T08:00:00.000Z` | Crea. Slot 1 está dentro de la ventana y no entra en el alcance. |
| V6-22 | Crear `entire_encounter` con los mismos slots que V6-21. Propuesto = `P_far` | `2026-10-13T08:00:00.000Z` | Aviso actual. El slot 1 es el inicio del Encounter y se movería. |
| V6-23 | Crear `official_match` slot 1 con los mismos slots que V6-21. Propuesto = `P_far` | `2026-10-13T08:00:00.000Z` | Aviso actual. El slot 1 está a 1 hora. |
| V6-24 | Crear. Actual `2026-10-13T07:00:00.000Z` (ya pasó). Propuesto `2026-10-13T21:00:00.000Z` | `2026-10-13T08:00:00.000Z` | Crea. El aviso del actual no aplica. El propuesto cumple 13 horas. |
| V6-25 | Crear. Actual `2026-10-13T07:00:00.000Z`. Propuesto `2026-10-13T09:00:00.000Z` | `2026-10-13T08:00:00.000Z` | Aviso propuesto. |
| V6-26 | Aceptar. La solicitud se creó con `N = 12` y 18 horas de holgura. El N vigente ahora es `24` | holgura actual 18 h | Aviso actual. El N no se congeló. |
| V6-27 | Aceptar. Misma solicitud. El N vigente ahora es `0` | holgura actual 18 h | Aplica, si la fecha sigue futura. |
| V6-28 | Aceptar una propuesta cuyo `proposedStartAt` ya no es futuro | `proposedStartAt` | Fecha inválida, no aviso. Vecino de V6-18. |

V6-21 y V6-22 son el par de alcance. El vecino positivo de un Encounter bloqueado
es mover solo el slot lejano.

V6-24 es C2, ya validada. C1 habría convertido esa fila en aviso actual. V6-25
no cambia.

## 8. Qué hereda el desarrollo posterior

Las fronteras de la §5 y la columna C de V6-01…V6-28 son el contrato. El trabajo
de código, en un PR distinto, debe:

1. Aplicar los predicados de la §5 en crear, contraproponer y aceptar.
2. Dejar rechazar, listar y leer sin aviso.
3. Usar los vectores V6-01…V6-28 como contrato. Entrada del consumidor, reloj
   inyectado, aserción literal del código, estado y horario.
4. Incluir el vecino positivo junto a cada denegación (V6-02 junto a V6-03,
   V6-21 junto a V6-22, V6-10 junto a V6-08, V6-20 junto a V6-08).
5. No afirmar el contrato leyendo la constante `12` ni este Markdown.

No implementar nada de eso en este PR.

## 9. Relación con otras decisiones

| Decisión | Relación | Este corte |
| --- | --- | --- |
| DEC-021 | Plazo de confirmación de selección en results. 24 h desde la propuesta. | Distinta. No compartir código ni default. |
| DEC-030 | Cupo de 2 reprogramaciones por Team y Encounter. | Ya se aplica. El aviso no lo sustituye. |
| DEC-031 | Quién inicia. | Sin cambio. |
| DEC-032 | TTL de la solicitud de reprogramación. Default 12 h. | Fuera. Ver tensión abajo. |
| DEC-033 | Escalada al expirar. | Fuera. |
| DEC-034 | Fecha límite de reprogramar. Luego solo organizador. | Distinta del aviso N. |
| DEC-081 | Publicar bloquea reglas. | Explica por qué el releer suele ser estable tras publicar. |
| Edición de fixture | Camino auditado del organizador. | Fuera del aviso. |

Tensión observada, no resuelta. Default de aviso `12` y default DEC-032 `12`.
C revalida el actual al aceptar. Una solicitud abierta exactamente 12 horas
antes del kickoff (V6-02) solo se puede aceptar en ese mismo milisegundo
(V6-17). Un milisegundo después falla (V6-18). El TTL de 12 horas no llega a
usarse. Este hilo no cambia DEC-032. El corte de expiración y escalada vive en
[#152](https://github.com/thedavos/futrob/pull/152), otro archivo de propuestas.

## 10. Alternativas descartadas

**A.** Más simple y más cerca de «no toques el partido de esta noche». Deja pasar
V6-07. Un capitán puede citar al rival en 1 hora.

**B.** Más simple y cubre la cita nueva. Deja pasar V6-08. Un capitán puede
desmontar el partido de esta noche.

**C sin revalidar el actual al aceptar.** Crear y contraproponer miran el actual.
Aceptar solo mira el propuesto y que siga futuro. Evita la tensión con DEC-032.
Vuelve a permitir aplicar V6-18, que es cancelar a última hora.

**C1 en vez de C2.** Si `T_actual <= now`, también falla el aviso del actual.
Frontera más rígida. Todo pendiente que se pasó de hora lo resuelve el
organizador por fixture. Peor para dos capitanes que ya acordaron otra hora.

**Bypass del organizador en la negociación.** Un aceptar con
`encounters.reschedule.resolve` ignoraría N. Mezcla emergencia y acuerdo. La
emergencia ya tiene edición de fixture.

## 11. Preguntas y respuestas validadas

Validado el 2026-10-12 por el responsable de producto. Se adoptan las respuestas
recomendadas. A, B, C1, el aceptar sin revalidar y el bypass del organizador
quedan descartados. El desarrollo posterior no las reabre.

| # | Pregunta | Respuesta validada | Contrato |
| --- | --- | --- | --- |
| 1 | ¿C, A o B? | **C.** Aviso del actual y del propuesto. | Columna C de V6-01…V6-09. |
| 2 | ¿Horario actual ya pasado? | **C2.** No se exige aviso del actual si `T_actual <= now`. Sigue el aviso del propuesto. | V6-24 crea. V6-25 aviso propuesto. |
| 3 | ¿El aceptar revalida el aviso del actual? | **Sí.** El reloj y el N vigentes del comando. | V6-16 y V6-17 aplican. V6-18 aviso actual. |
| 4 | ¿El organizador en la negociación? | **Atado a N.** La emergencia usa la edición de fixture. | §4 puntos 6 y 7. |
| 5 | ¿`N = 0`? | **Apaga solo el aviso.** «Futuro y distinto» sigue. | V6-10 y V6-11 crean. V6-12 fecha inválida. |
| 6 | ¿Revisar el default 12 frente al TTL de DEC-032? | **No se decide aquí.** La tensión queda documentada. | §9. El corte DEC-032/033 es [#152](https://github.com/thedavos/futrob/pull/152). |

Siguiente paso de producto, no de este PR: registrar la decisión en
[open-decisions.md](/product/open-decisions.md) cuando no pise el hilo
DEC-032/033. Siguiente paso de código: otro PR que implemente V6-01…V6-28.
