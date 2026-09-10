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
  postJson,
  closeDbPool,
  ensureDatabaseColumns,
} from './test_helpers.ts';

export async function runTier2Tests(harness: TestHarness) {
  harness.suite('Tier 2: Boundary & Corner Cases');

  await ensureDatabaseColumns();
  const createdLeadIds: number[] = [];

  const registerLead = (lead: { id: number }) => {
    createdLeadIds.push(lead.id);
    return lead;
  };

  try {
    // -------------------------------------------------------------
    // Test 2.1: Empty Batch Dispatch (Zero Pending Leads)
    // -------------------------------------------------------------
    await harness.runTest(
      'T2.1: Batch dispatch with limit 0 or when 0 pending leads returns sent 0 gracefully',
      async () => {
        // Dispatch with limit: 0
        const resZero = await sendBatchDispatch(0);
        assertEqual(resZero.status, 200, `Expected 200 for limit 0, got ${resZero.status}: ${resZero.rawText}`);
        assert(resZero.data?.success === true, 'Response missing success: true');
        assertEqual(resZero.data?.sent, 0, `Expected sent: 0, got ${resZero.data?.sent}`);
      }
    );

    // -------------------------------------------------------------
    // Test 2.2: Unknown / Non-existent Lead in Webhook
    // -------------------------------------------------------------
    await harness.runTest(
      'T2.2: Resend webhook gracefully handles unknown lead ID and non-existent email',
      async () => {
        const fakeLead = {
          id: 99999999,
          email: `ghost_lead_${Date.now()}@hatake-nonexistent-domain.com`,
        };
        const payload = makeResendWebhookPayload('email.opened', fakeLead);

        const webhookRes = await sendResendWebhook(payload);
        // Server should either return 200 (ignoring unknown lead) or 404, never 500 crash
        assert(
          webhookRes.status === 200 || webhookRes.status === 404,
          `Expected 200 or 404 for unknown lead webhook, got ${webhookRes.status}: ${webhookRes.rawText}`
        );
      }
    );

    // -------------------------------------------------------------
    // Test 2.3: Idempotent Webhook Handling (Duplicate Deliveries)
    // -------------------------------------------------------------
    await harness.runTest(
      'T2.3: Duplicate webhooks are idempotent and do not corrupt state or fail',
      async () => {
        const lead = registerLead(await createTestLead({ status: 'sent', sentAt: new Date() }));
        const emailId = `idempotent_email_${Date.now()}_${lead.id}`;
        const payload = makeResendWebhookPayload('email.opened', lead, { emailId });

        // First delivery
        const firstRes = await sendResendWebhook(payload);
        assertEqual(firstRes.status, 200, `First webhook delivery failed: ${firstRes.rawText}`);

        const leadAfterFirst = await getLeadById(lead.id);
        assertEqual(leadAfterFirst!.status, 'opened', 'Status should be opened after first delivery');
        const firstOpenedAt = leadAfterFirst!.openedAt;
        assertNotNull(firstOpenedAt, 'openedAt should be populated');

        // Duplicate delivery with identical payload
        const secondRes = await sendResendWebhook(payload);
        assertEqual(secondRes.status, 200, `Second webhook delivery failed: ${secondRes.rawText}`);

        const leadAfterSecond = await getLeadById(lead.id);
        assertEqual(leadAfterSecond!.status, 'opened', 'Status should remain opened after duplicate delivery');
      }
    );

    // -------------------------------------------------------------
    // Test 2.4: Out-of-Order Webhooks (Clicked Arriving Before Opened)
    // -------------------------------------------------------------
    await harness.runTest(
      'T2.4: Out-of-order webhooks: clicked advances status, late opened event does not downgrade',
      async () => {
        const lead = registerLead(await createTestLead({ status: 'sent', sentAt: new Date() }));
        const emailId = `reorder_email_${Date.now()}_${lead.id}`;

        // 1. Simulate out-of-order 'clicked' arriving first
        const clickedPayload = makeResendWebhookPayload('email.clicked', lead, { emailId });
        const clickedRes = await sendResendWebhook(clickedPayload);
        assertEqual(clickedRes.status, 200, `Clicked webhook failed: ${clickedRes.rawText}`);

        const leadAfterClick = await getLeadById(lead.id);
        assertEqual(leadAfterClick!.status, 'clicked', 'Lead must advance directly to clicked');
        assertNotNull(leadAfterClick!.clickedAt, 'clickedAt must be set');

        // 2. Simulate delayed 'opened' event arriving afterwards
        const openedPayload = makeResendWebhookPayload('email.opened', lead, { emailId });
        const openedRes = await sendResendWebhook(openedPayload);
        assertEqual(openedRes.status, 200, `Delayed opened webhook failed: ${openedRes.rawText}`);

        const leadAfterLateOpen = await getLeadById(lead.id);
        // Crucial monotonic invariant: status MUST remain 'clicked'
        assertEqual(
          leadAfterLateOpen!.status,
          'clicked',
          `Late opened event degraded status from 'clicked' to '${leadAfterLateOpen!.status}'!`
        );
      }
    );

    // -------------------------------------------------------------
    // Test 2.5: Malformed JSON and Missing Required Fields
    // -------------------------------------------------------------
    await harness.runTest(
      'T2.5: Malformed JSON or incomplete payloads are rejected or safely ignored without 500 errors',
      async () => {
        // Case A: Missing type
        const resMissingType = await sendResendWebhook({
          created_at: new Date().toISOString(),
          data: { email_id: '123' },
        });
        assert(
          resMissingType.status === 400 || resMissingType.status === 200,
          `Expected 400 or safe 200 for missing type, got ${resMissingType.status}`
        );

        // Case B: Missing data object
        const resMissingData = await sendResendWebhook({
          type: 'email.opened',
        });
        assert(
          resMissingData.status === 400 || resMissingData.status === 200,
          `Expected 400 or safe 200 for missing data, got ${resMissingData.status}`
        );

        // Case C: Empty JSON object
        const resEmpty = await sendResendWebhook({});
        assert(
          resEmpty.status === 400 || resEmpty.status === 200,
          `Expected 400 or safe 200 for empty payload, got ${resEmpty.status}`
        );

        // Case D: Invalid nested types
        const resBadTypes = await sendResendWebhook({
          type: 12345,
          data: 'invalid-string-instead-of-object',
        });
        assert(
          resBadTypes.status === 400 || resBadTypes.status === 200,
          `Expected 400 or safe 200 for bad types, got ${resBadTypes.status}`
        );
      }
    );

    // -------------------------------------------------------------
    // Test 2.6: Extreme & Boundary Batch Limits
    // -------------------------------------------------------------
    await harness.runTest(
      'T2.6: Negative or non-numeric batch limits are handled safely without DB crashes',
      async () => {
        // Negative limit
        const resNeg = await sendBatchDispatch(-5);
        assert(
          resNeg.status === 200 || resNeg.status === 400,
          `Expected 200 or 400 for negative limit, got ${resNeg.status}`
        );

        // Non-numeric limit
        const resString = await postJson(
          '/api-v2/admin/leads/send',
          { limit: 'fifty' },
          { Authorization: 'Bearer custom-token-ernst-uid' }
        );
        assert(
          resString.status === 200 || resString.status === 400,
          `Expected 200 or 400 for non-numeric limit, got ${resString.status}`
        );
      }
    );
  } finally {
    await deleteTestLeads(createdLeadIds);
  }
}

// Standalone execution support
if (process.argv[1]?.endsWith('tier2_boundary_corner.test.ts')) {
  const harness = new TestHarness();
  runTier2Tests(harness)
    .then(() => {
      const summary = harness.printSummary('Tier 2: Boundary & Corner Cases');
      closeDbPool();
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      closeDbPool();
      process.exit(1);
    });
}
