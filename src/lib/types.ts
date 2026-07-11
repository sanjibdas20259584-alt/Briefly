// Central domain types. Mirrored from supabase/migrations/0001_init.sql.

export type ClientStatus = "active" | "lead" | "inactive";
export type ProjectStatus = "idea" | "active" | "waiting" | "completed" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "urgent";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type ProposalStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "archived";
export type ReminderRepeat = "none" | "daily" | "weekly" | "monthly";
export type ReminderStatus = "pending" | "done" | "skipped";
export type ReminderRelatedType = "client" | "project" | "invoice" | "proposal";
export type ChatRole = "user" | "assistant" | "system";
export type DeliveryStatus = "sent" | "failed";

export interface UserProfile {
  id: string;
  full_name: string | null;
  created_at: string;
}

export type ThemePreference = "light" | "dark" | "system";

export interface AppSettings {
  user_id: string;
  owner_name: string;
  telegram_chat_id: string | null;
  telegram_bot_token_enc: string | null;
  theme: ThemePreference;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  social: Record<string, string>;
  notes: string | null;
  status: ClientStatus;
  tags: string[];
  favorite: boolean;
  last_contact_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
  due?: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string | null;
  due_date: string | null;
  progress: number;
  proposal_id: string | null;
  checklist: ChecklistItem[];
  milestones: Milestone[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: number;
  rate: number;
  subtotal: number;
  position: number;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  tax_rate: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  payment_notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProposalItem {
  id: string;
  proposal_id: string;
  description: string | null;
  amount: number;
  position: number;
}

export interface Proposal {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  scope: string | null;
  timeline: string | null;
  pricing: string | null;
  terms: string | null;
  status: ProposalStatus;
  acceptance_status: "pending" | "accepted" | "rejected" | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  note: string | null;
  due_at: string;
  repeat: ReminderRepeat;
  related_type: ReminderRelatedType | null;
  related_id: string | null;
  status: ReminderStatus;
  last_sent_at: string | null;
  created_at: string;
}

export interface TelegramDeliveryLog {
  id: string;
  user_id: string;
  reminder_id: string | null;
  chat_id: string | null;
  message: string | null;
  status: DeliveryStatus;
  error: string | null;
  sent_at: string;
}

export interface ChatbotMessage {
  id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  provider_id: string | null;
  model: string | null;
  created_at: string;
}

// Provider shape returned to the client — never includes the encrypted key.
export interface ModelProviderPublic {
  id: string;
  user_id: string;
  name: string;
  base_url: string;
  model_name: string;
  headers: Record<string, string>;
  is_default: boolean;
  has_key: boolean;
  created_at: string;
}

export interface ModelProviderRow extends Omit<ModelProviderPublic, "has_key"> {
  api_key_enc: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  client_id: string | null;
  project_id: string | null;
  title: string | null;
  body: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string | null;
  created_at: string;
}

// Google Drive
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  trashed?: boolean;
}

export interface GoogleDriveFileList {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

export interface GoogleDriveAbout {
  user: { displayName: string; emailAddress: string };
  storageQuota: { limit: string; usage: string };
}

// AI Memory
export type MemoryCategory = 'general' | 'project' | 'client' | 'preference' | 'instruction' | 'fact' | 'goal';

export interface AiMemory {
  id: string;
  user_id: string;
  category: MemoryCategory;
  content: string;
  importance: number;
  source: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}
