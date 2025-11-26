export type ReviewsTable = {
  key: string;
  id: string;
  name: string;
  teamName: string;
  modifiedAt?: string;
  userName: string;
  createAt?: string;
  isFromLifeCycle: boolean;
  stateCode?: number;
  comments?: { state_code: number }[];
  json: {
    data: {
      id: string;
      version: string;
      name: any;
    };
    team: {
      name: string;
      id: string;
    };
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
};
