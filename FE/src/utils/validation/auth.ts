// Auth validation functions for react-hook-form

// Email validation
export const validateEmail = (email: string): boolean | string => {
  if (!email.trim()) {
    return '이메일을 입력해주세요.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '올바른 이메일 형식이 아닙니다.';
  }
  return true;
};

// Password validation (for login)
export const validatePassword = (password: string): boolean | string => {
  if (!password.trim()) {
    return '비밀번호를 입력해주세요.';
  }
  return true;
};

// Password validation (for register - minimum 8 characters)
export const validateRegisterPassword = (password: string): boolean | string => {
  if (!password.trim()) {
    return '비밀번호를 입력해주세요.';
  }
  if (password.length < 8) {
    return '비밀번호는 최소 8자리 이상이어야 합니다.';
  }
  return true;
};

// Name validation
export const validateName = (name: string): boolean | string => {
  if (!name.trim()) {
    return '이름을 입력해주세요.';
  }
  return true;
};

// Nickname validation
export const validateNickname = (nickname: string): boolean | string => {
  if (!nickname.trim()) {
    return '닉네임을 입력해주세요.';
  }
  return true;
};

// Birth date validation (8 digits)
export const validateBirthDate = (birthDate: string): boolean | string => {
  if (!birthDate.trim()) {
    return '생년월일을 입력해주세요.';
  }
  if (birthDate.length !== 8) {
    return '생년월일은 8자리로 입력해주세요.';
  }
  const dateRegex = /^\d{8}$/;
  if (!dateRegex.test(birthDate)) {
    return '생년월일은 숫자만 입력해주세요.';
  }
  // Validate date format (YYYYMMDD)
  const year = parseInt(birthDate.substring(0, 4), 10);
  const month = parseInt(birthDate.substring(4, 6), 10);
  const day = parseInt(birthDate.substring(6, 8), 10);
  
  if (year < 1900 || year > new Date().getFullYear()) {
    return '올바른 연도를 입력해주세요.';
  }
  if (month < 1 || month > 12) {
    return '올바른 월을 입력해주세요.';
  }
  if (day < 1 || day > 31) {
    return '올바른 일을 입력해주세요.';
  }
  
  return true;
};

// Login form validation rules
export const loginValidationRules = {
  email: {
    required: '이메일을 입력해주세요.',
    validate: validateEmail,
  },
  password: {
    required: '비밀번호를 입력해주세요.',
    validate: validatePassword,
  },
};

// Register form validation rules
export const registerValidationRules = {
  email: {
    required: '이메일을 입력해주세요.',
    validate: validateEmail,
  },
  password: {
    required: '비밀번호를 입력해주세요.',
    validate: validateRegisterPassword,
  },
  name: {
    required: '이름을 입력해주세요.',
    validate: validateName,
  },
  nickname: {
    required: '닉네임을 입력해주세요.',
    validate: validateNickname,
  },
  birthDate: {
    required: '생년월일을 입력해주세요.',
    validate: validateBirthDate,
  },
};
