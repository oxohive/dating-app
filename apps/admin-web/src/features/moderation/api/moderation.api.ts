import { apiClient } from "@/lib/apiClient";

export interface SuspendUserRequest {
  userId: string;
  reason: string;
}

/**
 * Suspends a user. POST /admin/users/{id}/suspend -> 204 (requires
 * is_admin). The backend route
 * (services/backend/packages/api/features/admin/routes.py) takes no
 * request body - it just flips `is_active` to false - so `reason` is kept
 * on the dialog as a confirmation/audit affordance for the admin typing it,
 * but isn't sent to the API since the backend has nowhere to store it yet.
 */
export async function suspendUser({ userId }: SuspendUserRequest): Promise<void> {
  await apiClient.post<void>(`/admin/users/${userId}/suspend`);
}
