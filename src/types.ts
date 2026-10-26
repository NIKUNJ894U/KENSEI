export interface SubTask {
  id: string;
  title: string;
  duration: number; // in minutes
  completed: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string; // Hex code or label color
}

export interface Task {
  id: string;
  title: string;
  description: string;
  urgencyScore: number; // 0 to 10
  dueDate: string; // ISO date string
  category: string; // e.g. Work/Academics, Finance, Personal
  criticality: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffort: string;
  immediateNextStep: string;
  completed: boolean;
  completedAt?: string; // ISO date string when task was completed
  createdAt: string;
  steps: SubTask[];
  draft: string | null;
  draftIssuedAt?: string;
  focusBlocks: string[]; // List of formatted times, e.g. ["2026-06-25 14:00 - 14:30"]
  alertSent1h?: boolean;
  tags?: string[]; // Tag IDs
}

export interface UserProfile {
  name: string;
  accountType: string;
  integrations: string[]; // ["Google Calendar", "System Push Notifications"]
  focusMode: boolean;
  avatar?: string;
  alertTone?: string;
  customTags?: Tag[]; // Custom color-coded tag labels
  fontSize?: 'small' | 'normal' | 'large' | 'huge';
}

export interface DBState {
  tasks: Task[];
  profile: UserProfile;
  users?: {
    [emailOrId: string]: {
      tasks: Task[];
      profile: UserProfile;
    };
  };
}
