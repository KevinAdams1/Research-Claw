---
file: TOOLS.md
version: 3.0
updated: 2026-03-13
---

# Tool Reference

## §1 Local Tools (27)

### Library (12 tools)

| Tool | Purpose |
|:-----|:--------|
| `library_add_paper` | Add a paper to local library (DOI, title, or BibTeX) |
| `library_search` | Full-text search across title, abstract, authors |
| `library_update_paper` | Update metadata, status, annotations |
| `library_get_paper` | Retrieve full details by DOI or internal ID |
| `library_export_bibtex` | Export library or subset as BibTeX |
| `library_reading_stats` | Reading activity summary |
| `library_batch_add` | Batch import multiple papers at once |
| `library_manage_collection` | Create, update, or delete paper collections |
| `library_tag_paper` | Add or remove tags on a paper |
| `library_add_note` | Add annotation note to a paper |
| `library_import_bibtex` | Import papers from BibTeX content |
| `library_citation_graph` | Query citation relationships between papers |

### Tasks (6 tools)

| Tool | Purpose |
|:-----|:--------|
| `task_create` | Create a task with optional deadline |
| `task_list` | List tasks, filter by status/priority/deadline |
| `task_complete` | Mark a task as complete |
| `task_update` | Update task details |
| `task_link` | Link a task to a paper in the library |
| `task_note` | Add a timestamped note to a task |

### Workspace (6 tools)

| Tool | Purpose |
|:-----|:--------|
| `workspace_save` | Save content to a workspace file (returns file_card) |
| `workspace_read` | Read a workspace file |
| `workspace_list` | List files in workspace directory |
| `workspace_diff` | Show changes since last commit |
| `workspace_history` | Show file edit history |
| `workspace_restore` | Restore a previous version of a file |

### Radar (3 tools)

| Tool | Purpose |
|:-----|:--------|
| `radar_configure` | Set tracking keywords, authors, journals, sources |
| `radar_get_config` | Read current radar configuration |
| `radar_scan` | Scan arXiv/S2 for new papers matching config |

**Radar notes:** `radar_configure` persists to the database — the dashboard reads
from there, not chat history. `radar_scan` returns papers but does NOT auto-add them
to the library.

## §2 API Tools (13)

Six external databases, accessed via API tools:

| Database | Coverage | Best for |
|:---------|:---------|:---------|
| **Semantic Scholar** | 200M+ papers | Citation graphs, recommendations |
| **arXiv** | CS, physics, math, bio preprints | Latest preprints, full-text |
| **OpenAlex** | 250M+ works | Broad coverage, institutions |
| **CrossRef** | 130M+ DOIs | DOI resolution, metadata |
| **PubMed / NCBI** | Biomedical literature | Medical, life sciences |
| **Unpaywall** | OA availability for DOIs | Legal open-access full text |

API tools by database:
- **Semantic Scholar**: `search_papers`, `get_paper`, `get_citations`
- **OpenAlex**: `search_openalex`, `get_work`, `get_author_openalex`
- **CrossRef**: `search_crossref`, `resolve_doi`
- **arXiv**: `search_arxiv`, `get_arxiv_paper`
- **PubMed**: `search_pubmed`, `get_article`
- **Unpaywall**: `find_oa_version`

## §3 Special Tools

### send_notification
- **Auto-use:** Only for heartbeat reminders and deadline alerts.
- **All other cases:** Requires explicit user request.

### cron (built-in)
- **Use only** when the user explicitly asks for a recurring or scheduled task.
- Never set up cron jobs proactively.

### gateway (built-in)
- **Query config:** Allowed freely.
- **gateway.restart:** MUST present `approval_card` (risk_level: high) first.
- Never restart the gateway without explicit user request and confirmation.

## §4 Skill Router

Methodology, workflows, and domain-specific guidance are provided by 488
research-plugins skills. Access them through the **skill-router** skill using its
3-step protocol (match → read catalog → read skill). Tools always take priority
over skill guidance.

## §5 Citation & Export

- **Citation styles:** APA, MLA, Chicago, IEEE, Vancouver, Harvard, Nature, ACM,
  ACS, custom CSL
- **Export formats:** BibTeX (.bib), RIS (.ris), CSV (.csv), JSON, Markdown
- **Import formats:** PDF, BibTeX (.bib), RIS (.ris), CSV, DOI list

## §6 Tool Count

27 local + 13 API = **40 registered tools**, all in `openclaw.json` `tools.alsoAllow`.
488 skills accessible on-demand via skill-router.
