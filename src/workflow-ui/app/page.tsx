import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Workflow Orchestration - Build Reusable Task Libraries',
  description:
    'Platform teams build battle-tested task libraries. Product teams compose workflows in minutes. Zero copy-paste, zero duplication. Ship 10x faster with composable workflows.',
};

export default function Home() {
  return (
    <div className="min-h-screen theme-gradient">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="inline-block px-4 py-2 bg-[var(--theme-accent-light)] text-gray-800 dark:text-gray-200 rounded-full text-sm font-semibold mb-6">
          Stop Reinventing the Wheel
        </div>
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Build Reusable Lego Bricks,
          <br />
          <span className="theme-accent-text">Not Distributed Monoliths</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-4 max-w-3xl mx-auto">
          <strong>Platform teams</strong> build battle-tested task libraries. <br />
          <strong>Product teams</strong> compose workflows in minutes.
        </p>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Zero copy-paste. Zero HTTP client code.
          <br />
          Update once, improve 50 workflows instantly.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/tasks"
            className="px-6 py-3 theme-button theme-shadow-md"
          >
            Browse Task Library
          </Link>
          <Link
            href="/workflows"
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white theme-rounded-md font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors theme-shadow-sm"
          >
            View Workflows
          </Link>
        </div>
      </section>

      {/* Why This Matters Section */}
      <section className="bg-white dark:bg-gray-900 py-16 border-y border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Why This Matters</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-red-600 dark:text-red-400">❌ Before</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li>• 3 weeks to ship a simple API composition</li>
                  <li>• Update a shared API → coordinate 30 deployments</li>
                  <li>• Copy-paste retry logic across 50 services</li>
                  <li>• Lock-step deployments required for breaking changes</li>
                  <li>• Custom code to merge and reshape data from 5 APIs</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-green-600 dark:text-green-400">✅ After</h3>
                <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                  <li>• Ship features in hours, not weeks</li>
                  <li>• Update task once → 50 workflows auto-upgrade</li>
                  <li>• Safe continuous deployment - no lock-step required</li>
                  <li>• Compose workflows from existing tasks in 5 minutes</li>
                  <li>• Chain transforms declaratively - map → filter → aggregate</li>
                </ul>
              </div>
            </div>
            <div className="mt-8 p-6 bg-[var(--theme-accent-light)] rounded-lg border border-[var(--theme-accent)]/30">
              <p className="text-center text-gray-700 dark:text-gray-200">
                <strong>One task, three workflows, zero duplication.</strong> That&apos;s the power of
                composability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="theme-card p-6">
            <div className="w-12 h-12 bg-[var(--theme-accent-light)] theme-rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 theme-accent-text"
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
            <h3 className="text-xl mb-2 text-gray-900 dark:text-white">Parallel Execution</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Automatically identifies and executes independent tasks in parallel with configurable
              concurrency limits.
            </p>
          </div>

          <div className="theme-card p-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 theme-rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
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
            <h3 className="text-xl mb-2 text-gray-900 dark:text-white">Schema Validation</h3>
            <p className="text-gray-600 dark:text-gray-300">
              JSON Schema-based validation ensures type safety and fail-fast behavior at design
              time.
            </p>
          </div>

          <div className="theme-card p-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 theme-rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
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
            <h3 className="text-xl mb-2 text-gray-900 dark:text-white">Execution History</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Full audit trail with task-level details, timing breakdowns, and dependency resolution
              tracking.
            </p>
          </div>

          <div className="theme-card p-6">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 theme-rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-orange-600 dark:text-orange-400"
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
            <h3 className="text-xl mb-2 text-gray-900 dark:text-white">Timeout Control</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Per-task timeout support with graceful failure handling and clear error messages.
            </p>
          </div>

          <div className="theme-card p-6">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 theme-rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
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
            <h3 className="text-xl mb-2 text-gray-900 dark:text-white">Smart Retries</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Exponential backoff retry policies with configurable attempts and delay strategies.
            </p>
          </div>

          <div className="theme-card p-6">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 theme-rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-indigo-600 dark:text-indigo-400"
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
            <h3 className="text-xl mb-2 text-gray-900 dark:text-white">Template Expressions</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Dynamic data flow with template expressions for passing data between tasks seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gray-50 dark:bg-gray-950 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4 text-gray-900 dark:text-white">How It Works</h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
            See how the same tasks get reused across different workflows with zero duplication
          </p>
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Platform Team Side */}
              <div className="theme-card border-2 border-[var(--theme-accent)]/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 theme-accent theme-rounded-full flex items-center justify-center text-white font-bold">
                    P
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Platform Team</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Builds task library once</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-[var(--theme-accent-light)] rounded border border-[var(--theme-accent)]/30">
                    <code className="text-sm font-mono theme-accent-text">fetch-user</code>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Get user from API</p>
                  </div>
                  <div className="p-3 bg-[var(--theme-accent-light)] rounded border border-[var(--theme-accent)]/30">
                    <code className="text-sm font-mono theme-accent-text">send-notification</code>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Send via notification service</p>
                  </div>
                  <div className="p-3 bg-[var(--theme-accent-light)] rounded border border-[var(--theme-accent)]/30">
                    <code className="text-sm font-mono theme-accent-text">validate-data</code>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Validate against rules</p>
                  </div>
                </div>
              </div>

              {/* Product Teams Side */}
              <div className="theme-card border-2 border-green-200 dark:border-green-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-600 theme-rounded-full flex items-center justify-center text-white font-bold">
                    T
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Product Teams</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Compose workflows from tasks</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-800">
                    <p className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">User Registration</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-xs bg-[var(--theme-accent-light)] theme-accent-text px-2 py-1 rounded">
                        validate-data
                      </span>
                      <span className="text-xs bg-[var(--theme-accent-light)] theme-accent-text px-2 py-1 rounded">
                        fetch-user
                      </span>
                      <span className="text-xs bg-[var(--theme-accent-light)] theme-accent-text px-2 py-1 rounded">
                        send-notification
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-800">
                    <p className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">Profile Update</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-xs bg-[var(--theme-accent-light)] theme-accent-text px-2 py-1 rounded">
                        fetch-user
                      </span>
                      <span className="text-xs bg-[var(--theme-accent-light)] theme-accent-text px-2 py-1 rounded">
                        validate-data
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-800">
                    <p className="font-semibold text-sm mb-1 text-gray-900 dark:text-white">Alert Workflow</p>
                    <div className="flex gap-1 flex-wrap">
                      <span className="text-xs bg-[var(--theme-accent-light)] theme-accent-text px-2 py-1 rounded">
                        fetch-user
                      </span>
                      <span className="text-xs bg-[var(--theme-accent-light)] theme-accent-text px-2 py-1 rounded">
                        validate-data
                      </span>
                      <span className="text-xs bg-[var(--theme-accent-light)] theme-accent-text px-2 py-1 rounded">
                        send-notification
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-[var(--theme-accent-light)] to-green-50 dark:from-[var(--theme-accent-light)] dark:to-green-900/30 rounded-lg border border-[var(--theme-accent)]/30">
              <p className="text-center text-gray-800 dark:text-gray-200">
                <strong>3 tasks</strong> × <strong>3 workflows</strong> ={' '}
                <strong className="theme-accent-text">9 integrations</strong> with{' '}
                <strong className="text-green-600">zero code duplication</strong>
              </p>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                Update <code className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded">send-notification</code>{' '}
                once → All three workflows get the upgrade. Deploy independently, no lock-step needed.
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
        <div className="theme-accent theme-rounded-xl theme-shadow-xl p-12 text-white text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white theme-rounded-lg flex items-center justify-center">
              <svg className="w-10 h-10 theme-accent-text" fill="currentColor" viewBox="0 0 24 24">
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
              className="px-6 py-3 bg-white theme-accent-text rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
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
              className="px-6 py-3 bg-[var(--theme-accent-dark)] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Coming Soon Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">Coming Soon</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Stage 11: Cloud Deployment */}
          <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/30 p-6 rounded-lg border border-sky-200 dark:border-sky-800">
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
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Cloud Deployment</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Helm charts for GKE & AKS, production hardening, and high availability configuration
                </p>
              </div>
            </div>
          </div>

          {/* Stage 39: Smart Caching */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 p-6 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Smart Caching</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Intelligent task caching with TTL - reduce API costs by 50-90%
                </p>
              </div>
            </div>
          </div>

          {/* Stage 38: Zero-Config Observability */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/30 p-6 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Zero-Config Observability</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  OpenTelemetry traces, Prometheus metrics, and structured logging out of the box
                </p>
              </div>
            </div>
          </div>

          {/* Stage 36: Time-Travel Debugging */}
          <div className="bg-gradient-to-br from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/30 dark:to-pink-900/30 p-6 rounded-lg border border-fuchsia-200 dark:border-fuchsia-800">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-fuchsia-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Time-Travel Debugging</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  See exact state at every step, then replay with modified inputs
                </p>
              </div>
            </div>
          </div>

          {/* Stage 35: Marketplace & Connectors */}
          <div className="bg-gradient-to-br from-lime-50 to-green-50 dark:from-lime-900/30 dark:to-green-900/30 p-6 rounded-lg border border-lime-200 dark:border-lime-800">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-lime-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
                    d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Marketplace & Connectors</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Pre-built tasks for Stripe, Twilio, SendGrid - from days to minutes
                </p>
              </div>
            </div>
          </div>

          {/* Stage 40: Compliance Built-In */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/30 dark:to-gray-900/30 p-6 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
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
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Compliance Built-In</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  PII detection, audit logging, and HIPAA/SOC2 compliance reports
                </p>
              </div>
            </div>
          </div>

          {/* Stage 42: Traffic Splitting */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 p-6 rounded-lg border border-orange-200 dark:border-orange-800">
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
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Traffic Splitting</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Canary deployments and A/B testing - deploy with confidence
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build with Lego Bricks?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Browse the task library and see how teams are composing workflows
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/tasks"
              className="px-8 py-4 theme-accent text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
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
