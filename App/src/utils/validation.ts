// Validation schemas using Yup

import * as Yup from 'yup';
import { APP_CONFIG } from './constants';

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(APP_CONFIG.MIN_PASSWORD_LENGTH, `Password must be at least ${APP_CONFIG.MIN_PASSWORD_LENGTH} characters`)
    .required('Password is required'),
});

export const signupSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  password: Yup.string()
    .min(APP_CONFIG.MIN_PASSWORD_LENGTH, `Password must be at least ${APP_CONFIG.MIN_PASSWORD_LENGTH} characters`)
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
});

export const profileSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, 'Name must be at least 2 characters')
    .required('Name is required'),
  email: Yup.string()
    .email('Please enter a valid email')
    .required('Email is required'),
  phone: Yup.string()
    .matches(/^[0-9]{10,15}$/, 'Please enter a valid phone number')
    .optional(),
  age: Yup.number()
    .min(1, 'Age must be at least 1')
    .max(150, 'Please enter a valid age')
    .optional(),
  gender: Yup.string()
    .oneOf(['male', 'female', 'other'], 'Please select a valid gender')
    .optional(),
  symptoms: Yup.string().optional(),
  medicines: Yup.array().of(Yup.string()).optional(),
});
