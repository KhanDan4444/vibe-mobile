import { isValidEthiopianPhone } from '@/src/utils/phone';
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from '@/src/utils/passwordValidation';

export const MAX_NAME_LENGTH = 200;
export const MAX_BRANCH_ADDRESS_LENGTH = 500;
const USERNAME_RE = /^[a-z0-9._]+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrorMap = Record<string, string | undefined>;

export function validatePlanFields(fields: {
  name: string;
  duration: string;
  price: string;
}): FieldErrorMap {
  const errors: FieldErrorMap = {};
  const name = fields.name.trim();
  if (!name) errors.name = 'validation.nameRequired';
  else if (name.length > MAX_NAME_LENGTH) errors.name = 'validation.nameTooLong';

  const dur = parseInt(String(fields.duration).trim(), 10);
  if (!String(fields.duration).trim() || Number.isNaN(dur) || dur < 1) {
    errors.duration = 'validation.planDurationMin';
  }

  const priceRaw = String(fields.price).trim();
  const price = priceRaw === '' ? NaN : Number(priceRaw);
  if (priceRaw === '' || Number.isNaN(price) || price < 0) {
    errors.price = 'validation.planPriceInvalid';
  }

  return errors;
}

export function validateStaffFields(fields: {
  name: string;
  username: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  branchId: number | null;
  requireBranch: boolean;
  isEdit?: boolean;
}): FieldErrorMap {
  const errors: FieldErrorMap = {};
  const name = fields.name.trim();
  if (!name) errors.name = 'validation.nameRequired';
  else if (name.length > MAX_NAME_LENGTH) errors.name = 'validation.nameTooLong';

  if (fields.requireBranch && fields.branchId == null) {
    errors.branchId = 'validation.branchRequired';
  }

  const username = fields.username.trim().toLowerCase();
  if (!username) errors.username = 'validation.usernameRequired';
  else if (username.length < 3) errors.username = 'validation.usernameTooShort';
  else if (username.length > 30) errors.username = 'validation.usernameTooLong';
  else if (!USERNAME_RE.test(username)) errors.username = 'validation.usernameInvalid';

  const email = (fields.email ?? '').trim();
  if (email && (!EMAIL_RE.test(email) || email.length > 255)) {
    errors.email = 'validation.emailInvalid';
  }

  const password = fields.password ?? '';
  const confirmPassword = fields.confirmPassword ?? '';
  if (!fields.isEdit) {
    if (!password) errors.password = 'forms.passwordRequired';
    else if (password.length < MIN_PASSWORD_LENGTH) errors.password = 'forgot.passwordShort';
    else if (password.length > MAX_PASSWORD_LENGTH) errors.password = 'forms.passwordTooLong';
    else if (password !== confirmPassword) errors.confirmPassword = 'forgot.passwordMismatch';
  }

  return errors;
}

export function validateStaffPasswordReset(
  password: string,
  confirmPassword = ''
): FieldErrorMap {
  const errors: FieldErrorMap = {};
  if (!password.trim()) errors.password = 'forms.passwordRequired';
  else if (password.length < MIN_PASSWORD_LENGTH) errors.password = 'forgot.passwordShort';
  else if (password.length > MAX_PASSWORD_LENGTH) errors.password = 'forms.passwordTooLong';
  else if (password !== confirmPassword) errors.confirmPassword = 'forgot.passwordMismatch';
  return errors;
}

export function validateBranchFields(fields: {
  name: string;
  phone?: string;
  address?: string;
}): FieldErrorMap {
  const errors: FieldErrorMap = {};
  const name = fields.name.trim();
  if (!name) errors.name = 'validation.nameRequired';
  else if (name.length > MAX_NAME_LENGTH) errors.name = 'validation.nameTooLong';

  const phone = (fields.phone ?? '').trim();
  if (phone && !isValidEthiopianPhone(phone)) {
    errors.phone = 'validation.phoneInvalid';
  }

  const address = (fields.address ?? '').trim();
  if (address.length > MAX_BRANCH_ADDRESS_LENGTH) {
    errors.address = 'validation.addressTooLong';
  }

  return errors;
}

export function validateTrainerFields(fields: {
  name: string;
  phone?: string;
  branchId: number | null;
  requireBranch: boolean;
}): FieldErrorMap {
  const errors: FieldErrorMap = {};
  const name = fields.name.trim();
  if (!name) errors.name = 'validation.nameRequired';
  else if (name.length > MAX_NAME_LENGTH) errors.name = 'validation.nameTooLong';
  if (fields.requireBranch && fields.branchId == null) {
    errors.branchId = 'validation.branchRequired';
  }
  const phone = (fields.phone ?? '').trim();
  if (!phone) errors.phone = 'validation.phoneRequired';
  else if (!isValidEthiopianPhone(phone)) {
    errors.phone = 'validation.phoneInvalid';
  }
  return errors;
}

export function hasFieldErrors(errors: FieldErrorMap): boolean {
  return Object.values(errors).some(Boolean);
}
