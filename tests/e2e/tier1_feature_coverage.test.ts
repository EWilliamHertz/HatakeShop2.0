import {
  TestHarness,
  assert,
  assertEqual,
  assertNotNull,
  assertIn,
  createTestLead,
  getLeadById,
  deleteTestLeads,
  sendBatchDispatch,
  sendResendWebhook,
  makeResendWebhookPayload,
  getJson,
  postJson,
  closeDbPool,
  ensureDatabaseColumns,
} from './test_helpers.ts';

export async function runTier1Tests(harness: TestHarness) {
  harness.suite('Tier 1: Core Feature Coverage');

  await ensureDatabaseColumns();
  const createdLeadIds: number[] = [];

  // Cleanup helper
  const registerLead = (lead: { id: number }) => {
    createdLeadIds.push(lead.id);
    return lead;
  };

  try {
    // -------------------------------------------------------------
    // Test 1.1: Batch Dispatch Endpoint Authentication Guard
    // -------------------------------------------------------------
    await harness.runTest(
      'T1.1: Batch dispatch rejects unauthenticated or unauthorized requests',
      async () => {
        const resUnauth = await postJson('/api-v2/admin/leads/send', { limit: 10 });
        assert(
          resUnauth.status === 401 || resUnauth.status === 403,
          `Expected 401/403 for unauthenticated dispatch request, got ${resUnauth.status}`
        );

        const resInvalidToken = await postJson(
          '/api-v2/admin/leads/send',
          { limit: 10 },
          { Authorization: 'Bearer invalid-token-xyz' }
        );
        assert(
          resInvalidToken.status === 401 || resInvalidToken.status === 403,
          `Expected 401/403 for invalid token, got ${resInvalidToken.status}`
        );
      }
    );

    // -------------------------------------------------------------
    // Test 1.2: Batch Dispatch Execution & DB Status Transition
    // -------------------------------------------------------------
    await harness.runTest(
      'T1.2: Batch dispatch updates pending leads to sent and sets sentAt & tokenHash',
      async () => {
        // Seed 2 pending leads
        const leadA = registerLead(await createTestLead({ status: 'pending' }));
        const leadB = registerLead(await createTestLead({ status: 'pending' }));

        const dispatchRes = await sendBatchDispatch(2);
        assertEqual(dispatchRes.status, 200, `Dispatch endpoint failed: ${dispatchRes.rawText}`);
        assert(dispatchRes.data?.success === true, 'Response missing success: true');
        assert(typeof dispatchRes.data?.sent === 'number', 'Response missing numeric sent count');
        assert(dispatchRes.data.sent >= 2, `Expected sent >= 2, got ${dispatchRes.data.sent}`);

        // Verify state in database
        const updatedA = await getLeadById(leadA.id);
        const updatedB = await getLeadById(leadB.id);

        assertNotNull(updatedA, `Lead ${leadA.id} not found in DB`);
        assertNotNull(updatedB, `Lead ${leadB.id} not found in DB`);

        // Check status transition to 'sent' (or higher if mock Resend processed)
        assertIn(updatedA!.status, ['sent', 'opened', 'clicked'], `Lead A status should be sent, got ${updatedA!.status}`);
        assertIn(updatedB!.status, ['sent', 'opened', 'clicked'], `Lead B status should be sent, got ${updatedB!.status}`);

        // Check token hash and sentAt timestamps are populated
        assertNotNull(updatedA!.sentAt, 'sentAt should not be null');
        assertNotNull(updatedA!.inviteTokenHash, 'inviteTokenHash should not be null');
      }
    );

    // -------------------------------------------------------------
    // Test 1.3: Webhook Endpoint Handles 'email.delivered'
    // -------------------------------------------------------------
    await harness.runTest(
      'T1.3: Resend webhook endpoint accepts email.delivered event without error',
      async () => {
        const lead = registerLead(await createTestLead({ status: 'sent', sentAt: new Date() }));
        const payload = makeResendWebhookPayload('email.delivered', lead);

        const webhookRes = await sendResendWebhook(payload);
        assertEqual(webhookRes.status, 200, `Webhook returned non-200: ${webhookRes.rawText}`);
        assert(
          webhookRes.data?.received === true || webhookRes.data?.success === true,
          'Webhook response should indicate success'
        );

        // Verify lead is not corrupted
        const freshLead = await getLeadById(lead.id);
        assertNotNull(freshLead, 'Lead must exist in DB');
        assertIn(freshLead!.status, ['sent', 'opened', 'clicked'], `Lead status altered unexpectedly: ${freshLead!.status}`);
      }
    );

    // -------------------------------------------------------------
    // Test 1.4: Webhook Endpoint Handles 'email.opened' & Sets openedAt
    // -------------------------------------------------------------
    await harness.runTest(
      'T1.4: Resend webhook handles email.opened, transitions status to opened and records openedAt',
      async () => {
        const lead = registerLead(await createTestLead({ status: 'sent', sentAt: new Date() }));
        const emailId = `resend_email_${Date.now()}_${lead.id}`;
        const payload = makeResendWebhookPayload('email.opened', lead, { emailId });

        const webhookRes = await sendResendWebhook(payload);
        assertEqual(webhookRes.status, 200, `Webhook returned non-200: ${webhookRes.rawText}`);

        // Verify DB update
        const freshLead = await getLeadById(lead.id);
        assertNotNull(freshLead, 'Lead must exist in DB');
        assertEqual(freshLead!.status, 'opened', `Expected lead status 'opened', got '${freshLead!.status}'`);
        assertNotNull(freshLead!.openedAt, 'openedAt timestamp should be set');
      }
    );

    // -------------------------------------------------------------
    // Test 1.5: Webhook Endpoint Handles 'email.clicked' & Sets clickedAt
    // -------------------------------------------------------------
    await harness.runTest(
      'T1.5: Resend webhook handles email.clicked, transitions status to clicked and records clickedAt',
      async () => {
        const lead = registerLead(
          await createTestLead({
            status: 'opened',
            sentAt: new Date(),
            openedAt: new Date(),
          })
        );
        const emailId = `resend_email_${Date.now()}_${lead.id}`;
        const clickUrl = 'https://hatake.shop/login?invite=mock-click-token';
        const payload = makeResendWebhookPayload('email.clicked', lead, { emailId, clickUrl });

        const webhookRes = await sendResendWebhook(payload);
        assertEqual(webhookRes.status, 200, `Webhook returned non-200: ${webhookRes.rawText}`);

        // Verify DB update
        const freshLead = await getLeadById(lead.id);
        assertNotNull(freshLead, 'Lead must exist in DB');
        assertEqual(freshLead!.status, 'clicked', `Expected lead status 'clicked', got '${freshLead!.status}'`);
        assertNotNull(freshLead!.clickedAt, 'clickedAt timestamp should be set');
      }
    );

    // -------------------------------------------------------------
    // Test 1.6: Progress Metric Counts Contacted Leads (status != pending)
    // -------------------------------------------------------------
    await harness.runTest(
      'T1.6: /api-v2/leads/progress counts sent, opened, clicked, and recruited leads',
      async () => {
        const leadSent = registerLead(await createTestLead({ status: 'sent', sentAt: new Date() }));
        const leadOpened = registerLead(await createTestLead({ status: 'opened', sentAt: new Date(), openedAt: new Date() }));
        const leadClicked = registerLead(await createTestLead({ status: 'clicked', sentAt: new Date(), clickedAt: new Date() }));

        const progressRes = await getJson('/api-v2/leads/progress');
        assertEqual(progressRes.status, 200, `Progress endpoint failed: ${progressRes.rawText}`);
        assert(typeof progressRes.data?.sentCount === 'number', 'sentCount must be a number');
        assert(progressRes.data.sentCount >= 3, `Expected sentCount >= 3, got ${progressRes.data.sentCount}`);
      }
    );
  } finally {
    // Cleanup seeded test leads
    await deleteTestLeads(createdLeadIds);
  }
}

// Standalone execution support
if (process.argv[1]?.endsWith('tier1_feature_coverage.test.ts')) {
  const harness = new TestHarness();
  runTier1Tests(harness)
    .then(() => {
      const summary = harness.printSummary('Tier 1: Core Feature Coverage');
      closeDbPool();
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      closeDbPool();
      process.exit(1);
    });
}
