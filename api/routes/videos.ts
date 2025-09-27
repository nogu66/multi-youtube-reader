import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { getVideoInfo, extractVideoId } from '../lib/youtube'
import type { Video } from '../lib/supabase'

const router = Router()

/**
 * POST /api/videos/analyze
 * YouTube動画の基本情報を取得して保存
 */
router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL is required' })
    }

    // YouTube動画IDを抽出
    const videoId = extractVideoId(url)
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' })
    }

    // 既存の動画をチェック
    const { data: existingVideo } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('youtube_id', videoId)
      .single()

    let video: Video

    if (existingVideo) {
      video = existingVideo
      return res.json({
        video,
        status: 'completed',
        message: 'Video already exists'
      })
    } else {
      // 新しい動画の情報を取得
      console.log(`Fetching video info for: ${videoId}`)
      const videoInfo = await getVideoInfo(videoId)
      
      // 動画をデータベースに保存
      const { data: newVideo, error: videoError } = await supabaseAdmin
        .from('videos')
        .insert({
          youtube_id: videoInfo.id,
          title: videoInfo.title,
          description: videoInfo.description,
          duration: videoInfo.duration,
          thumbnail_url: videoInfo.thumbnailUrl
        })
        .select()
        .single()

      if (videoError) {
        console.error('Video save error:', videoError)
        throw new Error('Failed to save video to database')
      }

      if (!newVideo) {
        throw new Error('No video data returned from database')
      }

      video = newVideo
      console.log(`Successfully saved video: ${video.title}`)
    }

    res.json({
      video,
      status: 'completed',
      message: 'Video information saved successfully'
    })

  } catch (error) {
    console.error('Error analyzing video:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ 
      error: 'Failed to analyze video',
      details: errorMessage
    })
  }
})

/**
 * GET /api/videos/:videoId
 * 動画の基本情報を取得
 */
router.get('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params

    // 動画情報を取得
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    res.json({
      video
    })

  } catch (error) {
    console.error('Error fetching video data:', error)
    res.status(500).json({ error: 'Failed to fetch video data' })
  }
})

export default router