// Database Types
export type UserRole = 'candidate' | 'employer' | 'admin'
export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship'
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
export type ApplicationStatus = 'new' | 'shortlisted' | 'interview' | 'offer' | 'rejected'
export type JobStatus = 'draft' | 'published' | 'closed'
export type WorkType = 'onsite' | 'remote' | 'hybrid'
export type EmployerRole = 'owner' | 'member'

// User & Profile Types
export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  headline: string | null
  location: string | null
  about: string | null
  created_at: string
}

export interface CandidateProfile {
  user_id: string
  years_experience: number | null
  salary_min: number | null
  salary_max: number | null
  work_type: WorkType[]
  skills: string[]
  resume_url: string | null
  visible: boolean
  embedding: number[] | null
}

export interface Employer {
  id: string
  owner_id: string
  name: string
  website: string | null
  logo_url: string | null
  verified: boolean
  created_at: string
}

export interface EmployerMember {
  employer_id: string
  user_id: string
  role: EmployerRole
}

// Job & Application Types
export interface Job {
  id: string
  employer_id: string
  title: string
  description: string
  skills: string[]
  location: string | null
  remote: boolean
  job_type: JobType
  experience_level: ExperienceLevel | null
  salary_min: number | null
  salary_max: number | null
  status: JobStatus
  created_at: string
  embedding: number[] | null
  employer?: Employer
}

export interface Application {
  id: string
  job_id: string
  candidate_id: string
  cover_letter: string | null
  status: ApplicationStatus
  created_at: string
  job?: Job
  candidate?: Profile
}

export interface Match {
  id: string
  job_id: string
  candidate_id: string
  match_score: number
  explanation: string | null
  top_missing_skills: string[]
  created_at: string
  job?: Job
  candidate?: Profile & { candidate_profile?: CandidateProfile }
}

export interface Message {
  id: string
  application_id: string
  sender_id: string
  body: string
  created_at: string
  sender?: Profile
}

// Form Types
export interface JobFormData {
  title: string
  description: string
  skills: string[]
  location: string
  remote: boolean
  job_type: JobType
  experience_level: ExperienceLevel
  salary_min: number | null
  salary_max: number | null
}

export interface CandidateProfileFormData {
  full_name: string
  headline: string
  location: string
  about: string
  years_experience: number
  salary_min: number | null
  salary_max: number | null
  work_type: WorkType[]
  skills: string[]
  visible: boolean
}

export interface EmployerFormData {
  name: string
  website: string
}

// API Response Types
export interface PaginatedResponse<T> {
  data: T[]
  count: number | null
  page: number
  pageSize: number
}

export interface SearchFilters {
  query?: string
  location?: string
  remote?: boolean
  job_type?: JobType[]
  experience_level?: ExperienceLevel[]
  salary_min?: number
  salary_max?: number
  skills?: string[]
}

export interface MatchingResult {
  candidate_id: string
  score: number
  explanation: string
  top_missing_skills: string[]
}

export interface EmbeddingResponse {
  success: boolean
  embedding?: number[]
  error?: string
}

// Auth Types
export interface AuthUser {
  id: string
  email: string
  profile?: Profile
}

// Component Props Types
export interface ScoreBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export interface MatchRowProps {
  match: Match
  onViewDetails: () => void
  onToggleExplanation?: () => void
  showExplanation?: boolean
}

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type WithId<T> = T & { id: string }
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>
export type UpdateInput<T> = Partial<CreateInput<T>>

// Error Types
export interface APIError {
  message: string
  status?: number
  code?: string
}

// Constants
export const ROLES = {
  CANDIDATE: 'candidate' as const,
  EMPLOYER: 'employer' as const,
  ADMIN: 'admin' as const,
}

export const JOB_TYPES = {
  FULL_TIME: 'full-time' as const,
  PART_TIME: 'part-time' as const,
  CONTRACT: 'contract' as const,
  INTERNSHIP: 'internship' as const,
}

export const APPLICATION_STATUSES = {
  NEW: 'new' as const,
  SHORTLISTED: 'shortlisted' as const,
  INTERVIEW: 'interview' as const,
  OFFER: 'offer' as const,
  REJECTED: 'rejected' as const,
}

export const WORK_TYPES = {
  ONSITE: 'onsite' as const,
  REMOTE: 'remote' as const,
  HYBRID: 'hybrid' as const,
}

export const EXPERIENCE_LEVELS = {
  ENTRY: 'entry' as const,
  MID: 'mid' as const,
  SENIOR: 'senior' as const,
  LEAD: 'lead' as const,
  EXECUTIVE: 'executive' as const,
}