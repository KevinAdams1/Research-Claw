/**
 * Research-Claw Core — Literature Tools
 *
 * 12 agent tools in the `library_*` namespace.
 * Each tool is registered via api.registerTool() with JSON Schema parameters
 * and an execute callback matching the OpenClaw ToolDefinition interface.
 */

// Note: Tool parameters use raw JSON Schema objects for simplicity.
// The spec suggests TypeBox (@sinclair/typebox) but raw schemas are
// functionally equivalent and avoid an additional abstraction layer.

import { LiteratureService, type PaperInput, type PaperPatch } from './service.js';
import type { ToolDefinition } from '../types.js';

// ── Helpers ─────────────────────────────────────────────────────────────

function ok(text: string, details: unknown): unknown {
  return { content: [{ type: 'text', text }], details };
}

function fail(message: string): unknown {
  return { content: [{ type: 'text', text: `Error: ${message}` }], details: { error: message } };
}

// ── Registration ────────────────────────────────────────────────────────

export function createLiteratureTools(service: LiteratureService): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  // ── 1. library_add_paper ──────────────────────────────────────────────

  tools.push({
    name: 'library_add_paper',
    description:
      'Add a paper to the local research library. Returns the saved paper object. ' +
      'If a paper with the same DOI or arXiv ID already exists, an error is returned.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Paper title' },
        authors: { type: 'array', items: { type: 'string' }, description: 'List of author names' },
        doi: { type: 'string', description: 'Digital Object Identifier' },
        arxiv_id: { type: 'string', description: 'arXiv identifier (e.g. 2301.12345)' },
        venue: { type: 'string', description: 'Publication venue (journal or conference)' },
        year: { type: 'number', description: 'Publication year' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Tags to attach' },
        notes: { type: 'string', description: 'Personal notes' },
        pdf_path: { type: 'string', description: 'Local path to the PDF file' },
        bibtex_key: { type: 'string', description: 'BibTeX citation key' },
        metadata: { type: 'object', description: 'Additional metadata' },
        abstract: { type: 'string', description: 'Paper abstract' },
        url: { type: 'string', description: 'URL to the paper' },
        source: { type: 'string', description: 'Discovery source (e.g. arxiv, semantic_scholar)' },
        source_id: { type: 'string', description: 'Source-specific identifier' },
      },
      required: ['title'],
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const input: PaperInput = {
          title: params.title as string,
          authors: (params.authors as string[]) ?? undefined,
          doi: (params.doi as string) ?? undefined,
          arxiv_id: (params.arxiv_id as string) ?? undefined,
          venue: (params.venue as string) ?? undefined,
          year: (params.year as number) ?? undefined,
          tags: (params.tags as string[]) ?? undefined,
          notes: (params.notes as string) ?? undefined,
          pdf_path: (params.pdf_path as string) ?? undefined,
          bibtex_key: (params.bibtex_key as string) ?? undefined,
          metadata: (params.metadata as Record<string, unknown>) ?? undefined,
          abstract: (params.abstract as string) ?? undefined,
          url: (params.url as string) ?? undefined,
          source: (params.source as string) ?? undefined,
          source_id: (params.source_id as string) ?? undefined,
        };
        const paper = service.add(input);
        return ok(
          `Added paper "${paper.title}" (id: ${paper.id})` +
            (paper.tags && paper.tags.length > 0 ? ` with tags: ${paper.tags.join(', ')}` : ''),
          paper,
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 2. library_search ─────────────────────────────────────────────────

  tools.push({
    name: 'library_search',
    description:
      'Search the local research library by query string. ' +
      'Supports full-text search across title, abstract, and authors.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (full-text search across title, abstract, authors)' },
        limit: { type: 'number', description: 'Maximum results to return (default 50, max 500)' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
      required: ['query'],
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const query = params.query as string;
        const limit = (params.limit as number) ?? 50;
        const offset = (params.offset as number) ?? 0;
        const result = service.search(query, limit, offset);
        return ok(
          `Found ${result.total} paper(s) matching "${query}" (showing ${result.items.length})`,
          result,
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 3. library_update_paper ───────────────────────────────────────────

  tools.push({
    name: 'library_update_paper',
    description:
      'Update one or more fields of an existing paper in the library. ' +
      'Only provide the fields you want to change.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Paper ID' },
        title: { type: 'string', description: 'Paper title' },
        authors: { type: 'array', items: { type: 'string' }, description: 'Updated author list' },
        abstract: { type: 'string', description: 'Paper abstract' },
        doi: { type: 'string', description: 'Digital Object Identifier' },
        url: { type: 'string', description: 'URL to the paper' },
        arxiv_id: { type: 'string', description: 'arXiv identifier' },
        pdf_path: { type: 'string', description: 'Local PDF path' },
        source: { type: 'string', description: 'Discovery source' },
        source_id: { type: 'string', description: 'Source-specific identifier' },
        venue: { type: 'string', description: 'Publication venue' },
        year: { type: 'number', description: 'Publication year' },
        read_status: { type: 'string', description: 'Reading status (unread, reading, read, reviewed)' },
        rating: { type: 'number', description: 'Rating (1-5)' },
        notes: { type: 'string', description: 'Personal notes' },
        bibtex_key: { type: 'string', description: 'BibTeX citation key' },
        metadata: { type: 'object', description: 'Additional metadata' },
      },
      required: ['id'],
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const id = params.id as string;
        const patch: PaperPatch = {};
        if (params.title !== undefined) patch.title = params.title as string;
        if (params.authors !== undefined) patch.authors = params.authors as string[];
        if (params.abstract !== undefined) patch.abstract = params.abstract as string;
        if (params.doi !== undefined) patch.doi = params.doi as string;
        if (params.url !== undefined) patch.url = params.url as string;
        if (params.arxiv_id !== undefined) patch.arxiv_id = params.arxiv_id as string;
        if (params.pdf_path !== undefined) patch.pdf_path = params.pdf_path as string;
        if (params.source !== undefined) patch.source = params.source as string;
        if (params.source_id !== undefined) patch.source_id = params.source_id as string;
        if (params.venue !== undefined) patch.venue = params.venue as string;
        if (params.year !== undefined) patch.year = params.year as number;
        if (params.read_status !== undefined) patch.read_status = params.read_status as string;
        if (params.rating !== undefined) patch.rating = params.rating as number;
        if (params.notes !== undefined) patch.notes = params.notes as string;
        if (params.bibtex_key !== undefined) patch.bibtex_key = params.bibtex_key as string;
        if (params.metadata !== undefined) patch.metadata = params.metadata as Record<string, unknown>;

        const paper = service.update(id, patch);
        return ok(`Updated paper "${paper.title}" (id: ${paper.id})`, paper);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 4. library_get_paper ──────────────────────────────────────────────

  tools.push({
    name: 'library_get_paper',
    description:
      'Get detailed information about a specific paper by ID, including tags and metadata.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Paper ID' },
      },
      required: ['id'],
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const id = params.id as string;
        const paper = service.get(id);
        if (!paper) {
          return fail(`Paper not found: ${id}`);
        }
        return ok(`Paper: "${paper.title}" by ${paper.authors.join(', ') || 'unknown'}`, paper);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 5. library_export_bibtex ──────────────────────────────────────────

  tools.push({
    name: 'library_export_bibtex',
    description:
      'Export papers as BibTeX entries. Select by paper IDs, tag, collection, or export all.',
    parameters: {
      type: 'object',
      properties: {
        paper_ids: { type: 'array', items: { type: 'string' }, description: 'List of paper IDs to export' },
        tag: { type: 'string', description: 'Export all papers with this tag' },
        collection: { type: 'string', description: 'Export all papers in this collection ID' },
        all: { type: 'boolean', description: 'Export entire library' },
      },
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const result = service.exportBibtex({
          paperIds: (params.paper_ids as string[]) ?? undefined,
          tag: (params.tag as string) ?? undefined,
          collection: (params.collection as string) ?? undefined,
          all: (params.all as boolean) ?? undefined,
        });
        return ok(`Exported ${result.count} paper(s) as BibTeX`, result);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 6. library_reading_stats ──────────────────────────────────────────

  tools.push({
    name: 'library_reading_stats',
    description:
      'Get library statistics including total papers, breakdown by status/year/source, ' +
      'reading time, PDF coverage, and average rating.',
    parameters: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Time period filter (reserved for future use)' },
      },
    },
    execute: async () => {
      try {
        const stats = service.getStats();
        return ok(
          `Library: ${stats.total} papers, ${stats.total_reading_minutes} min reading time, ` +
            `${stats.papers_with_pdf} with PDF` +
            (stats.average_rating != null ? `, avg rating ${stats.average_rating}` : ''),
          stats,
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 7. library_batch_add ──────────────────────────────────────────────

  tools.push({
    name: 'library_batch_add',
    description:
      'Add multiple papers to the library in a single batch (max 100). ' +
      'Returns counts of added papers, duplicates, and errors.',
    parameters: {
      type: 'object',
      properties: {
        papers: {
          type: 'array',
          maxItems: 100,
          description: 'Array of paper objects to add (max 100)',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Paper title' },
              authors: { type: 'array', items: { type: 'string' } },
              abstract: { type: 'string' },
              doi: { type: 'string' },
              url: { type: 'string' },
              arxiv_id: { type: 'string' },
              pdf_path: { type: 'string' },
              source: { type: 'string' },
              source_id: { type: 'string' },
              venue: { type: 'string' },
              year: { type: 'number' },
              notes: { type: 'string' },
              bibtex_key: { type: 'string' },
              metadata: { type: 'object' },
              tags: { type: 'array', items: { type: 'string' } },
            },
            required: ['title'],
          },
        },
      },
      required: ['papers'],
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const papers = params.papers as PaperInput[];
        const result = service.batchAdd(papers);
        const parts: string[] = [`Added ${result.added.length} paper(s)`];
        if (result.duplicates.length > 0) parts.push(`${result.duplicates.length} duplicate(s) skipped`);
        if (result.errors.length > 0) parts.push(`${result.errors.length} error(s)`);
        return ok(parts.join(', '), result);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 8. library_manage_collection ──────────────────────────────────────

  tools.push({
    name: 'library_manage_collection',
    description:
      'Manage paper collections: create, update, delete a collection, ' +
      'or add/remove papers from a collection.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Action: create, update, delete, add_paper, remove_paper' },
        id: { type: 'string', description: 'Collection ID (required for update/delete/add_paper/remove_paper)' },
        name: { type: 'string', description: 'Collection name (for create/update)' },
        description: { type: 'string', description: 'Collection description (for create/update)' },
        color: { type: 'string', description: 'Collection color hex code (for create/update)' },
        paper_ids: { type: 'array', items: { type: 'string' }, description: 'Paper IDs (for add_paper/remove_paper)' },
      },
      required: ['action'],
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const action = params.action as string;
        const result = service.manageCollection(action, {
          id: (params.id as string) ?? undefined,
          name: (params.name as string) ?? undefined,
          description: (params.description as string) ?? undefined,
          color: (params.color as string) ?? undefined,
          paper_ids: (params.paper_ids as string[]) ?? undefined,
        });
        return ok(`Collection ${result.action}: ${result.id}`, result);
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 9. library_tag_paper ──────────────────────────────────────────────

  tools.push({
    name: 'library_tag_paper',
    description: 'Add or remove a tag on a paper.',
    parameters: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: 'Paper ID' },
        tag_name: { type: 'string', description: 'Tag name' },
        action: {
          type: 'string',
          enum: ['add', 'remove'],
          description: 'Whether to add or remove the tag (default: add)',
        },
        color: { type: 'string', description: 'Tag color hex code (only used when adding)' },
      },
      required: ['paper_id', 'tag_name'],
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const paperId = params.paper_id as string;
        const tagName = params.tag_name as string;
        const action = (params.action as string) ?? 'add';
        const color = (params.color as string) ?? undefined;

        let tags: string[];
        if (action === 'remove') {
          tags = service.untag(paperId, tagName);
          return ok(`Removed tag "${tagName}" from paper ${paperId}`, { action: 'removed', paper_id: paperId, tag: tagName, tags });
        }
        tags = service.tag(paperId, tagName, color);
        return ok(`Added tag "${tagName}" to paper ${paperId}`, { action: 'added', paper_id: paperId, tag: tagName, tags });
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 10. library_add_note ──────────────────────────────────────────────

  tools.push({
    name: 'library_add_note',
    description: 'Add a note or annotation to a paper, optionally tied to a specific page or highlight.',
    parameters: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: 'Paper ID' },
        note_text: { type: 'string', description: 'Note content (Markdown supported)' },
        page: { type: 'number', description: 'Page number the note refers to' },
        highlight: { type: 'string', description: 'Highlighted text the note refers to' },
      },
      required: ['paper_id', 'note_text'],
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const paperId = params.paper_id as string;
        const noteText = params.note_text as string;
        const page = (params.page as number) ?? undefined;
        const highlight = (params.highlight as string) ?? undefined;
        const note = service.addNote(paperId, noteText, page, highlight);
        return ok(
          `Added note to paper ${paperId}` +
            (page != null ? ` (page ${page})` : ''),
          note,
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 11. library_import_bibtex ─────────────────────────────────────────

  tools.push({
    name: 'library_import_bibtex',
    description:
      'Import papers from BibTeX content. Parses the BibTeX and adds each entry to the library.',
    parameters: {
      type: 'object',
      properties: {
        bibtex_content: { type: 'string', description: 'BibTeX content to import (one or more @entries)' },
      },
      required: ['bibtex_content'],
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const bibtexContent = params.bibtex_content as string;
        const result = service.importBibtex(bibtexContent);
        return ok(
          `Imported ${result.imported} paper(s), skipped ${result.skipped}`,
          result,
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  // ── 12. library_citation_graph ────────────────────────────────────────

  tools.push({
    name: 'library_citation_graph',
    description:
      'Get the citation graph for a paper. Returns papers that this paper cites ' +
      'and/or papers that cite it. Supports multi-hop traversal up to depth 3.',
    parameters: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: 'Paper ID to get citations for' },
        direction: {
          type: 'string',
          enum: ['citing', 'cited_by', 'both'],
          description: 'Direction: citing, cited_by, or both (default: both)',
        },
        depth: {
          type: 'number',
          minimum: 1,
          maximum: 3,
          description: 'Traversal depth for the citation graph (1-3, default: 1). ' +
            'Depth 1 returns direct citations only. Deeper traversal follows citation ' +
            'chains via BFS.',
        },
      },
      required: ['paper_id'],
    },
    execute: async (params: Record<string, unknown>) => {
      try {
        const paperId = params.paper_id as string;
        const direction = (params.direction as string) ?? 'both';
        const depth = Math.min(Math.max((params.depth as number) ?? 1, 1), 3);

        // Depth-1: current behavior (direct citations)
        const result = service.getCitations(paperId, direction);

        if (depth === 1) {
          const citingCount = result.citing.length;
          const citedByCount = result.cited_by.length;

          return ok(
            `Paper ${paperId}: cites ${citingCount} paper(s), cited by ${citedByCount} paper(s)`,
            { center: paperId, depth, ...result, direction },
          );
        }

        // Depth 2-3: BFS traversal
        // Collect all nodes and edges across hops
        interface GraphNode { paper_id: string; depth: number }
        interface GraphEdge { from: string; to: string }
        const nodes: GraphNode[] = [{ paper_id: paperId, depth: 0 }];
        const edges: GraphEdge[] = [];
        const visited = new Set<string>([paperId]);

        // Add depth-1 results
        for (const c of result.citing) {
          edges.push({ from: paperId, to: c.cited_paper_id });
          if (!visited.has(c.cited_paper_id)) {
            visited.add(c.cited_paper_id);
            nodes.push({ paper_id: c.cited_paper_id, depth: 1 });
          }
        }
        for (const c of result.cited_by) {
          edges.push({ from: c.citing_paper_id, to: paperId });
          if (!visited.has(c.citing_paper_id)) {
            visited.add(c.citing_paper_id);
            nodes.push({ paper_id: c.citing_paper_id, depth: 1 });
          }
        }

        // BFS for depths 2..depth
        for (let d = 2; d <= depth; d++) {
          const frontier = nodes.filter((n) => n.depth === d - 1);
          for (const node of frontier) {
            try {
              const hopResult = service.getCitations(node.paper_id, direction);
              for (const c of hopResult.citing) {
                edges.push({ from: node.paper_id, to: c.cited_paper_id });
                if (!visited.has(c.cited_paper_id)) {
                  visited.add(c.cited_paper_id);
                  nodes.push({ paper_id: c.cited_paper_id, depth: d });
                }
              }
              for (const c of hopResult.cited_by) {
                edges.push({ from: c.citing_paper_id, to: node.paper_id });
                if (!visited.has(c.citing_paper_id)) {
                  visited.add(c.citing_paper_id);
                  nodes.push({ paper_id: c.citing_paper_id, depth: d });
                }
              }
            } catch {
              // Skip papers that can't be found (may be external)
            }
          }
        }

        return ok(
          `Citation graph for ${paperId}: ${nodes.length} node(s), ${edges.length} edge(s), depth ${depth}`,
          { center: paperId, depth, nodes, edges, direction },
        );
      } catch (err) {
        return fail(err instanceof Error ? err.message : String(err));
      }
    },
  });

  return tools;
}
