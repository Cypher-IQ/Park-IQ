// Shared validation utilities with detailed feedback

const validators = {
  email: (value) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value) return { valid: false, message: 'Email is required' };
    if (!regex.test(value)) return { valid: false, message: 'Please enter a valid email address' };
    return { valid: true };
  },

  password: (value) => {
    if (!value) return { valid: false, message: 'Password is required' };
    if (value.length < 6) return { valid: false, message: 'Password must be at least 6 characters' };
    if (!/[A-Z]/.test(value)) return { valid: false, message: 'Password should contain at least one uppercase letter' };
    if (!/[0-9]/.test(value)) return { valid: false, message: 'Password should contain at least one number' };
    return { valid: true };
  },

  name: (value) => {
    if (!value) return { valid: false, message: 'Name is required' };
    if (value.length < 2) return { valid: false, message: 'Name must be at least 2 characters' };
    if (!/^[a-zA-Z\s]+$/.test(value)) return { valid: false, message: 'Name should contain only letters and spaces' };
    return { valid: true };
  },

  phone: (value) => {
    if (!value) return { valid: false, message: 'Phone number is required' };
    const regex = /^[0-9]{10,15}$/;
    if (!regex.test(value.replace(/[\s\-()]/g, ''))) {
      return { valid: false, message: 'Please enter a valid phone number (10-15 digits)' };
    }
    return { valid: true };
  },

  vehicleNumber: (value) => {
    if (!value) return { valid: false, message: 'Vehicle number is required' };
    const regex = /^[A-Z0-9]{6,10}$/;
    if (!regex.test(value.toUpperCase())) {
      return { valid: false, message: 'Vehicle number should be 6-10 alphanumeric characters' };
    }
    return { valid: true };
  },

  price: (value) => {
    if (value === undefined || value === null || value === '') {
      return { valid: false, message: 'Price is required' };
    }
    const num = parseFloat(value);
    if (isNaN(num)) return { valid: false, message: 'Price must be a valid number' };
    if (num < 0) return { valid: false, message: 'Price cannot be negative' };
    if (num === 0) return { valid: false, message: 'Price must be greater than 0' };
    return { valid: true };
  },

  promoCode: (value) => {
    if (!value) return { valid: false, message: 'Promo code is required' };
    if (value.length < 3) return { valid: false, message: 'Promo code must be at least 3 characters' };
    if (!/^[A-Z0-9]+$/.test(value.toUpperCase())) {
      return { valid: false, message: 'Promo code can only contain letters and numbers' };
    }
    return { valid: true };
  },

  dateTime: (value) => {
    if (!value) return { valid: false, message: 'Date and time are required' };
    const date = new Date(value);
    if (isNaN(date.getTime())) return { valid: false, message: 'Please enter a valid date and time' };
    if (date < new Date()) return { valid: false, message: 'Date cannot be in the past' };
    return { valid: true };
  },
};

module.exports = validators;
