export const validatePhone = (phone) => {
  const cleaned = (phone || '').replace(/\D/g, '');
  return cleaned.length === 10;
};

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test((email || '').trim());
};

export const validateIdentifier = (value) => {
  const val = (value || '').trim();
  if (!val) return false;
  // If numeric or looks like phone
  if (/^\+?\d[\d\s-]{8,14}$/.test(val)) {
    const digits = val.replace(/\D/g, '');
    return digits.length === 10;
  }
  // Otherwise test as email
  return validateEmail(val);
};

export const validatePassword = (password) => {
  return typeof password === 'string' && password.length >= 6;
};

export const validateOTP = (otp) => {
  const cleaned = (otp || '').trim();
  return cleaned.length === 4 && /^\d+$/.test(cleaned);
};

export const validateComplaintForm = ({ title, category, description, location }) => {
  const errors = {};
  if (!category) {
    errors.category = 'Please select an issue category';
  }
  if (!location || !location.address) {
    errors.location = 'Please select location coordinates on map';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
