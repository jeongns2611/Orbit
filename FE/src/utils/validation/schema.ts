import * as yup from 'yup';

// Login form schema
export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required('이메일을 입력해주세요.')
    .email('올바른 이메일 형식이 아닙니다.'),
  password: yup
    .string()
    .required('비밀번호를 입력해주세요.'),
});

// Register form schema
export const registerSchema = yup.object().shape({
  email: yup
    .string()
    .required('이메일을 입력해주세요.')
    .email('올바른 이메일 형식이 아닙니다.'),
  password: yup
    .string()
    .required('비밀번호를 입력해주세요.')
    .min(8, '비밀번호는 최소 8자리 이상이어야 합니다.'),
  name: yup
    .string()
    .required('이름을 입력해주세요.'),
  nickname: yup
    .string()
    .required('닉네임을 입력해주세요.'),
  birthDate: yup
    .string()
    .required('생년월일을 입력해주세요.')
    .length(8, '생년월일은 8자리로 입력해주세요.')
    .matches(/^\d{8}$/, '생년월일은 숫자만 입력해주세요.')
    .test('valid-date', '올바른 날짜를 입력해주세요.', (value) => {
      if (!value || value.length !== 8) return false;
      const year = parseInt(value.substring(0, 4), 10);
      const month = parseInt(value.substring(4, 6), 10);
      const day = parseInt(value.substring(6, 8), 10);
      
      if (year < 1900 || year > new Date().getFullYear()) return false;
      if (month < 1 || month > 12) return false;
      if (day < 1 || day > 31) return false;
      
      return true;
    }),
});

// TypeScript types from schemas
export type LoginFormData = yup.InferType<typeof loginSchema>;
export type RegisterFormData = yup.InferType<typeof registerSchema>;
