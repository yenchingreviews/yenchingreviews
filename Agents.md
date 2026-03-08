# AGENTS.md

## Project overview

This repository powers **yenchingreviews**, a course review platform for the Yenching Academy at Peking University.

The goal is to build a Berkeleytime-style course review site where students can:
- browse courses
- filter courses quickly
- open a course page
- read course reviews
- eventually submit new reviews

The product should feel:
- sleek
- minimal
- information-dense
- mobile-friendly
- fast to navigate

Branding:
- always style the product name as **yenchingreviews** in lowercase
- use a cream or off-white background
- use red as the primary accent color
- keep the UI restrained and academic, not playful or overdesigned

## Tech stack

- Next.js frontend
- Supabase database
- GitHub repository
- Vercel hosting

Assume the Supabase project already exists and contains the real data.

## Existing Supabase schema

### courses table
- course_id
- course_name
- category_type
- track_name
- language
- aliases
- notes

### reviews table
- review_id
- course_id
- term_label
- professor_name
- review_text
- legacy_review_order
- reviewer_display_name
- is_anonymous
- rating_quality
- rating_workload
- used_for_track_credit
- used_for_track

## Business logic rules

1. `category_type` can only be `Yenching` or `PKU Wide`.
2. `track_name` applies to Yenching courses, including `General Elective`.
3. PKU-wide courses may optionally have track credit based on user reviews.
4. A single course page may contain reviews for multiple professors.
5. Course pages must support filtering reviews by professor.
6. Ratings may be missing, so aggregation must handle null values gracefully.
7. Future review submission must support both:
   - adding a review to an existing course
   - adding a brand-new course and its first review

## Core product requirements

### Homepage
The homepage should support:
- browsing courses
- search
- filtering by category_type
- filtering by track_name
- filtering by language
- mobile responsiveness

### Course page
Each course page should display:
- course title
- tags for category_type, track_name, language
- average quality and workload ratings if available
- review cards with professor, term, and review text
- attribution as either:
  - Anonymous
  - Reviewed by [name]
- professor filter buttons such as:
  - All
  - Prof A
  - Prof B

## Architecture preferences

Prefer:
- Next.js App Router
- server components by default
- client components only when needed for interactivity
- centralized Supabase helpers
- modular components
- incremental PRs
- clear loading and empty states

Avoid:
- placeholder/demo data
- unnecessary complexity
- scattered Supabase queries across many files
- generic startup landing-page styling

## UI guidance

The UI should be:
- Berkeleytime-inspired in density and utility
- modern and clean
- compact but readable
- cream background
- red branding for yenchingreviews
- subtle borders
- minimal shadows
- strong typography hierarchy

Do not make it look:
- overly playful
- too spacious
- like a marketing page

## Working style

When making changes:
1. keep changes focused and reviewable
2. explain what was changed
3. note assumptions made
4. identify any follow-up work
5. preserve alignment with the Supabase schema above
