export type AppRole = 'user' | 'admin';

export interface Profile {
  id: string;
  vehicle_number: string; // Log in Number
  vehicle_register_number?: string; // Vehicle register Number
  name: string;
  phone: string;
  role: AppRole;
  created_at?: string;
}

export interface DailyRecord {
  id: string;
  user_id: string;
  record_date: string;
  income: number;
  income_details: string;
  cost: number;
  cost_location: string;
  cost_details: string;
  other: number;
  other_details: string;
  created_at?: string;
}

export interface LoginHistory {
  id: number;
  user_id: string;
  logged_in_at: string;
}

export interface RecordTotals {
  income: number;
  cost: number;
  other: number;
  balance: number;
  marginPercent: number;
  entryCount: number;
}
