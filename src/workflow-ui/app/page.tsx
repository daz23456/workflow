import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Workflow Orchestration - Build Reusable Task Libraries',
  description:
    'Platform teams build battle-tested task libraries. Product teams compose workflows in minutes. Zero copy-paste, zero duplication. Ship 10x faster with composable workflows.',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-6">
          Stop Reinventing the Wheel
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Build Reusable Lego Bricks,
          <br />
          <span className="text-blue-600">Not Distributed Monoliths</span>
        </h1>
        <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
          <strong>Platform teams</strong> build battle-tested task libraries. <br />
          <strong>Product teams</strong> compose workflows in minutes.
        </p>
        <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
          Zero copy-paste. Zero HTTP client code.
          <br />
          Update once, improve 50 workflows instantly.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/tasks"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Browse Task Library
          </Link>
          <Link
            href="/workflows"
            className="px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            View Workflows
          </Link>
        </div>
      </section>

      {/* Why This Matters Section */}
      <section className="bg-white py-16 border-y border-gray-200">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Why This Matters</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-red-600">❌ Before</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• 3 weeks to ship a simple API composition</li>
                  <li>• Update payment provider → touch 30 codebases</li>
                  <li>• Copy-paste retry logic across 50 services</li>
                  <li>• Every team writes their own HTTP wrapper</li>
                  <li>• Custom code to merge and reshape data from 5 APIs</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-green-600">✅ After</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Ship features in hours, not weeks</li>
                  <li>• Update task once → 50 workflows auto-upgrade</li>
                  <li>• Reusable task library (payments, emails, webhooks)</li>
                  <li>• Compose workflows from existing tasks in 5 minutes</li>
                  <li>• Chain transforms declaratively - map → filter → aggregate</li>
                </ul>
              </div>
            </div>
            <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-center text-gray-700">
                <strong>One task, three workflows, zero duplication.</strong> That&apos;s the power of
                composability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Parallel Execution</h3>
            <p className="text-gray-600">
              Automatically identifies and executes independent tasks in parallel with configurable
              concurrency limits.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Schema Validation</h3>
            <p className="text-gray-600">
              JSON Schema-based validation ensures type safety and fail-fast behavior at design
              time.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Execution History</h3>
            <p className="text-gray-600">
              Full audit trail with task-level details, timing breakdowns, and dependency resolution
              tracking.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-orange-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Timeout Control</h3>
            <p className="text-gray-600">
              Per-task timeout support with graceful failure handling and clear error messages.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Retries</h3>
            <p className="text-gray-600">
              Exponential backoff retry policies with configurable attempts and delay strategies.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Template Expressions</h3>
            <p className="text-gray-600">
              Dynamic data flow with template expressions for passing data between tasks seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            See how the same tasks get reused across different workflows with zero duplication
          </p>
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Platform Team Side */}
              <div className="bg-white rounded-lg shadow-sm border-2 border-blue-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    P
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Platform Team</h3>
                    <p className="text-sm text-gray-600">Builds task library once</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <code className="text-sm font-mono text-blue-800">fetch-user</code>
                    <p className="text-xs text-gray-600 mt-1">Get user from API</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <code className="text-sm font-mono text-blue-800">send-email</code>
                    <p className="text-xs text-gray-600 mt-1">Send email via service</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <code className="text-sm font-mono text-blue-800">charge-payment</code>
                    <p className="text-xs text-gray-600 mt-1">Process payments</p>
                  </div>
                </div>
              </div>

              {/* Product Teams Side */}
              <div className="bg-white rounded-lg shadow-sm border-2 border-green-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                    T
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Product Teams</h3>
                    <p className="text-sm text-gray-600">Compose workflows from tasks</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="font-semibold text-sm mb-1">Order Fulfillment</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        fetch-user
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        charge-payment
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        send-email
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="font-semibold text-sm mb-1">User Onboarding</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        fetch-user
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        send-email
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <p className="font-semibold text-sm mb-1">Subscription Renewal</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        fetch-user
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        charge-payment
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        send-email
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
              <p className="text-center text-gray-800">
                <strong>3 tasks</strong> × <strong>3 workflows</strong> ={' '}
                <strong className="text-blue-600">9 integrations</strong> with{' '}
                <strong className="text-green-600">zero code duplication</strong>
              </p>
              <p className="text-center text-sm text-gray-600 mt-2">
                Update <code className="text-xs bg-white px-2 py-1 rounded">charge-payment</code>{' '}
                once → Both Order Fulfillment and Subscription Renewal get the upgrade
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Learning Playground CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-2xl p-12 text-white text-center overflow-hidden relative">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>

          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform">
                <svg
                  className="w-12 h-12 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
            </div>

            <div className="inline-block px-4 py-2 bg-white bg-opacity-20 rounded-full text-sm font-semibold mb-4">
              New! Interactive Learning 🎓
            </div>

            <h2 className="text-4xl font-bold mb-4">Learn by Doing</h2>
            <p className="text-xl mb-3 opacity-95 max-w-2xl mx-auto">
              Master workflow orchestration through <strong>hands-on interactive lessons</strong>
            </p>
            <p className="text-lg mb-8 opacity-80 max-w-2xl mx-auto">
              5 progressive lessons • Live code editing • Step-by-step guidance • Track your
              progress
            </p>

            <div className="flex gap-6 justify-center items-center mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">5</div>
                <div className="text-sm opacity-80">Lessons</div>
              </div>
              <div className="w-px h-12 bg-white opacity-30"></div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">10-30</div>
                <div className="text-sm opacity-80">Minutes Each</div>
              </div>
              <div className="w-px h-12 bg-white opacity-30"></div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">100%</div>
                <div className="text-sm opacity-80">Free</div>
              </div>
            </div>

            <Link
              href="/playground"
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-purple-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-2xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Start Learning Now
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>

            <p className="text-sm opacity-70 mt-6">
              From &quot;Hello World&quot; to advanced features in under 2 hours
            </p>
          </div>
        </div>
      </section>

      {/* VSCode Extension Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-12 text-white text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352zm-5.146 14.861L10.826 12l7.178-5.448v10.896z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold mb-4">VSCode Extension</h2>
          <p className="text-xl mb-8 opacity-90">
            Design, validate, and test workflows directly in your favorite editor
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="https://marketplace.visualstudio.com/items?itemName=workflow.workflow-designer"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21.29 4.1L20.08 2a.999.999 0 00-1.72.62v18.76a1 1 0 001.72.62l1.21-2.1a3 3 0 000-3.24L18 12l3.29-4.66a3 3 0 000-3.24zM3 12a9 9 0 0113.38-7.87V4.91a7 7 0 10.01 14.18v-1.22A9 9 0 013 12z" />
              </svg>
              Install Extension
            </a>
            <a
              href="https://github.com/workflow-engine/vscode-extension"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Coming Soon</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Stage 11: Cloud Deployment */}
          <div className="bg-gradient-to-br from-sky-50 to-blue-50 p-6 rounded-lg border border-sky-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Cloud Deployment</h3>
                <p className="text-gray-600 text-sm">
                  Helm charts for GKE & AKS, production hardening, and high availability configuration
                </p>
              </div>
            </div>
          </div>

          {/* Stage 14: Workflow Optimizer */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-lg border border-emerald-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Workflow Optimizer</h3>
                <p className="text-gray-600 text-sm">
                  Automatic performance tuning with algebraic transforms - proven safe by replaying past executions
                </p>
              </div>
            </div>
          </div>

          {/* Stage 15: MCP Server */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">MCP Workflow Server</h3>
                <p className="text-gray-600 text-sm">
                  Let any chatbot discover and execute workflows via Model Context Protocol
                </p>
              </div>
            </div>
          </div>

          {/* Stage 16: OpenAPI Task Generator */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-lg border border-orange-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">OpenAPI Task Generator</h3>
                <p className="text-gray-600 text-sm">
                  Auto-generate WorkflowTask CRDs from OpenAPI specs - complete PACT replacement
                </p>
              </div>
            </div>
          </div>

          {/* Stage 17: Test API Server */}
          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 p-6 rounded-lg border border-cyan-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Test API Server</h3>
                <p className="text-gray-600 text-sm">
                  100 endpoints for testing orchestration - validates transforms, errors, and retries
                </p>
              </div>
            </div>
          </div>

          {/* Stage 18: Synthetic Health Checks */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-6 rounded-lg border border-rose-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Synthetic Health Checks</h3>
                <p className="text-gray-600 text-sm">
                  Proactive endpoint monitoring - catch broken APIs before users do
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-gray-900 to-blue-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build with Lego Bricks?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Browse the task library and see how teams are composing workflows
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/tasks"
              className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Explore Task Library
            </Link>
            <Link
              href="/workflows"
              className="px-8 py-4 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              See Workflows in Action
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-6">
            Join teams shipping 10x faster with composable workflows
          </p>
        </div>
      </section>
    </div>
  );
}
