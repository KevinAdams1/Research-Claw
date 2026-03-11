---
file: TOOLS.md
version: 1.0
updated: 2026-03-11
chars: ~2000
---

# Tool Reference

## Paper Database APIs

These external APIs are available for literature search. Use multiple databases
for comprehensive coverage. Prefer Semantic Scholar for citation graphs and
arXiv for preprints.

| API | Coverage | Best For | Rate Limits |
|:---|:---|:---|:---|
| **Semantic Scholar** | 200M+ papers | Citation graphs, recommendations | 100 req/5min |
| **arXiv** | CS, physics, math, bio preprints | Latest preprints, full-text | 3 req/sec |
| **OpenAlex** | 250M+ works | Broad coverage, institutions | 10 req/sec |
| **CrossRef** | 130M+ DOIs | DOI resolution, metadata | 50 req/sec (polite) |
| **PubMed / NCBI** | Biomedical literature | Medical, life sciences | 3 req/sec |
| **Unpaywall** | OA availability for DOIs | Legal open-access full text | 100K/day |

## Local Library Tools

Provided by the `research-claw-core` plugin. Data stored in
`.research-claw/library.db` (SQLite).

| Tool | Purpose | Example |
|:---|:---|:---|
| `library_add_paper` | Add a paper to local library | Provide DOI, title, or BibTeX |
| `library_search` | Search library by keyword, author, tag, status | `library_search(query="attention", status="unread")` |
| `library_update_paper` | Update paper metadata, status, annotations | Change status to "read", add notes |
| `library_get_paper` | Retrieve full details of a specific paper | By DOI or internal ID |
| `library_export_bibtex` | Export library or subset as BibTeX | Filter by tag, project, or list |
| `library_reading_stats` | Reading activity summary | Papers read this week, total count |

## Task Management Tools

| Tool | Purpose | Example |
|:---|:---|:---|
| `task_create` | Create a new task with optional deadline | `task_create(title="Review Ch.3", deadline="2026-03-15")` |
| `task_list` | List tasks, filter by status/project/deadline | `task_list(status="pending", project="Survey")` |
| `task_complete` | Mark a task as complete | `task_complete(id="t-001")` |
| `task_update` | Update task details (title, deadline, priority) | `task_update(id="t-001", priority="high")` |
| `task_link` | Link a task to papers or other tasks | `task_link(task="t-001", paper="doi:10.1234/x")` |
| `task_note` | Add a note/comment to a task | `task_note(id="t-001", note="Methodology looks solid")` |

## Workspace Tools

For managing files in the research workspace.

| Tool | Purpose | Example |
|:---|:---|:---|
| `workspace_save` | Save content to a workspace file | `workspace_save(path="notes/ch3.md", content="...")` |
| `workspace_read` | Read a workspace file | `workspace_read(path="notes/ch3.md")` |
| `workspace_list` | List files in workspace | `workspace_list(dir="notes/")` |
| `workspace_diff` | Show changes to a file | `workspace_diff(path="notes/ch3.md")` |
| `workspace_history` | Show file edit history | `workspace_history(path="notes/ch3.md")` |
| `workspace_restore` | Restore a previous version | `workspace_restore(path="notes/ch3.md", version=3)` |

## Citation & Export

- **Supported citation styles:** APA, MLA, Chicago, IEEE, Vancouver, Harvard,
  Nature, ACM, ACS, custom CSL
- **Export formats:** BibTeX (.bib), RIS (.ris), CSV (.csv), JSON, Markdown
- **Import formats:** PDF, BibTeX (.bib), RIS (.ris), CSV, DOI list

## Configuration

Citation style is configured in `openclaw.json` at
`plugins.entries.research-claw-core.config.defaultCitationStyle`.

Tool availability depends on the `tools.profile` setting:
- `"full"` — All built-in tools + research tools (default)
- `"minimal"` — Built-in tools only, no research-specific tools
