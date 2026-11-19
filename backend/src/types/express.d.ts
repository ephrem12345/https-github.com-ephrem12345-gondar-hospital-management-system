import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      actor?: {
        userId: string;
        role: UserRole;
        patientId?: string;
        department?: string;
        hospitalId?: string;
      };
    }
  }
}

export {};
