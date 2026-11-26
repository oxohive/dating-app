export interface SuspendUserRequest {
  userId: string;
  reason: string;
}

/**
 * TODO: wire up to backend endpoint POST /api/admin/users/:id/suspend
 * (see services/backend). Stubbed for the MVP skeleton.
 */
export async function suspendUser(_request: SuspendUserRequest): Promise<void> {
  return Promise.resolve();
}
