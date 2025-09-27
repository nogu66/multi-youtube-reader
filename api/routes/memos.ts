import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'

const router = Router()

// メモ一覧取得
router.get('/videos/:videoId/memos', async (req, res) => {
  try {
    const { videoId } = req.params

    const { data, error } = await supabaseAdmin
      .from('memos')
      .select('*')
      .eq('video_id', videoId)
      .order('timestamp_seconds', { ascending: true })

    if (error) {
      console.error('Failed to fetch memos:', error)
      return res.status(500).json({ error: 'メモの取得に失敗しました' })
    }

    res.json(data)
  } catch (error) {
    console.error('Failed to fetch memos:', error)
    res.status(500).json({ error: 'メモの取得に失敗しました' })
  }
})

// メモ作成
router.post('/videos/:videoId/memos', async (req, res) => {
  try {
    const { videoId } = req.params
    const { content, timestamp_seconds } = req.body

    if (!content) {
      return res.status(400).json({ error: 'メモの内容が必要です' })
    }

    const { data, error } = await supabaseAdmin
      .from('memos')
      .insert({
        video_id: videoId,
        content,
        timestamp_seconds: timestamp_seconds || null
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create memo:', error)
      return res.status(500).json({ error: 'メモの作成に失敗しました' })
    }

    res.status(201).json(data)
  } catch (error) {
    console.error('Failed to create memo:', error)
    res.status(500).json({ error: 'メモの作成に失敗しました' })
  }
})

// メモ更新
router.put('/memos/:memoId', async (req, res) => {
  try {
    const { memoId } = req.params
    const { content, timestamp_seconds } = req.body

    if (!content) {
      return res.status(400).json({ error: 'メモの内容が必要です' })
    }

    const { data, error } = await supabaseAdmin
      .from('memos')
      .update({
        content,
        timestamp_seconds: timestamp_seconds || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memoId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update memo:', error)
      return res.status(500).json({ error: 'メモの更新に失敗しました' })
    }

    if (!data) {
      return res.status(404).json({ error: 'メモが見つかりません' })
    }

    res.json(data)
  } catch (error) {
    console.error('Failed to update memo:', error)
    res.status(500).json({ error: 'メモの更新に失敗しました' })
  }
})

// メモ削除
router.delete('/memos/:memoId', async (req, res) => {
  try {
    const { memoId } = req.params

    const { error } = await supabaseAdmin
      .from('memos')
      .delete()
      .eq('id', memoId)

    if (error) {
      console.error('Failed to delete memo:', error)
      return res.status(500).json({ error: 'メモの削除に失敗しました' })
    }

    res.status(204).send()
  } catch (error) {
    console.error('Failed to delete memo:', error)
    res.status(500).json({ error: 'メモの削除に失敗しました' })
  }
})

export default router