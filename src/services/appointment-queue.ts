import type { AppointmentInput } from "@/validation/schemas";

export type AppointmentStatus =
  | "Scheduled"
  | "Confirmed"
  | "Checked In"
  | "Completed"
  | "Cancelled"
  | "No Show";

export type QueueStatus =
  | "Waiting"
  | "Consulting"
  | "Completed"
  | "Absent"
  | "Transferred";

export interface AppointmentRecord extends AppointmentInput {
  id: string;
  patient: string;
  status: AppointmentStatus;
}

export interface QueueRecord {
  queueNumber: number;
  patientId: string;
  department: string;
  doctor: string;
  checkIn: string;
  status: QueueStatus;
}

export interface AppointmentPatientOption {
  id: string;
  name: string;
}

export interface DoctorAvailabilityRecord {
  doctorId: string;
  name: string;
  department: string;
  availableDays: string[];
  workingHours: { start: string; end: string };
  bookedSlots: number;
  availableSlots: number;
}

/** API contract for a future backend; this frontend phase uses local demo state. */
export interface AppointmentQueueService {
  searchPatients(query: string): Promise<AppointmentPatientOption[]>;
  listAppointments(from: string, to: string): Promise<AppointmentRecord[]>;
  createAppointment(input: AppointmentInput): Promise<AppointmentRecord>;
  updateAppointment(id: string, input: AppointmentInput): Promise<AppointmentRecord>;
  updateAppointmentStatus(id: string, status: AppointmentStatus): Promise<AppointmentRecord>;
  listDoctorAvailability(date: string, department?: string): Promise<DoctorAvailabilityRecord[]>;
  listAvailableTimeSlots(doctorId: string, date: string): Promise<string[]>;
  listQueue(department?: string): Promise<QueueRecord[]>;
  updateQueueStatus(queueNumber: number, status: QueueStatus): Promise<QueueRecord>;
  transferQueuePatient(queueNumber: number, department: string): Promise<QueueRecord>;
  callNextPatient(department?: string): Promise<QueueRecord | null>;
}
