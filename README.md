# pg-json-import

pg-json-import lets you take data from a JSON file, and insert it into a table on a postgres DB

## Installation

Install the tool with [npm](https://npmjs.com)

`npm install -g pg-import-json`

## Usage

```
  $ pji --file filename.json -c postgresql://localhost:5432/mydb -t tablename
  $ pji --file filename.json --database dbname --table tablename
  $ pji --file filename.json --host host --port port --database dbname --table tablename

  -f, --file file     The JSON file to load
  -c, --connection    A connection string to PostgreSQL. i.e. postgresql://localhost:5432/mydb
  -t, --table         The table name where data should be imported
  --help              show this message
```
