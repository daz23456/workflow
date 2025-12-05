/**
 * Training App Configuration
 * Configure external links and settings here
 */

export const config = {
  // Link to the theory slides (set to your hosted slides URL)
  // Leave empty to hide the slides link
  slidesUrl: process.env.NEXT_PUBLIC_SLIDES_URL || '',

  // Title for the slides link
  slidesTitle: 'Learn the Theory: Why Spec-Driven Development Works',

  // Organization name (shown on certificate)
  organizationName: process.env.NEXT_PUBLIC_ORG_NAME || 'Your Organization',

  // Link to Claude Code / AI tool best practices
  // Leave empty to hide the link
  bestPracticesUrl: process.env.NEXT_PUBLIC_BEST_PRACTICES_URL || 'https://www.anthropic.com/claude-code',

  // Title for the best practices link
  bestPracticesTitle: 'Claude Code Best Practices',
};
