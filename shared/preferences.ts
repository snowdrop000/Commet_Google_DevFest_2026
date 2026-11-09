import { z } from "zod";

export const preferences = z.object({
  position: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
    .nullable()
    .default(null),
  followComposer: z.boolean().default(true),
  explore: z.boolean().default(true),
  useContext: z.boolean().default(true),
  summarizeVideos: z.boolean().default(true),
  analyzeOnPost: z.boolean().default(true),
});
export type Preferences = z.infer<typeof preferences>;
export const defaults = preferences.parse({});
