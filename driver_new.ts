import AbstractDriver from '@sqltools/base-driver';
import { IConnectionDriver, MConnectionExplorer, NSDatabase, ContextValue, Arg0 } from '@sqltools/types';
import { DBSQLClient } from '@databricks/sql';
import IHiveSession from '@databricks/sql/dist/contracts/IHiveSession';
//TODO: when next version is released, change IHiveSession to: import { DBSQLSession } from '@databricks/sql';
//import IOperation from '@databricks/sql/dist/contracts/IOperation';
import { v4 as generateId } from 'uuid';
import queries from './queries';
import QueryParser from './parser';
//import response from '.response';


const utils = DBSQLClient.utils;


type DBSQLOptions = {
  host: string;
  path: string;
  token: string;
};

export default class DatabricksSQL extends AbstractDriver<DBSQLClient, DBSQLOptions> implements IConnectionDriver {
  queries = queries;

  declare connection: Promise<DBSQLClient>;
  declare session: Promise<IHiveSession>;

  public async open(): Promise<DBSQLClient> {
    if (!this.connection) {
      const clientConfig: DBSQLOptions = {
        host: this.credentials.host.trim(),
        path: this.credentials.path.trim(),
        token: this.credentials.token.trim(),
      }
      if (!(clientConfig.host && clientConfig.path && clientConfig.token)) {
        return Promise.reject({
          message: 'Missing config info. Ensure host, path, and token are set in connection details.',
        });
      }
      if (clientConfig.host.toUpperCase().startsWith('http')) {
        return Promise.reject({
          message: `Incorrect Host config. Try removing the https:// from ${clientConfig.host}`,
        });
      }

      try {
        const client = new DBSQLClient();
        const conn = await client.connect(clientConfig);
        this.connection = Promise.resolve(conn);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return this.connection;
  }

  private async openSession(conn: DBSQLClient): Promise<IHiveSession> {
    if (!this.session) {
      try {
        const session = await conn.openSession();
        this.session = Promise.resolve(session);
      } catch (error) {
        return Promise.reject(error);
      }
   }
    return this.session;
  }

  public async close() {
    if (this.connection) {

      if (this.session) {
        const sess = await this.session;
        await sess.close();
        this.session = null;
      }

      const conn = await this.connection;
      conn.close();
      this.connection = null;
    }
    return Promise.resolve();
  }

  public query: typeof AbstractDriver['prototype']['query'] = async (query, opt = {}) => {
    // can we add optional args then unpack/intercept them? Smuggling. Probably not idiomatic typescript
    //const {runAsync, confOverlay, queryTimeout, ...opts } = opt as ExecuteStatementOptions;

    const resultsAgg: NSDatabase.IResult[] = [];

    const queries = QueryParser.parse(query.toString()).filter(Boolean);

    const conn = await this.open();

    const session = await this.openSession(conn);

    for (const qry in queries) {
      const messages = [];
      //subscribe to client connection's potential async network errors
      conn.on('error', (error) => {
        messages.push({ message: error, date: new Date() });
      });
      try {
        const queryOperation = await session.executeStatement(qry, {runAsync: true});
        await utils.waitUntilReady(queryOperation, false);
        await utils.fetchAll(queryOperation);
        //const status = await queryOperation.status(false) //TODO: add to messages, getInfo()

        await queryOperation.close();
        const queryResult = utils.getResult(queryOperation).getValue();
        messages.push({ date: new Date(), message: `Query ok with ${queryResult.length} results` });

        resultsAgg.push(<NSDatabase.IResult>{
          cols: Object.keys(queryResult[0]),
          connId: this.getId(),
          messages: messages,
          results: queryResult,
          query: qry.toString(),
          requestId: opt.requestId,
          resultId: generateId(),
        });
      } catch (err) {
        messages.push(
          this.prepareMessage(
            [
              (err && err.message) || err,
              err && err.routine === 'scanner_yyerror' && err.position ? `at character ${err.position}` : undefined,
            ]
              .filter(Boolean)
              .join(' '),
          ),
        );
        resultsAgg.push(<NSDatabase.IResult>{
          resultId: generateId(),
          requestId: opt.requestId,
          connId: this.getId(),
          error: true,
          rawError: err,
          results: [],
          cols: [],
          query,
          messages: messages,
        });
      } finally {
        session && (await session.close());
      }
      return resultsAgg;
    }
  };

  public async testConnection() {
    console.log('Executing connection test');
    try {
      await this.open();
      await this.query('SELECT 1', {runAsync: true});
      await this.close();
    } catch (e) {
      console.error('Connection test failed with message');
      console.error(e);
      throw 'Connection test failed.';
    }
    console.log('Databricks connection test successful');
  }

  //TODO: What is the interface to the explorer tree - what methods to I need to implement?
  // AbstractDriver
  //  .open()
  //  .close()
  //  .query()
  //  .describeTable(metadata: NSDatabase.ITable, opt: IQueryOptions): [result] -- a boxed query result
  //  .getChildrenForItem(_params: { item: NSDatabase.SearchableItem; parent?: NSDatabase.SearchableItem }): Promise<MConnectionExplorer.IChildItem[]>
  //  .searchItems(_itemType: ContextValue, _search: string, _extraParams?: any): Promise<NSDatabase.SearchableItem[]>


  //TODO: cancel operation - UI ?
  //    DBSQLOperation.cancel()

  // session methods:
  // getCatalogs(): Promise<IOperation>;
  // getSchemas(request: SchemasRequest): Promise<IOperation>;
  //     SchemasRequest = {schemaName?: string;catalogName?: string};
  //     return a query result {label, schema, type, childType, iconId}
  //     what .query() returns?
  // getTables(request: TablesRequest): Promise<IOperation>;
  //     https://github.com/databricks/databricks-sql-nodejs/blob/a2a4b32b6155314960496a4391aeeed7f5fdbb26/lib/contracts/IDBSQLSession.ts#L21
  // getTableTypes(): Promise<IOperation>;
  // getColumns(request: ColumnRequest): Promise<IOperation>;
  // getFunctions(request: FunctionNameRequest): Promise<IOperation>;
  // getPrimaryKeys(request: PrimaryKeysRequest): Promise<IOperation>;
  // getCrossReference(request: CrossReferenceRequest): Promise<IOperation>; // foreign keys


  // type request = SchemasRequest | TablesRequest | ColumnRequest | FunctionNameRequest | PrimaryKeysRequest | CrossReferenceRequest
  // /**
  //  * Wraps the API methods to return what looks like a SQL query result
  //  * @param func a DBSQLSession method
  //  * @param request
  //  * @returns Promise<NSDatabase.IResult[]>
  //  */
  // private async getMetadata<R = any, Q = any>(methodName: Q | string, request = {}): Promise<NSDatabase.IResult<Q extends IExpectedResult<infer U> ? U : R>[]> {
  //   const messages = [];
  //   const resultsAgg: NSDatabase.IResult[] = []
  //   const conn = await this.open();
  //   const session = await this.openSession(conn);
  //   try {
  //     const operation = await session[methodName as keyof typeof session].apply(session, request);
  //     await utils.waitUntilReady(operation, false);
  //     await utils.fetchAll(operation);
  //     await operation.close();
  //     const result = utils.getResult(operation).getValue();
  //     messages.push({ date: new Date(), message: `Query ok with ${result.length} results` });
  //     resultsAgg.push(<NSDatabase.IResult>{
  //       cols: Object.keys(result[0]),
  //       connId: this.getId(),
  //       messages: messages,
  //       results: result,
  //       query: methodName + request.toString(),
  //       requestId: generateId(),
  //       resultId: generateId(),
  //     });
  //   } catch (err) {
  //     messages.push(
  //       this.prepareMessage(
  //         [
  //           (err && err.message) || err,
  //           err && err.routine === 'scanner_yyerror' && err.position ? `at character ${err.position}` : undefined,
  //         ]
  //           .filter(Boolean)
  //           .join(' '),
  //       ),
  //     );
  //     resultsAgg.push(<NSDatabase.IResult>{
  //       resultId: generateId(),
  //       requestId: generateId(),
  //       connId: this.getId(),
  //       error: true,
  //       rawError: err,
  //       results: [],
  //       cols: [],
  //       query: methodName + request.toString(),
  //       messages: messages,
  //     });
  //   } finally {
  //     session && (await session.close());
  //   }
  //   return resultsAgg
  // };

  // private singleMetadata<R = any, Q = any>(methodName: Q | string , request: object) {
  //   return this.getMetadata<R, Q>(methodName, request).then(([ res ]) => res);
  // }

  // private metadataResults = async <R = any, Q = any>(methodName: Q | string, request?: object ) => {
  //   const result = await this.singleMetadata<R, Q>(methodName, request);
  //   if (result.error) throw result.rawError;
  //   return result.results;
  // }

  // private async getDatabases() {
  // // schema_name as "label",
  // // schema_name as "database",
  // // catalog_name as "catalog",
  // // '${ContextValue.DATABASE}' as "type",
  // // 'database' as "detail"
  //   const results = await this.metadataResults('getCatalogs', {});
  //   results.map(db => ({
  //     label: db[0].TABLE_CAT,
  //     database: db[0].TABLE_CAT,
  //     catalog: db[0].TABLE_CAT,
  //     type: ContextValue.DATABASE,
  //     detail: 'database'
  //   }))
  //   return results;
  // }

  // private async getSchemas() {
  //   // schema_name AS label,
  //   // schema_name AS "schema",
  //   // '${ContextValue.SCHEMA}' as "type",
  //   // 'group-by-ref-type' as "iconId",
  //   // catalog_name as "database"
  //   return this.getMetadata('getSchemas',
  //    {schemaName: '', catalogName: ''}
  //   )
  // }

  private async getColumns(parent: NSDatabase.ITable): Promise<NSDatabase.IColumn[]> {
    const results = await this.queryResults(this.queries.fetchColumns(parent));
    return results.map(col => ({
      ...col,
      iconName: col.isPk ? 'pk' : (col.isFk ? 'fk' : null),
      childType: ContextValue.NO_CHILD,
      table: parent
    }));
  }

  /**
   * This method is a helper to generate the connection explorer tree.
   * it gets the child items based on current item
   */
  public async getChildrenForItem({ item, parent }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    switch (item.type) {
      case ContextValue.CONNECTION:
      case ContextValue.CONNECTED_CONNECTION:
        return this.queryResults(this.queries.fetchDatabases());
      case ContextValue.TABLE:
      case ContextValue.VIEW:
      case ContextValue.MATERIALIZED_VIEW:
        return this.getColumns(item as NSDatabase.ITable);
      case ContextValue.DATABASE:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Schemas', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.SCHEMA },
        ];
      case ContextValue.RESOURCE_GROUP:
        return this.getChildrenForGroup({ item, parent });
      case ContextValue.SCHEMA:
        return <MConnectionExplorer.IChildItem[]>[
          { label: 'Tables', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.TABLE },
          { label: 'Views', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.VIEW },
          { label: 'Materialized Views', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.MATERIALIZED_VIEW },
          { label: 'Functions', type: ContextValue.RESOURCE_GROUP, iconId: 'folder', childType: ContextValue.FUNCTION },
        ];
    }
    return [];
  }


    // @return {
    //        database: 'fakedb',
    //        label: `${item.childType}${i++}`,
    //        type: item.childType,
    //        schema: 'fakeschema',
    //        childType: ContextValue.COLUMN,
    //      }
  /**
   * This method is a helper to generate the connection explorer tree.
   * It gets the child based on child types
   */
  private async getChildrenForGroup({ parent, item }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    console.log({ item, parent });
    switch (item.childType) {
      case ContextValue.TABLE:
      case ContextValue.VIEW:
        let i = 0;
        return <MConnectionExplorer.IChildItem[]>[
          {
            database: 'fakedb',
            label: `${item.childType}${i++}`,
            type: item.childType,
            schema: 'fakeschema',
            childType: ContextValue.COLUMN,
          },
          {
            database: 'fakedb',
            label: `${item.childType}${i++}`,
            type: item.childType,
            schema: 'fakeschema',
            childType: ContextValue.COLUMN,
          },
          {
            database: 'fakedb',
            label: `${item.childType}${i++}`,
            type: item.childType,
            schema: 'fakeschema',
            childType: ContextValue.COLUMN,
          },
        ];
    }
    return [];
  }

  /**
   * This method is a helper for intellisense and quick picks.
   */
  public async searchItems(
    itemType: ContextValue,
    search: string,
    _extraParams: any = {},
  ): Promise<NSDatabase.SearchableItem[]> {
    switch (itemType) {
      case ContextValue.TABLE:
      case ContextValue.VIEW:
        let j = 0;
        return [
          {
            database: 'fakedb',
            label: `${search || 'table'}${j++}`,
            type: itemType,
            schema: 'fakeschema',
            childType: ContextValue.COLUMN,
          },
          {
            database: 'fakedb',
            label: `${search || 'table'}${j++}`,
            type: itemType,
            schema: 'fakeschema',
            childType: ContextValue.COLUMN,
          },
          {
            database: 'fakedb',
            label: `${search || 'table'}${j++}`,
            type: itemType,
            schema: 'fakeschema',
            childType: ContextValue.COLUMN,
          },
        ];
      case ContextValue.COLUMN:
        let i = 0;
        return [
          {
            database: 'fakedb',
            label: `${search || 'column'}${i++}`,
            type: ContextValue.COLUMN,
            dataType: 'faketype',
            schema: 'fakeschema',
            childType: ContextValue.NO_CHILD,
            isNullable: false,
            iconName: 'column',
            table: 'fakeTable',
          },
          {
            database: 'fakedb',
            label: `${search || 'column'}${i++}`,
            type: ContextValue.COLUMN,
            dataType: 'faketype',
            schema: 'fakeschema',
            childType: ContextValue.NO_CHILD,
            isNullable: false,
            iconName: 'column',
            table: 'fakeTable',
          },
          {
            database: 'fakedb',
            label: `${search || 'column'}${i++}`,
            type: ContextValue.COLUMN,
            dataType: 'faketype',
            schema: 'fakeschema',
            childType: ContextValue.NO_CHILD,
            isNullable: false,
            iconName: 'column',
            table: 'fakeTable',
          },
          {
            database: 'fakedb',
            label: `${search || 'column'}${i++}`,
            type: ContextValue.COLUMN,
            dataType: 'faketype',
            schema: 'fakeschema',
            childType: ContextValue.NO_CHILD,
            isNullable: false,
            iconName: 'column',
            table: 'fakeTable',
          },
          {
            database: 'fakedb',
            label: `${search || 'column'}${i++}`,
            type: ContextValue.COLUMN,
            dataType: 'faketype',
            schema: 'fakeschema',
            childType: ContextValue.NO_CHILD,
            isNullable: false,
            iconName: 'column',
            table: 'fakeTable',
          },
        ];
    }
    return [];
  }

  public getStaticCompletions: IConnectionDriver['getStaticCompletions'] = async () => {
    return {};
  };
}
