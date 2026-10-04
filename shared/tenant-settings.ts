import { z } from "zod";

// The separator belongs to the generated folio, not to the stored prefix.
export const quotationFolioPrefixSchema = z.string()
  .trim()
  .transform(value => value.toUpperCase().replace(/-+$/, "") || "MEX")
  .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9-]{0,19}$/, "Usa hasta 20 letras, números o guiones para el prefijo."))
  .default("MEX");