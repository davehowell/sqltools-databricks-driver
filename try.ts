import { DBSQLClient } from '@databricks/sql';
import IOperation from '@databricks/sql/dist/contracts/IOperation';
import dotenv from 'dotenv';

const utils = DBSQLClient.utils;
const client = new DBSQLClient();
dotenv.config();

const TARGET_DATABASE = 'hive_metastore';
const TARGET_SCHEMA = 'sqltools_databricks_driver';
const TARGET_TABLE = 'parent';
const TARGET_VIEW = 'parent_view';

type catalogsResponse = [
    {
        TABLE_SCHEM: string
    }
];

type schemasResponse = [
    {
        TABLE_SCHEM: string
        TABLE_CATALOG: string
    }
];

type tableTypesResponse = [
    {
        TABLE_TYPE: string
    }
];

type tablesResponse = [
    {
        TABLE_CAT: string // 'hive_metastore',
        TABLE_SCHEM: string // 'sqltools_databricks_driver',
        TABLE_NAME: string // 'parent',
        TABLE_TYPE: string // '', // why is this blank?
        REMARKS: string // 'UNKNOWN',
        TYPE_CAT: string // null,
        TYPE_SCHEM: string // null,
        TYPE_NAME: string // null,
        SELF_REFERENCING_COL_NAME: string // null,
        REF_GENERATION: string // null
      }
];

type columnResponse = [
    {
        TABLE_CAT: string // 'hive_metastore',
        TABLE_SCHEM: string // 'sqltools_databricks_driver',
        TABLE_NAME: string // 'parent',
        COLUMN_NAME: string // 'id',
        DATA_TYPE: number // 4,
        TYPE_NAME: string //'INT',
        COLUMN_SIZE: number // 4,
        BUFFER_LENGTH: any // null,
        DECIMAL_DIGITS: number // 0,
        NUM_PREC_RADIX: number // 10,
        NULLABLE: number // 0,
        REMARKS: string // '',
        COLUMN_DEF: any // null,
        SQL_DATA_TYPE: any //  null,
        SQL_DATETIME_SUB: any //  null,
        CHAR_OCTET_LENGTH: any //  null,
        ORDINAL_POSITION: 0,
        IS_NULLABLE: string // 'YES',
        SCOPE_CATALOG: any //  null,
        SCOPE_SCHEMA: any //  null,
        SCOPE_TABLE: any //  null,
        SOURCE_DATA_TYPE: any //  null,
        IS_AUTO_INCREMENT: string // 'NO'
      }
]

type response = (
    catalogsResponse | schemasResponse | tableTypesResponse |
    tablesResponse | columnResponse
);

async function handle(queryOperation: IOperation, logResult: boolean = true): Promise<response> {
    await utils.waitUntilReady(queryOperation, false, () => {});
    await utils.fetchAll(queryOperation);
    await queryOperation.close();
    const result = utils.getResult(queryOperation).getValue();
    if (logResult) {
        console.log(result);
    }

    return Promise.resolve(result);

};

client
  .connect({
    host:  `${process.env.SQLTOOLS_DATABRICKS_HOST}`,
    path:  `${process.env.SQLTOOLS_DATABRICKS_PATH}`,
    token: `${process.env.SQLTOOLS_DATABRICKS_TOKEN}`,
  })
  .then(async (client) => {
    const session = await client.openSession();

    const createSchema = await session.executeStatement(`create schema if not exists hive_metastore.sqltools_databricks_driver`, {runAsync: true});
    await handle(createSchema, false);

    const createTable = await session.executeStatement(`
    create or replace table hive_metastore.sqltools_databricks_driver.parent (
        id int not null,
        name string not null,
        desc string not null
      )`
      ,{runAsync: true}
    );
    await handle(createTable, false);

    const insertTable = await session.executeStatement(`
    insert into hive_metastore.sqltools_databricks_driver.parent (id, name, desc)
    values
    (1, 'hey', 'yo'),
    (1, 'whut', 'noway')`
      ,{runAsync: true}
    );
    await handle(insertTable, false);

    const createView = await session.executeStatement(`
    create or replace view hive_metastore.sqltools_databricks_driver.parent_view as
    select * from hive_metastore.sqltools_databricks_driver.parent`
    ,{runAsync: true}
    );
    await handle(createView, false);

    const databases = await session.getCatalogs();
    await handle(databases);

    const schemas = await session.getSchemas(
        { //schemaName: 'default', // don't provide this
        catalogName: TARGET_DATABASE}
    );
    await handle(schemas);

    const tabletypes = await session.getTableTypes();
    await handle(tabletypes);

    const tables = await session.getTables(
        {
            catalogName: TARGET_DATABASE,
            schemaName: TARGET_SCHEMA,
            tableTypes: ['TABLE'], // no MATERIALIZED_VIEW ...yet
        }
    );
    await handle(tables);

    const views = await session.getTables(
        {
            catalogName: TARGET_DATABASE,
            schemaName: TARGET_SCHEMA,
            tableTypes: ['VIEW'], // no MATERIALIZED_VIEW ...yet
        }
    );
    await handle(views);

    const table_columns = await session.getColumns(
        {
            catalogName: TARGET_DATABASE,
            schemaName: TARGET_SCHEMA,
            tableName: TARGET_TABLE,
            //tableTypes: [TABLE, VIEW, MATERIALIZED_VIEW],
        }
    )
    await handle(table_columns);

    const view_columns = await session.getColumns(
        {
            catalogName: TARGET_DATABASE,
            schemaName: TARGET_SCHEMA,
            tableName: TARGET_VIEW,
            //tableTypes: [TABLE, VIEW, MATERIALIZED_VIEW],
        }
    )
    await handle(view_columns);

    //Nonsense: compulsory functionName arg means this returns single function info
    //          not a list
    //const functions = await session.getFunctions(
    //    {
    //        functionName: '',
    //        catalogName: 'hive_metastore', //samples
    //        schemaName: '',
    //    }
    //)
    //await handle(functions);

    // requires unity catalog
    // const primarykeys = await session.getPrimaryKeys(
    //     {
    //         schemaName: TARGET_SCHEMA,
    //         tableName: TARGET_TABLE,
    //         catalogName: TARGET_DATABASE, // - this is optional?? madness.
    //     }
    // )
    // await handle(primarykeys);

    // requires unity catalog
    // const foreignkeys = await session.getCrossReference(
    //     {
    //         parentCatalogName: '',
    //         parentSchemaName: '',
    //         parentTableName: '',
    //         foreignCatalogName: '',
    //         foreignSchemaName: '',
    //         foreignTableName: '',
    //     }
    // )
    // await handle(foreignkeys);

    const cleanUp = await session.executeStatement(
        `drop schema hive_metastore.sqltools_databricks_driver cascade`
        ,{runAsync: true}
    );
    await handle(cleanUp, false);

    await session.close();
    await client.close();
  })
  .catch((error) => {
    console.log(error);
  });
