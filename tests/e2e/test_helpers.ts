import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import crypto from 'crypto';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, inArray, like, sql } from 'drizzle-orm';
import * as schema from '../../src/db/schema.ts';
import { leads, users } from '../../src/db/schema.ts';

const { Pool } = pg;

// Database connection pool for E2E tests
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 15000,
});

export const db = drizzle(pool, { schema });

// Base URL for backend server under test
export const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Default Admin Bearer token recognized by server.ts custom-token logic for Ernst (Admin)
export const DEFAULT_ADMIN_TOKEN = 'custom-token-ernst-uid';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: Error | string;
}

export class TestHarness {
  private currentSuite = 'General';
  private results: TestResult[] = [];
  private startTime = 0;

  suite(name: string) {
    this.currentSuite = name;
    console.log(`\n\x1b[1m\x1b[34m=== Suite: ${name} ===\x1b[0m`);
  }

  async runTest(name: string, fn: () => Promise<void>) {
    const start = Date.now();
    try {
      await fn();
      const durationMs = Date.now() - start;
      this.results.push({ suite: this.currentSuite, name, passed: true, durationMs });
      console.log(`  \x1b[32m✔\x1b[0m ${name} \x1b[90m(${durationMs}ms)\x1b[0m`);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      this.results.push({ suite: this.currentSuite, name, passed: false, durationMs, error: err });
      console.error(`  \x1b[31m✖\x1b[0m ${name} \x1b[90m(${durationMs}ms)\x1b[0m`);
      console.error(`    \x1b[31mError:\x1b[0m ${err?.message || err}`);
      if (err?.stack) {
        const stackLines = String(err.stack).split('\n').slice(1, 4).join('\n');
        console.error(`    \x1b[90m${stackLines}\x1b[0m`);
      }
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  printSummary(tierTitle: string) {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const totalTime = this.results.reduce((acc, r) => acc + r.durationMs, 0);

    console.log(`\n\x1b[1m--------------------------------------------------\x1b[0m`);
    console.log(`\x1b[1mReport for ${tierTitle}:\x1b[0m`);
    console.log(`  Total tests : ${total}`);
    console.log(`  Passed      : \x1b[32m${passed}\x1b[0m`);
    console.log(`  Failed      : \x1b[${failed > 0 ? '31' : '32'}m${failed}\x1b[0m`);
    console.log(`  Duration    : ${totalTime}ms`);
    console.log(`\x1b[1m--------------------------------------------------\x1b[0m\n`);

    return { total, passed, failed, totalTime };
  }
}

// Global assertions
export function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}. ${message || ''}`);
  }
}

export function assertNotEqual<T>(actual: T, expected: T, message?: string) {
  if (actual === expected) {
    throw new Error(`Assertion failed: expected value to not equal ${JSON.stringify(expected)}. ${message || ''}`);
  }
}

export function assertNotNull(actual: any, message?: string) {
  if (actual === null || actual === undefined) {
    throw new Error(`Assertion failed: expected non-null value, got ${actual}. ${message || ''}`);
  }
}

export function assertIn<T>(actual: T, allowed: T[], message?: string) {
  if (!allowed.includes(actual)) {
    throw new Error(`Assertion failed: value ${JSON.stringify(actual)} is not in allowed set ${JSON.stringify(allowed)}. ${message || ''}`);
  }
}

export function assertGreaterOrEqual(actual: number, threshold: number, message?: string) {
  if (actual < threshold) {
    throw new Error(`Assertion failed: expected ${actual} >= ${threshold}. ${message || ''}`);
  }
}

// Database helper functions
export async function ensureDatabaseColumns() {
  try {
    // Check if clicked_at and resend_email_id exist; if not, add them safely
    await pool.query(`
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS clicked_at timestamp;
      ALTER TABLE leads ADD COLUMN IF NOT EXISTS resend_email_id text;
    `);
  } catch (err: any) {
    console.warn(`[test_helpers] Column verify warning (may already exist): ${err.message}`);
  }
}

export async function createTestLead(overrides: Partial<typeof leads.$inferInsert> = {}) {
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const defaultLead = {
    email: `test_e2e_${uniqueId}@hatake-test.shop`,
    companyName: `TCG Test Vendor ${uniqueId}`,
    location: 'Berlin, DE',
    segment: 'TCG',
    status: 'pending' as const,
    website: `https://test-vendor-${uniqueId}.example.com`,
  };

  const toInsert = { ...defaultLead, ...overrides };
  const inserted = await db.insert(leads).values(toInsert).returning();
  return inserted[0];
}

export async function getLeadById(id: number) {
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0] || null;
}

export async function getLeadByEmail(email: string) {
  const rows = await db.select().from(leads).where(eq(leads.email, email)).limit(1);
  return rows[0] || null;
}

export async function updateLeadDirectly(id: number, updates: Partial<typeof leads.$inferInsert>) {
  const rows = await db.update(leads).set(updates).where(eq(leads.id, id)).returning();
  return rows[0] || null;
}

export async function deleteTestLeads(ids: number[]) {
  if (ids.length === 0) return;
  await db.delete(leads).where(inArray(leads.id, ids));
}

export async function cleanupAllTestLeads() {
  try {
    await db.delete(leads).where(like(leads.email, 'test_e2e_%'));
  } catch (err) {
    console.warn('[test_helpers] Warning during cleanupAllTestLeads:', err);
  }
}

export async function closeDbPool() {
  await pool.end();
}

// HTTP helper functions
export async function postJson(endpoint: string, body: any, headers: Record<string, string> = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    let data: any = null;
    const rawText = await res.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }

    return {
      status: res.status,
      ok: res.ok,
      data,
      rawText,
    };
  } catch (err: any) {
    throw new Error(`HTTP POST ${url} failed to connect: ${err.message}`);
  }
}

export async function getJson(endpoint: string, headers: Record<string, string> = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
    });

    let data: any = null;
    const rawText = await res.text();
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }

    return {
      status: res.status,
      ok: res.ok,
      data,
      rawText,
    };
  } catch (err: any) {
    throw new Error(`HTTP GET ${url} failed to connect: ${err.message}`);
  }
}

export async function checkServerReachable(timeoutMs: number = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${BASE_URL}/api-v2/leads/progress`, { signal: controller.signal });
    clearTimeout(timer);
    return res.status < 500;
  } catch {
    return false;
  }
}

// Resend Webhook Payload builder matching PROJECT.md interface contract
export interface ResendWebhookOptions {
  emailId?: string;
  from?: string;
  toEmail?: string;
  leadId?: number | string;
  clickUrl?: string;
  createdAt?: string;
}

export function makeResendWebhookPayload(
  type: 'email.delivered' | 'email.opened' | 'email.clicked',
  lead: { id: number; email: string },
  options: ResendWebhookOptions = {}
) {
  const emailId = options.emailId || `email_${Date.now()}_${lead.id}`;
  const createdAt = options.createdAt || new Date().toISOString();
  const toEmail = options.toEmail || lead.email;
  const leadIdTag = options.leadId !== undefined ? String(options.leadId) : String(lead.id);

  const payload: any = {
    type,
    created_at: createdAt,
    data: {
      email_id: emailId,
      from: options.from || 'b2b@hatake.social',
      to: [toEmail],
      subject: 'Partner, join Hatake.Shop B2B',
      tags: {
        lead_id: leadIdTag,
      },
    },
  };

  if (type === 'email.clicked') {
    payload.data.click = {
      link: options.clickUrl || 'https://hatake.shop/login?invite=mock-e2e-token',
      timestamp: createdAt,
      ipAddress: '127.0.0.1',
      userAgent: 'E2E-Test-Runner/1.0',
    };
  }

  return payload;
}

export async function sendResendWebhook(payload: any, customHeaders: Record<string, string> = {}) {
  return await postJson('/api-v2/webhooks/resend', payload, customHeaders);
}

export async function sendBatchDispatch(limit: number = 50, token: string = DEFAULT_ADMIN_TOKEN) {
  return await postJson(
    '/api-v2/admin/leads/send',
    { limit },
    { Authorization: `Bearer ${token}` }
  );
}

export async function triggerRecruitViaAuthSync(inviteToken: string, token: string = DEFAULT_ADMIN_TOKEN) {
  return await postJson(
    '/api-v2/auth/sync',
    { inviteToken },
    { Authorization: `Bearer ${token}` }
  );
}
