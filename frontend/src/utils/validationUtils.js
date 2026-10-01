// Validate input format
export const isValidEmail = (email) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidMobile = (mobile) => {
  if (!mobile) return false;
  return /^0\d{9}$/.test(mobile);
};
