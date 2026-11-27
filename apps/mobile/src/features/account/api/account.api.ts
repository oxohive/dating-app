import { apiClient } from '../../../core/apiClient';

/**
 * Irreversibly deletes the current user's account. `POST
 * /auth/account/delete` is authenticated via the existing bearer token
 * (no request body needed) and responds `204` with no body — same
 * bare-204 shape every other no-content auth endpoint in this app uses.
 */
export async function deleteAccount(): Promise<void> {
  await apiClient.post<void>('/auth/account/delete');
}
