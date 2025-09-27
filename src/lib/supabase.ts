import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qktmbjmjvrqsnjsqhqwp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdG1iam1qdnJxc25qc3FocXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NDM4NTIsImV4cCI6MjA3NDUxOTg1Mn0.LVmoFOJUOvocxigEtkhre_PdPSE-xKl1JPiBnrUmFqM'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// データベース型定義
export interface Video {
  id: string
  youtube_id: string
  title: string
  description?: string
  duration: number
  thumbnail_url?: string
  created_at: string
  updated_at: string
}

export interface Transcript {
  id: string
  video_id: string
  start_time: number
  end_time: number
  original_text: string
  language_code: string
  created_at: string
  updated_at: string
}

export interface Translation {
  id: string
  video_id: string
  transcript_id: string
  translated_text: string
  target_language: string
  translation_model: string
  created_at: string
  updated_at: string
}

export interface TranslationJob {
  id: string
  video_id: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  target_language: string
  progress: number
  estimated_time?: number
  error_message?: string
  created_at: string
  updated_at: string
}