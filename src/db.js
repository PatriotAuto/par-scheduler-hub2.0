// src/db.js (or ./db.js if in root)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = { prisma };