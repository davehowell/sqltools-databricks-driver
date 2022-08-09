# SQLTools Databricks Driver

This package depends on the vscode-sqltools extension.

For installation use Extensions within VSCode, OR the VSCode marketplace.

## About
[SQLTools](https://marketplace.visualstudio.com/items?itemName=mtxr.sqltools) is a fantastic extension that turns VSCode into a feature-rich SQL IDE client. It already supports connections to SQLite, PostgreSQL, MySQL, MSSQL, Snowflake, Redshift, Caddandra, Trino, Teradata and others.

The purpose of this Databricks Driver for SQLTools is to extend the capability of SQLTools to support connecting to Databricks SQL Warehouses (SQL endpoints). It enables browsing the metadata catalog, and support the editing and running of adhoc and source-controlled `*.sql` files directly with Databricks.

It is not intended to use for connecting with other Databricks cluster types.

There is an existing excellent [Databricks VSCode](https://marketplace.visualstudio.com/items?itemName=paiqo.databricks-vscode) extension that utilizes Jupyter notebooks to simulate the Databricks web console experience in your local IDE. That is useful for working with notebook files as well as working with clusters, jobs and other admin tasks. This is not intented to replace that extension or compete with that functionality.

## Requirements
1. A **Databricks account** and workspace with Databricks SQL available
    1. Requires a "Premium" or higher pricing plan, "Standard" does not support SQL Warehouses nor tokens.
2. A personal access **token** (PAT) created in Databricks for your user
    1. PAT feature may need to be enabled see [tokens](https://docs.databricks.com/administration-guide/access-control/tokens.html)
3. A **Databricks SQL Warehouse** see [Create a SQL warehouse](https://docs.databricks.com/sql/admin/sql-endpoints.html#create-a-sql-warehouse)
    1. Ensure the SQL Warehouse is running
    2. Get the connection details for that SQL Warehouse
    1. You will need the `host` and `path` as well as your PAT `token` created earlier
4. VSCode
5. SQLTools extension for VSCode

## Setup

* Install from the VSCode marketplace

## Usage
* Open the config and enter the `host`, `path` and PAT `token`
* Test the connection
    * If there are errors, check the SQL Warehouse is running, and double check the connection details
    * Other potential connection issues you may check are beyond the responsibility of this extension and could include firewalls, VPN, corporate restrictions, or internet connectivity
* Usage as per the functionality of SQLTools

## Issues
Create an issue in this Github repo

## Known limitations
* Basic authentication with a username and password is intentionally not supported, and will not be supported
* The Databricks SQL connection has other configurable options including timeout settings, custom ca, cert and key amongst others. These have sensible defaults, but the ability to modify those are currently not supported
* Downloading large amounts of data and attempting to render it in a table within VSCode is a bad idea. If you run live queries the displayed data will be paged to 1000 rows. This is correct behaviour - trust me you don't want a million rows in your IDE.

#TODO add gif here

## Development
    The following relates to developing and supporting this VSCode extension, you probably just want to install it from the VSCode marketplace

* Read the [VSCode extension docs](https://code.visualstudio.com/api/get-started/your-first-extension)
* Install:
    * [Git](https://git-scm.com/)
    * [Node.js](https://nodejs.org/en/)
    * [Yarn](https://yarnpkg.com/getting-started/install) i.e. after Node.js is installed just run `corepack enable`
    * Optional if creating extension from scratch:
        * Both [Yeoman](https://yeoman.io/) and [generator-code](https://www.npmjs.com/package/generator-code) the VSCode extension generator `npm install -g yo generator-code`
* Read the [vscode-sqltools docs](https://vscode-sqltools.mteixeira.dev/contributing/support-new-drivers)
* `F5` to compile and run the extension - at this point add in your connection config
* #TODO: run the integration tests

Note: the Databricks Driver depends on [databricks-sql-nodejs](https://github.com/databricks/databricks-sql-nodejs) which has examples and more docs that are useful for development purposes.

## Changelog

### 0.0.1

- First working version
