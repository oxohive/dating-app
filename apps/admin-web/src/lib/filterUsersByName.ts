export interface NamedRecord {
  displayName: string;
}

/**
 * Pure helper extracted from the users search flow so it can be unit
 * tested without needing to render React components.
 */
export function filterUsersByName<T extends NamedRecord>(users: T[], query: string): T[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length === 0) {
    return users;
  }
  return users.filter((user) => user.displayName.toLowerCase().includes(trimmed));
}
