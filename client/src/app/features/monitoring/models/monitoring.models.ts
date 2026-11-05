/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-11-05
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

/** Development Monitoring contract types (mirror the backend DTOs, camelCase). */

export interface MonitoringEnvelope<T> {
  success: boolean;
  message?: string | null;
  data?: T | null;
  errors?: string[] | null;
}

export interface MonitoringPaged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type MonitoringRole = 'SuperAdmin' | 'Developer' | 'DevOps' | 'SupportEngineer' | 'ReadOnly';

export type MonitoringPermission =
  | 'dashboard.view'
  | 'apiperformance.view'
  | 'logs.view'
  | 'errors.view'
  | 'stacktraces.view'
  | 'tenants.view'
  | 'database.view'
  | 'users.manage'
  | 'audit.view'
  | 'settings.view'
  | 'settings.manage'
  | 'roles.manage';

export interface MonitoringUser {
  monitoringUserId: number;
  fullName: string;
  email: string;
  isActive: boolean;
  isLocked: boolean;
  mustChangePassword: boolean;
  lastLoginDate?: string | null;
  createdDate: string;
  roles: string[];
  permissions: string[];
}

export interface MonitoringLoginData {
  accessToken: string;
  accessTokenExpiresOn: string;
  user: MonitoringUser;
}

// ---- Dashboard --------------------------------------------------------------
export interface DashboardSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseMs: number;
  p95ResponseMs: number;
  totalExceptions: number;
  activeTenants: number;
  slowRequests: number;
}

export interface TimeseriesPoint {
  time: string;
  requests: number;
  errors: number;
  avgMs: number;
  p95Ms: number;
}

export interface Timeseries {
  bucketSeconds: number;
  points: TimeseriesPoint[];
}

export interface SlowApi {
  method: string;
  endpoint: string;
  requests: number;
  avgMs: number;
  p95Ms: number;
}

export interface ErrorApi {
  method: string;
  endpoint: string;
  requests: number;
  errors: number;
}

export interface DashboardBreakdowns {
  byTenant: { tenantId: number; tenantName: string; requests: number }[];
  statusCodes: { statusCode: number; count: number }[];
  slowestApis: SlowApi[];
  errorApis: ErrorApi[];
  bySource: { source: string; count: number }[];
}

// ---- API performance --------------------------------------------------------
export interface EndpointStat {
  method: string;
  endpoint: string;
  requests: number;
  errors: number;
  avgMs: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}

export interface ApiRequestRow {
  eventTime: string;
  tenantId?: number | null;
  method: string;
  endpoint: string;
  statusCode: number;
  responseTimeMs: number;
  correlationId?: string | null;
  requestSource?: string | null;
  applicationVersion?: string | null;
}

// ---- Logs -------------------------------------------------------------------
export interface LogRow {
  eventTime: string;
  tenantId?: number | null;
  eventType: string;
  applicationName?: string | null;
  description?: string | null;
  correlationId?: string | null;
}

// ---- Errors -----------------------------------------------------------------
export interface ErrorGroup {
  fingerprint: string;
  exceptionType: string;
  message: string;
  occurrences: number;
  tenantCount: number;
  environment?: string | null;
  applicationVersion?: string | null;
  firstSeen: string;
  lastSeen: string;
}

export interface ErrorEvent {
  eventTime: string;
  tenantId?: number | null;
  tenantName?: string | null;
  environment?: string | null;
  applicationName?: string | null;
  applicationVersion?: string | null;
  exceptionType: string;
  message: string;
  correlationId?: string | null;
  fingerprint?: string | null;
}

export interface ErrorTrace {
  exceptionType: string;
  message: string;
  stackTrace: string;
}

// ---- Tenants ----------------------------------------------------------------
export interface TenantStat {
  tenantId: number;
  tenantName: string;
  requests: number;
  errors: number;
  errorRate: number;
  avgMs: number;
  p95Ms: number;
  exceptions: number;
}

export interface TenantOverview {
  tenantId: number;
  tenantName: string;
  summary: DashboardSummary;
  timeseries: Timeseries;
  topErrors: { exceptionType: string; message: string; occurrences: number }[];
  slowestApis: SlowApi[];
}

export interface TenantCompareRow {
  tenantId: number;
  tenantName: string;
  requests: number;
  errors: number;
  errorRate: number;
  avgMs: number;
  p95Ms: number;
}

// ---- Database ---------------------------------------------------------------
export interface DatabaseOverview {
  summary: { operations: number; failures: number; avgMs: number; p95Ms: number };
  byDatabase: { databaseName: string; operations: number; failures: number; avgMs: number; p95Ms: number }[];
  slowestOperations: {
    databaseName: string;
    operation: string;
    calls: number;
    avgMs: number;
    p95Ms: number;
    maxMs: number;
  }[];
  timeseries: { time: string; operations: number; failures: number; avgMs: number }[];
}

// ---- Users / roles ----------------------------------------------------------
export interface CreateMonitoringUserRequest {
  fullName: string;
  email: string;
  temporaryPassword: string;
  roles: string[];
}

export interface ResetTokenResult {
  token: string;
  expiresAt: string;
}

export interface MonitoringRoleInfo {
  roleId: number;
  roleName: string;
  description?: string | null;
  isActive: boolean;
  permissions: string[];
}

export interface MonitoringPermissionInfo {
  permissionId: number;
  permissionName: string;
  description?: string | null;
}

// ---- Audit ------------------------------------------------------------------
export interface AuditLogRow {
  id: number;
  monitoringUserId?: number | null;
  userEmail?: string | null;
  action: string;
  description?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

// ---- Settings ---------------------------------------------------------------
export interface MonitoringSetting {
  key: string;
  value: string;
  description?: string | null;
}

export interface MonitoringHealth {
  clickHouse: { healthy: boolean; message: string; latencyMs: number };
  telemetry: { queued: number; dropped: number; sent: number; failedBatches: number };
}
