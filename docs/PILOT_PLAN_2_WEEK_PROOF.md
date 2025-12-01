# 2-Week Pilot: Prove Task Library Value to Skeptical Teams

**Last Updated:** 2025-11-29

## Goal

**Convert 1 skeptical team into a champion** by showing 5-10× faster workflow creation with the task library approach.

**Timeline:** 2 weeks
**Investment:** 20-30 hours total (mostly pairing with pilot team)
**Success Metric:** Team voluntarily uses task library for their next 2 projects

---

## Why Teams Resist (Common Objections)

| Objection | Root Fear | How Pilot Addresses It |
|-----------|-----------|------------------------|
| "We're too busy" | Time/priority | Show 5× speedup (2 days vs 2 weeks) |
| "Our use case is special" | Not invented here | Build tasks FOR their exact use case |
| "Platform team bottleneck" | Loss of control | Federated ownership (they own their tasks) |
| "Shared services break" | Reliability | >90% coverage, versioning, canary deploys |
| "Current approach works" | Change resistance | Opportunity cost (what could you build with 8 weeks saved?) |
| "Too complex" | Cognitive load | Show YAML is simpler than code |
| "Task won't exist" | Dependency anxiety | Show how easy it is to create tasks |

---

## Week 1: Build WITH Them

### Day 1 (Monday): Find the Right Team

**Selection Criteria:**

✅ **DO pick:**
- Team about to build a painful integration (next sprint)
- Moderate skepticism (open to evidence)
- Has 1-2 weeks of capacity (or sprint planning)
- Contains 1 influential engineer (future champion)
- Team lead is pragmatic (not dogmatic)

❌ **DON'T pick:**
- Most supportive team (easy win, won't convince skeptics)
- Most hostile team (will fight you)
- Busiest team (no time)
- Team with no upcoming integration work

**The Pitch:**

```
Subject: Help me test something (might save you 2 weeks)

Hi [Team Lead],

I know you're skeptical about the task library. Fair.

I saw you're planning to build [specific integration] next sprint.
Your estimate: 2 weeks.

What if I could show you how to build it in 2 days?

No long-term commitment. We do a 2-week pilot:
- Week 1: I pair with your team to build tasks for YOUR use case
- Week 2: Your team builds the workflow using those tasks
- If it doesn't work: You go back to your plan, I get feedback
- If it works: You ship faster, I get a case study

Worth 2 hours Monday to explore?

[Your Name]
```

**Expected Response:** "Okay, but I'm skeptical" (Perfect! That's who you want)

---

### Day 2-3 (Tuesday-Wednesday): Deep Dive on Requirements

**Goal:** Understand their EXACT pain points (not generic integration needs)

**Meeting Agenda (2 hours):**

**1. What are you building?** (15 min)
- Specific integration (Stripe payment, SendGrid email, etc.)
- Expected inputs/outputs
- Success criteria

**2. What's painful about it?** (30 min)
- Retry logic? ("If API fails, retry 3 times with backoff")
- Error handling? ("Different error codes need different handling")
- Auth? ("Need to refresh OAuth tokens")
- Testing? ("Hard to mock external APIs")
- Schema validation? ("Input validation is boilerplate")

**3. Current approach?** (15 min)
- How do you usually build this?
- How long does it take?
- What usually goes wrong?

**4. Ideal scenario?** (15 min)
- "If I could just call an API and it handles..."
- What would make this trivial?

**5. Concerns about task library?** (30 min)
- What worries you?
- What would make you trust it?
- What would make you NOT use it?

**6. Success criteria for pilot?** (15 min)
- What would convince you this works?
- What metrics matter? (time, quality, ease of use?)

**Deliverable:**
- Document their exact requirements
- Identify 2-3 tasks that would solve their pain
- Get commitment: "If we build these tasks and they work, you'll use them"

---

### Day 4-5 (Thursday-Friday): Build Tasks WITH Them

**Goal:** Show that building tasks is EASY (demystify the platform)

**Don't:** Build tasks in isolation, hand them over
**Do:** Pair program, narrate as you build, teach them

**Example Session (Thursday Morning, 3 hours):**

**9:00 AM: Scaffolding**
```bash
$ workflow-cli task create --name charge-payment --template http

✅ Generated task scaffold at tasks/charge-payment.yaml
✅ Generated tests at tests/charge-payment.test.ts
✅ Configured CI/CD pipeline

Let's fill in the details together...
```

**9:15 AM: Define Schema**
```yaml
# Pair program: "What inputs do you need?"
# They say: "amount, currency, customerId, idempotencyKey"

inputSchema:
  type: object
  required: [amount, currency, customerId]
  properties:
    amount: { type: number, minimum: 0.01 }
    currency: { type: string, enum: [USD, EUR, GBP] }
    customerId: { type: string }
    idempotencyKey: { type: string }  # Optional but recommended
```

**9:30 AM: Implement HTTP Call**
```yaml
# "Where's the Stripe API endpoint?"
# They share docs, you build together

http:
  method: POST
  url: "https://api.stripe.com/v1/charges"
  headers:
    Authorization: "Bearer {{env.STRIPE_SECRET_KEY}}"
    Idempotency-Key: "{{input.idempotencyKey}}"
  body: |
    {
      "amount": {{input.amount}},
      "currency": "{{input.currency}}",
      "customer": "{{input.customerId}}"
    }
```

**10:00 AM: Add Retry Logic**
```yaml
# "What should we retry on?"
# They explain Stripe error codes, you configure

retry:
  maxAttempts: 3
  backoff: exponential
  retryOn:
    - statusCode: 429  # Rate limit
    - statusCode: 500  # Server error
    - statusCode: 503  # Service unavailable
```

**10:30 AM: Define Output Schema**
```yaml
outputSchema:
  type: object
  required: [chargeId, status]
  properties:
    chargeId: { type: string }
    status: { type: string, enum: [succeeded, pending, failed] }
    errorCode: { type: string }
    errorMessage: { type: string }
```

**11:00 AM: Write Tests**
```typescript
// "What scenarios should we test?"
// They list: success, declined card, network error, etc.

describe('charge-payment task', () => {
  it('should charge successfully', async () => {
    const result = await executeTask('charge-payment', {
      amount: 100.00,
      currency: 'USD',
      customerId: 'cust_123'
    });

    expect(result.status).toBe('succeeded');
    expect(result.chargeId).toBeDefined();
  });

  it('should handle declined card', async () => {
    // Mock Stripe API to return 402
    const result = await executeTask('charge-payment', {
      amount: 100.00,
      currency: 'USD',
      customerId: 'cust_invalid'
    });

    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe('card_declined');
  });

  // ... 10 more tests
});
```

**12:00 PM: DONE**

Task built in 3 hours (pair programming).
If they built it alone: 3-5 days.

**Key Moment:** They realize "Wait, this is actually easier than writing it myself"

---

**Friday: Test & Deploy Together**

**Morning:** Run tests
```bash
$ npm test tasks/charge-payment.test.ts

✅ 12/12 tests passing
✅ 95% code coverage
```

**Afternoon:** Deploy to staging
```bash
$ kubectl apply -f tasks/charge-payment.yaml
$ kubectl apply -f tasks/send-welcome-email.yaml  # Built Thu afternoon

✅ Tasks deployed to staging namespace
```

**Test from Postman/curl:**
```bash
$ curl -X POST /api/v1/tasks/charge-payment/execute \
  -d '{
    "amount": 10.00,
    "currency": "USD",
    "customerId": "cust_test_123"
  }'

# Response: 200 OK
{
  "chargeId": "ch_abc123",
  "status": "succeeded"
}
```

**End of Week 1 Checkpoint:**
- ✅ 2 tasks built (charge-payment, send-welcome-email)
- ✅ Team participated in building them (not handed over)
- ✅ All tests passing, deployed to staging
- ✅ Team sees: "This wasn't as hard as I thought"

---

## Week 2: Compose & Ship

### Day 6 (Monday): Build Their Workflow Together

**Goal:** Show composition is trivial (30 minutes vs 2 weeks)

**Morning Session (1 hour):**

```yaml
# "Let's build your user onboarding workflow"
# Original estimate: 2 weeks
# Actual time: 30 minutes of YAML

apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: user-onboarding
spec:
  description: Onboard new users with payment and welcome email

  input:
    userId:
      type: string
      required: true
      description: User ID from registration

  tasks:
    # Task 1: Charge initial fee
    - id: charge-onboarding-fee
      taskRef: charge-payment  # Built last week!
      input:
        amount: 10.00
        currency: USD
        customerId: "{{input.userId}}"
        idempotencyKey: "onboarding-{{input.userId}}"

    # Task 2: Fetch user details
    - id: fetch-user
      taskRef: fetch-user-data  # Already exists in catalog
      input:
        userId: "{{input.userId}}"
      dependsOn: [charge-onboarding-fee]  # Wait for payment

    # Task 3: Send welcome email
    - id: send-welcome
      taskRef: send-welcome-email  # Built last week!
      input:
        to: "{{tasks.fetch-user.output.email}}"
        userName: "{{tasks.fetch-user.output.name}}"
      dependsOn: [fetch-user]

  output:
    chargeId: "{{tasks.charge-onboarding-fee.output.chargeId}}"
    userEmail: "{{tasks.fetch-user.output.email}}"
    emailSent: "true"
```

**Key Moment:** 30 minutes later, they say "Wait, that's it?"

---

### Day 7-8 (Tuesday-Wednesday): Test, Iterate, Polish

**Tuesday Morning: Deploy to Staging**
```bash
$ kubectl apply -f workflows/user-onboarding.yaml

✅ Workflow validated
✅ All task references exist
✅ Schema validation passed
✅ Deployed to staging
```

**Tuesday Afternoon: Execute Test Run**
```bash
$ curl -X POST /api/v1/workflows/user-onboarding/execute \
  -d '{"userId": "test_user_123"}'

# Response: 200 OK (completed in 2.3s)
{
  "status": "succeeded",
  "output": {
    "chargeId": "ch_abc123",
    "userEmail": "test@example.com",
    "emailSent": "true"
  },
  "taskResults": {
    "charge-onboarding-fee": { "status": "succeeded", "duration": "1.2s" },
    "fetch-user": { "status": "succeeded", "duration": "0.3s" },
    "send-welcome": { "status": "succeeded", "duration": "0.8s" }
  }
}
```

**Wednesday: Edge Cases & Error Handling**
- Test failure scenarios (payment declined, user not found, email bounce)
- Verify retry logic works
- Check execution traces in UI
- Polish error messages

---

### Day 9 (Thursday): Measure & Compare

**Create comparison table:**

| Metric | Old Approach | Task Library | Improvement |
|--------|--------------|--------------|-------------|
| **Development Time** | 10 days | 2 days | **5× faster** |
| **Code Written** | ~500 lines | 50 lines YAML | **10× less code** |
| **Test Coverage** | 65% | 95% | **+30% coverage** |
| **Bugs Found** | 3 (in QA) | 0 | **100% fewer bugs** |
| **Retry Logic** | Custom (buggy) | Built-in (battle-tested) | ✅ Reliable |
| **Error Handling** | Inconsistent | Standardized | ✅ Better UX |
| **Reusability** | 0% (1 team) | 100% (any team) | ♾️ Infinite reuse |
| **Maintenance** | Team owns code | Platform owns tasks | ⬇️ Lower burden |

**Calculate ROI:**
```
Time Saved: 8 days
Engineering Cost: $800/day
Total Savings: $6,400

Plus:
- Higher quality (95% vs 65% coverage)
- Faster debugging (execution traces)
- Future reuse (other teams benefit)

ROI: 5-10× for this ONE workflow
```

---

### Day 10 (Friday): Debrief & Decide

**Retrospective Meeting (1 hour):**

**1. What Worked?** (15 min)
- "Building tasks was easier than expected"
- "Composing workflows was surprisingly fast"
- "Having retries built-in saved us time"
- "Execution traces are great for debugging"

**2. What Concerns Remain?** (20 min)

| Concern | Response |
|---------|----------|
| "What if task breaks?" | Versioning: You pin to v1, we deploy v2 separately |
| "Who maintains tasks?" | Federated: You own your domain tasks, platform team curates |
| "What if we need custom logic?" | You can build custom tasks anytime (self-service) |
| "What about our special use case?" | We just proved tasks work for YOUR use case |
| "Platform team bottleneck?" | 5:1 ratio now, federated ownership scales to 50:1 |

**3. The Decision Question:** (20 min)

> "Would you use the task library for your next 2 projects?"

**Ideal:** "Yes, absolutely"
**Good:** "Yes, if we address [specific concern]"
**Neutral:** "Maybe, let me think about it"
**Bad:** "No, we'll stick with our approach"

**If "Yes" or "Good":**
- ✅ Pilot SUCCESS
- Document success story
- Use team as reference for other teams
- Invite them to weekly task library office hours

**If "Neutral" or "Bad":**
- ❌ Pilot FAILED (but you learned why!)
- Document objections
- Iterate on approach
- Try with different team

---

## Success Story Template (Share Widely)

```markdown
# How Team X Shipped User Onboarding 5× Faster with Task Library

**Team:** [Team Name]
**Project:** User onboarding workflow with payment + email
**Timeline:** 2-week pilot (Nov 18 - Nov 29, 2025)

## The Challenge

Team X needed to build a user onboarding workflow:
1. Charge $10 onboarding fee (Stripe integration)
2. Fetch user details (Internal API)
3. Send welcome email (SendGrid integration)

**Original Estimate:** 2 weeks (10 days)
- 3 days: Stripe integration with retry logic
- 2 days: User service integration
- 3 days: SendGrid integration
- 2 days: Testing and edge cases

## The Approach

**Week 1:** Built 2 reusable tasks WITH platform team:
- `charge-payment` (Stripe wrapper with retry/auth)
- `send-welcome-email` (SendGrid with templating)

**Week 2:** Composed workflow from tasks:
- 30 minutes to write YAML
- 1 day to test and polish

**Total Time:** 2 days (vs 10 days estimated)

## The Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Development Time | 10 days | 2 days | **5× faster** |
| Code Written | 500 lines | 50 lines | **10× less** |
| Test Coverage | 65% | 95% | **+30%** |
| Bugs in QA | 3 | 0 | **Zero defects** |

**Cost Savings:** $6,400 in engineering time (8 days × $800/day)

## Team Feedback

> "I was skeptical at first, but after seeing how fast we shipped
> with battle-tested tasks, I'm convinced. We're using this for
> our next 3 projects."
>
> — [Team Lead Name], Senior Engineer

> "The execution traces made debugging trivial. We found and fixed
> an issue in 10 minutes that would've taken hours before."
>
> — [Engineer Name], Team X

## Next Steps

Team X is now:
- ✅ Using task library for payment processing workflow (Sprint 47)
- ✅ Building 2 custom tasks for their domain (product recommendations)
- ✅ Evangelizing to Team Y and Team Z

## Try It Yourself

Interested in a 2-week pilot with your team?
Contact: [Your Name] in #task-library
```

---

## Week 3-4: Organic Expansion

**DON'T:** Announce company-wide mandate yet

**DO:** Let success spread naturally

**How it spreads:**

```
Week 2 (Pilot): Team X ships in 2 days, shares at demo day
Week 3: Team Y sees demo, asks "Can we try this?"
Week 4: Team Z hears about Team X's success, reaches out
Week 5: Teams A, B, C all request pilots
Week 6: You have a waitlist

This is grassroots adoption (most sustainable).
```

**Your job:** Run 2-week pilots with each new team until you have 5 champions

**Timeline:**
- Week 1-2: Pilot #1 (Team X)
- Week 3-4: Pilot #2 (Team Y)
- Week 5-6: Pilot #3 (Team Z)
- Week 7-8: Pilot #4 (Team A)
- Week 9-10: Pilot #5 (Team B)

**After 5 successful pilots:**
- ✅ 5 champion teams
- ✅ 20-30 tasks in production
- ✅ 15-25 workflows deployed
- ✅ Proven ROI ($30k+ saved)
- ✅ Cross-team success stories
- ✅ Ready for company-wide announcement

---

## Handling Persistent Resistance

**If a team says "No" after seeing the pilot:**

**Don't:** Force it, mandate it, escalate to leadership

**Do:** Understand why, document, move on

**Exit Interview Questions:**
1. What didn't work for you?
2. What would've convinced you?
3. What's your alternative approach?
4. Can we learn from your objections?

**Common reasons for rejection:**
- ❌ Political (team lead protecting territory)
- ❌ Cultural (extreme "not invented here")
- ❌ Legitimate technical mismatch (truly unique use case)
- ❌ Bad timing (team in crisis mode, no capacity)

**If 3+ teams reject for same reason:** You have a real problem to solve

**If 5+ teams adopt:** You have momentum, ignore holdouts

---

## Success Metrics (Track These)

**Per-Team Metrics:**
- ⏱️ Time to first workflow (target: <2 days)
- 📈 Workflows created (target: 3+ in first month)
- 🔄 Task reuse rate (target: >50% of tasks used by 2+ workflows)
- 😊 Developer NPS (target: >8)
- 🐛 Production bugs (target: 0 in first month)

**Platform Metrics:**
- 👥 Teams adopting (target: 5 in 10 weeks)
- 📦 Tasks in catalog (target: 30+ after 5 pilots)
- 🔧 Workflows in production (target: 20+ after 5 pilots)
- 💰 ROI calculated (target: $30k+ saved)
- 📣 Champions identified (target: 5+ evangelists)

**Red Flags (Stop and Reassess):**
- ❌ 3+ teams reject for same reason
- ❌ Developer NPS <5 (actively frustrated)
- ❌ Task reuse rate <20% (teams building duplicates)
- ❌ Production bugs >2/month (quality issues)
- ❌ Platform team becoming bottleneck (need federated ownership)

---

## Pilot Checklist

### Week 1: Build
- [ ] Day 1: Select team and get commitment
- [ ] Day 2-3: Deep dive on requirements (2-hour session)
- [ ] Day 4: Build first task together (3-hour pairing)
- [ ] Day 4 PM: Build second task together (2-hour pairing)
- [ ] Day 5: Test and deploy tasks to staging

### Week 2: Ship
- [ ] Day 6: Compose workflow together (1-hour session)
- [ ] Day 7: Deploy and test workflow
- [ ] Day 8: Handle edge cases and polish
- [ ] Day 9: Measure results and calculate ROI
- [ ] Day 10: Retrospective and decision

### Week 3: Document
- [ ] Create success story (1-pager)
- [ ] Share at demo day / all-hands
- [ ] Post in #engineering Slack channel
- [ ] Identify next pilot team
- [ ] Iterate based on feedback

---

## Conclusion

**The 2-week pilot de-risks the entire initiative.**

**If it works:**
- ✅ You have proof (not promises)
- ✅ You have a champion (not skeptics)
- ✅ You have a template (repeat with other teams)

**If it fails:**
- ✅ You learned WHY (not guessing)
- ✅ You iterate (fix root cause)
- ✅ You try again (with different team or approach)

**Either way, you WIN by learning fast.**

**Budget: 20-30 hours over 2 weeks**
**Return: $6k saved + 1 champion team + proof of concept**
**ROI: 10-20× on time invested**

**Ready to pick your first pilot team?**
