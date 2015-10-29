'use strict';

const BPromise = require('bluebird');
const commandLineArgs = require('command-line-args');
const jsonfile = require('jsonfile');
const knex = require('knex');
const args = require('./args');

let cli = commandLineArgs(args);
let options = cli.parse();

if (Object.keys(options).length === 0 || options.help) {
  displayUsage();
  exit(0);
}

if (!options.file || !options.file.exists) {
  console.error('You must provide a valid JSON file to open with -f or --file');
  exit(1);
}

if (!options.connection) {
  console.error('You must provide a connection string for PostgreSQL with -c or --connection');
  exit(1);
}

if (!options.table) {
  console.error('You must specify a destination table for the data using -t or --table');
  exit(1);
}

let json;

console.info('Reading File...');

try {
  json = jsonfile.readFileSync(options.file.filename);
} catch(ex) {
  console.error(`There was a problem reading ${options.file.filename}:\n`, ex.toString());
  exit(1);
}

let pg = knex({
  client: 'pg',
  connection: options.connection
});

console.info('Importing Data...');

pg.transaction((trx) => {
  return BPromise.map(json, (row) => {
    return trx.insert(row)
    .into(options.table);
  })
  .then(trx.commit)
  .catch(trx.rollback);
})
.then((inserts) => {
  console.info(`${inserts.length} rows imported into the '${options.table}' table.`);
  exit(0);
})
.catch((error) => {
  console.error(`There was an error importing into ${options.table}. The transaction was reversed. Details: \n\n`, error.toString());
  exit(1)
});

function displayUsage() {
  console.info(cli.getUsage({
    title: 'pg-json-import',
    description: 'Import data from a JSON file into a PG table',
    synopsis: [
      '$ pji [bold]{--file} [underline]{filename.json} [bold]{-c} [underline]{postgresql://localhost:5432/mydb} [bold]{-t} [underline]{tablename}',
      '$ pji [bold]{--file} [underline]{filename.json} [bold]{--database} [underline]{dbname} [bold]{--table} [underline]{tablename}',
      '$ pji [bold]{--file} [underline]{filename.json} [bold]{--host} [underline]{host} [bold]{--port} [underline]{port} [bold]{--database} [underline]{dbname} [bold]{--table} [underline]{tablename}'
    ]
  }));
}

function exit(code) {
  process.exit(code);
}
