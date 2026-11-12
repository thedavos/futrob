import type { ScheduleChangeRequestDto, ScheduleChangeResolutionDto } from "@futrob/api-contracts";
import type { ScheduleChangeRecoveryMessage } from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import { en } from "./reschedule-copy-en";

type Status = ScheduleChangeRequestDto["status"];
type Outcome = ScheduleChangeResolutionDto["outcome"];
type BlockedResponse = ScheduleChangeRequestDto["blockedActions"][number]["reason"];
type Action = "accept" | "reject" | "counter";

/** Same vocabulary as web's `reschedule.*` catalog. */
export interface RescheduleCopy {
  title: string;
  description: string;
  back: string;
  close: string;
  cancel: string;
  retry: string;
  vs: string;
  encounterLoading: string;
  encounterError: string;
  encounterNotFound: string;
  encounterNotFoundHelp: string;
  loading: string;
  empty: string;
  emptyHelp: string;
  forbidden: string;
  error: string;
  refresh: string;
  refreshFailed: string;
  paused: string;
  status: Record<Status, string>;
  scopeEncounter: string;
  scopeSlot: (slot: number) => string;
  proposedBy: (team: string) => string;
  proposedStart: string;
  deadline: (date: string) => string;
  summary: {
    pending: (team: string, scope: string, from: string, to: string) => string;
    applied: (scope: string, from: string, to: string) => string;
    closed: (team: string, scope: string, to: string) => string;
  };
  respondBy: (date: string) => string;
  history: string;
  hideHistory: string;
  proposal: (number: number) => string;
  consent: (actor: string) => string;
  rejection: (actor: string) => string;
  organizer: string;
  system: string;
  expiredAt: (deadline: string, processed: string) => string;
  resolvedAt: (date: string, actor: string) => string;
  noPermission: string;
  resolve: string;
  outcome: string;
  outcomes: Record<Outcome, string>;
  outcomeHelp: Record<Outcome, string>;
  reason: string;
  reasonRequired: string;
  newStart: string;
  date: string;
  dateHint: string;
  time: string;
  timeHint: string;
  zone: (zone: string) => string;
  dateInvalid: string;
  winningTeam: string;
  winnerRequired: string;
  save: string;
  success: string;
  currentStart: string;
  preview: (date: string) => string;
  create: {
    open: string;
    title: string;
    team: string;
    actingAs: (team: string) => string;
    scope: string;
    currentStart: (date: string) => string;
    reason: string;
    reasonRequired: string;
    help: string;
    submit: string;
    success: string;
    blocked: {
      permission: string;
      rescheduling_disabled: string;
      limit_reached: (team: string) => string;
      active_request_exists: string;
      result_protected: string;
    };
  };
  recovery: Record<Exclude<ScheduleChangeRecoveryMessage, "unknown">, string> & {
    unknown: string;
  };
  respondAs: (team: string) => string;
  actions: Record<
    Action,
    { open: string; title: string; submit: string; success: (team: string) => string }
  >;
  acceptBody: (scope: string, from: string, to: string) => string;
  rejectBody: (date: string) => string;
  rejectReason: string;
  counterActingAs: (team: string) => string;
  counterBody: (team: string) => string;
  counterReason: string;
  counterReasonRequired: string;
  blocked: Record<Exclude<BlockedResponse, "request_closed">, string>;
  stale: string;
}

const es: RescheduleCopy = {
  title: "Reprogramaciones",
  description:
    "Consulta las propuestas y resuelve las solicitudes escaladas. El silencio no acepta un cambio.",
  back: "Atrás",
  close: "Cerrar",
  cancel: "Cancelar",
  retry: "Reintentar",
  vs: "vs",
  encounterLoading: "Cargando el enfrentamiento…",
  encounterError: "No pudimos cargar el enfrentamiento.",
  encounterNotFound: "Enfrentamiento no disponible",
  encounterNotFoundHelp: "No existe en esta competición o no tienes acceso a él.",
  loading: "Cargando reprogramaciones…",
  empty: "Sin solicitudes de reprogramación",
  emptyHelp: "Las solicitudes y sus decisiones aparecerán aquí.",
  forbidden: "No tienes acceso al historial de reprogramaciones.",
  error: "No pudimos cargar las reprogramaciones.",
  refresh: "Actualizar reprogramaciones",
  refreshFailed: "No pudimos actualizar el historial. Los datos mostrados pueden haber cambiado.",
  paused: "Actualiza las reprogramaciones para enviar. Tu borrador se conserva.",
  status: {
    open: "En negociación",
    accepted: "Horario aplicado por consentimiento",
    rejected: "Rechazada",
    cancelled: "Cancelada",
    expired: "Vencida",
    escalated: "Escalada al organizador",
    resolved_by_organizer: "Resuelta por el organizador",
  },
  scopeEncounter: "Todo el enfrentamiento",
  scopeSlot: (slot) => `Partido ${slot}`,
  proposedBy: (team) => `Propuesta de ${team}`,
  proposedStart: "Inicio propuesto",
  deadline: (date) => `Plazo de respuesta: ${date}`,
  summary: {
    pending: (team, scope, from, to) =>
      `${team} propone mover ${scope.toLowerCase()} del ${from} al ${to}.`,
    applied: (scope, from, to) => `${scope} pasó del ${from} al ${to}.`,
    closed: (team, scope, to) => `${team} propuso mover ${scope.toLowerCase()} al ${to}.`,
  },
  respondBy: (date) => `Responde antes del ${date}.`,
  history: "Ver historial de propuestas y decisiones",
  hideHistory: "Ocultar historial",
  proposal: (number) => `Propuesta ${number}`,
  consent: (actor) => `Consentimiento de ${actor}`,
  rejection: (actor) => `Rechazo de ${actor}`,
  organizer: "Organizador",
  system: "Sistema",
  expiredAt: (deadline, processed) =>
    `Plazo vencido el ${deadline}; escalada procesada el ${processed}.`,
  resolvedAt: (date, actor) => `Resolución registrada el ${date} por ${actor}.`,
  noPermission: "Solo un operador con permiso para resolver puede cerrar esta solicitud escalada.",
  resolve: "Resolver solicitud escalada",
  outcome: "Desenlace",
  outcomes: {
    schedule_set: "Fijar nueva fecha",
    schedule_kept: "Conservar horario",
    walkover_intended: "Registrar intención de walkover",
  },
  outcomeHelp: {
    schedule_set:
      "Aplica la nueva fecha al alcance solicitado y consume cupo del equipo que abrió la solicitud.",
    schedule_kept: "Conserva el horario actual y cierra la solicitud sin consumir cupo.",
    walkover_intended:
      "Solo registra una intención. No crea un resultado oficial ni cambia estadísticas, tabla o bracket.",
  },
  reason: "Motivo de la resolución",
  reasonRequired: "Escribe un motivo para cerrar la solicitud.",
  newStart: "Nueva fecha y hora",
  date: "Fecha",
  dateHint: "AAAA-MM-DD",
  time: "Hora",
  timeHint: "HH:MM, formato 24 h",
  zone: (zone) => `Hora de la competición: ${zone}`,
  dateInvalid: "Introduce una fecha válida en la zona de la competición.",
  winningTeam: "Equipo ganador de la intención",
  winnerRequired: "Elige un equipo ganador para registrar la intención.",
  save: "Guardar resolución",
  success: "Resolución guardada. El historial refleja el cierre.",
  currentStart: "Horario actual",
  preview: (date) => `Se guardará como ${date}`,
  create: {
    open: "Solicitar reprogramación",
    title: "Nueva solicitud de reprogramación",
    team: "Equipo que solicita",
    actingAs: (team) => `Solicitas en nombre de ${team}`,
    scope: "Qué se mueve",
    currentStart: (date) => `Ahora: ${date}`,
    reason: "Motivo para el rival",
    reasonRequired: "Escribe un motivo para el rival.",
    help: "El rival debe aceptar antes del plazo. Si no responde, la solicitud pasa al organizador: el silencio no cuenta como aceptación.",
    submit: "Enviar solicitud",
    success: "Solicitud enviada. El horario no cambia hasta que el rival acepte.",
    blocked: {
      permission:
        "Solo el capitán de un equipo de este enfrentamiento puede solicitar una reprogramación.",
      rescheduling_disabled: "Esta competición no permite reprogramaciones.",
      limit_reached: (team) => `${team} ya usó todas sus reprogramaciones.`,
      active_request_exists: "Ya hay una solicitud activa que incluye este horario.",
      result_protected: "Hay una selección de resultados protegida; su horario no se puede mover.",
    },
  },
  recovery: {
    review: "La propuesta cambió. Revisa la propuesta actual antes de responder.",
    windowClosed:
      "Tu respuesta llegó después del plazo y no se registró. El organizador decide la solicitud.",
    resultProtected: "Hay un resultado aprobado en este horario; ya no se puede mover.",
    disabled: "Esta competición ya no permite reprogramaciones.",
    limitReached: "Tu equipo ya usó todas sus reprogramaciones.",
    permission: "Ya no tienes permiso para esta acción. Actualizamos la lista.",
    activeRequest: "Ya hay una solicitud activa para este horario. Revísala en la lista.",
    noticeProposed: "La nueva fecha no respeta la antelación mínima. Elige una fecha más lejana.",
    noticeCurrent:
      "El partido está demasiado cerca para reprogramarlo; el horario actual se mantiene.",
    acceptNotice:
      "La fecha propuesta ya no respeta la antelación mínima. Contrapropón otra fecha o rechaza la propuesta.",
    acceptPast: "La fecha propuesta ya pasó. Contrapropón otra fecha o rechaza la propuesta.",
    dateRejected: "Elige una fecha futura, distinta del horario actual.",
    network: "No pudimos enviar la acción. Vuelve a intentarlo; no se aplicará dos veces.",
    unknown: "No se pudo completar. Intenta de nuevo.",
  },
  respondAs: (team) => `Respondes como ${team}`,
  actions: {
    accept: {
      open: "Aceptar",
      title: "Aceptar la propuesta",
      submit: "Confirmar aceptación",
      success: () =>
        "Aceptación registrada. El estado de la solicitud indica si el horario ya cambió.",
    },
    reject: {
      open: "Rechazar",
      title: "Rechazar la propuesta",
      submit: "Confirmar rechazo",
      success: () => "Propuesta rechazada. Se mantiene el horario actual.",
    },
    counter: {
      open: "Contraproponer",
      title: "Contraproponer otra fecha",
      submit: "Enviar contrapropuesta",
      success: (team) => `Contrapropuesta enviada. ${team} debe responder antes del plazo.`,
    },
  },
  acceptBody: (scope, from, to) => `${scope} pasa de ${from} a ${to}.`,
  rejectBody: (date) => `Se mantiene el horario actual: ${date}.`,
  rejectReason: "Motivo (opcional)",
  counterActingAs: (team) => `Contrapropones como ${team}`,
  counterBody: (team) => `${team} tendrá que dar su consentimiento de nuevo.`,
  counterReason: "Motivo de la contrapropuesta",
  counterReasonRequired: "Escribe un motivo para la contrapropuesta.",
  blocked: {
    response_window_closed:
      "El plazo de respuesta venció. La solicitud pasa al organizador; el silencio no cuenta como aceptación.",
    own_proposal: "Tu equipo hizo esta propuesta. Espera la respuesta del rival.",
    permission: "Solo el capitán rival o el organizador pueden responder a esta propuesta.",
    already_consented: "Ya diste tu consentimiento a esta propuesta.",
    rescheduling_disabled:
      "La competición no permite reprogramar, así que no puedes aceptar ni contraproponer.",
    result_protected:
      "Hay un resultado aprobado en este horario, así que no puedes aceptar ni contraproponer.",
  },
  stale: "La propuesta cambió mientras respondías. Cancela y revisa la propuesta actual.",
};

export function rescheduleCopy(language: MobileLanguage): RescheduleCopy {
  return language === "es" ? es : en;
}

/** Medium date + short time on the competition's clock, as web formats every instant. */
export function formatCompetitionInstant(
  instant: string,
  timeZone: string,
  language: MobileLanguage,
): string {
  return new Intl.DateTimeFormat(language === "es" ? "es" : "en", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(instant));
}
