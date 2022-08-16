import AbstractDriver from '@sqltools/base-driver';
import { IConnectionDriver, MConnectionExplorer, NSDatabase, ContextValue, Arg0 } from '@sqltools/types';
import { DBSQLClient } from '@databricks/sql';

import queries from './queries';
import QueryParser from './parser';
import { v4 as generateId } from 'uuid';
import IHiveSession from '@databricks/sql/dist/contracts/IHiveSession';
//import { DBSQLSession } from './interfaces';

const utils = DBSQLClient.utils;

type DBSQLOptions = {
  host: string;
  path: string;
  token: string;
};

export default class DatabricksSQL extends AbstractDriver<DBSQLClient, DBSQLOptions> implements IConnectionDriver {
  queries = queries;

  /**
   *
   */
  session: Promise<any>;

  public async openConnection() {
    if (this.connection) {
      return this.connection;
    }
    const clientConfig: DBSQLOptions = {
      host: this.credentials.host.trim(),
      path: this.credentials.path.trim(),
      token: this.credentials.token.trim(),
    };
    if (!(clientConfig.host && clientConfig.path && clientConfig.token)) {
      return Promise.reject({
        message: 'Missing config info. Ensure host, path, and token are set in connection details.',
      });
    }
    try {
      const client = new DBSQLClient();
      const conn = await client.connect(clientConfig);
      this.connection = Promise.resolve(conn)
    } catch (error) {
      return Promise.reject(error);
    }
    return this.connection;
  }

  public async open() {
    if (this.session) {
      return this.session;
    }
    try {
      await this.openConnection()
      const conn = await this.connection;
      const sess = await conn.openSession()
      this.session = Promise.resolve(sess)
    } catch (error) {
      return Promise.reject(error);
    }
    return this.session;
  }


  public async close() {
    if (!this.connection) return Promise.resolve();

    if (this.session) {
      const sess = await this.session;
      await sess.close()
      this.session = null;
    }

    const conn = await this.connection;
    await conn.close();
    this.connection = null;
  }

  public query: typeof AbstractDriver['prototype']['query'] = async (query, opt = {}) => {
    const session = await this.open();
    const queries = QueryParser.parse(query.toString()).filter(Boolean);
    /**
     *
     *  queries could be multiple, parse them with ;
     *  e.g. https://github.com/cloudspannerecosystem/sqltools-cloud-spanner-driver/blob/main/src/ls/parser.ts
     * or https://github.com/mtxr/vscode-sqltools/blob/dev/packages/util/query/parse.ts
     *
     * https://github.com/SAP/sap-hana-driver-for-sqltools/blob/master/src/ls/driver.ts
     * declare a DatabricksSession interface that includes those methods & properties -
     * public open(): Promise<DatabricksSession> { ...}
     *
     */




    const queriesResults = await session.query(queries);

    const resultsAgg: NSDatabase.IResult[] = [];
    queriesResults.forEach((queryResult) => {
      resultsAgg.push({
        cols: Object.keys(queryResult[0]),
        connId: this.getId(),
        messages: [{ date: new Date(), message: `Query ok with ${queriesResults.length} results` }],
        results: queryResult,
        query: queries.toString(),
        requestId: opt.requestId,
        resultId: generateId(),
      });
    });
    return resultsAgg;
  };

  /** if you need a different way to test your connection, you can set it here.
   * Otherwise by default we open and close the connection only
   */
  public async testConnection() {
    await this.open();
    await this.query('SELECT 1', {});
    await this.close()
  }

  /**
   * This method is a helper to generate the connection explorer tree.
   * it gets the child items based on current item
   */
  public async getChildrenForItem({ item, parent }: Arg0<IConnectionDriver['getChildrenForItem']>) {
    switch (item.type) {
      case ContextValue.CONNECTION:
      case ContextValue.CONNECTED_CONNECTION:
        return <MConnectionExplorer.IChildItem[]>[
          {
            label: 'Tables',
            type: ContextValue.RESOURCE_GROUP,
            iconId: 'folder',
            childType: ContextValue.TABLE,
          },
          {
            label: 'Views',
            type: ContextValue.RESOURCE_GROUP,
            iconId: 'folder',
            childType: ContextValue.VIEW,
          },
        ];
      case ContextValue.TABLE:
      case ContextValue.VIEW:
        let i = 0;
        return <NSDatabase.IColumn[]>[
          {
            database: 'fakedb',
            label: `column${i++}`,
            type: ContextValue.COLUMN,
            dataType: 'faketype',
            schema: 'fakeschema',
            childType: ContextValue.NO_CHILD,
            isNullable: false,
            iconName: 'column',
            table: parent,
          },
          {
            database: 'fakedb',
            label: `column${i++}`,
            type: ContextValue.COLUMN,
            dataType: 'faketype',
            schema: 'fakeschema',
            childType: ContextValue.NO_CHILD,
            isNullable: false,
            iconName: 'column',
            table: parent,
          },
          {
            database: 'fakedb',
            label: `column${i++}`,
            type: ContextValue.COLUMN,
            dataType: 'faketype',
            schema: 'fakeschema',
            childType: ContextValue.NO_CHILD,
            isNullable: false,
            iconName: 'column',
            table: parent,
          },
          {
            database: 'fakedb',
            label: `column${i++}`,
            type: ContextValue.COLUMN,
            dataType: 'faketype',
            schema: 'fakeschema',
            childType: ContextValue.NO_CHILD,
            isNullable: false,
            iconName: 'column',
            table: parent,
          },
          {
            database: 'fakedb',
            label: `column${i++}`,
            type: ContextValue.COLUMN,
            dataType: 'faketype',
            schema: 'fakeschema',
            childType: ContextValue.NO_CHILD,
            isNullable: false,
            iconName: 'column',
            table: parent,
          },
        ];
      case ContextValue.RESOURCE_GROUP:
        return this.getChildrenForGroup({ item, parent });
    }
    return [];
  }

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
