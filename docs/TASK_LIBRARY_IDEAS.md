# Workflow Task Library - Public API Integration Ideas

A comprehensive collection of composable workflow tasks for integrating with popular public APIs.

**Goal**: Build a library of 50+ reusable tasks that can be composed into thousands of workflow combinations.

---

## Table of Contents

- [Communication & Notifications](#communication--notifications)
- [Payments & Finance](#payments--finance)
- [AI & Machine Learning](#ai--machine-learning)
- [Data Storage & Databases](#data-storage--databases)
- [Developer Tools & DevOps](#developer-tools--devops)
- [Web Scraping & Data Enrichment](#web-scraping--data-enrichment)
- [Analytics & Monitoring](#analytics--monitoring)
- [Utility Tasks](#utility-tasks)
- [CRM & Sales](#crm--sales)
- [Social Media](#social-media)
- [Workflow Composition Examples](#workflow-composition-examples)
- [Task Library Organization](#task-library-organization)

---

## 🔔 Communication & Notifications

### slack-send-message
Send message to Slack channel

**Input Schema:**
```yaml
channel: string          # Channel name or ID (e.g., "#general")
text: string            # Message text (markdown supported)
attachments?: array     # Rich message attachments
threadTs?: string       # Thread timestamp to reply to
username?: string       # Custom username
iconEmoji?: string      # Custom emoji icon
```

**Output Schema:**
```yaml
messageTs: string       # Timestamp of sent message
channel: string         # Channel where message was sent
```

**Example:**
```yaml
- id: notify-team
  taskRef: slack-send-message
  input:
    channel: "#deployments"
    text: "🚀 Deployment to production completed successfully!"
```

---

### sendgrid-send-email
Send transactional email via SendGrid

**Input Schema:**
```yaml
to: string              # Recipient email address
subject: string         # Email subject line
html: string            # HTML email body
from?: string           # Sender email (defaults to configured sender)
cc?: array<string>      # CC recipients
bcc?: array<string>     # BCC recipients
attachments?: array     # File attachments
templateId?: string     # SendGrid template ID
dynamicTemplateData?: object  # Template variables
```

**Output Schema:**
```yaml
messageId: string       # Email message ID
statusCode: integer     # HTTP status code
```

**Example:**
```yaml
- id: send-welcome-email
  taskRef: sendgrid-send-email
  input:
    to: "{{input.userEmail}}"
    subject: "Welcome to Our Platform!"
    templateId: "d-abc123"
    dynamicTemplateData:
      firstName: "{{input.firstName}}"
      activationLink: "{{tasks.generate-token.output.link}}"
```

---

### twilio-send-sms
Send SMS message via Twilio

**Input Schema:**
```yaml
to: string              # Recipient phone number (E.164 format)
body: string            # SMS message body (max 160 chars)
from?: string           # Sender phone number
mediaUrl?: array<string>  # MMS media URLs
```

**Output Schema:**
```yaml
messageSid: string      # Twilio message SID
status: string          # Message status
dateCreated: string     # ISO 8601 timestamp
```

**Example:**
```yaml
- id: send-verification-code
  taskRef: twilio-send-sms
  input:
    to: "{{input.phoneNumber}}"
    body: "Your verification code is: {{tasks.generate-code.output.code}}"
```

---

### discord-webhook
Send notification to Discord via webhook

**Input Schema:**
```yaml
webhookUrl: string      # Discord webhook URL
content: string         # Message content
username?: string       # Custom username
avatarUrl?: string      # Custom avatar URL
embeds?: array          # Rich embed objects
tts?: boolean           # Text-to-speech
```

**Output Schema:**
```yaml
messageId: string       # Discord message ID
```

**Example:**
```yaml
- id: notify-discord
  taskRef: discord-webhook
  input:
    webhookUrl: "{{env.DISCORD_WEBHOOK_URL}}"
    content: "🎉 New user signup: {{input.userEmail}}"
    embeds:
      - title: "User Details"
        fields:
          - name: "Email"
            value: "{{input.userEmail}}"
          - name: "Plan"
            value: "{{input.plan}}"
```

---

### teams-send-message
Send message to Microsoft Teams channel

**Input Schema:**
```yaml
webhookUrl: string      # Teams webhook URL
title: string           # Message title
text: string            # Message text
themeColor?: string     # Hex color code
sections?: array        # Message sections
```

**Output Schema:**
```yaml
statusCode: integer     # HTTP status code
```

---

### pagerduty-create-incident
Create PagerDuty incident

**Input Schema:**
```yaml
title: string           # Incident title
urgency: string         # low | high
description?: string    # Incident description
serviceId: string       # PagerDuty service ID
escalationPolicyId?: string
```

**Output Schema:**
```yaml
incidentId: string      # PagerDuty incident ID
incidentNumber: integer # Incident number
status: string          # Incident status
htmlUrl: string         # Incident URL
```

---

## 💳 Payments & Finance

### stripe-create-payment-intent
Create Stripe payment intent

**Input Schema:**
```yaml
amount: integer         # Amount in cents
currency: string        # Three-letter ISO currency code (e.g., "usd")
customer?: string       # Stripe customer ID
description?: string    # Payment description
metadata?: object       # Custom metadata
paymentMethodTypes?: array<string>  # ["card", "apple_pay"]
```

**Output Schema:**
```yaml
paymentIntentId: string # Payment intent ID
clientSecret: string    # Client secret for frontend
status: string          # Payment status
amount: integer         # Payment amount
```

**Example:**
```yaml
- id: create-payment
  taskRef: stripe-create-payment-intent
  input:
    amount: "{{input.amount}}"
    currency: "usd"
    customer: "{{tasks.get-or-create-customer.output.customerId}}"
    description: "Order #{{input.orderId}}"
    metadata:
      orderId: "{{input.orderId}}"
      userId: "{{input.userId}}"
```

---

### stripe-refund
Issue a refund for a payment

**Input Schema:**
```yaml
paymentIntentId: string # Payment intent to refund
amount?: integer        # Partial refund amount (omit for full refund)
reason?: string         # duplicate | fraudulent | requested_by_customer
metadata?: object       # Custom metadata
```

**Output Schema:**
```yaml
refundId: string        # Refund ID
status: string          # Refund status
amount: integer         # Refunded amount
```

---

### stripe-create-customer
Create a Stripe customer

**Input Schema:**
```yaml
email: string           # Customer email
name?: string           # Customer name
phone?: string          # Customer phone
description?: string    # Customer description
metadata?: object       # Custom metadata
paymentMethod?: string  # Payment method ID to attach
```

**Output Schema:**
```yaml
customerId: string      # Stripe customer ID
email: string           # Customer email
created: integer        # Unix timestamp
```

---

### stripe-create-subscription
Create a subscription

**Input Schema:**
```yaml
customerId: string      # Stripe customer ID
priceId: string         # Price ID
quantity?: integer      # Subscription quantity
trialPeriodDays?: integer
metadata?: object       # Custom metadata
```

**Output Schema:**
```yaml
subscriptionId: string  # Subscription ID
status: string          # Subscription status
currentPeriodEnd: integer  # Unix timestamp
```

---

### paypal-create-order
Create PayPal order

**Input Schema:**
```yaml
amount: number          # Order amount
currency: string        # Currency code
description?: string    # Order description
returnUrl: string       # Return URL after payment
cancelUrl: string       # Cancel URL
```

**Output Schema:**
```yaml
orderId: string         # PayPal order ID
approvalUrl: string     # URL for customer approval
status: string          # Order status
```

---

### coingecko-get-price
Get cryptocurrency prices

**Input Schema:**
```yaml
coinId: string          # Coin ID (e.g., "bitcoin", "ethereum")
currency: string        # Target currency (e.g., "usd", "eur")
includeMarketCap?: boolean
include24hrChange?: boolean
```

**Output Schema:**
```yaml
price: number           # Current price
marketCap?: number      # Market capitalization
change24h?: number      # 24h price change percentage
lastUpdated: string     # ISO 8601 timestamp
```

---

## 🤖 AI & Machine Learning

### openai-chat-completion
Generate chat completion with OpenAI GPT

**Input Schema:**
```yaml
model: string           # Model ID (e.g., "gpt-4", "gpt-3.5-turbo")
messages: array         # Array of message objects
temperature?: number    # 0.0 to 2.0 (default: 1.0)
maxTokens?: integer     # Maximum tokens to generate
topP?: number           # Nucleus sampling parameter
stop?: array<string>    # Stop sequences
```

**Message Format:**
```yaml
- role: system | user | assistant
  content: string
```

**Output Schema:**
```yaml
content: string         # Generated response
finishReason: string    # stop | length | content_filter
usage:
  promptTokens: integer
  completionTokens: integer
  totalTokens: integer
model: string           # Model used
```

**Example:**
```yaml
- id: generate-product-description
  taskRef: openai-chat-completion
  input:
    model: "gpt-4"
    temperature: 0.7
    maxTokens: 500
    messages:
      - role: system
        content: "You are a professional product copywriter."
      - role: user
        content: "Write a compelling description for: {{input.productName}}"
```

---

### openai-create-embeddings
Generate text embeddings

**Input Schema:**
```yaml
input: string | array<string>  # Text to embed
model: string           # "text-embedding-3-small" | "text-embedding-3-large"
dimensions?: integer    # Output dimensions (for -3 models)
```

**Output Schema:**
```yaml
embedding: array<number>  # Vector embedding
model: string           # Model used
usage:
  promptTokens: integer
  totalTokens: integer
```

**Example:**
```yaml
- id: embed-document
  taskRef: openai-create-embeddings
  input:
    input: "{{input.documentText}}"
    model: "text-embedding-3-small"
```

---

### openai-create-image
Generate image with DALL-E

**Input Schema:**
```yaml
prompt: string          # Image description
model?: string          # "dall-e-3" | "dall-e-2"
size?: string           # "1024x1024" | "1792x1024" | "1024x1792"
quality?: string        # "standard" | "hd"
style?: string          # "vivid" | "natural"
```

**Output Schema:**
```yaml
imageUrl: string        # Generated image URL
revisedPrompt?: string  # AI-revised prompt (DALL-E 3)
```

---

### claude-api-message
Generate completion with Claude API

**Input Schema:**
```yaml
model: string           # "claude-3-opus-20240229" | "claude-3-sonnet-20240229"
messages: array         # Message objects
maxTokens: integer      # Maximum tokens to generate
temperature?: number    # 0.0 to 1.0
system?: string         # System prompt
```

**Output Schema:**
```yaml
content: string         # Generated response
stopReason: string      # end_turn | max_tokens
usage:
  inputTokens: integer
  outputTokens: integer
model: string           # Model used
```

---

### huggingface-inference
Run inference on Hugging Face model

**Input Schema:**
```yaml
model: string           # Model ID (e.g., "facebook/bart-large-cnn")
inputs: any             # Model-specific inputs
parameters?: object     # Model-specific parameters
```

**Output Schema:**
```yaml
output: any             # Model-specific output
```

**Example:**
```yaml
- id: summarize-text
  taskRef: huggingface-inference
  input:
    model: "facebook/bart-large-cnn"
    inputs: "{{input.longText}}"
    parameters:
      maxLength: 130
      minLength: 30
```

---

### stability-ai-generate-image
Generate image with Stable Diffusion

**Input Schema:**
```yaml
prompt: string          # Image description
negativePrompt?: string # What to avoid
width?: integer         # Image width (default: 512)
height?: integer        # Image height (default: 512)
steps?: integer         # Inference steps (default: 30)
cfgScale?: number       # Prompt adherence (default: 7)
seed?: integer          # Random seed
samples?: integer       # Number of images (default: 1)
```

**Output Schema:**
```yaml
imageUrl: string        # Generated image URL
imageBase64?: string    # Base64-encoded image
seed: integer           # Seed used
```

---

### whisper-transcribe-audio
Transcribe audio with OpenAI Whisper

**Input Schema:**
```yaml
audioUrl: string        # Audio file URL
model?: string          # "whisper-1"
language?: string       # ISO-639-1 language code
prompt?: string         # Context prompt
responseFormat?: string # json | text | srt | vtt
```

**Output Schema:**
```yaml
text: string            # Transcribed text
language?: string       # Detected language
duration?: number       # Audio duration in seconds
```

---

## 📊 Data Storage & Databases

### s3-upload-file
Upload file to Amazon S3

**Input Schema:**
```yaml
bucket: string          # S3 bucket name
key: string             # Object key (path)
body: string            # File content (base64 or text)
contentType?: string    # MIME type
acl?: string            # public-read | private
metadata?: object       # Custom metadata
```

**Output Schema:**
```yaml
url: string             # Object URL
etag: string            # ETag
versionId?: string      # Version ID (if versioning enabled)
```

**Example:**
```yaml
- id: upload-report
  taskRef: s3-upload-file
  input:
    bucket: "company-reports"
    key: "reports/{{input.date}}/sales.pdf"
    body: "{{tasks.generate-pdf.output.pdfBase64}}"
    contentType: "application/pdf"
    metadata:
      generatedAt: "{{now()}}"
      userId: "{{input.userId}}"
```

---

### s3-get-object
Get file from Amazon S3

**Input Schema:**
```yaml
bucket: string          # S3 bucket name
key: string             # Object key
versionId?: string      # Specific version ID
```

**Output Schema:**
```yaml
body: string            # File content
contentType: string     # MIME type
contentLength: integer  # File size in bytes
lastModified: string    # ISO 8601 timestamp
etag: string            # ETag
metadata?: object       # Custom metadata
```

---

### s3-delete-object
Delete file from S3

**Input Schema:**
```yaml
bucket: string          # S3 bucket name
key: string             # Object key
versionId?: string      # Specific version ID
```

**Output Schema:**
```yaml
deleted: boolean        # Success status
versionId?: string      # Deleted version ID
```

---

### mongodb-insert
Insert document into MongoDB

**Input Schema:**
```yaml
database: string        # Database name
collection: string      # Collection name
document: object        # Document to insert
```

**Output Schema:**
```yaml
insertedId: string      # Inserted document ID
acknowledged: boolean   # Operation acknowledged
```

**Example:**
```yaml
- id: save-user-activity
  taskRef: mongodb-insert
  input:
    database: "analytics"
    collection: "user_events"
    document:
      userId: "{{input.userId}}"
      event: "purchase_completed"
      amount: "{{input.amount}}"
      timestamp: "{{now()}}"
      metadata: "{{input.metadata}}"
```

---

### mongodb-find
Query MongoDB documents

**Input Schema:**
```yaml
database: string        # Database name
collection: string      # Collection name
filter: object          # Query filter
limit?: integer         # Max documents to return
sort?: object           # Sort specification
projection?: object     # Fields to include/exclude
```

**Output Schema:**
```yaml
documents: array        # Matching documents
count: integer          # Number of documents found
```

---

### mongodb-update
Update MongoDB document

**Input Schema:**
```yaml
database: string        # Database name
collection: string      # Collection name
filter: object          # Query filter
update: object          # Update operations
upsert?: boolean        # Create if not exists
```

**Output Schema:**
```yaml
matchedCount: integer   # Documents matched
modifiedCount: integer  # Documents modified
upsertedId?: string     # ID if upserted
```

---

### redis-set
Set value in Redis

**Input Schema:**
```yaml
key: string             # Redis key
value: string           # Value to store
expirationSeconds?: integer  # TTL in seconds
```

**Output Schema:**
```yaml
success: boolean        # Operation success
key: string             # Key that was set
```

---

### redis-get
Get value from Redis

**Input Schema:**
```yaml
key: string             # Redis key
```

**Output Schema:**
```yaml
value: string | null    # Retrieved value
exists: boolean         # Key exists
```

---

### redis-delete
Delete key from Redis

**Input Schema:**
```yaml
key: string             # Redis key to delete
```

**Output Schema:**
```yaml
deleted: boolean        # Key was deleted
```

---

### supabase-insert
Insert row into Supabase table

**Input Schema:**
```yaml
table: string           # Table name
data: object            # Row data to insert
returning?: array<string>  # Columns to return
```

**Output Schema:**
```yaml
id: string              # Inserted row ID
data: object            # Inserted row data
```

---

### supabase-select
Query Supabase table

**Input Schema:**
```yaml
table: string           # Table name
select?: string         # Columns to select (* default)
filter?: object         # Filter conditions
limit?: integer         # Max rows to return
orderBy?: object        # Sort specification
```

**Output Schema:**
```yaml
data: array             # Query results
count?: integer         # Total count
```

---

### pinecone-vector-search
Search similar vectors in Pinecone

**Input Schema:**
```yaml
vector: array<number>   # Query vector
topK: integer           # Number of results
namespace?: string      # Namespace to search
filter?: object         # Metadata filter
includeMetadata?: boolean
includeValues?: boolean
```

**Output Schema:**
```yaml
matches: array          # Similar vectors
  - id: string
    score: number
    metadata?: object
    values?: array<number>
```

---

## 🔧 Developer Tools & DevOps

### github-create-issue
Create GitHub issue

**Input Schema:**
```yaml
owner: string           # Repository owner
repo: string            # Repository name
title: string           # Issue title
body?: string           # Issue description
labels?: array<string>  # Issue labels
assignees?: array<string>  # Assignees
milestone?: integer     # Milestone number
```

**Output Schema:**
```yaml
issueNumber: integer    # Issue number
issueUrl: string        # Issue URL
id: integer             # Issue ID
state: string           # open | closed
```

**Example:**
```yaml
- id: create-bug-report
  taskRef: github-create-issue
  input:
    owner: "company"
    repo: "backend"
    title: "Bug: {{input.errorType}} in {{input.service}}"
    body: |
      ## Error Details
      - Service: {{input.service}}
      - Error: {{input.errorMessage}}
      - Stack Trace:
      ```
      {{input.stackTrace}}
      ```
    labels: ["bug", "automated"]
```

---

### github-create-pr
Create GitHub pull request

**Input Schema:**
```yaml
owner: string           # Repository owner
repo: string            # Repository name
title: string           # PR title
head: string            # Branch to merge from
base: string            # Branch to merge into
body?: string           # PR description
draft?: boolean         # Create as draft PR
```

**Output Schema:**
```yaml
prNumber: integer       # Pull request number
prUrl: string           # Pull request URL
id: integer             # Pull request ID
state: string           # open | closed
```

---

### github-add-comment
Add comment to GitHub issue/PR

**Input Schema:**
```yaml
owner: string           # Repository owner
repo: string            # Repository name
issueNumber: integer    # Issue/PR number
body: string            # Comment text
```

**Output Schema:**
```yaml
commentId: integer      # Comment ID
commentUrl: string      # Comment URL
```

---

### github-merge-pr
Merge GitHub pull request

**Input Schema:**
```yaml
owner: string           # Repository owner
repo: string            # Repository name
prNumber: integer       # Pull request number
mergeMethod?: string    # merge | squash | rebase
commitTitle?: string    # Commit title
commitMessage?: string  # Commit message
```

**Output Schema:**
```yaml
merged: boolean         # PR was merged
sha: string             # Merge commit SHA
message: string         # Merge message
```

---

### gitlab-create-issue
Create GitLab issue

**Input Schema:**
```yaml
projectId: string       # Project ID
title: string           # Issue title
description?: string    # Issue description
labels?: array<string>  # Issue labels
assigneeIds?: array<integer>
```

**Output Schema:**
```yaml
issueIid: integer       # Issue IID
webUrl: string          # Issue URL
id: integer             # Issue ID
```

---

### vercel-deploy
Deploy project to Vercel

**Input Schema:**
```yaml
projectId: string       # Vercel project ID
gitBranch?: string      # Git branch to deploy
env?: object            # Environment variables
production?: boolean    # Deploy to production
```

**Output Schema:**
```yaml
deploymentId: string    # Deployment ID
deploymentUrl: string   # Deployment URL
status: string          # Deployment status
readyState: string      # READY | ERROR | BUILDING
```

**Example:**
```yaml
- id: deploy-to-production
  taskRef: vercel-deploy
  input:
    projectId: "{{env.VERCEL_PROJECT_ID}}"
    gitBranch: "main"
    production: true
    env:
      DATABASE_URL: "{{env.PROD_DATABASE_URL}}"
      API_KEY: "{{env.PROD_API_KEY}}"
```

---

### vercel-get-deployment
Get Vercel deployment details

**Input Schema:**
```yaml
deploymentId: string    # Deployment ID
```

**Output Schema:**
```yaml
url: string             # Deployment URL
state: string           # Deployment state
readyState: string      # READY | ERROR | BUILDING
createdAt: integer      # Unix timestamp
```

---

### docker-hub-get-tags
List Docker image tags

**Input Schema:**
```yaml
repository: string      # Repository (e.g., "nginx")
namespace?: string      # Namespace (default: library)
```

**Output Schema:**
```yaml
tags: array<string>     # List of tags
count: integer          # Number of tags
```

---

### circleci-trigger-pipeline
Trigger CircleCI pipeline

**Input Schema:**
```yaml
projectSlug: string     # gh/owner/repo or bb/owner/repo
branch?: string         # Git branch
parameters?: object     # Pipeline parameters
```

**Output Schema:**
```yaml
pipelineId: string      # Pipeline ID
pipelineNumber: integer # Pipeline number
state: string           # Pipeline state
createdAt: string       # ISO 8601 timestamp
```

---

## 🌐 Web Scraping & Data Enrichment

### clearbit-enrich-company
Enrich company data with Clearbit

**Input Schema:**
```yaml
domain: string          # Company domain
```

**Output Schema:**
```yaml
name: string            # Company name
domain: string          # Company domain
description: string     # Company description
employees: integer      # Employee count
industry: string        # Industry
founded: integer        # Founded year
location: string        # HQ location
logo: string            # Logo URL
linkedin: string        # LinkedIn URL
twitter: string         # Twitter handle
tags: array<string>     # Company tags
tech: array<string>     # Technologies used
```

**Example:**
```yaml
- id: enrich-lead-company
  taskRef: clearbit-enrich-company
  input:
    domain: "{{input.companyDomain}}"
```

---

### hunter-find-email
Find email addresses with Hunter.io

**Input Schema:**
```yaml
domain: string          # Company domain
firstName?: string      # First name
lastName?: string       # Last name
```

**Output Schema:**
```yaml
email: string           # Found email address
confidence: integer     # Confidence score (0-100)
position?: string       # Job position
department?: string     # Department
```

---

### zerobounce-validate-email
Validate email address

**Input Schema:**
```yaml
email: string           # Email to validate
ipAddress?: string      # IP address for validation
```

**Output Schema:**
```yaml
status: string          # valid | invalid | catch-all | unknown
subStatus?: string      # Additional status info
freeEmail: boolean      # Is free email provider
disposable: boolean     # Is disposable email
role: boolean           # Is role-based email
didYouMean?: string     # Suggested correction
```

---

### ipgeolocation-lookup
Get IP address geolocation

**Input Schema:**
```yaml
ip: string              # IP address to lookup
```

**Output Schema:**
```yaml
ip: string              # IP address
country: string         # Country name
countryCode: string     # ISO country code
city: string            # City name
region: string          # Region/state
latitude: number        # Latitude
longitude: number       # Longitude
timezone: string        # Timezone
isp: string             # ISP name
```

---

### weather-api-forecast
Get weather forecast

**Input Schema:**
```yaml
city: string            # City name
country?: string        # Country code
units?: string          # metric | imperial
days?: integer          # Forecast days
```

**Output Schema:**
```yaml
current:
  temperature: number   # Current temperature
  feelsLike: number     # Feels like temperature
  condition: string     # Weather condition
  humidity: integer     # Humidity percentage
  windSpeed: number     # Wind speed
forecast: array         # Daily forecasts
  - date: string
    tempMin: number
    tempMax: number
    condition: string
```

---

### google-places-search
Search Google Places API

**Input Schema:**
```yaml
query: string           # Search query
location?: string       # Lat,lng coordinates
radius?: integer        # Search radius in meters
type?: string           # Place type
```

**Output Schema:**
```yaml
places: array
  - placeId: string
    name: string
    address: string
    rating: number
    phoneNumber?: string
    website?: string
    location:
      lat: number
      lng: number
```

---

## 📈 Analytics & Monitoring

### newrelic-send-event
Send custom event to New Relic

**Input Schema:**
```yaml
eventType: string       # Event type name
attributes: object      # Event attributes
timestamp?: integer     # Unix timestamp
```

**Output Schema:**
```yaml
success: boolean        # Event sent successfully
uuid: string            # Event UUID
```

**Example:**
```yaml
- id: track-checkout
  taskRef: newrelic-send-event
  input:
    eventType: "CheckoutCompleted"
    attributes:
      orderId: "{{input.orderId}}"
      userId: "{{input.userId}}"
      amount: "{{input.amount}}"
      currency: "{{input.currency}}"
      paymentMethod: "{{input.paymentMethod}}"
```

---

### datadog-send-metric
Send metric to Datadog

**Input Schema:**
```yaml
metric: string          # Metric name
value: number           # Metric value
type?: string           # gauge | count | rate
tags?: array<string>    # Metric tags (key:value)
timestamp?: integer     # Unix timestamp
```

**Output Schema:**
```yaml
success: boolean        # Metric sent successfully
```

---

### datadog-send-event
Send event to Datadog

**Input Schema:**
```yaml
title: string           # Event title
text: string            # Event description
alertType?: string      # info | warning | error | success
priority?: string       # normal | low
tags?: array<string>    # Event tags
```

**Output Schema:**
```yaml
eventId: string         # Event ID
status: string          # Event status
```

---

### mixpanel-track-event
Track user event in Mixpanel

**Input Schema:**
```yaml
event: string           # Event name
distinctId: string      # User ID
properties?: object     # Event properties
timestamp?: integer     # Unix timestamp
```

**Output Schema:**
```yaml
success: boolean        # Event tracked
status: integer         # HTTP status code
```

---

### google-analytics-send-event
Send event to Google Analytics 4

**Input Schema:**
```yaml
measurementId: string   # GA4 measurement ID
clientId: string        # Client ID
eventName: string       # Event name
userId?: string         # User ID
parameters?: object     # Event parameters
```

**Output Schema:**
```yaml
success: boolean        # Event sent successfully
```

---

### sentry-capture-exception
Capture exception in Sentry

**Input Schema:**
```yaml
message: string         # Error message
level?: string          # fatal | error | warning | info | debug
stackTrace?: string     # Stack trace
user?: object           # User context
tags?: object           # Error tags
extra?: object          # Additional data
```

**Output Schema:**
```yaml
eventId: string         # Sentry event ID
```

---

## 🛠️ Utility Tasks

### qrcode-generate
Generate QR code image

**Input Schema:**
```yaml
data: string            # Data to encode
size?: integer          # Image size in pixels (default: 200)
errorCorrectionLevel?: string  # L | M | Q | H
margin?: integer        # Quiet zone size
```

**Output Schema:**
```yaml
imageBase64: string     # Base64-encoded PNG
imageUrl?: string       # Hosted image URL (if storage enabled)
```

**Example:**
```yaml
- id: generate-ticket-qr
  taskRef: qrcode-generate
  input:
    data: "TICKET-{{input.ticketId}}"
    size: 300
    errorCorrectionLevel: "H"
```

---

### pdf-generate
Generate PDF from HTML

**Input Schema:**
```yaml
html: string            # HTML content
css?: string            # CSS styles
options?: object        # PDF options
  format?: string       # A4 | Letter | Legal
  landscape?: boolean   # Page orientation
  margin?: object       # Page margins
  headerTemplate?: string
  footerTemplate?: string
```

**Output Schema:**
```yaml
pdfBase64: string       # Base64-encoded PDF
pdfUrl?: string         # Hosted PDF URL (if storage enabled)
sizeBytes: integer      # PDF size in bytes
```

---

### image-resize
Resize and optimize image

**Input Schema:**
```yaml
imageUrl: string        # Source image URL
width?: integer         # Target width
height?: integer        # Target height
fit?: string            # cover | contain | fill | inside | outside
format?: string         # jpeg | png | webp
quality?: integer       # 1-100 (JPEG/WebP quality)
```

**Output Schema:**
```yaml
resizedUrl: string      # Resized image URL
resizedBase64?: string  # Base64-encoded image
width: integer          # Actual width
height: integer         # Actual height
sizeBytes: integer      # File size
```

---

### url-shorten
Shorten URL with bit.ly or similar

**Input Schema:**
```yaml
url: string             # Long URL to shorten
customSlug?: string     # Custom short URL slug
domain?: string         # Custom domain
```

**Output Schema:**
```yaml
shortUrl: string        # Shortened URL
longUrl: string         # Original URL
clicks: integer         # Current click count
```

---

### csv-parse
Parse CSV data

**Input Schema:**
```yaml
csv: string             # CSV data
delimiter?: string      # Column delimiter (default: ,)
hasHeader?: boolean     # First row is header
columns?: array<string> # Column names (if no header)
```

**Output Schema:**
```yaml
rows: array<object>     # Parsed rows
rowCount: integer       # Number of rows
columns: array<string>  # Column names
```

---

### csv-generate
Generate CSV from data

**Input Schema:**
```yaml
data: array<object>     # Array of objects
columns?: array<string> # Column order
delimiter?: string      # Column delimiter (default: ,)
includeHeader?: boolean # Include header row
```

**Output Schema:**
```yaml
csv: string             # Generated CSV
rowCount: integer       # Number of rows
```

---

### json-to-xml
Convert JSON to XML

**Input Schema:**
```yaml
json: object            # JSON data to convert
rootElement?: string    # Root element name
```

**Output Schema:**
```yaml
xml: string             # Generated XML
```

---

### xml-to-json
Convert XML to JSON

**Input Schema:**
```yaml
xml: string             # XML data to convert
```

**Output Schema:**
```yaml
json: object            # Parsed JSON
```

---

### jwt-sign
Sign JWT token

**Input Schema:**
```yaml
payload: object         # Token payload
secret: string          # Secret key
expiresIn?: string      # Expiration (e.g., "1h", "7d")
algorithm?: string      # HS256 | HS384 | HS512
```

**Output Schema:**
```yaml
token: string           # Signed JWT token
expiresAt?: integer     # Unix timestamp
```

---

### jwt-verify
Verify and decode JWT token

**Input Schema:**
```yaml
token: string           # JWT token to verify
secret: string          # Secret key
```

**Output Schema:**
```yaml
valid: boolean          # Token is valid
payload?: object        # Decoded payload
error?: string          # Error message if invalid
```

---

## 👥 CRM & Sales

### salesforce-create-lead
Create lead in Salesforce

**Input Schema:**
```yaml
firstName: string       # First name
lastName: string        # Last name
email: string           # Email address
company: string         # Company name
phone?: string          # Phone number
status?: string         # Lead status
source?: string         # Lead source
```

**Output Schema:**
```yaml
leadId: string          # Salesforce lead ID
success: boolean        # Creation success
```

---

### salesforce-create-opportunity
Create opportunity in Salesforce

**Input Schema:**
```yaml
name: string            # Opportunity name
accountId: string       # Account ID
amount: number          # Opportunity amount
closeDate: string       # Close date (ISO 8601)
stageName: string       # Sales stage
```

**Output Schema:**
```yaml
opportunityId: string   # Opportunity ID
success: boolean        # Creation success
```

---

### hubspot-create-contact
Create contact in HubSpot

**Input Schema:**
```yaml
email: string           # Email address
firstName?: string      # First name
lastName?: string       # Last name
company?: string        # Company name
phone?: string          # Phone number
customProperties?: object  # Custom properties
```

**Output Schema:**
```yaml
contactId: string       # HubSpot contact ID
vid: integer            # Contact VID
```

---

### hubspot-create-deal
Create deal in HubSpot

**Input Schema:**
```yaml
dealName: string        # Deal name
amount: number          # Deal amount
pipeline: string        # Pipeline ID
dealStage: string       # Deal stage
contactIds?: array<string>
companyIds?: array<string>
```

**Output Schema:**
```yaml
dealId: string          # HubSpot deal ID
```

---

### airtable-create-record
Create record in Airtable

**Input Schema:**
```yaml
baseId: string          # Base ID
tableId: string         # Table ID or name
fields: object          # Record fields
```

**Output Schema:**
```yaml
recordId: string        # Airtable record ID
fields: object          # Record data
createdTime: string     # ISO 8601 timestamp
```

---

### airtable-update-record
Update Airtable record

**Input Schema:**
```yaml
baseId: string          # Base ID
tableId: string         # Table ID or name
recordId: string        # Record ID to update
fields: object          # Fields to update
```

**Output Schema:**
```yaml
recordId: string        # Updated record ID
fields: object          # Updated data
```

---

### notion-create-page
Create page in Notion database

**Input Schema:**
```yaml
databaseId: string      # Database ID
properties: object      # Page properties
children?: array        # Page content blocks
```

**Output Schema:**
```yaml
pageId: string          # Notion page ID
url: string             # Page URL
```

---

## 📱 Social Media

### twitter-post-tweet
Post tweet to Twitter/X

**Input Schema:**
```yaml
text: string            # Tweet text (max 280 chars)
mediaIds?: array<string>  # Media attachment IDs
replyToTweetId?: string   # Tweet ID to reply to
```

**Output Schema:**
```yaml
tweetId: string         # Posted tweet ID
tweetUrl: string        # Tweet URL
createdAt: string       # ISO 8601 timestamp
```

---

### linkedin-create-post
Create LinkedIn post

**Input Schema:**
```yaml
text: string            # Post text
visibility?: string     # PUBLIC | CONNECTIONS
mediaUrl?: string       # Image/video URL
```

**Output Schema:**
```yaml
postId: string          # LinkedIn post ID
postUrl: string         # Post URL
```

---

### instagram-post-photo
Post photo to Instagram (Business accounts)

**Input Schema:**
```yaml
imageUrl: string        # Image URL
caption?: string        # Post caption
location?: string       # Location name
```

**Output Schema:**
```yaml
mediaId: string         # Instagram media ID
permalink: string       # Post URL
```

---

## 🎯 Workflow Composition Examples

### Example 1: E-commerce Order Processing
```yaml
name: process-order
description: Complete order processing workflow

input:
  orderId: string
  customerId: string
  amount: integer
  items: array
  customerEmail: string

tasks:
  # 1. Create payment
  - id: create-payment
    taskRef: stripe-create-payment-intent
    input:
      amount: "{{input.amount}}"
      currency: "usd"
      customer: "{{input.customerId}}"
      description: "Order #{{input.orderId}}"
      metadata:
        orderId: "{{input.orderId}}"

  # 2. Send confirmation email (parallel with inventory update)
  - id: send-confirmation-email
    taskRef: sendgrid-send-email
    input:
      to: "{{input.customerEmail}}"
      subject: "Order Confirmation #{{input.orderId}}"
      templateId: "d-order-confirmation"
      dynamicTemplateData:
        orderId: "{{input.orderId}}"
        amount: "{{input.amount}}"
        items: "{{input.items}}"
    dependencies: [create-payment]

  # 3. Update inventory (parallel with email)
  - id: update-inventory
    taskRef: mongodb-update
    input:
      database: "ecommerce"
      collection: "inventory"
      filter:
        productId: "{{input.items[0].productId}}"
      update:
        $inc:
          stock: -1
    dependencies: [create-payment]

  # 4. Notify warehouse
  - id: notify-warehouse
    taskRef: slack-send-message
    input:
      channel: "#warehouse"
      text: |
        📦 New order to fulfill!
        Order ID: {{input.orderId}}
        Items: {{input.items.length}}
    dependencies: [update-inventory]

  # 5. Track analytics event
  - id: track-analytics
    taskRef: mixpanel-track-event
    input:
      event: "order_completed"
      distinctId: "{{input.customerId}}"
      properties:
        orderId: "{{input.orderId}}"
        amount: "{{input.amount}}"
        itemCount: "{{input.items.length}}"
    dependencies: [create-payment]

output:
  paymentId: "{{tasks.create-payment.output.paymentIntentId}}"
  emailSent: "{{tasks.send-confirmation-email.output.messageId}}"
  inventoryUpdated: "{{tasks.update-inventory.output.modifiedCount}}"
```

---

### Example 2: AI Content Generation & Publishing Pipeline
```yaml
name: generate-blog-post
description: AI-powered blog post generation and multi-channel publishing

input:
  topic: string
  keywords: array<string>
  targetAudience: string

tasks:
  # 1. Generate article content
  - id: generate-content
    taskRef: openai-chat-completion
    input:
      model: "gpt-4"
      temperature: 0.7
      maxTokens: 2000
      messages:
        - role: system
          content: "You are a professional blog writer."
        - role: user
          content: |
            Write a comprehensive blog post about: {{input.topic}}
            Keywords: {{input.keywords}}
            Target audience: {{input.targetAudience}}
            Format: Include title, introduction, 3-5 sections, and conclusion.

  # 2. Generate hero image (parallel with content generation optimization)
  - id: generate-image
    taskRef: stability-ai-generate-image
    input:
      prompt: "Professional blog header image for article about {{input.topic}}, high quality, clean design"
      width: 1200
      height: 630
      cfgScale: 8
    dependencies: [generate-content]

  # 3. Upload image to S3
  - id: upload-image-to-s3
    taskRef: s3-upload-file
    input:
      bucket: "blog-images"
      key: "posts/{{now() | date:'YYYY-MM-DD'}}/hero.png"
      body: "{{tasks.generate-image.output.imageBase64}}"
      contentType: "image/png"
      acl: "public-read"
    dependencies: [generate-image]

  # 4. Generate SEO meta description
  - id: generate-meta-description
    taskRef: openai-chat-completion
    input:
      model: "gpt-3.5-turbo"
      temperature: 0.5
      maxTokens: 100
      messages:
        - role: user
          content: |
            Write a compelling SEO meta description (max 155 chars) for this article:
            {{tasks.generate-content.output.content | truncate:500}}
    dependencies: [generate-content]

  # 5. Publish to CMS (Contentful/WordPress/etc)
  - id: publish-to-cms
    taskRef: contentful-create-entry
    input:
      contentType: "blogPost"
      fields:
        title: "{{tasks.generate-content.output.content | extract:'title'}}"
        body: "{{tasks.generate-content.output.content}}"
        heroImage: "{{tasks.upload-image-to-s3.output.url}}"
        metaDescription: "{{tasks.generate-meta-description.output.content}}"
        keywords: "{{input.keywords}}"
        publishedAt: "{{now()}}"
    dependencies: [generate-content, upload-image-to-s3, generate-meta-description]

  # 6. Generate social media excerpt
  - id: generate-social-excerpt
    taskRef: openai-chat-completion
    input:
      model: "gpt-3.5-turbo"
      temperature: 0.7
      maxTokens: 80
      messages:
        - role: user
          content: |
            Create an engaging tweet (max 280 chars) to promote this article:
            {{tasks.generate-content.output.content | truncate:500}}
    dependencies: [generate-content]

  # 7. Post to Twitter
  - id: post-to-twitter
    taskRef: twitter-post-tweet
    input:
      text: |
        {{tasks.generate-social-excerpt.output.content}}

        Read more: {{tasks.publish-to-cms.output.url}}
    dependencies: [publish-to-cms, generate-social-excerpt]

  # 8. Post to LinkedIn
  - id: post-to-linkedin
    taskRef: linkedin-create-post
    input:
      text: |
        {{tasks.generate-social-excerpt.output.content}}

        {{tasks.publish-to-cms.output.url}}
      visibility: "PUBLIC"
    dependencies: [publish-to-cms, generate-social-excerpt]

  # 9. Track publishing event
  - id: track-analytics
    taskRef: mixpanel-track-event
    input:
      event: "blog_post_published"
      distinctId: "system"
      properties:
        postId: "{{tasks.publish-to-cms.output.entryId}}"
        topic: "{{input.topic}}"
        wordCount: "{{tasks.generate-content.output.content | wordCount}}"
    dependencies: [publish-to-cms]

output:
  postId: "{{tasks.publish-to-cms.output.entryId}}"
  postUrl: "{{tasks.publish-to-cms.output.url}}"
  imageUrl: "{{tasks.upload-image-to-s3.output.url}}"
  tweetUrl: "{{tasks.post-to-twitter.output.tweetUrl}}"
  linkedInPostUrl: "{{tasks.post-to-linkedin.output.postUrl}}"
```

---

### Example 3: Incident Response Automation
```yaml
name: handle-production-incident
description: Automated incident response and notification workflow

input:
  service: string
  severity: string        # low | medium | high | critical
  errorMessage: string
  stackTrace: string
  affectedUsers: integer

tasks:
  # 1. Create PagerDuty incident
  - id: create-pagerduty-incident
    taskRef: pagerduty-create-incident
    input:
      title: "[{{input.severity | uppercase}}] {{input.service}}: {{input.errorMessage}}"
      urgency: "{{input.severity == 'critical' ? 'high' : 'low'}}"
      description: |
        Service: {{input.service}}
        Error: {{input.errorMessage}}
        Affected Users: {{input.affectedUsers}}
      serviceId: "{{env.PAGERDUTY_SERVICE_ID}}"

  # 2. Notify engineering team on Slack
  - id: notify-slack
    taskRef: slack-send-message
    input:
      channel: "#incidents"
      text: |
        🚨 {{input.severity == 'critical' ? '@channel' : ''}} Production Incident Detected

        *Service:* {{input.service}}
        *Severity:* {{input.severity | uppercase}}
        *Error:* {{input.errorMessage}}
        *Affected Users:* {{input.affectedUsers}}

        *PagerDuty Incident:* {{tasks.create-pagerduty-incident.output.htmlUrl}}
    dependencies: [create-pagerduty-incident]

  # 3. Create GitHub issue for tracking
  - id: create-github-issue
    taskRef: github-create-issue
    input:
      owner: "company"
      repo: "backend"
      title: "[INCIDENT] {{input.service}}: {{input.errorMessage}}"
      body: |
        ## Incident Details
        - **Service:** {{input.service}}
        - **Severity:** {{input.severity}}
        - **Affected Users:** {{input.affectedUsers}}
        - **PagerDuty:** {{tasks.create-pagerduty-incident.output.htmlUrl}}

        ## Error Message
        ```
        {{input.errorMessage}}
        ```

        ## Stack Trace
        ```
        {{input.stackTrace}}
        ```
      labels: ["incident", "{{input.severity}}", "{{input.service}}"]
    dependencies: [create-pagerduty-incident]

  # 4. Rollback deployment (only for critical incidents)
  - id: rollback-deployment
    taskRef: vercel-rollback
    input:
      projectId: "{{env.VERCEL_PROJECT_ID}}"
      deploymentId: "{{env.PREVIOUS_DEPLOYMENT_ID}}"
    dependencies: [create-pagerduty-incident]
    condition: "{{input.severity == 'critical'}}"

  # 5. Create public status page incident
  - id: create-status-page-incident
    taskRef: statuspage-create-incident
    input:
      name: "{{input.service}} Experiencing Issues"
      status: "{{input.severity == 'critical' ? 'major_outage' : 'partial_outage'}}"
      body: "We are currently investigating issues with {{input.service}}."
      componentIds: ["{{env.STATUSPAGE_COMPONENT_ID}}"]
      impactOverride: "{{input.severity == 'critical' ? 'major' : 'minor'}}"
    dependencies: [create-pagerduty-incident]
    condition: "{{input.severity == 'critical' || input.severity == 'high'}}"

  # 6. Send customer notification emails (critical incidents only)
  - id: notify-affected-customers
    taskRef: sendgrid-send-email
    input:
      to: "{{env.CUSTOMER_NOTIFICATION_LIST}}"
      subject: "Service Update: {{input.service}}"
      templateId: "d-incident-notification"
      dynamicTemplateData:
        service: "{{input.service}}"
        status: "We are aware of the issue and working on a resolution"
        statusPageUrl: "{{tasks.create-status-page-incident.output.shortlink}}"
    dependencies: [create-status-page-incident]
    condition: "{{input.severity == 'critical' && input.affectedUsers > 100}}"

  # 7. Log incident to monitoring (New Relic)
  - id: log-to-newrelic
    taskRef: newrelic-send-event
    input:
      eventType: "ProductionIncident"
      attributes:
        service: "{{input.service}}"
        severity: "{{input.severity}}"
        errorMessage: "{{input.errorMessage}}"
        affectedUsers: "{{input.affectedUsers}}"
        pagerdutyIncidentId: "{{tasks.create-pagerduty-incident.output.incidentId}}"
        githubIssueNumber: "{{tasks.create-github-issue.output.issueNumber}}"
        rolledBack: "{{tasks.rollback-deployment.output ? true : false}}"
    dependencies: [create-pagerduty-incident, create-github-issue]

output:
  pagerdutyIncidentId: "{{tasks.create-pagerduty-incident.output.incidentId}}"
  pagerdutyUrl: "{{tasks.create-pagerduty-incident.output.htmlUrl}}"
  githubIssueNumber: "{{tasks.create-github-issue.output.issueNumber}}"
  githubIssueUrl: "{{tasks.create-github-issue.output.issueUrl}}"
  rolledBack: "{{tasks.rollback-deployment.output != null}}"
  statusPageIncidentUrl: "{{tasks.create-status-page-incident.output.shortlink}}"
```

---

### Example 4: Lead Enrichment & CRM Sync Pipeline
```yaml
name: enrich-lead
description: Enrich incoming lead data and sync to CRM

input:
  firstName: string
  lastName: string
  email: string
  companyDomain: string
  phoneNumber?: string

tasks:
  # 1. Validate email address
  - id: validate-email
    taskRef: zerobounce-validate-email
    input:
      email: "{{input.email}}"

  # 2. Enrich company data (parallel with email validation)
  - id: enrich-company
    taskRef: clearbit-enrich-company
    input:
      domain: "{{input.companyDomain}}"

  # 3. Find verified work email (if personal email provided)
  - id: find-work-email
    taskRef: hunter-find-email
    input:
      domain: "{{input.companyDomain}}"
      firstName: "{{input.firstName}}"
      lastName: "{{input.lastName}}"
    dependencies: [validate-email]
    condition: "{{tasks.validate-email.output.freeEmail == true}}"

  # 4. Get IP geolocation (if available)
  - id: get-ip-location
    taskRef: ipgeolocation-lookup
    input:
      ip: "{{input.ipAddress}}"
    condition: "{{input.ipAddress != null}}"

  # 5. Create/update Salesforce lead
  - id: create-salesforce-lead
    taskRef: salesforce-create-lead
    input:
      firstName: "{{input.firstName}}"
      lastName: "{{input.lastName}}"
      email: "{{tasks.find-work-email.output.email || input.email}}"
      company: "{{tasks.enrich-company.output.name}}"
      phone: "{{input.phoneNumber}}"
      status: "New"
      source: "Website"
      description: |
        Company: {{tasks.enrich-company.output.name}}
        Industry: {{tasks.enrich-company.output.industry}}
        Employees: {{tasks.enrich-company.output.employees}}
        Location: {{tasks.enrich-company.output.location}}
    dependencies: [validate-email, enrich-company]
    condition: "{{tasks.validate-email.output.status == 'valid'}}"

  # 6. Create HubSpot contact (alternative to Salesforce)
  - id: create-hubspot-contact
    taskRef: hubspot-create-contact
    input:
      email: "{{tasks.find-work-email.output.email || input.email}}"
      firstName: "{{input.firstName}}"
      lastName: "{{input.lastName}}"
      company: "{{tasks.enrich-company.output.name}}"
      phone: "{{input.phoneNumber}}"
      customProperties:
        company_size: "{{tasks.enrich-company.output.employees}}"
        company_industry: "{{tasks.enrich-company.output.industry}}"
        lead_source: "Website"
    dependencies: [validate-email, enrich-company]
    condition: "{{tasks.validate-email.output.status == 'valid'}}"

  # 7. Notify sales team for high-value leads
  - id: notify-sales-team
    taskRef: slack-send-message
    input:
      channel: "#sales-leads"
      text: |
        🎯 High-value lead detected!

        *Name:* {{input.firstName}} {{input.lastName}}
        *Company:* {{tasks.enrich-company.output.name}}
        *Industry:* {{tasks.enrich-company.output.industry}}
        *Company Size:* {{tasks.enrich-company.output.employees}} employees
        *Email:* {{tasks.find-work-email.output.email || input.email}}

        *Salesforce Lead:* {{tasks.create-salesforce-lead.output.leadId}}
    dependencies: [create-salesforce-lead]
    condition: "{{tasks.enrich-company.output.employees > 500}}"

  # 8. Track lead in analytics
  - id: track-lead-event
    taskRef: mixpanel-track-event
    input:
      event: "lead_enriched"
      distinctId: "{{input.email}}"
      properties:
        firstName: "{{input.firstName}}"
        lastName: "{{input.lastName}}"
        company: "{{tasks.enrich-company.output.name}}"
        companySize: "{{tasks.enrich-company.output.employees}}"
        industry: "{{tasks.enrich-company.output.industry}}"
        emailValid: "{{tasks.validate-email.output.status == 'valid'}}"
        salesforceLeadId: "{{tasks.create-salesforce-lead.output.leadId}}"
    dependencies: [validate-email, enrich-company]

output:
  leadId: "{{tasks.create-salesforce-lead.output.leadId}}"
  hubspotContactId: "{{tasks.create-hubspot-contact.output.contactId}}"
  enrichedCompany:
    name: "{{tasks.enrich-company.output.name}}"
    industry: "{{tasks.enrich-company.output.industry}}"
    employees: "{{tasks.enrich-company.output.employees}}"
  emailValid: "{{tasks.validate-email.output.status == 'valid'}}"
  workEmail: "{{tasks.find-work-email.output.email}}"
```

---

### Example 5: File Processing & Analysis Pipeline
```yaml
name: process-uploaded-document
description: Process uploaded file with AI analysis and storage

input:
  fileKey: string         # S3 key of uploaded file
  userId: string
  fileType: string        # pdf | image | document

tasks:
  # 1. Download file from S3
  - id: download-from-s3
    taskRef: s3-get-object
    input:
      bucket: "user-uploads"
      key: "{{input.fileKey}}"

  # 2. Extract text from PDF (if PDF)
  - id: extract-pdf-text
    taskRef: pdf-extract-text
    input:
      pdfBase64: "{{tasks.download-from-s3.output.body}}"
    dependencies: [download-from-s3]
    condition: "{{input.fileType == 'pdf'}}"

  # 3. OCR image (if image)
  - id: ocr-image
    taskRef: google-vision-ocr
    input:
      imageBase64: "{{tasks.download-from-s3.output.body}}"
    dependencies: [download-from-s3]
    condition: "{{input.fileType == 'image'}}"

  # 4. Analyze content with AI
  - id: analyze-with-ai
    taskRef: openai-chat-completion
    input:
      model: "gpt-4"
      temperature: 0.3
      messages:
        - role: system
          content: "You are a document analysis assistant. Analyze the document and provide: 1) Summary, 2) Key topics, 3) Sentiment, 4) Action items"
        - role: user
          content: |
            Analyze this document:

            {{tasks.extract-pdf-text.output.text || tasks.ocr-image.output.text}}
    dependencies: [extract-pdf-text, ocr-image]

  # 5. Generate embeddings for semantic search
  - id: generate-embeddings
    taskRef: openai-create-embeddings
    input:
      input: "{{tasks.extract-pdf-text.output.text || tasks.ocr-image.output.text}}"
      model: "text-embedding-3-small"
    dependencies: [extract-pdf-text, ocr-image]

  # 6. Store embeddings in vector DB
  - id: store-in-pinecone
    taskRef: pinecone-upsert
    input:
      namespace: "user-documents"
      vectors:
        - id: "{{input.fileKey}}"
          values: "{{tasks.generate-embeddings.output.embedding}}"
          metadata:
            userId: "{{input.userId}}"
            fileKey: "{{input.fileKey}}"
            fileType: "{{input.fileType}}"
    dependencies: [generate-embeddings]

  # 7. Store analysis results in MongoDB
  - id: store-analysis
    taskRef: mongodb-insert
    input:
      database: "analytics"
      collection: "document_analysis"
      document:
        fileKey: "{{input.fileKey}}"
        userId: "{{input.userId}}"
        fileType: "{{input.fileType}}"
        analysis: "{{tasks.analyze-with-ai.output.content}}"
        extractedText: "{{tasks.extract-pdf-text.output.text || tasks.ocr-image.output.text}}"
        processedAt: "{{now()}}"
    dependencies: [analyze-with-ai]

  # 8. Cache result in Redis (1 hour)
  - id: cache-result
    taskRef: redis-set
    input:
      key: "analysis:{{input.fileKey}}"
      value: "{{tasks.analyze-with-ai.output.content}}"
      expirationSeconds: 3600
    dependencies: [analyze-with-ai]

  # 9. Generate thumbnail (if image)
  - id: generate-thumbnail
    taskRef: image-resize
    input:
      imageUrl: "{{tasks.download-from-s3.output.url}}"
      width: 200
      height: 200
      fit: "cover"
      format: "jpeg"
      quality: 80
    dependencies: [download-from-s3]
    condition: "{{input.fileType == 'image'}}"

  # 10. Upload thumbnail to S3
  - id: upload-thumbnail
    taskRef: s3-upload-file
    input:
      bucket: "user-uploads"
      key: "thumbnails/{{input.fileKey}}"
      body: "{{tasks.generate-thumbnail.output.resizedBase64}}"
      contentType: "image/jpeg"
      acl: "public-read"
    dependencies: [generate-thumbnail]
    condition: "{{input.fileType == 'image'}}"

  # 11. Notify user via email
  - id: send-completion-email
    taskRef: sendgrid-send-email
    input:
      to: "{{input.userEmail}}"
      subject: "Document Analysis Complete"
      templateId: "d-document-analysis"
      dynamicTemplateData:
        fileName: "{{input.fileKey}}"
        summary: "{{tasks.analyze-with-ai.output.content | truncate:200}}"
    dependencies: [analyze-with-ai]

output:
  analysisId: "{{tasks.store-analysis.output.insertedId}}"
  summary: "{{tasks.analyze-with-ai.output.content}}"
  thumbnailUrl: "{{tasks.upload-thumbnail.output.url}}"
  vectorId: "{{input.fileKey}}"
```

---

## 📦 Task Library Organization

### Directory Structure
```
tasks/
├── communication/
│   ├── slack-send-message.yaml
│   ├── sendgrid-send-email.yaml
│   ├── twilio-send-sms.yaml
│   ├── discord-webhook.yaml
│   ├── teams-send-message.yaml
│   └── pagerduty-create-incident.yaml
├── payments/
│   ├── stripe-create-payment-intent.yaml
│   ├── stripe-refund.yaml
│   ├── stripe-create-customer.yaml
│   ├── stripe-create-subscription.yaml
│   ├── paypal-create-order.yaml
│   └── coingecko-get-price.yaml
├── ai/
│   ├── openai-chat-completion.yaml
│   ├── openai-create-embeddings.yaml
│   ├── openai-create-image.yaml
│   ├── claude-api-message.yaml
│   ├── huggingface-inference.yaml
│   ├── stability-ai-generate-image.yaml
│   └── whisper-transcribe-audio.yaml
├── storage/
│   ├── s3-upload-file.yaml
│   ├── s3-get-object.yaml
│   ├── s3-delete-object.yaml
│   ├── mongodb-insert.yaml
│   ├── mongodb-find.yaml
│   ├── mongodb-update.yaml
│   ├── redis-set.yaml
│   ├── redis-get.yaml
│   ├── redis-delete.yaml
│   ├── supabase-insert.yaml
│   ├── supabase-select.yaml
│   └── pinecone-vector-search.yaml
├── devtools/
│   ├── github-create-issue.yaml
│   ├── github-create-pr.yaml
│   ├── github-add-comment.yaml
│   ├── github-merge-pr.yaml
│   ├── gitlab-create-issue.yaml
│   ├── vercel-deploy.yaml
│   ├── vercel-get-deployment.yaml
│   ├── docker-hub-get-tags.yaml
│   └── circleci-trigger-pipeline.yaml
├── enrichment/
│   ├── clearbit-enrich-company.yaml
│   ├── hunter-find-email.yaml
│   ├── zerobounce-validate-email.yaml
│   ├── ipgeolocation-lookup.yaml
│   ├── weather-api-forecast.yaml
│   └── google-places-search.yaml
├── analytics/
│   ├── newrelic-send-event.yaml
│   ├── datadog-send-metric.yaml
│   ├── datadog-send-event.yaml
│   ├── mixpanel-track-event.yaml
│   ├── google-analytics-send-event.yaml
│   └── sentry-capture-exception.yaml
├── utilities/
│   ├── qrcode-generate.yaml
│   ├── pdf-generate.yaml
│   ├── image-resize.yaml
│   ├── url-shorten.yaml
│   ├── csv-parse.yaml
│   ├── csv-generate.yaml
│   ├── json-to-xml.yaml
│   ├── xml-to-json.yaml
│   ├── jwt-sign.yaml
│   └── jwt-verify.yaml
├── crm/
│   ├── salesforce-create-lead.yaml
│   ├── salesforce-create-opportunity.yaml
│   ├── hubspot-create-contact.yaml
│   ├── hubspot-create-deal.yaml
│   ├── airtable-create-record.yaml
│   ├── airtable-update-record.yaml
│   └── notion-create-page.yaml
└── social/
    ├── twitter-post-tweet.yaml
    ├── linkedin-create-post.yaml
    └── instagram-post-photo.yaml
```

### Task Naming Convention
- Format: `{service}-{action}-{resource}`
- Examples:
  - `stripe-create-payment-intent`
  - `github-create-issue`
  - `openai-chat-completion`
  - `s3-upload-file`

### Task Categories (10 categories, 60+ tasks)
1. **Communication** (6 tasks) - Slack, Email, SMS, Discord, Teams, PagerDuty
2. **Payments** (6 tasks) - Stripe, PayPal, Crypto
3. **AI/ML** (7 tasks) - OpenAI, Claude, HuggingFace, Stable Diffusion, Whisper
4. **Storage** (12 tasks) - S3, MongoDB, Redis, Supabase, Pinecone
5. **DevTools** (9 tasks) - GitHub, GitLab, Vercel, Docker, CircleCI
6. **Enrichment** (6 tasks) - Clearbit, Hunter, Email validation, IP lookup, Weather
7. **Analytics** (6 tasks) - New Relic, Datadog, Mixpanel, Google Analytics, Sentry
8. **Utilities** (10 tasks) - QR codes, PDFs, Images, URLs, CSV, XML, JWT
9. **CRM/Sales** (7 tasks) - Salesforce, HubSpot, Airtable, Notion
10. **Social** (3 tasks) - Twitter, LinkedIn, Instagram

---

## 🎯 Implementation Priorities

### Phase 1: Core Communication & Utilities (12 tasks)
Essential for any workflow automation:
- slack-send-message
- sendgrid-send-email
- twilio-send-sms
- s3-upload-file
- s3-get-object
- redis-set
- redis-get
- qrcode-generate
- pdf-generate
- image-resize
- url-shorten
- jwt-sign

### Phase 2: AI & Data Processing (10 tasks)
Enable intelligent workflows:
- openai-chat-completion
- openai-create-embeddings
- openai-create-image
- claude-api-message
- stability-ai-generate-image
- mongodb-insert
- mongodb-find
- csv-parse
- json-to-xml
- xml-to-json

### Phase 3: Business Integration (15 tasks)
Connect to popular SaaS platforms:
- stripe-create-payment-intent
- stripe-refund
- github-create-issue
- github-create-pr
- salesforce-create-lead
- hubspot-create-contact
- mixpanel-track-event
- clearbit-enrich-company
- hunter-find-email
- zerobounce-validate-email
- vercel-deploy
- twitter-post-tweet
- linkedin-create-post
- datadog-send-metric
- newrelic-send-event

### Phase 4: Advanced Features (23+ tasks)
Complete the library with specialized tasks

---

## 📊 Success Metrics

### Task Library KPIs:
- **Total Tasks**: 60+ unique API integrations
- **Task Categories**: 10 functional categories
- **Workflow Combinations**: 1000+ possible compositions
- **API Coverage**: 40+ popular SaaS platforms
- **Reusability**: Each task used in 3+ different workflow patterns

### Quality Metrics:
- **Test Coverage**: ≥90% for all tasks
- **Error Handling**: Comprehensive error scenarios
- **Documentation**: Complete input/output schemas
- **Examples**: 3+ workflow examples per category
- **Performance**: <2s average task execution (excluding external API time)

---

**This comprehensive task library enables powerful workflow automation across communication, AI, payments, data processing, DevOps, and business operations! 🚀**
