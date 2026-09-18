export interface ApiError {
  code: string;
  message: string;
}

export interface ErrorPresentation {
  headline: string;
  detail: string;
  isRetryable: boolean;
  keepsSelection: boolean;
}
