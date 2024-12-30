const { Pool } = require('pg')
var fs = require('fs');
const dotenv = require("dotenv");
dotenv.config();

/*
const pool = new Pool({
    user: 'santhoshbetha',
    host: 'ep-muddy-forest-977794.ap-southeast-1.aws.neon.tech',
    database: 'neondb',
    password: 'apsqcb5Fe4IY',
    port: 5432,
    max: 20, // maximum number of connections in the pool
    ssl: true
  }
)*/

/*
const pool = new Pool({
  user: 'sgpostgres',
  host: 'SG-foggy-nation-2578-5137-pgsql-master.servers.mongodirector.com',
  database: 'postgres',
  password: '1fx@9hfj1GnDhHCk',
  port: 6432,
  ssl  : {
    ca : fs.readFileSync('./pgcert/foggy-nation-2578-ssl-public-cert.cert')
  }
})*/

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl  : {
    ca : fs.readFileSync('./pgcert/foggy-nation-2578-ssl-public-cert.cert')
  }
})

module.exports = {
  query: (text, params) => pool.query(text, params),
}





