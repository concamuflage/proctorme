declare module "pg" {
  export type QueryResultRow = Record<string, unknown>;

  export type QueryResult<Row = any> = {
    rows: Row[];
    rowCount: number | null;
  };

  export type QueryConfig = {
    text: string;
    values?: readonly unknown[];
  };

  export type Queryable = {
    query<Row = any>(
      queryTextOrConfig: string | QueryConfig,
      values?: readonly unknown[],
    ): Promise<QueryResult<Row>>;
  };

  export type PoolClient = Pool & {
    release(): void;
  };

  export class Pool implements Queryable {
    constructor(config?: unknown);

    query<Row = any>(
      queryTextOrConfig: string | QueryConfig,
      values?: readonly unknown[],
    ): Promise<QueryResult<Row>>;

    connect(): Promise<PoolClient>;

    end(): Promise<void>;
  }
}
