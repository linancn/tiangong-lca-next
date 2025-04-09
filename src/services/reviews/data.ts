import { ProcessTable } from "../processes/data";

export type ReviewsTable = {
    key: string;
    id: string;
    data_id: string;
    data_version: string;
    reviewer_id: string[];
    state_code: number;
    processes: ProcessTable;
  };
  