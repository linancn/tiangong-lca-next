export type TeamMemberTable = {
  user_id: string;
  team_id: string;
  role: string;
  display_name?: string;
  email: string;
};

export type TeamTable = {
  id: string;
  json: any;
  rank: number;
};
