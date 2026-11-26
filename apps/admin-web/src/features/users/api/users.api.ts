import { filterUsersByName } from "@/lib/filterUsersByName";

export interface AdminUser {
  id: string;
  displayName: string;
  phone: string;
  status: "active" | "suspended";
  city: string;
}

/**
 * TODO: wire up to backend endpoint GET /api/admin/users?query=
 * (see services/backend). Returns placeholder data for the MVP skeleton.
 */
export async function searchUsers(query: string): Promise<AdminUser[]> {
  const placeholder: AdminUser[] = [
    { id: "u_1", displayName: "Asha Kumar", phone: "+91XXXXXXXX01", status: "active", city: "Chennai" },
    { id: "u_2", displayName: "Ravi Shankar", phone: "+91XXXXXXXX02", status: "suspended", city: "Chennai" },
  ];

  return Promise.resolve(filterUsersByName(placeholder, query));
}

/**
 * TODO: wire up to backend endpoint GET /api/admin/users/:id
 * (see services/backend). Returns placeholder data for the MVP skeleton.
 */
export async function getUserById(id: string): Promise<AdminUser | null> {
  const users = await searchUsers("");
  return users.find((user) => user.id === id) ?? null;
}
