import { apiClient } from "@/lib/apiClient";

export interface AdminUser {
  id: string;
  displayName: string;
  phone: string;
  status: "active" | "suspended";
  isAdmin: boolean;
}

/**
 * Matches `UserAdminOut` in
 * services/backend/packages/api/features/admin/schemas.py exactly: id,
 * phone_number, display_name (nullable - a user may not have onboarded a
 * profile yet), is_active, is_admin, created_at. No city/location field is
 * returned by this endpoint.
 */
interface AdminUserApiModel {
  id: string;
  phone_number: string;
  display_name: string | null;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

function mapAdminUser(raw: AdminUserApiModel): AdminUser {
  return {
    id: raw.id,
    displayName: raw.display_name ?? "(no profile yet)",
    phone: raw.phone_number,
    status: raw.is_active ? "active" : "suspended",
    isAdmin: raw.is_admin,
  };
}

/**
 * Searches admin users by phone number or display name.
 * GET /admin/users?query= -> 200 list (requires is_admin).
 */
export async function searchUsers(query: string): Promise<AdminUser[]> {
  const results = await apiClient.get<AdminUserApiModel[]>(`/admin/users?query=${encodeURIComponent(query)}`);
  return results.map(mapAdminUser);
}
