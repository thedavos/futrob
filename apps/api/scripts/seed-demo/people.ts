import type { Pool } from "pg";
import { createDemoAccount, type DemoAccount } from "./accounts.ts";

export const GAME_EDITION = "fc26";
export const GAME_PLATFORM = "playstation";
/** EA's cross-gen platform, the one the club connections and syncs use. */
export const EA_PLATFORM = "common-gen5";

export interface PersonSpec {
  readonly localPart: string;
  readonly name: string;
  /** Game account identifier; also the EA `playername` in demo matches. */
  readonly gamertag?: string;
  /** Shown in the summary so testers know what to try with the account. */
  readonly purpose: string;
}

/** Named accounts, one per use case. Numbered squads are generated below. */
export const NAMED_PEOPLE = {
  superadmin: {
    localPart: "superadmin",
    name: "Sofía Administradora",
    purpose: "Superusuario: roles, planes de organizaciones",
  },
  nuevo: {
    localPart: "nuevo",
    name: "Nicolás Nuevo",
    purpose: "Registrado sin onboarding: el login entra al onboarding",
  },
  onbOrgPausado: {
    localPart: "onb-org-pausado",
    name: "Olga Pausada",
    purpose: "Onboarding de organizador detenido en «cuenta de juego»: retomar",
  },
  onbInvitacion: {
    localPart: "onb-invitacion",
    name: "Iván Invitado",
    purpose: "Onboarding por invitación detenido en «invitación» (token en el resumen)",
  },
  jugadorSolo: {
    localPart: "jugador-solo",
    name: "Julián Solo",
    gamertag: "Solo_Gol",
    purpose: "Espacio personal: 2 clubes, Mis partidos con hat-trick, póker, repóker y tarjetas",
  },
  jugadorSinClub: {
    localPart: "jugador-sin-club",
    name: "Javier Sin Club",
    purpose: "Espacio personal vacío: sin cuenta EA ni club",
  },
  espectador: {
    localPart: "espectador",
    name: "Elena Espectadora",
    purpose: "Sin membresías: solo exploración y portal público",
  },
  premium: {
    localPart: "premium",
    name: "Pedro Premium",
    gamertag: "Premium_Pro",
    purpose: "Add-on Jugador Premium activo",
  },
  orgFree: {
    localPart: "org-free",
    name: "Fernando Barrio",
    purpose: "Organizador de Barrio FC (Free) al límite: 1 competición, 12 equipos, sync agotado",
  },
  orgPro: {
    localPart: "org-pro",
    name: "Patricia Andina",
    purpose: "Organizadora de Liga Andina (Pro, 5/5 competiciones activas)",
  },
  orgLiga: {
    localPart: "org-liga",
    name: "Lucas Mega",
    purpose: "Organizador de Mega Liga (plan Liga): 36 equipos y competición pausada",
  },
  staff: {
    localPart: "staff",
    name: "Sara Staff",
    gamertag: "Staff_Sara",
    purpose: "Staff de Liga Andina (entró por invitación de staff)",
  },
  multiRol: {
    localPart: "multi-rol",
    name: "Mateo Multirol",
    gamertag: "Multi_Mateo",
    purpose:
      "Organizador de Club Multi (Pro en prueba), staff en Liga Andina, capitán en Mundialito",
  },
  capitanLocal: {
    localPart: "capitan-local",
    name: "Carla Cóndor",
    gamertag: "Capi_Condor",
    purpose: "Capitana de Cóndores FC: elegir partidos, propuestas, reprogramaciones",
  },
  capitanVisita: {
    localPart: "capitan-visita",
    name: "Pablo Puma",
    gamertag: "Capi_Puma",
    purpose: "Capitán de Atlético Pumas: confirmar, disputar, contraproponer horario",
  },
  subcapitan: {
    localPart: "subcapitan",
    name: "Sergio Subcapitán",
    gamertag: "Sub_Condor",
    purpose: "Subcapitán de Cóndores FC: permisos delegados",
  },
  capitanSinEa: {
    localPart: "capitan-sin-ea",
    name: "Hugo Halcón",
    gamertag: "Halcon_Hugo",
    purpose: "Capitán de Halcones Sin Club en Apertura: equipo sin club EA conectado",
  },
  invitado: {
    localPart: "invitado",
    name: "Gabriel Fichaje",
    gamertag: "Nuevo_Fichaje",
    purpose: "Invitaciones pendientes: plantilla de Cóndores e inscripción en Apertura",
  },
  invitVencida: {
    localPart: "invit-vencida",
    name: "Valeria Vencida",
    gamertag: "Vale_Vencida",
    purpose: "Invitaciones vencida y revocada",
  },
} as const satisfies Record<string, PersonSpec>;

export type NamedPersonKey = keyof typeof NAMED_PEOPLE;

const SQUAD_TAGS = [
  "Leo_Andes",
  "Toto_Arco",
  "Nico_Puno",
  "Rafa_Salta",
  "Gus_Cusco",
  "Dani_Lima",
  "Marco_Ica",
  "Beto_Tacna",
  "Ale_Piura",
  "Chino_Nazca",
  "Pipe_Jauja",
  "Kike_Tumbes",
  "Lalo_Moquegua",
  "Fede_Huaraz",
  "Tito_Chiclayo",
  "Rulo_Trujillo",
  "Manu_Arequipa",
  "Seba_Iquitos",
  "Gonzo_Ayacucho",
  "Bruno_Cajamarca",
  "Ciro_Huanuco",
  "Lucho_Pasco",
  "Paco_Ucayali",
  "Gemelo_Uno",
] as const;

const SQUAD_FIRST_NAMES = [
  "Leonardo",
  "Tomás",
  "Nicolás",
  "Rafael",
  "Gustavo",
  "Daniel",
  "Marco",
  "Alberto",
  "Alejandro",
  "Ricardo",
  "Felipe",
  "Enrique",
  "Eduardo",
  "Federico",
  "Héctor",
  "Raúl",
  "Manuel",
  "Sebastián",
  "Gonzalo",
  "Bruno",
  "Ciro",
  "Luis",
  "Francisco",
  "Gerardo",
] as const;

/** jugador01…jugador24: three per Liga Andina club; the first of each trio captains. */
export const SQUAD_PEOPLE: readonly PersonSpec[] = SQUAD_TAGS.map((gamertag, index) => ({
  localPart: `jugador${String(index + 1).padStart(2, "0")}`,
  name: `${SQUAD_FIRST_NAMES[index]} ${gamertag.split("_")[1]}`,
  gamertag,
  purpose: "Jugador de plantilla en Liga Andina (estadísticas y rankings)",
}));

/** barrio01…barrio12: captains of the Barrio FC teams. */
export const BARRIO_PEOPLE: readonly PersonSpec[] = Array.from({ length: 12 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return {
    localPart: `barrio${number}`,
    name: `Capitán Barrio ${number}`,
    gamertag: `Barrio_${number}`,
    purpose: "Capitán de un equipo de Barrio FC",
  };
});

export interface People {
  readonly named: Record<NamedPersonKey, DemoAccount>;
  readonly squad: readonly DemoAccount[];
  readonly barrio: readonly DemoAccount[];
  readonly specs: ReadonlyMap<string, PersonSpec>;
  gamertagOf(account: DemoAccount): string;
}

export async function createPeople(
  pool: Pool,
  passwordHash: string,
  createdAt: Date,
): Promise<People> {
  const specs = new Map<string, PersonSpec>();
  const create = async (key: string, spec: PersonSpec) => {
    specs.set(key, spec);
    return createDemoAccount(
      pool,
      { key, localPart: spec.localPart, name: spec.name },
      passwordHash,
      createdAt,
    );
  };
  // SAFETY: every key of NAMED_PEOPLE is assigned by the loop below before `named` is read.
  const named = {} as Record<NamedPersonKey, DemoAccount>;
  // SAFETY: Object.entries of a const object literal yields exactly its own keys.
  for (const [key, spec] of Object.entries(NAMED_PEOPLE) as Array<[NamedPersonKey, PersonSpec]>) {
    named[key] = await create(key, spec);
  }
  const squad: DemoAccount[] = [];
  for (const spec of SQUAD_PEOPLE) squad.push(await create(spec.localPart, spec));
  const barrio: DemoAccount[] = [];
  for (const spec of BARRIO_PEOPLE) barrio.push(await create(spec.localPart, spec));
  return {
    named,
    squad,
    barrio,
    specs,
    gamertagOf(account) {
      const gamertag = specs.get(account.key)?.gamertag;
      if (!gamertag) throw new Error(`${account.email} has no gamertag`);
      return gamertag;
    },
  };
}
