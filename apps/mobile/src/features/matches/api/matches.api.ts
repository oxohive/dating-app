import { apiClient } from '../../../core/apiClient';

export type MatchParticipant = {
  id: string;
  display_name: string;
  photo_url?: string | null;
};

export type MatchDto = {
  id: string;
  profile: MatchParticipant;
  matched_at: string;
  /**
   * The conversation created alongside this match. The contract doesn't
   * expose a "create conversation" endpoint, which implies the backend
   * provisions one automatically when the match is formed — this field is
   * expected to be present, but is typed nullable defensively in case it
   * hasn't landed yet by the time this screen renders.
   */
  conversation_id?: string | null;
};

type MatchesResponse = {
  matches: MatchDto[];
};

export async function fetchMatches(): Promise<MatchDto[]> {
  const response = await apiClient.get<MatchesResponse>('/matches');
  return response.matches;
}

export async function unmatch(matchId: string): Promise<void> {
  await apiClient.post<void>(`/matches/${matchId}/unmatch`);
}
