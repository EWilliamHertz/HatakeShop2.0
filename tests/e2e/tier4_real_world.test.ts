import crypto from 'crypto';
import {
  TestHarness,
  assert,
  assertEqual,
  assertNotNull,
  assertIn,
  createTestLead,
  getLeadById,
  deleteTestLeads,
  updateLeadDirectly,
  sendBatchDispatch,
  sendResendWebhook,
  makeResendWebhookPayload,
  triggerRecruitViaAuthSync,
  getJson,
  closeDbPool,
  ensureDatabaseColumns,
} from './test_helpers.ts';

export async function runTier4Tests(harness: TestHarness) {
  harness.suite('Tier 4: Real-World Application Scenarios');

  await ensureDatabaseColumns();
  const createdLeadIds: number[] = [];

  const registerLead = (lead: { id: number }) => {
    createdLeadIds.push(lead.id);
    return lead;
  };

  try {
    // -------------------------------------------------------------
    // Test 4.1: Realistic 10-Vendor Funnel Simulation with Jitter
    // -------------------------------------------------------------
    await harness.runTest(
      'T4.1: Cohort of 10 vendors simulated through batch dispatch, asynchronous webhooks, and funnel assertions',
      async () => {
        // Step 1: Create cohort of 10 TCG vendor leads
        const cohortData = [
          'Card Kingdom B2B Partner',
          'Black Lotus Collectibles',
          'Wizards Vault TCG',
          'Dragon Lair Games',
          'Tokyo Card Wholesale',
          'Mythic Mint Distribution',
          'Top Deck Europe',
          'Mana Crypt Supplies',
          'Sleeves & Slabs Co',
          'Akihabara Trade Hub',
        ];

        const cohortLeads = [];
        const tokenMap = new Map<number, string>();

        for (const companyName of cohortData) {
          const rawInviteToken = `invite-${crypto.randomUUID()}`;
          const tokenHash = crypto.createHash('sha256').update(rawInviteToken).digest('hex');

          const lead = registerLead(
            await createTestLead({
              companyName,
              status: 'pending',
              inviteTokenHash: tokenHash,
            })
          );
          tokenMap.set(lead.id, rawInviteToken);
          cohortLeads.push(lead);
        }

        assertEqual(cohortLeads.length, 10, 'Must have seeded 10 leads');

        // Step 2: Admin triggers batch dispatch
        const dispatchRes = await sendBatchDispatch(10);
        assertEqual(dispatchRes.status, 200, `Cohort dispatch failed: ${dispatchRes.rawText}`);
        assert(dispatchRes.data.sent >= 10, `Expected at least 10 sent, got ${dispatchRes.data.sent}`);

        // Step 3: Partition cohort into realistic funnel buckets:
        // Group A (Index 0, 1, 2) -> Delivered only (Target: 'sent')
        // Group B (Index 3, 4, 5) -> Delivered + Opened (Target: 'opened')
        // Group C (Index 6, 7)    -> Delivered + Opened + Clicked (Target: 'clicked')
        // Group D (Index 8, 9)    -> Delivered + Opened + Clicked + Recruited (Target: 'recruited')

        const groupA = [cohortLeads[0], cohortLeads[1], cohortLeads[2]];
        const groupB = [cohortLeads[3], cohortLeads[4], cohortLeads[5]];
        const groupC = [cohortLeads[6], cohortLeads[7]];
        const groupD = [cohortLeads[8], cohortLeads[9]];

        // Build simulated webhook event stream
        const eventStream: (() => Promise<void>)[] = [];

        // All 10 receive 'email.delivered'
        for (const lead of cohortLeads) {
          eventStream.push(async () => {
            await sendResendWebhook(makeResendWebhookPayload('email.delivered', lead));
          });
        }

        // Group B, C, D receive 'email.opened'
        for (const lead of [...groupB, ...groupC, ...groupD]) {
          eventStream.push(async () => {
            await sendResendWebhook(makeResendWebhookPayload('email.opened', lead));
          });
        }

        // Group C, D receive 'email.clicked'
        for (const lead of [...groupC, ...groupD]) {
          eventStream.push(async () => {
            const rawToken = tokenMap.get(lead.id)!;
            await sendResendWebhook(
              makeResendWebhookPayload('email.clicked', lead, {
                clickUrl: `https://hatake.shop/login?invite=${rawToken}`,
              })
            );
          });
        }

        // Execute webhook deliveries with randomized concurrency to simulate real-world network arrival
        const shuffled = eventStream.sort(() => Math.random() - 0.5);
        await Promise.all(shuffled.map((fn) => fn()));

        // Group D vendors complete registration
        for (const lead of groupD) {
          const rawToken = tokenMap.get(lead.id)!;
          const syncRes = await triggerRecruitViaAuthSync(rawToken);
          assertEqual(syncRes.status, 200, `Registration sync for lead ${lead.id} failed`);
        }

        // Step 4: Verify Final Funnel Database Assertions
        for (const lead of groupA) {
          const row = await getLeadById(lead.id);
          assertNotNull(row);
          assertEqual(row!.status, 'sent', `Group A lead ${lead.id} should be 'sent', got '${row!.status}'`);
        }

        for (const lead of groupB) {
          const row = await getLeadById(lead.id);
          assertNotNull(row);
          assertEqual(row!.status, 'opened', `Group B lead ${lead.id} should be 'opened', got '${row!.status}'`);
          assertNotNull(row!.openedAt, `Group B lead ${lead.id} missing openedAt`);
        }

        for (const lead of groupC) {
          const row = await getLeadById(lead.id);
          assertNotNull(row);
          assertEqual(row!.status, 'clicked', `Group C lead ${lead.id} should be 'clicked', got '${row!.status}'`);
          assertNotNull(row!.clickedAt, `Group C lead ${lead.id} missing clickedAt`);
        }

        for (const lead of groupD) {
          const row = await getLeadById(lead.id);
          assertNotNull(row);
          assertEqual(row!.status, 'recruited', `Group D lead ${lead.id} should be 'recruited', got '${row!.status}'`);
          assertNotNull(row!.redeemedAt, `Group D lead ${lead.id} missing redeemedAt`);
        }
      }
    );

    // -------------------------------------------------------------
    // Test 4.2: High-Concurrency Burst Webhook Traffic
    // -------------------------------------------------------------
    await harness.runTest(
      'T4.2: Concurrent burst of 15 interleaved webhook events handled without DB pool exhaustion or errors',
      async () => {
        // Seed 5 leads
        const leadsForBurst = [];
        for (let i = 0; i < 5; i++) {
          const lead = registerLead(await createTestLead({ status: 'sent', sentAt: new Date() }));
          leadsForBurst.push(lead);
        }

        // Create 15 concurrent events targeting the 5 leads in rapid burst
        const burstTasks = [];
        for (let i = 0; i < 15; i++) {
          const targetLead = leadsForBurst[i % leadsForBurst.length];
          const eventType = i % 3 === 0 ? 'email.delivered' : i % 3 === 1 ? 'email.opened' : 'email.clicked';
          burstTasks.push(
            sendResendWebhook(makeResendWebhookPayload(eventType as any, targetLead))
          );
        }

        const responses = await Promise.all(burstTasks);

        for (let i = 0; i < responses.length; i++) {
          const res = responses[i];
          assertEqual(
            res.status,
            200,
            `Burst request #${i} failed with status ${res.status}: ${res.rawText}`
          );
        }

        // Verify each lead reached at least 'opened' or 'clicked' without schema corruption
        for (const lead of leadsForBurst) {
          const fresh = await getLeadById(lead.id);
          assertNotNull(fresh);
          assertIn(fresh!.status, ['opened', 'clicked'], `Lead ${lead.id} status unexpected: ${fresh!.status}`);
        }
      }
    );
  } finally {
    await deleteTestLeads(createdLeadIds);
  }
}

// Standalone execution support
if (process.argv[1]?.endsWith('tier4_real_world.test.ts')) {
  const harness = new TestHarness();
  runTier4Tests(harness)
    .then(() => {
      const summary = harness.printSummary('Tier 4: Real-World Application Scenarios');
      closeDbPool();
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      closeDbPool();
      process.exit(1);
    });
}
