export const validatePhone = (phone) => {
  const cleaned = (phone || '').replace(/\D/g, '');
  return cleaned.length >= 10;
};

export const validateOTP = (otp) => {
  const cleaned = (otp || '').trim();
  return cleaned.length === 4 && /^\d+$/.test(cleaned);
};

export const validateComplaintForm = ({ title, category, description, location }) => {
  const errors = {};
  if (!title || title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters long';
  }
  if (!category) {
    errors.category = 'Please select an issue category';
  }
  if (!description || description.trim().length < 8) {
    errors.description = 'Description must be at least 8 characters long';
  }
  if (!location || !location.address) {
    errors.location = 'Please select location coordinates on map';
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
