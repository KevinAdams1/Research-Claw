import { create } from 'zustand';

export type ReadStatus = 'unread' | 'reading' | 'read' | 'reviewed';

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  abstract?: string;
  doi?: string;
  tags: string[];
  status: ReadStatus;
  rating?: number;
  addedAt: string;
  source?: string;
}

export interface Tag {
  name: string;
  count: number;
}

export interface PaperFilter {
  status?: ReadStatus;
  tags?: string[];
  yearMin?: number;
  yearMax?: number;
  sort?: 'added_at' | 'year' | 'title';
}

interface LibraryState {
  papers: Paper[];
  tags: Tag[];
  loading: boolean;
  total: number;
  searchQuery: string;
  activeTab: 'pending' | 'saved';
  filters: PaperFilter;

  // Skeleton — awaiting S2 plugin implementation
  loadPapers: (filter?: PaperFilter) => Promise<void>;
  loadTags: () => Promise<void>;
  setSearchQuery: (q: string) => void;
  setActiveTab: (tab: 'pending' | 'saved') => void;
  updatePaperStatus: (id: string, status: ReadStatus) => Promise<void>;
  ratePaper: (id: string, rating: number) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>()((set) => ({
  papers: [],
  tags: [],
  loading: false,
  total: 0,
  searchQuery: '',
  activeTab: 'pending',
  filters: {},

  loadPapers: async (_filter?: PaperFilter) => {
    // TODO: S2 — call rc.lit.list via gateway
    set({ loading: false });
  },

  loadTags: async () => {
    // TODO: S2 — call rc.lit.tags via gateway
  },

  setSearchQuery: (q: string) => {
    set({ searchQuery: q });
  },

  setActiveTab: (tab: 'pending' | 'saved') => {
    set({ activeTab: tab });
  },

  updatePaperStatus: async (_id: string, _status: ReadStatus) => {
    // TODO: S2 — call rc.lit.status via gateway
  },

  ratePaper: async (_id: string, _rating: number) => {
    // TODO: S2 — call rc.lit.rate via gateway
  },
}));
