import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../utils/http-error.js";

export function validateBody<T>(schema: ZodType<T>) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return next(new HttpError(400, result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "), "VALIDATION_ERROR"));
    }
    request.body = result.data;
    return next();
  };
}
