import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qktmbjmjvrqsnjsqhqwp.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrdG1iam1qdnJxc25qc3FocXdwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0Mzg1MiwiZXhwIjoyMDc0NTE5ODUyfQ.kJf_NleApX5ewPbuBgVU3FKly80FnrZzSC8u_6A5ePs'

// バックエンド用Supabaseクライアント（SERVICE_ROLE_KEY使用）
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

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
}

export interface Translation {
  id: string
  video_id: string
  transcript_id: string
  translated_text: string
  target_language: string
  translation_model: string
  created_at: string
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

export interface Memo {
  id: string
  video_id: string
  content: string
  timestamp_seconds?: number
  created_at: string
  updated_at: string
}