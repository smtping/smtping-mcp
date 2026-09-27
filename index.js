#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Smtping } from '@smtping/sdk';

const VERSION = '1.0.0';
const MAX_ROWS = 1000;
const WAIT_SECONDS = 120;

if (process.argv.includes('--check')) {
  console.log(`smtping-mcp ${VERSION} ok`);
  process.exit(0);
}
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(VERSION);
  process.exit(0);
}

let client;
function api() {
  if (!client) {
    if (!process.env.SMTPING_API_KEY) {
      throw new Error('SMTPING_API_KEY is not set. Create a key at https://app.smtping.com and add it to the "env" block of your MCP config.');
    }
    client = new Smtping({ apiKey: process.env.SMTPING_API_KEY, userAgent: `smtping-mcp/${VERSION}` });
  }
  return client;
}

const text = (data) => ({ content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] });
const fail = (e) => ({ isError: true, content: [{ type: 'text', text: `SMTPing error${e.status ? ` (HTTP ${e.status})` : ''}: ${e.message}` }] });

function summarize(rows) {
  const counts = { safe: 0, avoid: 0, judgement: 0 };
  const byStatus = {};
  for (const r of rows) {
    if (counts[r.band] != null) counts[r.band]++;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
  }
  const compact = rows.slice(0, MAX_ROWS).map((r) => ({ email: r.email, status: r.status, band: r.band }));
  return {
    total: rows.length,
    bands: counts,
    statuses: byStatus,
    results: compact,
    ...(rows.length > MAX_ROWS ? { note: `Only the first ${MAX_ROWS} rows are shown. Use the SMTPing dashboard or the smtping CLI to export the full CSV.` } : {}),
  };
}

const server = new McpServer({ name: 'smtping', version: VERSION });

server.registerTool(
  'verify_email',
  {
    title: 'Verify an email address',
    description: 'Verifies one email address with SMTPing. Returns a status (valid, invalid, catch_all, spamtrap, disposable, etc.) and a band: safe (send), avoid (remove) or judgement (your call). Costs 1 credit.',
    inputSchema: { email: z.string().describe('The email address to verify') },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ email }) => {
    try { return text(await api().verify(email)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'verify_list',
  {
    title: 'Verify a list of email addresses',
    description: `Verifies a list of addresses as one SMTPing bulk job (deduplicated, up to 100,000). Waits up to ${WAIT_SECONDS} seconds; if the job is still running, returns a job_id to pass to get_bulk_job later. Costs 1 credit per unique address.`,
    inputSchema: {
      emails: z.array(z.string()).min(1).describe('Email addresses to verify'),
      wait_seconds: z.number().int().min(0).max(600).optional().describe(`How long to wait for results. Default ${WAIT_SECONDS}. Use 0 to only start the job.`),
    },
    annotations: { readOnlyHint: false, openWorldHint: true },
  },
  async ({ emails, wait_seconds }) => {
    try {
      const smtping = api();
      if (emails.length <= 10) return text(summarize(await smtping.verifyMany(emails)));
      const job = await smtping.bulk.create(emails);
      const wait = (wait_seconds ?? WAIT_SECONDS) * 1000;
      if (!wait) return text({ job_id: job.jobId, status: job.status, total: job.totalEmails, next: 'Call get_bulk_job with this job_id.' });
      try {
        const rows = await smtping.bulk.wait(job.jobId, { timeout: wait, interval: 3000 });
        return text({ job_id: job.jobId, ...summarize(rows) });
      } catch (e) {
        if (e.name === 'TimeoutError') return text({ job_id: job.jobId, status: 'Processing', total: job.totalEmails, next: 'Still running. Call get_bulk_job with this job_id in a minute.' });
        throw e;
      }
    } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'get_bulk_job',
  {
    title: 'Get a bulk job',
    description: 'Returns the progress of a SMTPing bulk job, and its results once it has succeeded.',
    inputSchema: { job_id: z.string().describe('The job_id returned by verify_list') },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ job_id }) => {
    try {
      const smtping = api();
      const st = await smtping.bulk.get(job_id);
      if (st.status !== 'Succeeded') return text(st);
      return text({ job_id, status: st.status, ...summarize(await smtping.bulk.results(job_id)) });
    } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'check_threat',
  {
    title: 'Check a threat list',
    description: 'Looks up one address in a single SMTPing threat list: spamtrap, disposable, spambot or complainer.',
    inputSchema: {
      list: z.enum(['spamtrap', 'disposable', 'spambot', 'complainer']).describe('Which list to check'),
      email: z.string().describe('The email address to check'),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ list, email }) => {
    try { return text(await api().check(list, email)); } catch (e) { return fail(e); }
  },
);

server.registerTool(
  'get_credits',
  {
    title: 'Get remaining credits',
    description: 'Returns the remaining SMTPing credit balance and plan. Free.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async () => {
    try { return text(await api().credits()); } catch (e) { return fail(e); }
  },
);

await server.connect(new StdioServerTransport());
