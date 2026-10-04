import { DailyRecord, Profile } from './types';

// Normalizes Cloud SQL user row into frontend Profile format
export function normalizeProfile(row: any): Profile {
  return {
    id: String(row.id),
    vehicle_number: row.vehicleNumber || row.vehicle_number || '',
    name: row.name || '',
    phone: row.phone || '',
    role: (row.role || 'user') as 'user' | 'admin',
    created_at: row.createdAt || row.created_at,
  };
}

// Normalizes Cloud SQL record row into frontend DailyRecord format
export function normalizeRecord(row: any): DailyRecord {
  return {
    id: String(row.id),
    user_id: String(row.userId || row.user_id),
    record_date: row.recordDate || row.record_date || '',
    income: Number(row.income) || 0,
    income_details: row.incomeDetails || row.income_details || '',
    cost: Number(row.cost) || 0,
    cost_location: '',
    cost_details: '',
    other: Number(row.other) || 0,
    other_details: row.otherDetails || row.other_details || '',
    created_at: row.createdAt || row.created_at,
  };
}

export const api = {
  // 1. Health & Online Status
  async getDatabaseStatus(): Promise<{
    online: boolean;
    engine: string;
    region: string;
    instance: string;
    database: string;
    counts: { vehicles: number; records: number; logins: number };
  }> {
    const res = await fetch('/api/database/status');
    if (!res.ok) {
      throw new Error(`Database status check returned HTTP ${res.status}`);
    }
    return res.json();
  },

  // 2. Authentication: Log in with Vehicle Number
  async login(payload: { vehicleNumber?: string; email?: string; uid?: string; name?: string }): Promise<{
    user: Profile;
    message: string;
  }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to authenticate');
    }

    const user = normalizeProfile(data.user);
    // Cache active user in session storage for current tab session
    sessionStorage.setItem('fleet_current_user', JSON.stringify(user));
    return { user, message: data.message };
  },

  // 3. Register New Vehicle in Online Cloud SQL
  async register(payload: {
    vehicleNumber: string;
    name: string;
    phone?: string;
    email?: string;
  }): Promise<{ user: Profile; message: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to register');
    }

    const user = normalizeProfile(data.user);
    sessionStorage.setItem('fleet_current_user', JSON.stringify(user));
    return { user, message: data.message };
  },

  getCurrentSessionUser(): Profile | null {
    try {
      const stored = sessionStorage.getItem('fleet_current_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  },

  logout(): void {
    sessionStorage.removeItem('fleet_current_user');
  },

  // 4. Fetch All Vehicles (Admin & Directory)
  async getVehicles(): Promise<Profile[]> {
    const res = await fetch('/api/vehicles');
    if (!res.ok) {
      throw new Error('Failed to fetch vehicles from online database');
    }
    const data = await res.json();
    return data.map(normalizeProfile);
  },

  // 5. Update Vehicle Role in Online Database
  async updateRole(userId: string | number, role: 'user' | 'admin'): Promise<Profile> {
    const res = await fetch(`/api/vehicles/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update role');
    }
    const data = await res.json();
    return normalizeProfile(data);
  },

  // 6. Fetch Daily Records with Filters
  async getRecords(params: {
    userId?: string | number;
    vehicleNumber?: string;
    from?: string;
    to?: string;
  }): Promise<DailyRecord[]> {
    const query = new URLSearchParams();
    if (params.userId) query.set('userId', String(params.userId));
    if (params.vehicleNumber) query.set('vehicleNumber', params.vehicleNumber);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);

    const res = await fetch(`/api/records?${query.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to fetch daily records from online database');
    }
    const data = await res.json();
    return data.map(normalizeRecord);
  },

  // 7. Save New Daily Record into Online Database
  async createRecord(record: {
    userId: string | number;
    vehicleNumber?: string;
    recordDate: string;
    income: number;
    incomeDetails?: string;
    cost: number;
    other: number;
    otherDetails?: string;
  }): Promise<DailyRecord> {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save record into online database');
    }

    const data = await res.json();
    return normalizeRecord(data);
  },

  // 8. Update Daily Record in Online Database
  async updateRecord(
    id: string | number,
    record: {
      recordDate: string;
      income: number;
      incomeDetails?: string;
      cost: number;
      other: number;
      otherDetails?: string;
    }
  ): Promise<DailyRecord> {
    const res = await fetch(`/api/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update record');
    }

    const data = await res.json();
    return normalizeRecord(data);
  },

  // 9. Delete Daily Record from Online Database
  async deleteRecord(id: string | number): Promise<void> {
    const res = await fetch(`/api/records/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete record');
    }
  },
};
