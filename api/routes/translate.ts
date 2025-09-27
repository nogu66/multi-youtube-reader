import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

/**
 * GET /api/translate/status/:jobId
 * 翻訳ジョブのステータスを取得
 */
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' })
    }

    // 翻訳ジョブの情報を取得
    const { data: job, error: jobError } = await supabaseAdmin
      .from('translation_jobs')
      .select(`
        *,
        videos (
          id,
          youtube_id,
          title,
          duration
        )
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return res.status(404).json({ error: 'Translation job not found' })
    }

    // 推定残り時間を計算（簡単な計算）
    let estimatedTimeRemaining = null
    if (job.status === 'processing' && job.progress > 0) {
      const elapsedTime = new Date().getTime() - new Date(job.created_at).getTime()
      const totalEstimatedTime = (elapsedTime / job.progress) * 100
      estimatedTimeRemaining = Math.max(0, totalEstimatedTime - elapsedTime)
    }

    res.json({
      id: job.id,
      status: job.status,
      progress: job.progress,
      targetLanguage: job.target_language,
      estimatedTimeRemaining,
      errorMessage: job.error_message,
      video: job.videos,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    })

  } catch (error) {
    console.error('Error fetching translation status:', error)
    res.status(500).json({ error: 'Failed to fetch translation status' })
  }
})

/**
 * GET /api/translate/jobs
 * 全ての翻訳ジョブを取得（最新順）
 */
router.get('/jobs', async (req, res) => {
  try {
    const { limit = 20, offset = 0, status } = req.query

    let query = supabaseAdmin
      .from('translation_jobs')
      .select(`
        *,
        videos (
          id,
          youtube_id,
          title,
          thumbnail_url,
          duration
        )
      `)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1)

    // ステータスでフィルタリング
    if (status && typeof status === 'string') {
      query = query.eq('status', status)
    }

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      throw new Error('Failed to fetch translation jobs')
    }

    res.json({
      jobs: jobs || [],
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: jobs?.length || 0
      }
    })

  } catch (error) {
    console.error('Error fetching translation jobs:', error)
    res.status(500).json({ error: 'Failed to fetch translation jobs' })
  }
})

/**
 * DELETE /api/translate/jobs/:jobId
 * 翻訳ジョブを削除（進行中でない場合のみ）
 */
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' })
    }

    // ジョブの現在のステータスを確認
    const { data: job, error: jobError } = await supabaseAdmin
      .from('translation_jobs')
      .select('status')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return res.status(404).json({ error: 'Translation job not found' })
    }

    // 進行中のジョブは削除できない
    if (job.status === 'processing') {
      return res.status(400).json({ error: 'Cannot delete job in progress' })
    }

    // ジョブを削除
    const { error: deleteError } = await supabaseAdmin
      .from('translation_jobs')
      .delete()
      .eq('id', jobId)

    if (deleteError) {
      throw new Error('Failed to delete translation job')
    }

    res.json({ message: 'Translation job deleted successfully' })

  } catch (error) {
    console.error('Error deleting translation job:', error)
    res.status(500).json({ error: 'Failed to delete translation job' })
  }
})

/**
 * POST /api/translate/retry/:jobId
 * 失敗した翻訳ジョブを再試行
 */
router.post('/retry/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' })
    }

    // ジョブの現在のステータスを確認
    const { data: job, error: jobError } = await supabaseAdmin
      .from('translation_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return res.status(404).json({ error: 'Translation job not found' })
    }

    // エラー状態のジョブのみ再試行可能
    if (job.status !== 'error') {
      return res.status(400).json({ error: 'Only failed jobs can be retried' })
    }

    // ジョブステータスをリセット
    const { error: updateError } = await supabaseAdmin
      .from('translation_jobs')
      .update({
        status: 'pending',
        progress: 0,
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (updateError) {
      throw new Error('Failed to reset translation job')
    }

    // 翻訳処理を再開（この部分は videos.ts の processTranslation 関数を再利用）
    // 実際の実装では、翻訳処理を別のサービスやワーカーに委譲することを推奨
    
    res.json({ message: 'Translation job restarted successfully' })

  } catch (error) {
    console.error('Error retrying translation job:', error)
    res.status(500).json({ error: 'Failed to retry translation job' })
  }
})

export default router