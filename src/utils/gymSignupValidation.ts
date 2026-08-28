import {
  MIN_PASSWORD_LENGTH,
  validatePasswordPair,
  type PasswordPairErrors,
} from '@/src/utils/passwordValidation';

export const SIGNUP_TRIAL_DAYS = 30;
export const MAX_GYM_CITY_LENGTH = 100;
export const MAX_GYM_ADDRESS_LENGTH = 500;

const USERNAME_RE = /^[a-z0-9._]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GymSignupFieldErrors = PasswordPairErrors & {
  code?: string;
  gymName?: string;
  city?: string;
  address?: string;
  ownerName?: string;
  username?: string;
  email?: string;
};

export function validateGymSignupGymStep({
  code,
  gymName,
  city,
  address,
}: {
  code: string;
  gymName: string;
  city: string;
  address: string;
}): GymSignupFieldErrors {
  const errors: GymSignupFieldErrors = {};
  const trimmedCode = code.trim();
  if (!trimmedCode) errors.code = 'signup.codeRequired';
  else if (trimmedCode.length < 4 || trimmedCode.length > 8) errors.code = 'signup.codeInvalid';

  if (!gymName.trim()) errors.gymName = 'signup.gymNameRequired';

  const trimmedCity = city.trim();
  if (!trimmedCity) errors.city = 'validation.cityRequired';
  else if (trimmedCity.length > MAX_GYM_CITY_LENGTH) errors.city = 'validation.cityTooLong';

  if (address.trim().length > MAX_GYM_ADDRESS_LENGTH) errors.address = 'validation.addressTooLong';

  return errors;
}

export function validateGymSignupAccountStep({
  ownerName,
  username,
  email,
  password,
  confirm,
}: {
  ownerName: string;
  username: string;
  email: string;
  password: string;
  confirm: string;
}): GymSignupFieldErrors {
  const errors: GymSignupFieldErrors = { ...validatePasswordPair(password, confirm) };

  if (!ownerName.trim()) errors.ownerName = 'signup.ownerNameRequired';

  const cleanUsername = username.trim().toLowerCase();
  if (!cleanUsername) errors.username = 'validation.usernameRequired';
  else if (!USERNAME_RE.test(cleanUsername)) errors.username = 'signup.usernameInvalid';

  const trimmedEmail = email.trim();
  if (trimmedEmail && !EMAIL_RE.test(trimmedEmail)) errors.email = 'validation.emailInvalid';

  if (password.length > 0 && password.length < MIN_PASSWORD_LENGTH) {
    errors.password = 'signup.passwordShort';
  }

  return errors;
}
