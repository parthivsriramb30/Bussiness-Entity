export interface DatasetInfo {
  id: string;
  name: string;
  path: string;
  status: 'ready' | 'incomplete' | 'placeholder' | 'error';
  checksum?: string;
  train_records: number;
  test_records: number;
  record_counts: Record<string, number>;
  country_counts: Record<string, number>;
  validation_errors: string[];
  is_active: boolean;
  created_at?: string;
}

export interface TSVFileStats {
  name: string;
  exists: boolean;
  size_bytes: number;
  size_mb: number;
  row_count: number;
  is_placeholder: boolean;
  missing_fields_count: number;
  has_valid_header: boolean;
  sample_preview: Record<string, string>[];
}

export interface DatasetValidationResult {
  status: 'ready' | 'incomplete' | 'placeholder' | 'error';
  message: string;
  is_placeholder_detected: boolean;
  files: Record<string, TSVFileStats>;
  total_train_rows: number;
  total_test_rows: number;
  countries_detected: string[];
  has_france: boolean;
  warnings: string[];
  errors: string[];
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  path: string;
  file_hash?: string;
  threshold: number;
  feature_count: number;
  feature_names: string[];
  n_estimators?: number;
  is_active: boolean;
  metadata: Record<string, any>;
  created_at?: string;
}

export interface JobStatus {
  id: string;
  job_type: 'inference' | 'training' | 'evaluation' | 'import';
  mode: 'sample' | 'full';
  sample_size?: number;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';
  stage: string;
  progress: number;
  processed_count: number;
  total_count: number;
  dataset_id?: string;
  model_id?: string;
  run_dir?: string;
  error_message?: string;
  config: Record<string, any>;
  memory_mb: number;
  cpu_percent: number;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
}

export interface ResultRow {
  source1_entity_id: string;
  business_name?: string;
  business_address?: string;
  country?: string;
  matched_entity_ids: string[];
  match_count: number;
  candidate_entity_ids: string[];
  candidate_count: number;
  top_score?: number;
  is_singleton: boolean;
}

export interface ResultsResponse {
  run_id: string;
  total_records: number;
  matched_records: number;
  singleton_records: number;
  page: number;
  page_size: number;
  total_pages: number;
  rows: ResultRow[];
}

export interface CandidateComparisonItem {
  cand_id: string;
  cand_name: string;
  cand_addr: string;
  cand_country: string;
  score: number;
  threshold: number;
  is_match: boolean;
  features: Record<string, number>;
}

export interface ComparisonResponse {
  run_id: string;
  s1_id: string;
  s1_name: string;
  s1_addr: string;
  s1_country: string;
  candidates: CandidateComparisonItem[];
}

export interface ThresholdPoint {
  threshold: number;
  macro_f_beta: number;
  singleton_accuracy: number;
  precision: number;
  recall: number;
}

export interface CountryMetrics {
  country: string;
  total_entities: number;
  macro_f_beta: number;
  singleton_accuracy: number;
  matched_rate: number;
}

export interface EvaluationResponse {
  dataset_name: string;
  model_version: string;
  evaluated_entities: number;
  macro_f_beta: number;
  singleton_accuracy: number;
  singleton_count: number;
  non_singleton_count: number;
  reduction_ratio: number;
  candidate_recall: number;
  optimal_threshold: number;
  threshold_sweep: ThresholdPoint[];
  country_breakdown: CountryMetrics[];
  is_held_out: boolean;
}

export interface HardwareMetrics {
  cpu_percent: number;
  cpu_cores: number;
  total_ram_gb: number;
  available_ram_gb: number;
  used_ram_gb: number;
  ram_percent: number;
  disk_free_gb: number;
  disk_total_gb: number;
  device_mode: string;
  gpu_detected: boolean;
  gpu_info: string;
}

export interface AuditReview {
  id: string;
  run_id: string;
  source1_id: string;
  reviewer_name: string;
  decision: string;
  notes?: string;
  created_at: string;
}
