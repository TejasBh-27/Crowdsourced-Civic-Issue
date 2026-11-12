/**
 * CivicPulse User Filter Utility
 * Provides strict multi-tenant isolation so each citizen only sees
 * their own complaints and newly registered accounts start with zero reports.
 */

export function isComplaintOwnedByUser(complaint, user) {
  if (!complaint || !user) return false;

  // Officers & Admins view complaints according to their administrative duties
  if (user.role === 'officer' || user.role === 'admin') {
    return true;
  }

  // Extract complaint reporter attributes
  const cUserId = complaint.reportedBy?.id || complaint.citizenId || complaint.userId;
  const cPhone = (complaint.reportedBy?.phone || complaint.citizenPhone || complaint.phone || '').replace(/\D/g, '');
  const cEmail = (complaint.reportedBy?.email || complaint.citizenEmail || complaint.email || '').toLowerCase().trim();

  // Extract current user attributes
  const uId = user.id ? String(user.id).trim() : '';
  const uPhone = user.phone ? String(user.phone).replace(/\D/g, '') : '';
  const uEmail = user.email ? String(user.email).toLowerCase().trim() : '';

  // 1. Direct ID match
  if (uId && cUserId && String(cUserId).trim() === uId) {
    return true;
  }

  // 2. Phone number match (comparing last 10 digits to normalize prefixes like +91)
  if (uPhone && cPhone && uPhone.length >= 10 && cPhone.length >= 10) {
    const last10U = uPhone.slice(-10);
    const last10C = cPhone.slice(-10);
    if (last10U === last10C) {
      return true;
    }
  }

  // 3. Email match (case-insensitive)
  if (uEmail && cEmail && uEmail === cEmail) {
    return true;
  }

  return false;
}

export default isComplaintOwnedByUser;
