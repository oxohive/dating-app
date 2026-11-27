import { describeVerificationStatus } from '../../../src/features/verification/describeVerificationStatus';
import { colors } from '../../../src/core/theme';

describe('describeVerificationStatus', () => {
  it('describes the pending status', () => {
    expect(describeVerificationStatus('pending')).toEqual({
      label: 'Pending review',
      message: "We've got your selfie — a reviewer will check it soon.",
      color: colors.textMuted,
    });
  });

  it('describes the approved status', () => {
    expect(describeVerificationStatus('approved')).toEqual({
      label: 'Verified',
      message: 'Your profile is verified.',
      color: colors.success,
    });
  });

  it('describes the rejected status', () => {
    expect(describeVerificationStatus('rejected')).toEqual({
      label: 'Not approved',
      message: 'Your selfie was not approved. Please try submitting a new one.',
      color: colors.danger,
    });
  });
});
