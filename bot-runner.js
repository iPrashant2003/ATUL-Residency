// Bot runner - used by PM2 to start the WhatsApp bot with TypeScript support
// This file is the PM2 entry point that uses tsx to run the TypeScript bot

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('./node_modules/tsx/dist/cjs/index.cjs');

// Now require the TypeScript entry point
require('./src/server/whatsapp.ts');
