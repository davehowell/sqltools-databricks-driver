export type catalogsResponse = [
    {
        TABLE_SCHEM: string
    }
];

export type schemasResponse = [
    {
        TABLE_SCHEM: string
        TABLE_CATALOG: string
    }
];

export type tableTypesResponse = [
    {
        TABLE_TYPE: string
    }
];

export type tablesResponse = [
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

export type columnResponse = [
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

export type response = (
    catalogsResponse | schemasResponse | tableTypesResponse |
    tablesResponse | columnResponse
);
