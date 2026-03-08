# AGENTS.md

## Project purpose

This repository powers **yenchingreviews**, a course review platform for the Yenching Academy at Peking University.

The goal is to create a useful, trustworthy, student-oriented academic utility where users can browse courses, understand how past students experienced them, and eventually contribute new reviews.

This is not a marketing site. It is a practical information tool.

## Product direction

The product should prioritize:

- clarity
- speed
- usability
- credibility
- compact presentation of useful information
- easy browsing on both desktop and mobile

The site should help users quickly answer questions like:

- What courses exist?
- Which courses fit a given interest or category?
- What did students think of a course?
- How did experiences vary by professor or term?

## Design philosophy

The interface should feel academically useful, lightweight, and easy to scan.

General design goals:
- clean and restrained
- information-dense without feeling cluttered
- visually calm
- mobile-friendly
- fast to navigate

Branding notes:
- style the product name as **yenchingreviews** in lowercase
- the visual identity should feel simple, modern, and credible
- avoid overly playful or overly decorative design choices

Do not lock the UI to one exact visual style if better implementations emerge over time. Preserve the product’s overall character rather than treating any single layout detail as sacred.

## Technical direction

This project uses:
- Next.js
- Supabase
- GitHub
- Vercel

Prefer:
- modular code
- small, reviewable pull requests
- centralized data access patterns
- maintainable component structure
- clear loading, empty, and error states
- simple solutions over clever ones

Avoid:
- placeholder/demo assumptions lingering in production code
- unnecessary complexity
- scattered data-fetching logic
- fragile hard-coded assumptions when a more robust pattern is available

## Working principles for agents

When making changes:
1. Keep changes focused on the requested task.
2. Preserve existing functionality unless the task requires changing it.
3. Explain assumptions clearly.
4. Do not invent product requirements that are not stated in the repo or prompt.
5. Prefer implementation choices that are easy to review and easy to revise later.

## Database guidance

This project uses Supabase as the source of application data.

Guidelines:
- Do not assume database fields beyond what is necessary for the feature being implemented.
- Do not introduce references to unused columns.
- If a query depends on a field, that dependency should be deliberate and tied to a visible product need.
- If schema uncertainty exists, surface the assumption clearly in code or in the PR summary rather than guessing broadly.

## Current product priorities

The current focus is the read experience:
- course browsing
- filtering
- course detail pages
- review display

Submission flows, moderation tools, and more advanced aggregation can be added later.

## Output expectations

For each task:
- keep changes PR-friendly
- summarize what changed
- note any assumptions
- identify any obvious follow-up work
