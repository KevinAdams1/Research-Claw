---
name: skill-router
description: "Find and load specialized research skills from 488 guides across 6 categories"
always: true
version: 1.0
---

# Skill Router — 488 Research Skills

Route user requests to the right skill guide from the research-plugins collection.
Skills provide methodology, workflows, and domain knowledge. They do NOT replace
local tools — tools execute actions, skills provide guidance.

## Routing Table

| Category | Subcategories | Count | When to route here |
|:---------|:-------------|------:|:-------------------|
| literature | search, discovery, metadata, fulltext | 89 | Paper search strategy, database selection, DOI resolution, OA access |
| analysis | statistics, econometrics, dataviz, wrangling | 57 | Statistical methods, econometric models, visualization, data cleaning |
| writing | composition, citation, latex, polish, templates | 68 | Academic writing, citation formats, LaTeX, proofreading, templates |
| research | methodology, deep-research, paper-review, automation, funding | 70 | Study design, systematic reviews, peer review, grant applications |
| domains | ai-ml, biomedical, cs, economics, law, + 11 more | 143 | Discipline-specific databases, methods, conventions, tools |
| tools | diagram, document, code-exec, knowledge-graph, ocr-translate, scraping | 61 | Diagrams, document parsing, code execution, KG, OCR, web scraping |

## 3-Step Protocol

When the user's request matches a skill category:

1. **Match** — Identify the category and subcategory from the user's intent.
2. **Read catalog** — `read ~/.openclaw/extensions/research-plugins/curated/{category}/README.md`
   to find the exact skill name.
3. **Read skill** — `read ~/.openclaw/extensions/research-plugins/skills/{category}/{subcategory}/{skill-name}/SKILL.md`
   and apply its guidance to the user's request.

## Priority Rules

- **Local tools first.** If a local tool (library_*, task_*, workspace_*, radar_*) can
  fulfill the request, use it directly. Do not route to a skill.
- **Skills for methodology.** Route to skills when the user needs a workflow, best
  practice, or domain-specific guidance that no tool provides.
- **Combine when needed.** A single request may need both a tool (for execution) and
  a skill (for methodology). Use both.

## Common Cross-Category Patterns

| User intent | Skill combination |
|:-----------|:-----------------|
| Literature review | literature/search + writing/composition |
| Data analysis report | analysis/statistics + analysis/dataviz |
| Submission preparation | writing/templates + writing/latex + writing/citation |
| Systematic review | research/deep-research + research/methodology |
| Entering a new field | domains/{field} |
| Grant writing | research/funding + writing/composition |
