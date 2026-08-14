export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export type PasswordChangeErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

export type PasswordPairErrors = {
  password?: string;
  confirmPassword?: string;
};

/** Client-side checks for new + confirm password (forgot / signup). Keys are i18n paths. */
export function validatePasswordPair(
  password: string,
  confirmPassword: string,
): PasswordPairErrors {
  const errors: PasswordPairErrors = {};

  if (!password) {
    errors.password = 'forms.passwordRequired';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = 'forgot.passwordShort';
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.password = 'forms.passwordTooLong';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'forms.passwordRequired';
  } else if (password && confirmPassword !== password) {
    errors.confirmPassword = 'forgot.passwordMismatch';
  }

  return errors;
}

/** Client-side checks for change-password. Keys are i18n paths. */
export function validatePasswordChange(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {};

  if (!currentPassword.trim()) {
    errors.currentPassword = 'forms.passwordRequired';
  }

  if (!newPassword) {
    errors.newPassword = 'forms.passwordRequired';
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = 'forgot.passwordShort';
  } else if (newPassword.length > MAX_PASSWORD_LENGTH) {
    errors.newPassword = 'forms.passwordTooLong';
  } else if (currentPassword && newPassword === currentPassword) {
    errors.newPassword = 'forms.passwordSame';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'forms.passwordRequired';
  } else if (newPassword && confirmPassword !== newPassword) {
    errors.confirmPassword = 'forgot.passwordMismatch';
  }

  return errors;
}

export function isIncorrectCurrentPasswordError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    /current password/.test(msg) ||
    /incorrect password/.test(msg) ||
    /wrong password/.test(msg) ||
    /password.*(incorrect|invalid|wrong)/.test(msg)
  );
}
