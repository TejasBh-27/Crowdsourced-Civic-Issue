export const API_CONFIG = {
  BASE_URL: 'https://api.civicpulse.gov/v1',
  FASTAPI_AI_URL: 'https://ai-microservice.civicpulse.gov/v1',
  MOCK_DELAY_MS: 600,
};

export const COMPLAINT_STATUS = {
  SUBMITTED: 'Submitted',
  REJECTED_INVALID: 'Rejected_Invalid_Image',
  VERIFIED_ASSIGNED: 'Verified_Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved'
};

export const USER_ROLES = {
  CITIZEN: 'citizen',
  OFFICER: 'officer'
};
