# Coding Style

- Follow KISS and DRY.
- No em-dashes or double dashes.
- Clear variable names over cryptic abbreviations.
- Max 500 lines per file. Refactor by splitting if approaching.
- Comments only when they add value for maintainers. No obvious or filler comments.
- Use Context7 MCP automatically for library/API docs, code generation, setup, or config steps.
- Never edit generated code (TS/Go). Edit the generator or source instead.
- Use `T[]`, not `Array<T>`.
- Prefer TS `type` over `interface`.
- SEO is a top priority for public-facing pages. Keep sitemaps in `web/src/pages/sitemaps/` current; ensure titles and copy are SEO-sound.

## Comments in Code

Comment like a human dev: sparingly, and only when the code can't speak for itself. Don't narrate what the code obviously does (`// increment counter`), don't restate function names, don't leave breadcrumbs explaining your thought process. Good comments explain *why*, not *what*: a non-obvious constraint, a workaround for a known bug, a business rule that looks wrong but isn't, a perf trade-off. Keep them short, lowercase-casual is fine, full essays are not. If a comment is longer than the code it describes, either the code needs refactoring or the comment needs cutting. When in doubt, leave it out.

# Commits & Branching

After user confirms changes, commit per rules below. Keep commits small and focused.

- Follow Conventional Commits (conventionalcommits.org).
- Short, single-line messages prefixed with `fix`, `feat`, `chore`, etc.
- Never add `Co-authored-by`.

# Token Optimization

1. **No doom-scrolling**: never read a whole file to find a definition or import.
2. **Progressive search** with `rg` (fallback `grep -n`):
   - **Find file**: `rg -l "term"` or `rg -t ts -l "term"`.
   - **Find line**: `rg -n "term" path/to/file`. Skip `-C` in broad searches.
   - **Targeted read**: small line windows only (e.g., lines 10-30).
3. **Search definitions, not usages**: `rg "function myFunc"` or `rg "func myFunc"`, not bare `rg "myFunc"`.
4. **Exclude noise**: ignore `package-lock.json`, `dist/`, large fixtures unless required.

# Writing Style

Applies to all prose: docs, comments, commits, READMEs, PR descriptions, UI copy, error messages. Write like a human who's done the work and respects the reader's time. Apply silently; never mention these guidelines in output.

## How AI Writing Gets Caught

Readers spot AI from structural patterns even when vocabulary is clean. Avoid these.

### Rhythmic Symmetry and the Rule of Three

AI defaults to balanced clauses and groups of three. Real writing has uneven rhythm.

- Bad: "It's fast, reliable, and scalable."
- Bad: "Not just a tool, but a platform."

Use two items, four, one, five. Three only when the content actually has three. Never write three consecutive sentences of similar length.

### Parataxis (The Short-Sentence Chain)

The fastest tell after em dashes. Short sentence. Then another. Then another. Reads like blank verse and screams machine.

Connect related thoughts with subordinate clauses, conjunctions, semicolons, or commas. Show how ideas relate. Fragments are fine in moderation; chains of fragments are not.

### Contrastive Reframing

The "not X, but Y" construction, plus "It's less about X and more about Y" and "X isn't just Y, it's Z." Make direct statements. If Y is true, say Y.

### Hedge Stacking

"Can potentially," "may sometimes help to," "could arguably." Pick one verb. Commit or don't.

- Bad: "This can potentially help reduce latency in some cases."
- Good: "This reduces latency."
- Good: "This usually reduces latency. Not always."

### Hollow Connectives and Throat-Clearing

Cut: "Moreover," "Furthermore," "That said," "Indeed," "Notably," "Importantly," "Essentially," "Ultimately," "It's worth noting that," "It's important to remember," "In essence," "At its core," "When it comes to," "In the realm of."

Cut closings: "In conclusion," "All in all," "To sum up." End on the last real idea.

### Empty Paragraphs (Low Information Density)

AI writes paragraphs that take 80 words to deliver 10 words of content. Common shapes:

- **Restating the heading.** Section "Caching" opening with "Caching is an important consideration..." Delete.
- **Previewing what you're about to say.** "In this section, we'll look at..." Just say it.
- **Summarizing what you just said.** "As we've seen..." Reader saw it.
- **Generic context-setting.** "In today's fast-moving development landscape..." Cut.
- **Definitional padding.** Define in five words if needed; skip if not.

The test: cover the paragraph and ask what the reader loses. If "nothing specific," cut it. If "a fact, number, name, instruction, or real opinion," keep it.

A paragraph earns its place by carrying information not in the heading, surrounding paragraphs, or the reader's existing knowledge. Otherwise it's wallpaper. One-sentence paragraphs that say something real beat five-sentence paragraphs that say nothing.

### Uniform Paragraph Structure

AI follows topic sentence → explanation → example → transition. Every paragraph. Break it. Start some with a question, some with a blunt assertion. Let some be one sentence. Let some end abruptly.

### Bold Lead-In Bullets

The "**Term**: explanation" pattern on every bullet is an AI signature. Use only when the term genuinely needs emphasis (glossary, API reference). For prose lists, write full sentences.

### Passive Hedging

"Is being considered," "was found to be," "are thought to." Active and direct.

### Suspicious Vocabulary

Red flags, not bans. If you reach for one, ask whether a plainer word fits.

leverage, utilize, delve, dive deep, navigate (metaphorical), explore (metaphorical), robust, seamless, streamlined, cutting-edge, state-of-the-art, tapestry, landscape, realm, journey, ecosystem (metaphorical), intricate, nuanced, multifaceted, holistic, foster, empower, unlock, elevate, transform, revolutionary, paradigm shift, comprehensive, crucial, vital, meticulous, game-changer.

## Punctuation

- **Em dashes**: max one per 500 words. Use commas, semicolons, colons, parentheses, or restructure.
- **Exclamation marks**: max one per 1,000 words.
- **Semicolons**: use them; AI underuses them.
- **Colons**: good for setups the next clause delivers.
- **Parentheses**: useful for asides (they break the AI cadence).
- **Ellipses**: only when genuinely trailing off. Never as a transition.
- **Contractions**: use them. Skipping reads stilted.

## What To Do Instead

- **Be specific.** "Parses 40MB of logs in under 200ms" beats "high-performance log parsing."
- **Show, don't describe.** "Three flags from install to first deploy" beats "streamlined developer experience."
- **Use real numbers.** "Cut p99 from 800ms to 120ms" beats "significant performance improvement."
- **Name real things.** "Postgres 15 with logical replication" beats "modern database infrastructure."
- **Include friction honestly.** "The cache invalidation took three rewrites and still has an edge case at midnight UTC" beats "robust caching strategy."
- **Reach past the first word.** AI picks the highest-probability token; the second-best is usually more accurate.
- **Take positions.** Hedge only on real uncertainty.

## Accuracy

- Never invent benchmark numbers, library versions, or API behavior. If unsure, say so or check.
- Never fabricate quotes from maintainers, RFCs, or docs.
- Real verifiable names beat generic descriptions.
- Fake specificity kills trust faster than honest vagueness.

# Security

- Never commit secrets. Use env vars.
- Validate all user input.
- Keep dependencies minimal and updated.

# SEO

Required for all user-facing prose (docs, blogs, landing pages, READMEs, marketing). Clarity, structure, and intent-matching serve both readers and rankings.

## Keywords

- Pick one primary keyword per piece (one search intent).
- Add 2-4 supporting secondary keywords. Use naturally, never stuff.
- Place the primary keyword in: H1, first 100 words, at least one H2, meta description, URL slug, and relevant image alt text.

## Title & Meta

- **Title**: 50-60 chars, primary keyword front-loaded, specific, not clickbait.
- **Meta description**: 140-160 chars, primary keyword + clear value.
- **URL slug**: short, lowercase, hyphenated, keyword-focused, drop stop words.

## Headings

- One H1 per page (contains primary keyword).
- H2 for sections, H3 for subsections. No skipped levels.
- Accurate, scannable, with natural keyword variations.

## Content

- Match search intent (how-to gets steps, vs gets comparison).
- Cover the topic thoroughly. Length serves the reader, not word count.
- Put the core answer in the first paragraph or two.
- Use synonyms and related terms for semantic variety.

## Rich Results

- 40-60 word definition paragraphs under H2s win paragraph snippets.
- Numbered lists for step-by-step.
- Tables for comparisons.
- FAQ sections with H3 questions and concise answers.

## Linking

- Internal links with descriptive anchors (never "click here").
- External links to authoritative sources for data and claims.
- Roughly 2-5 internal links per 1,000 words; every link must serve the reader.

## Media

- Descriptive alt text on all images.
- Compress before publishing.
- Descriptive filenames (`postgres-query-performance.png`, not `IMG_4521.png`).
- Captions where they aid comprehension.

## Technical

- Mobile-first: short paragraphs, scannable, no horizontal scroll.
- Page speed: avoid heavy embeds, oversized images, render-blocking content.
- Add schema markup (Article, FAQ, HowTo, Product) where applicable.
- Use canonical tags to prevent duplicate content issues.

## Avoid

- Keyword stuffing.
- Writing for robots (Writing Style still applies).
- Thin content to hit a calendar.
- Copying competitors. Add unique angle, data, or expertise.
- Chasing high-volume keywords that don't match the offering.
