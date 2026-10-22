// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");

// Some amounts are exported as strings with thousands separators, e.g. "55,707.77".
function parseAmount(value) {
  if (typeof value === "string") value = value.replace(/,/g, "");
  return Number(value);
}

// Latest attempt seen so far for each txn_id.
const latest = new Map();

const lines = fs.readFileSync("payments.jsonl", "utf8").split("\n").filter((l) => l.length > 0);
for (const line of lines) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue; // truncated / unreadable line
  }
  if (!event.txn_id) continue;
  // Lines aren't in time order, so compare timestamps. They're all
  // ISO-8601 UTC ("2026-09-21T15:30:26Z"), so string order is time order.
  const prev = latest.get(event.txn_id);
  if (!prev || event.ts > prev.ts) latest.set(event.txn_id, event);
}

let total = 0;
let count = 0;

for (const event of latest.values()) {
  if (event.status === "success") {
    total += parseAmount(event.amount);
    count += 1;
  }
}

const expected = parseInt(fs.readFileSync("expected.txt", "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(total)}`);
}
