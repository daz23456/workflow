# Spec-Driven Development Training

**Skip the slides. Prove it yourself in 2 hours.**

An interactive training program that lets engineers evaluate spec-driven development through hands-on exercises with their own metrics.

## Quick Start

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Open http://localhost:3000
```

## What This Is

This is NOT a slideshow. It's a **challenge**.

Engineers complete 3 exercises:

| Exercise | Time | What You Prove |
|----------|------|----------------|
| The Baseline | 30 min | How you currently work with AI |
| The Spec-Driven Way | 60 min | Same task with the framework |
| Context Recovery | 30 min | Time savings from persistent state |

At the end, you have **your own data** comparing both approaches.

## Features

- **Timer-tracked exercises** - Accurate time measurements
- **Metrics collection** - Track coverage, confidence, re-explanations
- **Side-by-side comparison** - See the difference in your own numbers
- **Completion certificate** - Shareable proof of training completion
- **Quarterly objective tracking** - Integrate with performance goals

## The Challenge

1. **Exercise 1: The Baseline**
   - Build a retry utility your normal way
   - Track how it goes (time, tests, coverage, confidence)

2. **Exercise 2: The Spec-Driven Way**
   - Build the same thing using CLAUDE.md, TDD, quality gates
   - Compare metrics to your baseline

3. **Exercise 3: Context Recovery**
   - Simulate losing context mid-project
   - Measure recovery time with and without framework

## Quarterly Objective

The training maps to a clear quarterly objective:

| Key Result | Description |
|------------|-------------|
| Complete Training | Finish all 3 exercises with metrics |
| Apply to Real Task | Use spec-driven development on real work |
| Document Findings | Track and record your comparison data |
| Share with Team | Present learnings (optional) |

**Success = You made an informed decision based on your own data.**

## Certificate

Complete all exercises and claim a certificate with:
- Your name
- Unique certificate ID
- Skills demonstrated
- Shareable format

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state persistence)
- Lucide React (icons)

## File Structure

```
training-app/
├── app/
│   ├── page.tsx                    # Main training page
│   ├── exercise/[exerciseId]/      # Exercise pages
│   ├── results/                    # Results comparison
│   └── certificate/                # Certificate generation
├── lib/
│   ├── store.ts                    # Zustand store
│   └── exercises.ts                # Exercise definitions
└── README.md
```

## Running in Production

```bash
npm run build
npm start
```

Or deploy to Vercel, Netlify, or any platform that supports Next.js.

---

**This is training that respects engineers' time. No lectures. Just data.**
