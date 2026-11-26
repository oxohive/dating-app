import { Alert } from 'react-native';
import { Button } from '../../../components/Button';
import { useBlockUser } from '../hooks/useBlockUser';

export type BlockButtonProps = {
  blockedProfileId: string;
  onBlocked: () => void;
};

/**
 * Block action with a confirmation prompt, wired to `POST /blocks`.
 * Single responsibility: confirm, then block.
 */
export function BlockButton({ blockedProfileId, onBlocked }: BlockButtonProps) {
  const { block, isBlocking } = useBlockUser(blockedProfileId);

  function handlePress() {
    Alert.alert('Block this user?', 'They will no longer be able to match or message you.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () => block(undefined, { onSuccess: onBlocked }),
      },
    ]);
  }

  return <Button disabled={isBlocking} label="Block" onPress={handlePress} variant="secondary" />;
}
