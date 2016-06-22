'use strict';

const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const pg = require('pg');
const fs = require('fs');
const format = require('pg-format');
const JSONStream = require('JSONStream');
const args = require('./args');

const usage = commandLineUsage([
  {
    header: 'pg-json-import',
    content: 'Import data from a JSON file into a PG table'
  },
  {
    header: 'Synopsis',
    content: [
      '$ pji [bold]{--file} [underline]{filename.json} [bold]{-c} [underline]{postgresql://localhost:5432/mydb} [bold]{-t} [underline]{tablename}',
      '$ pji [bold]{--file} [underline]{filename.json} [bold]{--database} [underline]{dbname} [bold]{--table} [underline]{tablename}',
      '$ pji [bold]{--file} [underline]{filename.json} [bold]{--host} [underline]{host} [bold]{--port} [underline]{port} [bold]{--database} [underline]{dbname} [bold]{--table} [underline]{tablename}'
    ]
  }
]);

const queryTemplate = 'INSERT INTO %I (%I) VALUES (%L);';

const executeQuery = function(client, query) {
  return new Promise((resolve, reject) => {
    client.query(query, (err) => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};

const displayUsage = function() {
  console.info(usage);
}

const exit = function(code) {
  process.exit(code);
}

const options = commandLineArgs(args);

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

pg.connect(options.connection, (err, client, done) => {
  if (err) {
    console.error(`There was a problem connecting`, err);
    exit(1);
  }

  let rowCount;

  executeQuery(client, "BEGIN;")
  .then(() => {
    return new Promise((resolve, reject) => {
      console.info("Loading JSON...");
      let rows = [];
      let stream = fs.createReadStream(options.file.filename)
        .pipe(JSONStream.parse('*'));

      stream.on('data', (data) => rows.push(data));
      stream.on('end', () => {
        console.info("Finished loading JSON...");
        rowCount = rows.length;
        resolve(rows);
      });
      stream.on('error', (err) => reject(err));
    });
  })
  .then((rows) => {
    console.info('Inserting data...');
    return Promise.all(rows.map((row) => {
      let cols = Object.keys(row);
      let values = cols.map((col) => row[col]);
      return executeQuery(client, format(queryTemplate, options.table, cols, values));
    }));
  })
  .then(() => executeQuery(client, "COMMIT;"))
  .then(() => {
    console.info(`${rowCount} rows imported into the '${options.table}' table.`);
    exit(0);
  })
  .catch((error) => {
    executeQuery(client, "ROLLBACK;").then(() => {
      console.error(`There was an error importing into ${options.table}. The transaction was reversed. Details: \n\n ${error.toString()}`);
      exit(1);
    })
  });
});
