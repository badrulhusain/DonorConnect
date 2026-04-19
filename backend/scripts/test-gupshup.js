#!/usr/bin/env node
// Usage:
//   node test-gupshup.js --type=payment --phone=+918593826375 --lang=en --name="John" --amount=5000
//   node test-gupshup.js --type=event   --phone=+918593826375 --lang=ml --name="Rahul" \
//     --eventName="Annual Day" --date="25th April 2025" --time="10:00 AM" --venue="Auditorium"
//   node test-gupshup.js --type=programme --phone=+918593826375 --lang=en --name="Fathima" \
//     --programmeName="Graduation" --date="30th April 2025" --time="3:00 PM" --venue="Main Hall"

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { sendWhatsAppMessage } = require('../services/whatsappService');

const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    args[key] = rest.join('=');
  });
  return args;
};

const args = parseArgs();

const { type = 'payment', phone, lang = 'en', name = 'Test User' } = args;

if (!phone) {
  console.error('ERROR: --phone is required. Example: --phone=+918593826375');
  process.exit(1);
}

const REQUIRED = {
  payment: [],
  event: ['eventName', 'date', 'time', 'venue'],
  programme: ['programmeName', 'date', 'time', 'venue'],
};

const missing = (REQUIRED[type] || []).filter((k) => !args[k]);
if (missing.length > 0) {
  console.error(`ERROR: Missing required args for type=${type}: ${missing.map((k) => `--${k}`).join(', ')}`);
  process.exit(1);
}

const payload = {
  phone,
  recipientName: name,
  language: lang,
  type,
  amount: args.amount ? Number(args.amount) : undefined,
  eventName: args.eventName,
  programmeName: args.programmeName,
  date: args.date,
  time: args.time,
  venue: args.venue,
};

console.log('\n─── Gupshup Test ──────────────────────────────────');
console.log('Credentials check:');
console.log('  GUPSHUP_API_KEY   :', process.env.GUPSHUP_API_KEY ? '✓ set' : '✗ MISSING');
console.log('  GUPSHUP_SOURCE_MOBILE:', process.env.GUPSHUP_SOURCE_MOBILE ? '✓ set' : '✗ MISSING');
console.log('  GUPSHUP_APP_NAME  :', process.env.GUPSHUP_APP_NAME ? '✓ set' : '✗ MISSING');
console.log('\nSending payload:', JSON.stringify(payload, null, 2));
console.log('───────────────────────────────────────────────────\n');

sendWhatsAppMessage(payload)
  .then((result) => {
    console.log('SUCCESS:', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('FAILED:', err.message);
    process.exit(1);
  });
