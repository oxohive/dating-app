import { colors } from '../../core/theme';
import type { VerificationStatus } from './api/verification.api';

export type VerificationStatusDisplay = {
  label: string;
  message: string;
  color: string;
};

/**
 * Maps a verification status to its display label/message/color. Pulled
 * out as a pure function so the status screen's rendering logic is
 * unit-testable for every status value without rendering React Native
 * components (matching this app's existing test conventions, which test
 * pure helpers rather than mounting components — see `__tests__/`).
 */
export function describeVerificationStatus(status: VerificationStatus): VerificationStatusDisplay {
  switch (status) {
    case 'pending':
      return { label: 'Pending review', message: "We've got your selfie — a reviewer will check it soon.", color: colors.textMuted };
    case 'approved':
      return { label: 'Verified', message: 'Your profile is verified.', color: colors.success };
    case 'rejected':
      return {
        label: 'Not approved',
        message: 'Your selfie was not approved. Please try submitting a new one.',
        color: colors.danger,
      };
    default:
      return { label: status, message: '', color: colors.textMuted };
  }
}
