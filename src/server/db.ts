import fs from 'fs';
import path from 'path';
import { DBState, Task, UserProfile } from '../types';

const DB_FILE = path.join(process.cwd(), 'db.json');

const DEFAULT_PROFILE: UserProfile = {
  name: "Nikunj Singhal",
  accountType: "Premium AI Tier",
  integrations: ["Google Calendar", "System Push Notifications"],
  focusMode: false
};

const DEFAULT_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Pay Internet Bill",
    description: "Avoid service disconnection. The deadline is rigid and there's no grace period.",
    urgencyScore: 9.5,
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    category: "Finance",
    criticality: "critical",
    estimatedEffort: "10 mins",
    immediateNextStep: "Open payment portal app right now.",
    completed: false,
    createdAt: new Date().toISOString(),
    steps: [
      { id: "step-1-1", title: "Find the billing email for account number", duration: 2, completed: false },
      { id: "step-1-2", title: "Open bank or portal to submit transfer", duration: 5, completed: false },
      { id: "step-1-3", title: "Save receipt screenshot for proof", duration: 3, completed: false }
    ],
    draft: "Hi support team,\n\nI have successfully processed the payment for my internet bill today. Please find the attached payment confirmation to ensure uninterrupted service.\n\nThank you,\nNikunj Singhal",
    focusBlocks: []
  },
  {
    id: "task-2",
    title: "Finalize Project Submission",
    description: "Submit the final draft of the marketing campaign proposal. Needs polishing and PDF conversion.",
    urgencyScore: 7.2,
    dueDate: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(), // 30 hours from now (tomorrow)
    category: "Work/Academics",
    criticality: "high",
    estimatedEffort: "1.5 hours",
    immediateNextStep: "Review final section edits and run PDF compiler.",
    completed: false,
    createdAt: new Date().toISOString(),
    steps: [
      { id: "step-2-1", title: "Review marketing brief alignment", duration: 20, completed: false },
      { id: "step-2-2", title: "Polishing spelling and flow of executive summary", duration: 30, completed: false },
      { id: "step-2-3", title: "Compile final documents to PDF", duration: 15, completed: false }
    ],
    draft: null,
    focusBlocks: []
  },
  {
    id: "seed-completed-1",
    title: "Review Server Migration Log",
    description: "Audit database access configurations and network ingress parameters.",
    urgencyScore: 8.8,
    dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Work/Academics",
    criticality: "high",
    estimatedEffort: "45 mins",
    immediateNextStep: "All steps completed! Polish & submit.",
    completed: true,
    completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    steps: [
      { id: "step-sc1-1", title: "Download system access logs", duration: 15, completed: true },
      { id: "step-sc1-2", title: "Verify SSL handshake configurations", duration: 30, completed: true }
    ],
    draft: null,
    focusBlocks: []
  },
  {
    id: "seed-completed-2",
    title: "Renew Domain Certification",
    description: "Update critical security credentials on the cloud cluster portal.",
    urgencyScore: 9.2,
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Finance",
    criticality: "critical",
    estimatedEffort: "20 mins",
    immediateNextStep: "All steps completed! Polish & submit.",
    completed: true,
    completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    steps: [],
    draft: null,
    focusBlocks: []
  },
  {
    id: "seed-completed-3",
    title: "Draft Q2 Budget Overview",
    description: "Align core expenditures and marketing operational parameters.",
    urgencyScore: 6.5,
    dueDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Finance",
    criticality: "medium",
    estimatedEffort: "2 hours",
    immediateNextStep: "All steps completed! Polish & submit.",
    completed: true,
    completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    steps: [],
    draft: null,
    focusBlocks: []
  },
  {
    id: "seed-completed-4",
    title: "Submit Expense Reimbursements",
    description: "Collate receipts for client dinners and cloud hosting billings.",
    urgencyScore: 5.0,
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Finance",
    criticality: "low",
    estimatedEffort: "30 mins",
    immediateNextStep: "All steps completed! Polish & submit.",
    completed: true,
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    steps: [],
    draft: null,
    focusBlocks: []
  },
  {
    id: "seed-completed-5",
    title: "Synchronize Team Calendar Tasks",
    description: "Import upcoming milestone blocks and shared action goals.",
    urgencyScore: 7.0,
    dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    category: "Work/Academics",
    criticality: "medium",
    estimatedEffort: "40 mins",
    immediateNextStep: "All steps completed! Polish & submit.",
    completed: true,
    completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    steps: [],
    draft: null,
    focusBlocks: []
  }
];

export function readDB(): DBState {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initialState: DBState = {
        tasks: DEFAULT_TASKS,
        profile: DEFAULT_PROFILE
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialState, null, 2));
      return initialState;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as DBState;
  } catch (error) {
    console.error("Error reading db file, returning fallback state:", error);
    return {
      tasks: DEFAULT_TASKS,
      profile: DEFAULT_PROFILE
    };
  }
}

export function writeDB(state: DBState): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error("Error writing db file:", error);
  }
}

export interface UserPartition {
  tasks: Task[];
  profile: UserProfile;
}

export function readDBState(userKey: string = 'guest'): UserPartition {
  const db = readDB();
  
  if (!db.users) {
    db.users = {};
  }
  
  // Migrate legacy data to guest if guest partition does not exist
  if (!db.users['guest'] && db.tasks && db.profile) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const migratedName = db.profile.name === "Nikunj Singhal" ? `Guest-${randomSuffix}` : db.profile.name;
    db.users['guest'] = {
      tasks: db.tasks,
      profile: {
        ...db.profile,
        name: migratedName
      }
    };
  } else if (db.users['guest'] && db.users['guest'].profile && db.users['guest'].profile.name === "Nikunj Singhal") {
    // Also migrate existing guest if it's still named Nikunj Singhal
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    db.users['guest'].profile.name = `Guest-${randomSuffix}`;
    writeDB(db);
  }
  
  if (!db.users[userKey]) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    db.users[userKey] = {
      tasks: userKey === 'guest' ? [...DEFAULT_TASKS] : [],
      profile: { 
        ...DEFAULT_PROFILE, 
        name: userKey === 'guest' ? `Guest-${randomSuffix}` : userKey.split('@')[0]
      }
    };
    // Persist initialization
    writeDB(db);
  }
  
  return db.users[userKey];
}

export function writeDBState(userKey: string = 'guest', partition: UserPartition): void {
  const db = readDB();
  if (!db.users) {
    db.users = {};
  }
  db.users[userKey] = partition;
  
  // Keep legacy fields in sync for guest
  if (userKey === 'guest') {
    db.tasks = partition.tasks;
    db.profile = partition.profile;
  }
  
  writeDB(db);
}
