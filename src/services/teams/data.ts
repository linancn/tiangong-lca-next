import type { LangTextValue } from '../general/data';

export type TeamMemberTable = {
  user_id: string;
  team_id: string;
  role: string;
  display_name?: string;
  email: string;
};

export type TeamJson = {
  title?: LangTextValue;
  description?: LangTextValue;
  lightLogo?: string;
  darkLogo?: string;
  previewLightUrl?: string;
  previewDarkUrl?: string;
  [key: string]: unknown;
};

export type TeamTable = {
  id: string;
  json: TeamJson;
  rank: number;
  is_public?: boolean;
  user_id?: string;
  ownerEmail?: string;
  created_at?: string;
  modified_at?: string;
};
