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
  currency: string;
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
  template_id: string | null;
  time_estimate: number | null;
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

// Time Tracking
export interface TimeEntry {
  id: string;
  user_id: string;
  project_id: string | null;
  task: string | null;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  duration: number | null; // seconds
  billable: boolean;
  rate: number | null;
  created_at: string;
}

// Project Templates
export interface ProjectTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  checklist: ChecklistItem[];
  milestones: Milestone[];
  created_at: string;
}

// Expenses
export type ExpenseCategory =
  | "software"
  | "hardware"
  | "travel"
  | "office"
  | "marketing"
  | "professional"
  | "utilities"
  | "insurance"
  | "tax"
  | "other";

export interface Expense {
  id: string;
  user_id: string;
  client_id: string | null;
  project_id: string | null;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  receipt_url: string | null;
  notes: string | null;
  currency: string;
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

// Calendar
export interface CalendarEvent {
  id: string;
  user_id: string;
  client_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  color: string | null;
  reminder: boolean;
  created_at: string;
}

// Interactions
export type InteractionType = "call" | "email" | "meeting" | "whatsapp" | "note" | "other";

export interface Interaction {
  id: string;
  user_id: string;
  client_id: string | null;
  type: InteractionType;
  subject: string | null;
  content: string | null;
  duration: number | null;
  outcome: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Custom Fields
export type CustomFieldType = "text" | "number" | "date" | "select" | "checkbox";

export interface CustomField {
  id: string;
  user_id: string;
  entity_type: string;
  field_name: string;
  field_type: CustomFieldType;
  options: string[] | null;
  position: number;
  created_at: string;
}

export interface CustomFieldValue {
  id: string;
  user_id: string;
  field_id: string;
  entity_id: string;
  value: string | null;
  created_at: string;
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

export interface FileAttachment {
  id: string;
  user_id: string;
  entity_type: "client" | "project" | "invoice" | "proposal";
  entity_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  folder: string | null;
  version: number;
  created_at: string;
}

export interface PortalToken {
  id: string;
  user_id: string;
  client_id: string | null;
  token: string;
  expires_at: string | null;
  created_at: string;
}

// Automation
export type TriggerType =
  | "invoice_overdue"
  | "project_completed"
  | "client_inactive"
  | "reminder_due"
  | "custom";

export type ActionType =
  | "send_telegram"
  | "create_reminder"
  | "update_status"
  | "send_email"
  | "webhook";

export interface AutomationRule {
  id: string;
  user_id: string;
  name: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown> | null;
  action_type: ActionType;
  action_config: Record<string, unknown> | null;
  enabled: boolean;
  last_run: string | null;
  created_at: string;
}
