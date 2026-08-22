# @futrob/logger

Logger compartido del monorepo. Un solo sink de consola con tres formatos para
los cuatro runtimes (api, web/Workers, cli, mobile/RN).

## Uso

```ts
import { createConsoleLogger } from "@futrob/logger";

const logger = createConsoleLogger({ format: "styled", scope: "api:http" });

logger.info("cache.warmed", { entries: 42 });
logger.error("sync.failed", { provider: "ea-clubs" });

const child = logger.child("queue");
child.debug("job.received", { jobId });
```

### Formatos

| Formato  | Runtime                   | Cuándo                                    |
| -------- | ------------------------- | ----------------------------------------- |
| `styled` | Node (api), terminales    | Colores ANSI; default en desarrollo       |
| `plain`  | CLI, React Native         | Sin escapes ANSI (Metro no los renderiza) |
| `json`   | Producción / log drainers | `LOG_FORMAT=json` o explícito             |

### Niveles

`debug < info < warn < error`. El mínimo es `info`; configúralo con `level`.

## Convenciones

- `event` en `snake.case` describiendo el hecho (`queue.batch.completed`).
- Campos planos transport-safe (`string | number | boolean | null`).
- Errores esperados (`TaggedError`) se registran como `warn` con su `code`;
  los defectos van a Sentry además de `error`.

## Integración por app

| App           | Estado     | Nota                                                          |
| ------------- | ---------- | ------------------------------------------------------------- |
| `apps/api`    | cableado   | Adaptador `CorrelationLogger` + access log HTTP               |
| `apps/web`    | cableado   | Workers queue/scheduled (formato `plain`)                     |
| `apps/cli`    | cableado   | Fallos de red en `call-api`                                   |
| `apps/mobile` | disponible | Usar formato `plain`; integrar en los módulos al construirlos |

En React Native evita `format: "styled"`: los códigos ANSI aparecen como
basura en Metro.
