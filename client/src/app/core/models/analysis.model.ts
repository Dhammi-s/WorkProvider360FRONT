/* =============================================================================
   WorkProvider360 - Multi-tenant SaaS platform
   Developed by : Jasmeet Singh  (Full Stack Software Engineer)
   Date         : 2026-10-22
   NOTE TO DEVELOPERS: Do NOT change functionality without full knowledge of the
   SaaS architecture. PLEASE FIRST DISCUSS WITH SOFTWARE ENGINEER JASMEET SINGH.
   ============================================================================= */

export type AnalysisAccessLevel = 'None' | 'Read' | 'Write';

export interface AnalysisAccess {
  accessLevel: AnalysisAccessLevel;
  isSuperAdmin: boolean;
  canView: boolean;
  canRun: boolean;
  canShare: boolean;
  canManageSettings: boolean;
}

export interface AnalysisSettings {
  adminAccess: AnalysisAccessLevel;
  managerAccess: AnalysisAccessLevel;
  dailyReportEnabled: boolean;
  dailyReportModules: string[];
  dailyCcAdmins: boolean;
  dailyCcManagers: boolean;
  lastScheduledRunDate?: string | null;
  dailyRunUtc: string;
  updatedOn: string;
}

export interface UpdateAnalysisSettings {
  adminAccess: AnalysisAccessLevel;
  managerAccess: AnalysisAccessLevel;
  dailyReportEnabled: boolean;
  dailyReportModules: string[];
  dailyCcAdmins: boolean;
  dailyCcManagers: boolean;
}

export interface AnalysisModule {
  key: string;
  title: string;
  description: string;
  category: 'Agency' | 'Product';
  icon: string;
  model: string;
}

export interface RunAnalysisRequest {
  modules: string[];
  lookbackDays: number;
  horizonDays: number;
  title?: string | null;
}

export type KpiTone = 'good' | 'warn' | 'bad' | 'neutral';

export interface AnalysisKpi {
  label: string;
  value: string;
  hint?: string | null;
  trend: 'up' | 'down' | 'flat';
  tone: KpiTone;
}

export type AnalysisChartType = 'line' | 'bar' | 'hbar' | 'pie' | 'donut';

export interface AnalysisSeries {
  name: string;
  values: (number | null)[];
  color: string;
  isForecast: boolean;
  isBand: boolean;
  colors?: string[] | null;
}

export interface AnalysisChart {
  type: AnalysisChartType;
  title: string;
  subtitle?: string | null;
  unit?: string | null;
  labels: string[];
  series: AnalysisSeries[];
  forecastStart?: number | null;
}

export interface AnalysisInsight {
  severity: 'info' | 'positive' | 'warning' | 'critical';
  text: string;
}

export interface AnalysisTable {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface AnalysisModelInfo {
  name: string;
  method: 'NeuralNetwork' | 'Baseline' | 'Statistical';
  architecture: string;
  parameters: number;
  epochs: number;
  trainingSamples: number;
  metric: string;
  metricValue: number;
  confidence: number;
}

export interface AnalysisSection {
  key: string;
  title: string;
  icon: string;
  score: number;
  status: 'Healthy' | 'Watch' | 'Critical';
  summary: string;
  kpis: AnalysisKpi[];
  charts: AnalysisChart[];
  insights: AnalysisInsight[];
  recommendations: string[];
  tables: AnalysisTable[];
  models: AnalysisModelInfo[];
}

export interface AnalysisNetwork {
  modelsTrained: number;
  neuralModels: number;
  totalParameters: number;
  totalEpochs: number;
  trainingSamples: number;
  averageConfidence: number;
}

export interface AnalysisResult {
  reportId: number;
  title: string;
  agencyName: string;
  runType: 'Manual' | 'Scheduled';
  modules: string[];
  lookbackDays: number;
  horizonDays: number;
  healthScore: number;
  healthLabel: string;
  summary: string;
  highlights: string[];
  kpis: AnalysisKpi[];
  sections: AnalysisSection[];
  network: AnalysisNetwork;
  durationMs: number;
  createdByName?: string | null;
  createdOn: string;
  dataFrom: string;
  dataTo: string;
  shareCount: number;
}

export interface AnalysisReportSummary {
  reportId: number;
  title: string;
  runType: 'Manual' | 'Scheduled';
  modules: string[];
  lookbackDays: number;
  horizonDays: number;
  healthScore: number;
  summary?: string | null;
  durationMs: number;
  createdByName?: string | null;
  createdOn: string;
  shareCount: number;
}

export interface AnalysisRecipient {
  userId: number;
  fullName: string;
  email: string;
  roleName: string;
  officeName?: string | null;
}

export interface ShareAnalysisRequest {
  userIds: number[];
  message?: string | null;
  pdfBase64?: string | null;
}

export interface AnalysisShareResult {
  sent: number;
  failed: number;
  failedRecipients: string[];
}
