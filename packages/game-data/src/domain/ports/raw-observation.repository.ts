import type { RawProviderObservation } from "../entities/raw-provider-observation.ts";

export interface RawObservationRepository {
  append(observation: RawProviderObservation): Promise<void>;
}
