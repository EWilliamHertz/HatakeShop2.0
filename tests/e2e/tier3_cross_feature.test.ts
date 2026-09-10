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
  closeDbPool,
  ensureDatabaseColumns,
} from './test_helpers.ts';

export async function runTier3Tests(harness: TestHarness) {
  harness.suite('Tier 3: Cross-Feature Combinations & Lifecycle Monotonicity');

  await ensureDatabaseColumns();
  const createdLeadIds: number[] = [];

  const registerLead = (lead: { id: number }) => {
    createdLeadIds.push(lead.id);
    return lead;
  };

  try {
    // -------------------------------------------------------------
    // Test 3.1: Full 5-Stage Funnel Lifecycle Progression
    // pending -> sent -> opened -> clicked -> recruited
    // -------------------------------------------------------------
    await harness.runTest(
      'T3.1: Full 5-stage lifecycle progression: pending -> sent -> opened -> clicked -> recruited',
      async () => {
        // Step 0: Initial state: pending
        const rawInviteToken = `invite-${crypto.randomUUID()}`;
        const inviteTokenHash = crypto.createHash('sha256').update(rawInviteToken).digest('hex');

        const lead = registerLead(
          await createTestLead({
            status: 'pending',
            inviteTokenHash, // Pre-assign token so we can test auth/sync
          })
        );
        assertEqual(lead.status, 'pending', 'Lead initial status must be pending');

        // Step 1: Transition to 'sent'
        // Simulate batch dispatch or update to sent
        await updateLeadDirectly(lead.id, {
          status: 'sent',
          sentAt: new Date(),
          resendEmailId: `resend_${Date.now()}_${lead.id}`,
        });
        const leadSent = await getLeadById(lead.id);
        assertEqual(leadSent!.status, 'sent', 'Lead status should be sent');
        assertNotNull(leadSent!.sentAt, 'sentAt should be recorded');

        // Step 2: Transition to 'opened' via webhook
        const openPayload = makeResendWebhookPayload('email.opened', lead, {
          emailId: leadSent!.resendEmailId || undefined,
        });
        const openRes = await sendResendWebhook(openPayload);
        assertEqual(openRes.status, 200, `Opened webhook failed: ${openRes.rawText}`);

        const leadOpened = await getLeadById(lead.id);
        assertEqual(leadOpened!.status, 'opened', 'Lead status should be opened');
        assertNotNull(leadOpened!.openedAt, 'openedAt should be recorded');

        // Step 3: Transition to 'clicked' via webhook
        const clickPayload = makeResendWebhookPayload('email.clicked', lead, {
          emailId: leadSent!.resendEmailId || undefined,
          clickUrl: `https://hatake.shop/login?invite=${rawInviteToken}`,
        });
        const clickRes = await sendResendWebhook(clickPayload);
        assertEqual(clickRes.status, 200, `Clicked webhook failed: ${clickRes.rawText}`);

        const leadClicked = await getLeadById(lead.id);
        assertEqual(leadClicked!.status, 'clicked', 'Lead status should be clicked');
        assertNotNull(leadClicked!.clickedAt, 'clickedAt should be recorded');

        // Step 4: Transition to 'recruited' via /api-v2/auth/sync
        const syncRes = await triggerRecruitViaAuthSync(rawInviteToken);
        assertEqual(syncRes.status, 200, `Auth sync failed: ${syncRes.rawText}`);

        const leadRecruited = await getLeadById(lead.id);
        assertEqual(leadRecruited!.status, 'recruited', 'Lead status should be recruited');
        assertNotNull(leadRecruited!.redeemedAt, 'redeemedAt should be recorded');
      }
    );

    // -------------------------------------------------------------
    // Test 3.2: Comprehensive Monotonic Forward-Only Invariant Matrix
    // -------------------------------------------------------------
    await harness.runTest(
      'T3.2: Terminal & forward states cannot be downgraded by late webhooks',
      async () => {
        // Case A: Recruited lead resists opened, clicked, delivered
        const recruitedLead = registerLead(
          await createTestLead({
            status: 'recruited',
            sentAt: new Date(Date.now() - 3600000),
            openedAt: new Date(Date.now() - 1800000),
            clickedAt: new Date(Date.now() - 900000),
            redeemedAt: new Date(),
          })
        );

        // Send opened webhook to recruited lead
        await sendResendWebhook(makeResendWebhookPayload('email.opened', recruitedLead));
        let checkRecruited = await getLeadById(recruitedLead.id);
        assertEqual(
          checkRecruited!.status,
          'recruited',
          'Recruited status was downgraded to opened!'
        );

        // Send clicked webhook to recruited lead
        await sendResendWebhook(makeResendWebhookPayload('email.clicked', recruitedLead));
        checkRecruited = await getLeadById(recruitedLead.id);
        assertEqual(
          checkRecruited!.status,
          'recruited',
          'Recruited status was downgraded to clicked!'
        );

        // Send delivered webhook to recruited lead
        await sendResendWebhook(makeResendWebhookPayload('email.delivered', recruitedLead));
        checkRecruited = await getLeadById(recruitedLead.id);
        assertEqual(
          checkRecruited!.status,
          'recruited',
          'Recruited status was downgraded to delivered/sent!'
        );

        // Case B: Clicked lead resists opened and delivered
        const clickedLead = registerLead(
          await createTestLead({
            status: 'clicked',
            sentAt: new Date(Date.now() - 1800000),
            clickedAt: new Date(),
          })
        );

        // Send opened webhook to clicked lead
        await sendResendWebhook(makeResendWebhookPayload('email.opened', clickedLead));
        let checkClicked = await getLeadById(clickedLead.id);
        assertEqual(
          checkClicked!.status,
          'clicked',
          'Clicked status was downgraded to opened!'
        );

        // Send delivered webhook to clicked lead
        await sendResendWebhook(makeResendWebhookPayload('email.delivered', clickedLead));
        checkClicked = await getLeadById(clickedLead.id);
        assertEqual(
          checkClicked!.status,
          'clicked',
          'Clicked status was downgraded to delivered/sent!'
        );

        // Case C: Opened lead resists delivered
        const openedLead = registerLead(
          await createTestLead({
            status: 'opened',
            sentAt: new Date(Date.now() - 1800000),
            openedAt: new Date(),
          })
        );

        await sendResendWebhook(makeResendWebhookPayload('email.delivered', openedLead));
        const checkOpened = await getLeadById(openedLead.id);
        assertEqual(
          checkOpened!.status,
          'opened',
          'Opened status was downgraded to delivered/sent!'
        );
      }
    );

    // -------------------------------------------------------------
    // Test 3.3: 3-Tier Webhook Lead Identification Fallback Resolution
    // -------------------------------------------------------------
    await harness.runTest(
      'T3.3: Webhook successfully links leads via tags.lead_id, email_id, or recipient email fallback',
      async () => {
        // Fallback 1: Resolution via data.tags.lead_id
        const leadByTag = registerLead(await createTestLead({ status: 'sent', sentAt: new Date() }));
        const payloadByTag = {
          type: 'email.opened',
          created_at: new Date().toISOString(),
          data: {
            email_id: `tag_res_${Date.now()}`,
            to: ['some_other_alias@example.com'],
            tags: { lead_id: String(leadByTag.id) },
          },
        };
        const resTag = await sendResendWebhook(payloadByTag);
        assertEqual(resTag.status, 200, `Tag resolution webhook failed: ${resTag.rawText}`);
        const updatedTag = await getLeadById(leadByTag.id);
        assertEqual(updatedTag!.status, 'opened', 'Failed to resolve lead via tags.lead_id');

        // Fallback 2: Resolution via data.email_id matching resend_email_id
        const uniqueEmailId = `id_res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const leadById = registerLead(
          await createTestLead({
            status: 'sent',
            sentAt: new Date(),
            resendEmailId: uniqueEmailId,
          })
        );
        const payloadById = {
          type: 'email.opened',
          created_at: new Date().toISOString(),
          data: {
            email_id: uniqueEmailId,
            to: ['unmatched_email@example.com'], // different email
            // no tags
          },
        };
        const resId = await sendResendWebhook(payloadById);
        assertEqual(resId.status, 200, `Email ID resolution webhook failed: ${resId.rawText}`);
        const updatedId = await getLeadById(leadById.id);
        assertEqual(updatedId!.status, 'opened', 'Failed to resolve lead via resend_email_id');

        // Fallback 3: Resolution via data.to[0] matching leads.email
        const leadByEmail = registerLead(await createTestLead({ status: 'sent', sentAt: new Date() }));
        const payloadByEmail = {
          type: 'email.opened',
          created_at: new Date().toISOString(),
          data: {
            email_id: `unknown_email_id_${Date.now()}`,
            to: [leadByEmail.email],
            // no tags, unknown email_id
          },
        };
        const resEmail = await sendResendWebhook(payloadByEmail);
        assertEqual(resEmail.status, 200, `Email fallback resolution failed: ${resEmail.rawText}`);
        const updatedEmail = await getLeadById(leadByEmail.id);
        assertEqual(updatedEmail!.status, 'opened', 'Failed to resolve lead via recipient email address');
      }
    );
  } finally {
    await deleteTestLeads(createdLeadIds);
  }
}

// Standalone execution support
if (process.argv[1]?.endsWith('tier3_cross_feature.test.ts')) {
  const harness = new TestHarness();
  runTier3Tests(harness)
    .then(() => {
      const summary = harness.printSummary('Tier 3: Cross-Feature Combinations');
      closeDbPool();
      process.exit(summary.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      closeDbPool();
      process.exit(1);
    });
}
