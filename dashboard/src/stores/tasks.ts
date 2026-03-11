import { create } from 'zustand';

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed';
  assignee: 'human' | 'agent';
  createdAt: string;
  completedAt?: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  deadline?: string;
  priority?: Task['priority'];
  assignee?: Task['assignee'];
}

interface TasksState {
  tasks: Task[];
  loading: boolean;
  total: number;
  perspective: 'all' | 'human' | 'agent';
  showCompleted: boolean;
  sortBy: 'deadline' | 'priority' | 'created_at';

  // Skeleton — awaiting S2 plugin implementation
  loadTasks: () => Promise<void>;
  setPerspective: (p: 'all' | 'human' | 'agent') => void;
  toggleCompleted: () => void;
  completeTask: (id: string) => Promise<void>;
  createTask: (input: TaskInput) => Promise<void>;
}

export const useTasksStore = create<TasksState>()((set) => ({
  tasks: [],
  loading: false,
  total: 0,
  perspective: 'all',
  showCompleted: false,
  sortBy: 'deadline',

  loadTasks: async () => {
    // TODO: S2 — call rc.task.list via gateway
    set({ loading: false });
  },

  setPerspective: (p: 'all' | 'human' | 'agent') => {
    set({ perspective: p });
  },

  toggleCompleted: () => {
    set((s) => ({ showCompleted: !s.showCompleted }));
  },

  completeTask: async (_id: string) => {
    // TODO: S2 — call rc.task.complete via gateway
  },

  createTask: async (_input: TaskInput) => {
    // TODO: S2 — call rc.task.create via gateway
  },
}));
