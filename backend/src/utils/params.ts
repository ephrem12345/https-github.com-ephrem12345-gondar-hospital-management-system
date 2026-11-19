import { z } from "zod";
import { HttpError } from "./http-error.js";

/** Extracts a single string from an Express query/route parameter. */
export function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || "";
  return param || "";
}

/** Parses and validates a UUID identifier parameter. */
export function parseId(value: string | string[] | undefined): string {
  const parsed = z.string().uuid().safeParse(value);
  if (!parsed.success) throw new HttpError(400, "Invalid resource identifier", "VALIDATION_ERROR");
  return parsed.data;
}

/** Ensures route parameter is a single string and not an array. */
export function param(value: string | string[] | undefined): string {
  if (Array.isArray(value)) throw new HttpError(400, "Invalid route parameter", "VALIDATION_ERROR");
  return value || "";
}
