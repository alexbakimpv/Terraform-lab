export type Role = 'student' | 'admin';

export interface ImpervaStatus {
  waf: 'ON' | 'OFF';
  cert: 'OK' | 'PENDING';
  dns: 'OK' | 'PROPAGATING';
}

export interface User {
  role: Role;
  labId: string;
  scenario: string;
  sessionExpiry: string; // ISO String
}

export interface LabInfo {
  victimUrl: string;
  clientUrl: string;
  scenarioId: string;
  scenarioName: string;
  runbookUrl?: string;
  status: 'ready' | 'provisioning' | 'resetting' | 'error' | 'pending' | 'expired';
  imperva: ImpervaStatus;
}

export interface ApiError {
  message: string;
  code: number;
}
