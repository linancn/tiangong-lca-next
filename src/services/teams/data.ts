export type TeamMemberTable = {
  user_id: string;
  team_id: string;
  role: string;
  team_title?: any;
};

export type TeamTable = {
  id: string;
  json: any;
  rank: number;
};
