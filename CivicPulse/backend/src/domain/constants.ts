// Single source of truth for domain vocabulary. Categories/departments mirror the prototype's strings.js.

export const STATUS = Object.freeze({
  SUBMITTED: 'submitted',          // saved, waiting for AI verification
  REJECTED: 'rejected',            // AI says photo does not show the issue
  MANUAL_REVIEW: 'manual_review',  // AI unavailable after retries
  VERIFIED: 'verified',            // AI verified; routed to ward officer
  WORKER_ASSIGNED: 'worker_assigned',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
});

export const TRANSITIONS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  [STATUS.SUBMITTED]: [STATUS.VERIFIED, STATUS.REJECTED, STATUS.MANUAL_REVIEW],
  [STATUS.REJECTED]: [STATUS.SUBMITTED],
  [STATUS.MANUAL_REVIEW]: [STATUS.SUBMITTED, STATUS.VERIFIED, STATUS.REJECTED],
  [STATUS.VERIFIED]: [STATUS.WORKER_ASSIGNED],
  [STATUS.WORKER_ASSIGNED]: [STATUS.WORKER_ASSIGNED, STATUS.IN_PROGRESS],
  [STATUS.IN_PROGRESS]: [STATUS.RESOLVED],
  [STATUS.RESOLVED]: [],
});

export const ROLES = Object.freeze({ CITIZEN: 'citizen', OFFICER: 'officer', ADMIN: 'admin' });

export const URGENCY = Object.freeze({ LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' });
export const URGENCY_RANK = { low: 1, medium: 2, high: 3, critical: 4 };

export const CATEGORIES = Object.freeze({
  pothole: { label: 'Road Potholes & Damage', department: 'roads' },
  garbage: { label: 'Garbage Dump & Waste', department: 'sanitation' },
  water: { label: 'Water Leakage & Supply', department: 'water' },
  street_light: { label: 'Streetlight Failure', department: 'electrical' },
  drainage: { label: 'Drainage Overflow', department: 'drainage' },
  illegal_parking: { label: 'Traffic & Illegal Parking', department: 'traffic' },
});

export const DEPARTMENTS = Object.freeze({
  roads: 'Roads & Infrastructure',
  sanitation: 'Sanitation & Solid Waste',
  water: 'Jal Board Water Supply',
  electrical: 'Electrical Grid Maintenance',
  drainage: 'Drainage & Sewage',
  traffic: 'Traffic & Transit',
});

export const departmentFor = (category: string): string | undefined =>
  (CATEGORIES as Record<string, { department: string } | undefined>)[category]?.department;
