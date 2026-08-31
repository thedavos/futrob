import { z } from "zod";

export const chartCoordSchema = z.coerce.number().finite();
