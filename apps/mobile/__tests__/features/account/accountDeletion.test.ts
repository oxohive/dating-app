import { buildDeleteAccountAlertSpec, completeAccountDeletion } from '../../../src/features/account/accountDeletion';

describe('buildDeleteAccountAlertSpec', () => {
  it('has a cancel button that does nothing (no onPress) and does not invoke onConfirm', () => {
    const onConfirm = jest.fn();
    const spec = buildDeleteAccountAlertSpec(onConfirm);

    const cancelButton = spec.buttons.find((button) => button.style === 'cancel');
    expect(cancelButton).toBeDefined();
    expect(cancelButton?.onPress).toBeUndefined();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('has exactly one destructive button whose onPress fires onConfirm', () => {
    const onConfirm = jest.fn();
    const spec = buildDeleteAccountAlertSpec(onConfirm);

    const destructiveButtons = spec.buttons.filter((button) => button.style === 'destructive');
    expect(destructiveButtons).toHaveLength(1);

    destructiveButtons[0].onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('never fires onConfirm as a side effect of building the spec', () => {
    const onConfirm = jest.fn();
    buildDeleteAccountAlertSpec(onConfirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('completeAccountDeletion', () => {
  it('clears the session before navigating to login', () => {
    const calls: string[] = [];
    const clearSession = jest.fn(() => calls.push('clearSession'));
    const navigateToLogin = jest.fn(() => calls.push('navigateToLogin'));

    completeAccountDeletion({ clearSession, navigateToLogin });

    expect(calls).toEqual(['clearSession', 'navigateToLogin']);
    expect(clearSession).toHaveBeenCalledTimes(1);
    expect(navigateToLogin).toHaveBeenCalledTimes(1);
  });
});
