const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// Suppress the pg concurrency deprecation warning as Prisma adapter handles it safely
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  if (typeof warning === 'string' && warning.includes('Calling client.query() when the client is already executing a query is deprecated')) {
    return;
  }
  if (args[0] === 'DeprecationWarning' && typeof warning === 'string' && warning.includes('Calling client.query()')) {
    return;
  }
  if (warning && warning.name === 'DeprecationWarning' && warning.message && warning.message.includes('Calling client.query()')) {
    return;
  }
  return originalEmitWarning.call(process, warning, ...args);
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

module.exports = prisma;