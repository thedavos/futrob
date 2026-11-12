import type { OfficialSelectionActionDto, OfficialSelectionViewDto } from "@futrob/api-contracts";
import type { OperatorCommand, TeamCommand } from "@futrob/sdk";
import type { MobileLanguage } from "@/modules/identity/mobile-copy";
import { en } from "./match-center-copy-en";

type SelectionStatus = NonNullable<OfficialSelectionViewDto["selection"]>["status"];
type DisputeStatus = OfficialSelectionViewDto["disputes"][number]["status"];
type FlagCode = OfficialSelectionViewDto["integrityFlags"][number]["code"];
type ActionType = OfficialSelectionActionDto["type"];

interface CommandCopy {
  readonly trigger: string;
  readonly title: string;
  readonly description: string;
  readonly submit: string;
  readonly success: string;
}

/** Same wording as web's `encounter.*` catalog, so both clients name things alike. */
export const es = {
  back: "Volver",
  vs: "VS",
  round: (number: number, total: number | null) =>
    total ? `Jornada ${number} de ${total}` : `Jornada ${number}`,
  timeZone: (zone: string) => `Horarios en ${zone}`,
  loading: "Cargando enfrentamiento",
  error: "No pudimos cargar el enfrentamiento.",
  notFoundTitle: "Enfrentamiento no disponible",
  notFoundDescription: "No existe en esta competición o tu cuenta no tiene acceso a él.",
  retry: "Reintentar",
  slotsTitle: "Partidos oficiales",
  slotsDescription:
    "Asigna un partido EA a cada partido oficial para ver el resultado antes de proponerlo.",
  slot: (slot: number) => `Partido ${slot}`,
  slotUnassigned: "Sin partido EA asignado",
  slotUnmatched: "Los clubes de este partido EA no son los de ambos equipos.",
  slotClear: (slot: number) => `Quitar partido EA del partido ${slot}`,
  previewNote:
    "Solo en esta pantalla: no se guarda ni oficializa. El resultado cuenta cuando el rival confirma la propuesta.",
  previewIncomplete: "Asigna un partido EA a cada partido oficial para ver la serie.",
  previewAggregate: "Global",
  previewResult: "Resultado",
  previewIndependent: "Cada partido cuenta por separado; esta competición no usa marcador global.",
  previewModeUnknown:
    "La competición todavía no define cómo se resuelve la serie; revisa cada marcador.",
  win: (team: string) => `Gana ${team}`,
  draw: "Empate",
  candidatesTitle: "Partidos EA candidatos",
  candidatesDescription:
    "Partidos EA entre los clubes de ambos equipos cerca del horario. Elegir uno no envía nada.",
  candidatesWindow: (from: string, to: string) => `Buscados entre ${from} y ${to}`,
  candidatesUpdated: (time: string) => `Actualizado a las ${time}`,
  candidatesRefresh: "Actualizar candidatos",
  candidatesRefreshFailed: "No pudimos actualizar. Ves los últimos candidatos cargados.",
  candidatesEmptyTitle: "Sin partidos EA todavía",
  candidatesEmptyDescription:
    "No hay partidos EA entre ambos clubes cerca del horario. Actualiza después de jugar.",
  notConnectedTitle: "Falta conectar un club EA",
  notConnectedSide: (team: string) => `${team} no tiene un club EA conectado.`,
  notConnectedDescription: "Los candidatos aparecen cuando ambos equipos conectan su club EA.",
  providerMismatchTitle: "Clubes de proveedores distintos",
  providerMismatchDescription:
    "Los clubes de ambos equipos usan proveedores de datos distintos, así que sus partidos no se pueden comparar.",
  candidatesForbiddenTitle: "Candidatos restringidos",
  candidatesForbiddenDescription:
    "Solo los equipos del enfrentamiento y la organización ven los partidos EA candidatos.",
  candidatesError: "No pudimos cargar los partidos EA candidatos.",
  candidateLabel: (home: string, away: string, time: string) => `${home} contra ${away}, ${time}`,
  candidateDuration: (minutes: number) => `${minutes} min`,
  candidateDurationUnknown: "Duración desconocida",
  candidateDisconnected: "Hubo desconexión",
  candidateForfeit: "Victoria por abandono",
  candidatePartial: "Datos parciales",
  candidateUnverified: "Datos sin verificar",
  candidatePlayers: (count: number) =>
    count === 1 ? "1 jugador registrado" : `${count} jugadores registrados`,
  candidateUseIn: (slot: number) => `Usar en partido ${slot}`,
  candidateUsedIn: (slot: number) => `En partido ${slot}`,
  candidateUnused: "Sin usar",
  selectionTitle: "Selección oficial",
  selectionDescription:
    "Propón los partidos EA que cuentan, responde a la propuesta del rival o abre una disputa. Nada es oficial hasta que el rival confirma.",
  actingAs: "Actúas por",
  selectionLoading: "Cargando la selección oficial",
  selectionError: "No pudimos cargar la selección oficial.",
  selectionForbidden: "No puedes ver ni operar la selección oficial de este enfrentamiento.",
  selectionRefresh: "Actualizar selección",
  selectionRefreshFailed:
    "No pudimos actualizar la selección. Los datos mostrados pueden haber cambiado.",
  selectionEmptyTitle: "Aún no hay propuesta",
  selectionEmptyDescription:
    "Asigna un partido EA a cada partido oficial y propón la selección al rival.",
  status: {
    none: "Sin propuesta",
    awaiting_provider_data: "Esperando datos del proveedor",
    candidates_available: "Candidatos disponibles",
    selection_in_progress: "Selección en curso",
    awaiting_opponent_confirmation: "Esperando confirmación del rival",
    confirmed: "Confirmada",
    disputed: "En disputa",
    organizer_review: "En revisión de la organización",
    approved: "Aprobada",
    voided: "Anulada",
  } satisfies Record<SelectionStatus | "none", string>,
  version: (version: number) => `Versión ${version}`,
  deadline: (date: string) => `El rival puede responder hasta ${date}`,
  approved: "Resultado oficial aprobado",
  notOfficial: "Todavía no es un resultado oficial y no genera estadísticas.",
  noCommands: "No hay acciones disponibles para tu equipo en este estado.",
  disputeTitle: "Disputa",
  disputeStatus: {
    open: "Abierta",
    under_review: "En revisión",
    resolved: "Resuelta",
  } satisfies Record<DisputeStatus, string>,
  disputeOpenedBy: (team: string) => `Abierta por ${team}`,
  flagsTitle: "Avisos de integridad",
  flag: {
    provider_data_incomplete: (match: string) =>
      `Datos incompletos del proveedor en el partido EA ${match}`,
    provider_match_disconnected: (match: string) => `Hubo desconexión en el partido EA ${match}`,
  } satisfies Record<FlagCode, (match: string) => string>,
  proposalsTitle: "Propuestas",
  proposalLabel: (sequence: number, round: number) => `Propuesta ${sequence} · ronda ${round}`,
  proposalCurrent: "Vigente",
  proposalBy: (team: string) => `De ${team}`,
  slotScore: (slot: number, home: string, homeGoals: number, awayGoals: number, away: string) =>
    `Partido ${slot}: ${home} ${homeGoals}–${awayGoals} ${away}`,
  slotUnmatchedScore: (slot: number) => `Partido ${slot}: jugado por otros clubes`,
  slotMissing: (slot: number) => `Partido ${slot}: ya no figura entre los candidatos`,
  historyTitle: "Historial de la selección",
  historyHide: "Ocultar historial",
  historyByOperator: "Organización",
  historyBySystem: "Sistema",
  history: {
    proposed: "Propuesta enviada",
    confirmed: "Propuesta confirmada",
    approved: "Resultado aprobado",
    integrity_review_required: "Revisión de integridad requerida",
    rejected: "Propuesta rechazada",
    alternative_proposed: "Alternativa propuesta",
    dispute_opened: "Disputa abierta",
    review_started: "Revisión iniciada",
    dispute_resolved_approved: "Disputa resuelta con aprobación",
    returned_to_selection: "Devuelta a selección",
    voided: "Resultado anulado",
    reference_reuse_rejected: "Partido EA ya usado en otro enfrentamiento",
    legacy_review_required: "Revisión requerida por datos anteriores",
    confirmation_expired: "Plazo de confirmación vencido",
  } satisfies Record<ActionType, string>,
  teamUnknown: "Equipo sin identificar",
  command: {
    propose: {
      trigger: "Proponer selección",
      title: "Proponer la selección al rival",
      description:
        "El rival recibirá estos partidos EA para confirmarlos, rechazarlos o proponer otros.",
      submit: "Enviar propuesta",
      success: "Propuesta enviada al rival.",
    },
    confirm: {
      trigger: "Confirmar propuesta",
      title: "Confirmar la propuesta del rival",
      description:
        "Si no hay avisos de integridad, la selección queda aprobada como resultado oficial.",
      submit: "Confirmar",
      success: "Propuesta confirmada.",
    },
    reject: {
      trigger: "Rechazar",
      title: "Rechazar la propuesta",
      description: "La selección pasa a disputa y la organización decide. Nada se vuelve oficial.",
      submit: "Rechazar propuesta",
      success: "Propuesta rechazada. La selección queda en disputa.",
    },
    propose_alternative: {
      trigger: "Proponer alternativa",
      title: "Proponer otros partidos EA",
      description:
        "Si eliges los mismos partidos de la propuesta vigente, cuenta como confirmación. Si eliges otros, la selección pasa a disputa y la organización decide cuáles cuentan.",
      submit: "Enviar alternativa",
      success:
        "Alternativa enviada. Si coincide con la propuesta vigente, cuenta como confirmación; si no, la organización resolverá la disputa.",
    },
    open_dispute: {
      trigger: "Abrir disputa",
      title: "Abrir una disputa",
      description: "La organización revisará el caso. Mientras tanto, nada se vuelve oficial.",
      submit: "Abrir disputa",
      success: "Disputa abierta.",
    },
  } satisfies Record<TeamCommand, CommandCopy>,
  cancel: "Cancelar",
  close: "Cerrar",
  dialogSlots: "Partidos que envías",
  dialogSlotsIncomplete: "Asigna un partido EA a cada partido oficial antes de enviar.",
  dialogTarget: "Propuesta a la que respondes",
  reasonLabel: "Motivo",
  reasonHelp: "Obligatorio. Lo verán el rival y la organización. Máximo 1000 caracteres.",
  reasonRequired: "Escribe un motivo para continuar.",
  conflict: (from: number, to: number) =>
    `La selección cambió: leíste la versión ${from} y ahora está en la ${to}. Revisa el estado actual; tu borrador se conserva y no se reenvió nada.`,
  unavailable: "Esta acción ya no está disponible en el estado actual.",
  unknown:
    "No sabemos si se guardó porque falló la conexión. Reintentar envía la misma solicitud y no la duplica.",
  invalidMessage: (code: string | null): string => {
    switch (code ?? "") {
      case "results.reason_required":
        return "Escribe un motivo para continuar.";
      case "results.invalid_selection":
        return "La selección no es válida. Revisa los partidos EA asignados.";
      case "results.duplicate_provider_match":
        return "Usaste el mismo partido EA en dos partidos oficiales.";
      case "results.integrity_flags_not_acknowledged":
        return "Confirma que revisaste los avisos de integridad para aprobar.";
      default:
        return "No se pudo enviar. Revisa los datos e inténtalo de nuevo.";
    }
  },
  reviewTitle: "Revisión de la organización",
  reviewDescription:
    "Revisa la disputa, toma el caso y decide. Solo lo ve quien aprueba resultados y no se publica.",
  reviewLoading: "Cargando el expediente",
  reviewError: "No pudimos cargar el expediente.",
  reviewForbidden: "No puedes revisar disputas de este enfrentamiento.",
  reviewRefresh: "Actualizar expediente",
  reviewRefreshFailed:
    "No pudimos actualizar el expediente. Los datos mostrados pueden haber cambiado.",
  reviewEmpty: "Aún no hay propuestas en este enfrentamiento.",
  reviewNoCommands: "No hay decisiones pendientes para la organización en este estado.",
  reviewReasonHelp:
    "Obligatorio. Queda en el historial y lo verán ambos equipos. Máximo 1000 caracteres.",
  review: {
    review_dispute: {
      trigger: "Tomar el caso",
      title: "Tomar el caso",
      description:
        "La disputa pasa a revisión de la organización y los equipos ya no pueden cambiarla. Tomar el caso no aprueba nada.",
      submit: "Tomar el caso",
      success: "Tomaste el caso. Está en revisión de la organización.",
    },
    approve_proposal: {
      trigger: "Aprobar una propuesta",
      title: "Aprobar una propuesta",
      description: "La propuesta que elijas pasa a ser el resultado oficial y genera estadísticas.",
      submit: "Aprobar propuesta",
      success: "Propuesta aprobada. El resultado ya es oficial.",
    },
    return_to_selection: {
      trigger: "Devolver a selección",
      title: "Devolver el caso a selección",
      description:
        "Las propuestas de esta ronda se cierran y los equipos deben acordar una selección nueva.",
      submit: "Devolver a selección",
      success: "Caso devuelto a selección.",
    },
  } satisfies Record<OperatorCommand, CommandCopy>,
  reviewChoose: "Propuesta que apruebas",
  reviewChooseRequired: "Elige la propuesta que vas a aprobar.",
  reviewFlags: "Avisos de integridad de esta propuesta",
  reviewAcknowledge: "Revisé los avisos de integridad y apruebo igualmente",
  reviewAcknowledgeRequired: "Confirma que revisaste los avisos de integridad para aprobar.",
  disputesTitle: "Disputas",
  disputesDescription: "Selecciones que esperan una decisión de la organización",
  disputesLoading: "Cargando disputas",
  disputesError: "No pudimos cargar las disputas.",
  disputesEmptyTitle: "No hay disputas pendientes",
  disputesEmptyDescription:
    "Aparecerán aquí cuando un equipo impugne la selección oficial o un caso pase a revisión del organizador.",
  disputesNotFoundTitle: "Competición no disponible",
  disputesNotFoundDescription:
    "No existe en esta organización o tu cuenta no puede revisar sus disputas.",
  disputesOpen: (home: string, away: string) => `Revisar la disputa de ${home} vs ${away}`,
  disputesKickoff: (when: string) => `Partido el ${when}`,
  disputesStatus: {
    disputed: "En disputa",
    organizer_review: "Revisión del organizador",
  },
  disputesTeamUnnamed: "Equipo sin nombre disponible",
};

export type MatchCenterCopy = typeof es;

export function matchCenterCopy(language: MobileLanguage): MatchCenterCopy {
  return language === "en" ? en : es;
}

/** Date and time in the competition's zone, as web's Encounter page shows them. */
export function formatInCompetitionZone(
  iso: string,
  timeZone: string,
  language: MobileLanguage,
): string {
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "es", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatClock(epochMs: number, language: MobileLanguage): string {
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "es", {
    timeStyle: "short",
  }).format(new Date(epochMs));
}
