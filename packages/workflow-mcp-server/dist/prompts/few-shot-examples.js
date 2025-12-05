/**
 * Few-shot examples for different workflow patterns
 */
export const FEW_SHOT_EXAMPLES = {
    sequential: {
        intent: "Fetch a user's profile, then enrich it with their order history",
        yaml: `name: enrich-user-profile
input:
  type: object
  properties:
    userId:
      type: string
  required:
    - userId
output:
  enrichedProfile: "{{ tasks.enrich-profile.output.result }}"
tasks:
  - id: fetch-user
    taskRef: get-user
    input:
      userId: "{{ input.userId }}"
  - id: enrich-profile
    taskRef: enrich-data
    input:
      profile: "{{ tasks.fetch-user.output.user }}"
      type: order-history
    dependsOn:
      - fetch-user`,
        pattern: 'sequential',
        explanation: 'This workflow fetches a user first, then enriches their profile with order history. Tasks run sequentially because enrich-profile depends on fetch-user output.'
    },
    parallel: {
        intent: "Fetch user profile and product catalog at the same time",
        yaml: `name: parallel-fetch
input:
  type: object
  properties:
    userId:
      type: string
    catalogId:
      type: string
  required:
    - userId
    - catalogId
output:
  user: "{{ tasks.fetch-user.output.user }}"
  catalog: "{{ tasks.fetch-catalog.output.catalog }}"
tasks:
  - id: fetch-user
    taskRef: get-user
    input:
      userId: "{{ input.userId }}"
  - id: fetch-catalog
    taskRef: get-catalog
    input:
      catalogId: "{{ input.catalogId }}"`,
        pattern: 'parallel',
        explanation: 'This workflow fetches user and catalog data in parallel since neither depends on the other. Both tasks start immediately and run concurrently.'
    },
    diamond: {
        intent: "Validate an order by checking inventory and credit limit in parallel, then process if both pass",
        yaml: `name: validate-and-process-order
input:
  type: object
  properties:
    orderId:
      type: string
    customerId:
      type: string
  required:
    - orderId
    - customerId
output:
  result: "{{ tasks.process-order.output.confirmation }}"
tasks:
  - id: get-order
    taskRef: fetch-order
    input:
      orderId: "{{ input.orderId }}"
  - id: check-inventory
    taskRef: inventory-check
    input:
      items: "{{ tasks.get-order.output.items }}"
    dependsOn:
      - get-order
  - id: check-credit
    taskRef: credit-check
    input:
      customerId: "{{ input.customerId }}"
      amount: "{{ tasks.get-order.output.total }}"
    dependsOn:
      - get-order
  - id: process-order
    taskRef: order-processor
    input:
      order: "{{ tasks.get-order.output }}"
      inventoryOk: "{{ tasks.check-inventory.output.available }}"
      creditOk: "{{ tasks.check-credit.output.approved }}"
    dependsOn:
      - check-inventory
      - check-credit`,
        pattern: 'diamond',
        explanation: 'This workflow uses a diamond pattern: first fetch the order, then check inventory and credit in parallel (fork), finally process the order when both checks complete (join).'
    },
    complex: {
        intent: "Process a batch of orders with validation, enrichment, and notification",
        yaml: `name: batch-order-processing
input:
  type: object
  properties:
    batchId:
      type: string
  required:
    - batchId
output:
  summary: "{{ tasks.send-summary.output.result }}"
tasks:
  - id: fetch-batch
    taskRef: get-batch
    input:
      batchId: "{{ input.batchId }}"
  - id: validate-orders
    taskRef: batch-validate
    input:
      orders: "{{ tasks.fetch-batch.output.orders }}"
    dependsOn:
      - fetch-batch
  - id: enrich-orders
    taskRef: batch-enrich
    input:
      orders: "{{ tasks.validate-orders.output.validOrders }}"
    dependsOn:
      - validate-orders
  - id: process-orders
    taskRef: batch-process
    input:
      orders: "{{ tasks.enrich-orders.output.enrichedOrders }}"
    dependsOn:
      - enrich-orders
  - id: send-summary
    taskRef: send-notification
    input:
      type: batch-complete
      data: "{{ tasks.process-orders.output.summary }}"
    dependsOn:
      - process-orders`,
        pattern: 'complex',
        explanation: 'This is a complex sequential pipeline for batch processing: fetch → validate → enrich → process → notify. Each step depends on the previous one.'
    }
};
/**
 * Get the most relevant example based on intent analysis
 */
export function selectRelevantExample(intent) {
    const lowerIntent = intent.toLowerCase();
    // Check for parallel indicators
    if (lowerIntent.includes('at the same time') ||
        lowerIntent.includes('simultaneously') ||
        lowerIntent.includes('in parallel') ||
        lowerIntent.includes('both') ||
        lowerIntent.includes('and') && !lowerIntent.includes('then')) {
        return FEW_SHOT_EXAMPLES.parallel;
    }
    // Check for diamond pattern indicators
    if ((lowerIntent.includes('check') && lowerIntent.includes('then')) ||
        (lowerIntent.includes('validate') && lowerIntent.includes('process')) ||
        lowerIntent.includes('fork') ||
        lowerIntent.includes('join')) {
        return FEW_SHOT_EXAMPLES.diamond;
    }
    // Check for complex/batch indicators
    if (lowerIntent.includes('batch') ||
        lowerIntent.includes('multiple') ||
        lowerIntent.includes('pipeline')) {
        return FEW_SHOT_EXAMPLES.complex;
    }
    // Default to sequential
    return FEW_SHOT_EXAMPLES.sequential;
}
/**
 * Format a few-shot example for inclusion in a prompt
 */
export function formatExample(example) {
    return `**Example Intent:** "${example.intent}"

**Generated Workflow:**
\`\`\`yaml
${example.yaml}
\`\`\`

**Pattern:** ${example.pattern}
**Explanation:** ${example.explanation}`;
}
//# sourceMappingURL=few-shot-examples.js.map