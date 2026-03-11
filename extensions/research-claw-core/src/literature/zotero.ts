/**
 * Zotero Bridge — Read-only import from local Zotero SQLite database.
 *
 * This module provides one-way import from the user's local Zotero database
 * (~/.zotero/) into the Research-Claw library. It is read-only and never
 * modifies the Zotero database.
 *
 * Status: Placeholder — full implementation deferred to P1.
 * See docs/modules/03a-literature-library.md §6 for the full spec.
 */

export interface ZoteroItem {
  title: string;
  authors: string[];
  doi?: string;
  url?: string;
  year?: number;
  venue?: string;
  abstract?: string;
  bibtex_key?: string;
}

export class ZoteroBridge {
  private readonly dbPath: string | null;

  constructor(zoteroDataDir?: string) {
    // Default Zotero data directory locations:
    // macOS: ~/Zotero/zotero.sqlite
    // Linux: ~/Zotero/zotero.sqlite
    // Windows: %USERPROFILE%\Zotero\zotero.sqlite
    this.dbPath = zoteroDataDir ?? null;
  }

  /**
   * Check if a Zotero database is available at the configured path.
   */
  isAvailable(): boolean {
    // Placeholder: always returns false until P1 implementation
    return false;
  }

  /**
   * Import all items from the Zotero database.
   * Returns parsed items ready for insertion into rc_papers.
   */
  importAll(): ZoteroItem[] {
    // Placeholder: returns empty array until P1 implementation
    return [];
  }

  /**
   * Import items matching a search query from Zotero.
   */
  search(_query: string): ZoteroItem[] {
    // Placeholder: returns empty array until P1 implementation
    return [];
  }
}
