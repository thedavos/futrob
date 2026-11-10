import type { ActivityOutcome } from "../entities/activity-entry.ts";
import type { EmailIntent, EmailLocale, EmailTemplate } from "../entities/email-intent.ts";

/** Plain-text copy of one email. The layout escapes and wraps it. */
export interface EmailCopy {
  readonly subject: string;
  readonly heading: string;
  readonly body: readonly string[];
  readonly action: string;
}

type IntentOf<T extends EmailTemplate> = Extract<EmailIntent, { readonly template: T }>;

type TemplateCopy = { readonly [T in EmailTemplate]: (intent: IntentOf<T>) => EmailCopy };

export interface LocaleCopy {
  readonly templates: TemplateCopy;
  readonly greeting: (name: string) => string;
  readonly footerCritical: string;
  readonly footerOptional: string;
  readonly unsubscribe: string;
  readonly signature: string;
}

const ES_DECISIONS: Readonly<Record<ActivityOutcome, string>> = {
  entry_approved: "aprobó la inscripción",
  entry_rejected: "rechazó la inscripción",
  schedule_set: "fijó una nueva fecha para el partido",
  schedule_kept: "mantuvo la fecha del partido",
  walkover_intended: "decidió una victoria por incomparecencia",
};

const EN_DECISIONS: Readonly<Record<ActivityOutcome, string>> = {
  entry_approved: "approved the registration",
  entry_rejected: "rejected the registration",
  schedule_set: "set a new date for the match",
  schedule_kept: "kept the date of the match",
  walkover_intended: "decided a walkover",
};

const es: LocaleCopy = {
  greeting: (name) => `Hola, ${name}:`,
  footerCritical:
    "Te enviamos este correo porque tienes que actuar en una competición de Futrob o porque te afecta una decisión.",
  footerOptional: "Te enviamos este correo porque participas en una competición de Futrob.",
  unsubscribe: "Dejar de recibir estos avisos",
  signature: "Futrob",
  templates: {
    registration: (i) => ({
      subject: `Nueva inscripción en ${i.competitionName ?? "tu competición"}`,
      heading: "Nueva inscripción",
      body: [
        `${i.teamName ?? "Un equipo"} pidió inscribirse en ${i.competitionName ?? "tu competición"}.`,
        i.requiresAction ? "Revisa la solicitud para aprobarla o rechazarla." : "",
      ],
      action: i.requiresAction ? "Revisar inscripción" : "Ver equipos",
    }),
    upcoming_match: (i) => ({
      subject: `Partido próximo: ${i.encounterLabel ?? "tu partido"}`,
      heading: "Tu partido se acerca",
      body: [
        `${i.encounterLabel ?? "Tu partido"} de ${i.competitionName ?? "tu competición"} empieza el ${startsAt(i.startsAt, "es")}.`,
      ],
      action: "Ver partido",
    }),
    reschedule: (i) => ({
      subject: `Reprogramación de ${i.encounterLabel ?? "un partido"}`,
      heading: i.requiresAction ? "Responde a una reprogramación" : "Reprogramación propuesta",
      body: [
        `Hay una nueva fecha propuesta para ${i.encounterLabel ?? "un partido"} de ${i.competitionName ?? "tu competición"}.`,
        i.requiresAction
          ? "Acéptala, recházala o propón otra antes de que venza el plazo."
          : "Te avisaremos cuando se resuelva.",
      ],
      action: i.requiresAction ? "Responder" : "Ver reprogramación",
    }),
    ea_candidates: (i) => ({
      subject: `Partidos de EA para ${i.encounterLabel ?? "tu partido"}`,
      heading: "Hay partidos para elegir",
      body: [
        `Encontramos ${i.candidateCount} ${i.candidateCount === 1 ? "partido" : "partidos"} de EA que pueden corresponder a ${i.encounterLabel ?? "tu partido"}.`,
        "Elige los que cuentan para el resultado oficial.",
      ],
      action: "Elegir partidos",
    }),
    proposed_selection: (i) => ({
      subject: i.requiresAction
        ? `Confirma la selección de ${i.encounterLabel ?? "tu partido"}`
        : `Selección propuesta: ${i.encounterLabel ?? "un partido"}`,
      heading: i.requiresAction ? "Confirma la selección" : "Selección propuesta",
      body: [
        `${i.teamName ?? "El rival"} propuso los partidos que cuentan para ${i.encounterLabel ?? "el encuentro"} de ${i.competitionName ?? "tu competición"}.`,
        i.requiresAction
          ? "Confírmala o abre una disputa antes de que venza el plazo."
          : "El rival tiene que confirmarla.",
      ],
      action: i.requiresAction ? "Revisar selección" : "Ver partido",
    }),
    result_or_dispute: (i) =>
      i.result === "official"
        ? {
            subject: `Resultado oficial: ${i.encounterLabel ?? "tu partido"}`,
            heading: "Resultado oficial",
            body: [
              `El resultado de ${i.encounterLabel ?? "tu partido"} en ${i.competitionName ?? "tu competición"} ya es oficial.`,
            ],
            action: "Ver resultado",
          }
        : {
            subject: `Disputa abierta: ${i.encounterLabel ?? "un partido"}`,
            heading: "Hay una disputa abierta",
            body: [
              `Se abrió una disputa sobre ${i.encounterLabel ?? "un partido"} de ${i.competitionName ?? "tu competición"}.`,
              "Revísala para resolverla.",
            ],
            action: "Revisar disputa",
          },
    organizer_decision: (i) => ({
      subject: `Decisión del organizador en ${i.competitionName ?? "tu competición"}`,
      heading: "Decisión del organizador",
      body: [
        `El organizador ${i.outcome ? ES_DECISIONS[i.outcome] : "tomó una decisión"}${subjectEs(i)}.`,
      ],
      action: "Ver detalle",
    }),
    sanction: (i) => ({
      subject: `Sanción en ${i.competitionName ?? "tu competición"}`,
      heading: "Se aplicó una sanción",
      body: [
        `El organizador sancionó a ${i.teamName ?? "tu equipo"} en ${i.competitionName ?? "tu competición"}.`,
      ],
      action: "Ver sanción",
    }),
  },
};

const en: LocaleCopy = {
  greeting: (name) => `Hi ${name},`,
  footerCritical:
    "You get this email because you need to act in a Futrob competition or a decision affects you.",
  footerOptional: "You get this email because you take part in a Futrob competition.",
  unsubscribe: "Stop these notices",
  signature: "Futrob",
  templates: {
    registration: (i) => ({
      subject: `New registration in ${i.competitionName ?? "your competition"}`,
      heading: "New registration",
      body: [
        `${i.teamName ?? "A team"} asked to join ${i.competitionName ?? "your competition"}.`,
        i.requiresAction ? "Review the request to approve or reject it." : "",
      ],
      action: i.requiresAction ? "Review registration" : "View teams",
    }),
    upcoming_match: (i) => ({
      subject: `Upcoming match: ${i.encounterLabel ?? "your match"}`,
      heading: "Your match is coming up",
      body: [
        `${i.encounterLabel ?? "Your match"} in ${i.competitionName ?? "your competition"} starts on ${startsAt(i.startsAt, "en")}.`,
      ],
      action: "View match",
    }),
    reschedule: (i) => ({
      subject: `Reschedule of ${i.encounterLabel ?? "a match"}`,
      heading: i.requiresAction ? "Answer a reschedule" : "Reschedule proposed",
      body: [
        `A new date is proposed for ${i.encounterLabel ?? "a match"} in ${i.competitionName ?? "your competition"}.`,
        i.requiresAction
          ? "Accept it, reject it or propose another date before the deadline."
          : "We will tell you when it is settled.",
      ],
      action: i.requiresAction ? "Answer" : "View reschedule",
    }),
    ea_candidates: (i) => ({
      subject: `EA matches for ${i.encounterLabel ?? "your match"}`,
      heading: "Matches are ready to select",
      body: [
        `We found ${i.candidateCount} EA ${i.candidateCount === 1 ? "match" : "matches"} that can belong to ${i.encounterLabel ?? "your match"}.`,
        "Select the ones that count for the official result.",
      ],
      action: "Select matches",
    }),
    proposed_selection: (i) => ({
      subject: i.requiresAction
        ? `Confirm the selection for ${i.encounterLabel ?? "your match"}`
        : `Selection proposed: ${i.encounterLabel ?? "a match"}`,
      heading: i.requiresAction ? "Confirm the selection" : "Selection proposed",
      body: [
        `${i.teamName ?? "The opponent"} proposed the matches that count for ${i.encounterLabel ?? "the encounter"} in ${i.competitionName ?? "your competition"}.`,
        i.requiresAction
          ? "Confirm it or open a dispute before the deadline."
          : "The opponent must confirm it.",
      ],
      action: i.requiresAction ? "Review selection" : "View match",
    }),
    result_or_dispute: (i) =>
      i.result === "official"
        ? {
            subject: `Official result: ${i.encounterLabel ?? "your match"}`,
            heading: "Official result",
            body: [
              `The result of ${i.encounterLabel ?? "your match"} in ${i.competitionName ?? "your competition"} is now official.`,
            ],
            action: "View result",
          }
        : {
            subject: `Dispute opened: ${i.encounterLabel ?? "a match"}`,
            heading: "A dispute is open",
            body: [
              `A dispute was opened about ${i.encounterLabel ?? "a match"} in ${i.competitionName ?? "your competition"}.`,
              "Review it to resolve it.",
            ],
            action: "Review dispute",
          },
    organizer_decision: (i) => ({
      subject: `Organizer decision in ${i.competitionName ?? "your competition"}`,
      heading: "Organizer decision",
      body: [
        `The organizer ${i.outcome ? EN_DECISIONS[i.outcome] : "made a decision"}${subjectEn(i)}.`,
      ],
      action: "View details",
    }),
    sanction: (i) => ({
      subject: `Sanction in ${i.competitionName ?? "your competition"}`,
      heading: "A sanction was applied",
      body: [
        `The organizer sanctioned ${i.teamName ?? "your team"} in ${i.competitionName ?? "your competition"}.`,
      ],
      action: "View sanction",
    }),
  },
};

/** Recipients' time zones are unknown, so the time is shown in UTC and says so. */
function startsAt(iso: string, locale: EmailLocale): string {
  const formatted = new Intl.DateTimeFormat(locale === "es" ? "es-ES" : "en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
  return `${formatted} UTC`;
}

function subjectEs(i: IntentOf<"organizer_decision">): string {
  if (i.encounterLabel) return ` sobre ${i.encounterLabel}`;
  if (i.teamName) return ` de ${i.teamName}`;
  return "";
}

function subjectEn(i: IntentOf<"organizer_decision">): string {
  if (i.encounterLabel) return ` about ${i.encounterLabel}`;
  if (i.teamName) return ` for ${i.teamName}`;
  return "";
}

export const EMAIL_COPY: Readonly<Record<EmailLocale, LocaleCopy>> = { es, en };

export function copyFor(intent: EmailIntent, locale: EmailLocale): EmailCopy {
  const t = EMAIL_COPY[locale].templates;
  switch (intent.template) {
    case "registration":
      return t.registration(intent);
    case "upcoming_match":
      return t.upcoming_match(intent);
    case "reschedule":
      return t.reschedule(intent);
    case "ea_candidates":
      return t.ea_candidates(intent);
    case "proposed_selection":
      return t.proposed_selection(intent);
    case "result_or_dispute":
      return t.result_or_dispute(intent);
    case "organizer_decision":
      return t.organizer_decision(intent);
    case "sanction":
      return t.sanction(intent);
  }
}
