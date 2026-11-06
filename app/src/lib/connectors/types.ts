export const CONNECTOR_TYPES = [
  "email",
  "slack",
  "teams",
  "zapier",
  "webhook",
  "mcp",
  "google",
  "microsoft",
  "calendar_feed",
] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

export const CONNECTOR_META: Record<
  ConnectorType,
  { label: string; description: string; canNotify: boolean; canCalendar: boolean; oauth?: boolean }
> = {
  email: {
    label: "Email (Smart Capture mailer)",
    description: "Send alerts and briefings to a list of recipients through the platform mailer.",
    canNotify: true,
    canCalendar: false,
  },
  slack: {
    label: "Slack",
    description: "Post alerts into a Slack channel via an incoming webhook URL.",
    canNotify: true,
    canCalendar: false,
  },
  teams: {
    label: "Microsoft Teams",
    description: "Post alerts into a Teams channel via an incoming webhook / Workflows URL.",
    canNotify: true,
    canCalendar: false,
  },
  zapier: {
    label: "Zapier / Make",
    description: "Trigger a Zap or Make scenario with a structured JSON payload.",
    canNotify: true,
    canCalendar: false,
  },
  webhook: {
    label: "Custom webhook",
    description: "POST a signed JSON payload to any HTTPS endpoint (CRM, ticketing, your own service).",
    canNotify: true,
    canCalendar: false,
  },
  mcp: {
    label: "MCP server",
    description: "Connect a remote Model Context Protocol server so the assistant and automations can use its tools.",
    canNotify: false,
    canCalendar: false,
  },
  google: {
    label: "Google Workspace",
    description: "Send email from Gmail and add deadlines to Google Calendar.",
    canNotify: true,
    canCalendar: true,
    oauth: true,
  },
  microsoft: {
    label: "Microsoft 365",
    description: "Send email from Outlook and add deadlines to the Outlook calendar.",
    canNotify: true,
    canCalendar: true,
    oauth: true,
  },
  calendar_feed: {
    label: "Calendar feed (ICS)",
    description: "Subscribe any calendar (Google, Outlook, Apple) to your pursuit and track-list deadlines.",
    canNotify: false,
    canCalendar: false,
  },
};

export interface McpToolInfo {
  name: string;
  description?: string;
  /** Compact JSON Schema of the tool arguments (truncated). */
  inputSchema?: string;
}

/** Public (non-secret) connector shape returned to clients. */
export interface ConnectorView {
  id: string;
  type: ConnectorType;
  name: string;
  status: "active" | "error" | "disabled";
  config: {
    recipients?: string[];
    urlHint?: string;
    account?: string;
    tools?: McpToolInfo[];
    allowAssistant?: boolean;
    allowedTools?: string[];
    feedUrl?: string;
  };
  last_tested_at: string | null;
  last_error: string | null;
  created_by: string;
  created_at: string;
}

export interface ConnectorSecret {
  url?: string;
  headers?: Record<string, string>;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface NotificationMessage {
  subject: string;
  /** Plain-text body (also used for chat posts). */
  text: string;
  html?: string;
  /** Structured payload for webhooks / Zapier. */
  data?: Record<string, unknown>;
  /** Override recipients for email-capable connectors. */
  to?: string[];
}

export interface CalendarEventInput {
  title: string;
  description: string;
  /** ISO date or datetime; created as an all-day event on that date. */
  date: string;
  url?: string;
}
