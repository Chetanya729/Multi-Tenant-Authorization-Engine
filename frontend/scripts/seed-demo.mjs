#!/usr/bin/env node
// Fills a running backend with two demo organisations, personas and transfers, using only the public API.
// Usage:  PLATFORM_ADMIN_EMAIL=... PLATFORM_ADMIN_PASSWORD=... npm run seed:demo
// Optional: API_URL (default http://localhost:8080)
import { readFileSync } from "node:fs";

const demo = JSON.parse(readFileSync(new URL("../src/demo/demo-accounts.json", import.meta.url), "utf8"));
const API = (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD;
const PASSWORD = demo.password;
const TEMP = "Temporary-Invite-2026!";

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD (the same values the backend was started with).");
  process.exit(1);
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${method} ${path} -> ${res.status} ${text}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const login = async (email, password) => (await call("POST", "/api/auth/login", { body: { email, password } })).accessToken;
const activate = (email, temporaryPassword = TEMP) =>
  call("POST", "/api/auth/first-password", { body: { email, temporaryPassword, newPassword: PASSWORD } });

async function seedTenant(platformToken, t) {
  console.log(`\n▸ ${t.name}`);
  await call("POST", "/api/tenants/create", { token: platformToken, body: { name: t.name, slug: t.slug, adminEmail: t.admin, temporaryPassword: TEMP } });
  await activate(t.admin);
  const admin = await login(t.admin, PASSWORD);

  const duties = Object.fromEntries((await call("GET", "/api/permissions", { token: admin })).map((d) => [d.code, d.permissionId]));
  for (const [code, description] of t.duties) {
    duties[code] = (await call("POST", "/api/permissions/create", { token: admin, body: { code, description } })).permissionId;
  }
  console.log(`  duties   ${t.duties.map(([c]) => c).join(", ")}`);

  const roles = {};
  for (const r of t.roles) {
    roles[r.name] = (await call("POST", "/api/roles/create", { token: admin, body: { name: r.name, description: r.description } })).roleId;
    for (const code of r.duties) await call("PUT", `/api/roles/${roles[r.name]}/permissions/${duties[code]}`, { token: admin });
    if (r.limit) await call("PUT", `/api/roles/${roles[r.name]}/approval-limit`, { token: admin, body: { approvalLimit: r.limit } });
  }
  console.log(`  roles    ${t.roles.map((r) => r.name + (r.limit ? ` (limit ${r.limit})` : "")).join(", ")}`);

  const ids = {};
  for (const u of t.users) {
    const temp = u.firstLogin ? demo.firstLoginTemporaryPassword : TEMP;
    ids[u.email] = (await call("POST", "/api/users/create", { token: admin, body: { email: u.email, temporaryPassword: temp, roleIds: u.roles.map((r) => roles[r]) } })).userId;
    if (!u.firstLogin) await activate(u.email);
  }
  console.log(`  users    ${t.users.length} created`);

  const tokens = {};
  const tokenFor = async (email) => (tokens[email] ??= await login(email, PASSWORD));
  let count = 0;
  for (const tr of t.transfers) {
    const created = await call("POST", "/api/transfers/create", { token: await tokenFor(tr.by), body: { amount: tr.amount, currency: t.currency, description: tr.text } });
    if (tr.approve) await call("POST", `/api/transfers/${created.id}/approve`, { token: await tokenFor(tr.approve), body: { note: tr.note } });
    if (tr.reject) await call("POST", `/api/transfers/${created.id}/reject`, { token: await tokenFor(tr.reject), body: { note: tr.note } });
    count++;
  }
  console.log(`  transfers ${count} submitted`);

  for (const u of t.users.filter((x) => x.disable)) {
    await call("POST", `/api/users/${ids[u.email]}/disable`, { token: admin, body: { reason: "RESIGNED", note: "Left the company" } });
  }
}

const TRANSFER_DUTIES = [
  ["transfer:create", "Submit a transfer request"],
  ["transfer:read", "View all transfers in the organisation"],
  ["transfer:approve", "Approve or reject transfers within the role's limit"],
];

const acme = {
  name: "Acme Finance", slug: "acme", admin: "admin@acme.demo", currency: "INR",
  duties: TRANSFER_DUTIES,
  roles: [
    { name: "EMPLOYEE", description: "Submits transfer requests", duties: ["transfer:create"] },
    { name: "FINANCE_MANAGER", description: "Approves transfers up to ₹50,000", duties: ["transfer:read", "transfer:approve"], limit: 50000 },
    { name: "FINANCE_DIRECTOR", description: "Approves large transfers up to ₹10,00,000", duties: ["transfer:read", "transfer:approve"], limit: 1000000 },
    { name: "AUDITOR", description: "Read-only oversight", duties: ["transfer:read", "audit:read", "user:read", "role:read", "permission:read"] },
  ],
  users: [
    { email: "priya.sharma@acme.demo", roles: ["FINANCE_MANAGER", "EMPLOYEE"] },
    { email: "vikram.rao@acme.demo", roles: ["FINANCE_DIRECTOR"] },
    { email: "rahul.verma@acme.demo", roles: ["EMPLOYEE"] },
    { email: "anita.desai@acme.demo", roles: ["EMPLOYEE"] },
    { email: "sara.khan@acme.demo", roles: ["AUDITOR"] },
    { email: "new.joiner@acme.demo", roles: ["EMPLOYEE"], firstLogin: true },
    { email: "karan.mehta@acme.demo", roles: ["EMPLOYEE"], disable: true },
  ],
  transfers: [
    { by: "rahul.verma@acme.demo", amount: 12500, text: "Cloud hosting, October invoice", approve: "priya.sharma@acme.demo", note: "Matches PO-2291" },
    { by: "anita.desai@acme.demo", amount: 650000, text: "Q4 vendor settlement, Northwind Traders", approve: "vikram.rao@acme.demo", note: "Board approved in October" },
    { by: "rahul.verma@acme.demo", amount: 7600, text: "Client dinner, Bengaluru", reject: "priya.sharma@acme.demo", note: "Personal expense, not reimbursable" },
    { by: "anita.desai@acme.demo", amount: 9400, text: "Office supplies restock", approve: "priya.sharma@acme.demo", note: "OK" },
    { by: "rahul.verma@acme.demo", amount: 32000, text: "Laptop replacement for design team", approve: "priya.sharma@acme.demo", note: "Asset tag LT-0931" },
    { by: "karan.mehta@acme.demo", amount: 4200, text: "Taxi reimbursements, September" , approve: "priya.sharma@acme.demo", note: "Receipts attached" },
    { by: "anita.desai@acme.demo", amount: 120000, text: "Security audit, external firm", reject: "vikram.rao@acme.demo", note: "Re-quote with two more vendors" },
    { by: "rahul.verma@acme.demo", amount: 48000, text: "Team offsite venue deposit" },
    { by: "anita.desai@acme.demo", amount: 22000, text: "Conference tickets, FinTech Summit" },
    { by: "rahul.verma@acme.demo", amount: 180000, text: "Annual design-tool licences (40 seats)" },
    { by: "anita.desai@acme.demo", amount: 54000, text: "Marketing agency retainer, November" },
    { by: "priya.sharma@acme.demo", amount: 15000, text: "Leadership training course" },
  ],
};

const globex = {
  name: "Globex Corp", slug: "globex", admin: "admin@globex.demo", currency: "USD",
  duties: TRANSFER_DUTIES,
  roles: [
    { name: "EMPLOYEE", description: "Submits transfer requests", duties: ["transfer:create"] },
    { name: "APPROVER", description: "Approves transfers up to $10,000", duties: ["transfer:read", "transfer:approve"], limit: 10000 },
  ],
  users: [
    { email: "john.smith@globex.demo", roles: ["EMPLOYEE"] },
    { email: "jane.doe@globex.demo", roles: ["APPROVER"] },
  ],
  transfers: [
    { by: "john.smith@globex.demo", amount: 1200, text: "Software subscription", approve: "jane.doe@globex.demo", note: "Approved" },
    { by: "john.smith@globex.demo", amount: 8600, text: "Trade show booth" },
  ],
};

try {
  try {
    await login(acme.admin, PASSWORD);
    console.log("Demo data already exists (admin@acme.demo can sign in). Nothing to do.");
    process.exit(0);
  } catch {
    /* not seeded yet */
  }
  const platform = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  await seedTenant(platform, acme);
  await seedTenant(platform, globex);
  console.log(`\n✓ Done. Every demo account uses the password ${PASSWORD}`);
  console.log(`  except new.joiner@acme.demo, whose temporary password is ${demo.firstLoginTemporaryPassword}.`);
} catch (err) {
  console.error(`\n✗ ${err.message}`);
  if (err.status === 409) console.error("  Part of the demo data already exists. Use a fresh database to seed again.");
  process.exit(1);
}
