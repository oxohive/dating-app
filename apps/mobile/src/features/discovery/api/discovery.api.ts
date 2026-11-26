import { apiClient } from '../../../core/apiClient';

export type DiscoveryProfile = {
  id: string;
  display_name: string;
  age: number;
  bio?: string | null;
  interests?: string[] | null;
  city: string;
  locality: string;
  photo_urls: string[];
};

export type DiscoveryFeedResponse = {
  profiles: DiscoveryProfile[];
  next_offset: number | null;
};

const FEED_PAGE_SIZE = 10;

export async function fetchDiscoveryFeed(offset = 0, limit = FEED_PAGE_SIZE): Promise<DiscoveryFeedResponse> {
  return apiClient.get<DiscoveryFeedResponse>(`/discovery/feed?limit=${limit}&offset=${offset}`);
}

export async function passProfile(toProfileId: string): Promise<void> {
  await apiClient.post<void>('/discovery/pass', { to_profile_id: toProfileId });
}
