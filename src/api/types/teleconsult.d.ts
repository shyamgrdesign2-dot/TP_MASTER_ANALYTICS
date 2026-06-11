export interface TeleconsultSlotItem {
  start: string;
  end: string;
  status: "unavailable" | "available" | "leave" | "confirmed";
  availability?: { increment: number };
  appointments?: unknown[];
  leave?: { remarks: string } | null;
}

export interface TeleconsultSlotsResponse {
  slots: TeleconsultSlotItem[];
}

export interface TeleconsultAppointmentPatient {
  patient_unique_id: number;
  pm_pid: string;
  name: string;
  gender?: string;
  salutation?: string;
  contact_no: string;
  date_of_birth: string;
  pm_reference_id?: string;
  pincode?: string;
  city?: string;
  state?: string;
  address?: string;
}

export interface TeleconsultAppointmentItem {
  appointment_id: number;
  appointment_date: string;
  appointment_start_time: string;
  appointment_end_time: string;
  appointment_duration: number;
  doctor_id: number;
  clinic_id: number;
  appointment_remark: string | null;
  appointment_type: number;
  appointment_status: number;
  appointment_status_type: number;
  toct_id: number;
  category_id: number | null;
  patient: TeleconsultAppointmentPatient;
  teleconsult?: {
    consultationId: string;
    status: string;
    canJoinDoctor: boolean;
    canJoinPatient: boolean;
  };
}

export interface TeleconsultAppointmentsResponse {
  total: number;
  appointments: TeleconsultAppointmentItem[];
}

export interface TeleconsultBookBody {
  doctor_id: number;
  patient_unique_id: string;
  pm_pid: string;
  appointment_date: string;
  appointment_start_time: string;
  appointment_end_time: string;
  appointment_duration: number;
  toct_id: number;
  category_id?: number;
  appointment_remark?: string;
}

export interface TeleconsultBookResponse {
  appointmentId: string;
  consultationId: string;
  meetingLink: string;
}
