import {
  DatasetInfo,
  DatasetValidationResult,
  ModelInfo,
  JobStatus,
  ResultsResponse,
  ComparisonResponse,
  EvaluationResponse,
  HardwareMetrics,
  AuditReview
} from '../types';

const BASE_URL = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      if (data.detail) errorMsg = data.detail;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Datasets
  getDatasets: () => request<{ datasets: DatasetInfo[]; active_dataset_id?: string }>('/datasets'),
  registerFolder: (folder_path: string, name?: string) =>
    request<DatasetInfo>('/datasets/register-folder', {
      method: 'POST',
      body: JSON.stringify({ folder_path, name }),
    }),
  validateDataset: (path?: string) =>
    request<DatasetValidationResult>(`/datasets/validate${path ? `?path=${encodeURIComponent(path)}` : ''}`, {
      method: 'POST',
    }),
  setActiveDataset: (dataset_id: string) =>
    request<{ status: string; active_dataset_id: string }>(`/datasets/active/${dataset_id}`, { method: 'POST' }),
  previewTable: (dataset_id: string, table_name: string, page = 1, pageSize = 25, search?: string, country?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      ...(search ? { search } : {}),
      ...(country ? { country } : {}),
    });
    return request<{
      dataset_id: string;
      table_name: string;
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
      rows: Record<string, string>[];
    }>(`/datasets/preview/${dataset_id}/${table_name}?${params}`);
  },

  // Models
  getModels: () => request<{ models: ModelInfo[]; active_model_id?: string }>('/models'),
  getModelDetails: (model_id: string) => request<ModelInfo>(`/models/${model_id}`),
  setActiveModel: (model_id: string) =>
    request<{ status: string; active_model_id: string }>(`/models/active/${model_id}`, { method: 'POST' }),

  // Jobs
  launchJob: (params: {
    job_type: string;
    mode: string;
    sample_size: number;
    top_k: number;
    threshold?: number;
    max_matches?: number;
    dataset_id?: string;
    model_id?: string;
  }) =>
    request<JobStatus>('/jobs', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  getJobs: () => request<{ jobs: JobStatus[] }>('/jobs'),
  getJobStatus: (job_id: string) => request<JobStatus>(`/jobs/${job_id}`),
  getJobLogs: (job_id: string) => request<{ job_id: string; logs: string; status: string }>(`/jobs/${job_id}/logs`),
  cancelJob: (job_id: string) => request<{ status: string; message: string }>(`/jobs/${job_id}/cancel`, { method: 'POST' }),

  // Results
  getResults: (run_id: string, page = 1, pageSize = 25, search?: string, filterType = 'all') => {
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      filter_type: filterType,
      ...(search ? { search } : {}),
    });
    return request<ResultsResponse>(`/results/${run_id}?${params}`);
  },

  // Comparison
  getComparison: (run_id: string, s1_id: string) => request<ComparisonResponse>(`/comparison/${run_id}/${s1_id}`),
  liveCompare: (params: {
    name1: string;
    address1: string;
    country1?: string;
    name2: string;
    address2: string;
    country2?: string;
    threshold?: number;
  }) => request<any>('/comparison/live', { method: 'POST', body: JSON.stringify(params) }),

  // Evaluation
  getEvaluation: () => request<EvaluationResponse>('/evaluation'),

  // Exports
  validateRun: (run_id: string, check_ids = false) =>
    request<{
      passed: boolean;
      exit_code: number;
      stdout: string;
      stderr: string;
      errors: string[];
      warnings: string[];
    }>(`/exports/${run_id}/validate?check_ids=${check_ids}`),
  getMatchingDownloadUrl: (run_id: string) => `${BASE_URL}/exports/${run_id}/matching`,
  getCandidateDownloadUrl: (run_id: string) => `${BASE_URL}/exports/${run_id}/candidate`,
  getPackageDownloadUrl: (run_id: string, team_name = 'EntityMatchTeam') =>
    `${BASE_URL}/exports/${run_id}/package?team_name=${encodeURIComponent(team_name)}`,

  // Audit
  addAuditReview: (data: { run_id: string; source1_id: string; reviewer_name: string; decision: string; notes?: string }) =>
    request<AuditReview>('/audit', { method: 'POST', body: JSON.stringify(data) }),
  getAuditReviews: (run_id: string) => request<AuditReview[]>(`/audit/${run_id}`),

  // Settings
  getSettings: () =>
    request<{
      project_name: string;
      version: string;
      base_dir: string;
      dataset_dir: string;
      storage_dir: string;
      models_dir: string;
      runs_dir: string;
      default_model_path: string;
      default_top_k: number;
      default_threshold: number;
      hardware: HardwareMetrics;
    }>('/settings'),
};
