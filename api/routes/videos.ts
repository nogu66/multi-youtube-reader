import { Router } from 'express'
import { supabaseAdmin } from '../lib/supabase'
import { getVideoInfo, getVideoTranscript, extractVideoId } from '../lib/youtube'
import { translateBatch, detectLanguage } from '../lib/gemini'
import type { Video, Transcript, Translation, TranslationJob } from '../lib/supabase'

const router = Router()

/**
 * POST /api/videos/analyze
 * YouTube動画を分析してトランスクリプトを取得
 */
router.post('/analyze', async (req, res) => {
  try {
    const { url, targetLanguage = 'ja' } = req.body

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
      
      // 既存の翻訳をチェック
      const { data: existingTranslations } = await supabaseAdmin
        .from('translations')
        .select('*')
        .eq('video_id', video.id)
        .eq('target_language', targetLanguage)

      if (existingTranslations && existingTranslations.length > 0) {
        return res.json({
          video,
          status: 'completed',
          message: 'Translation already exists'
        })
      }
    } else {
      // 新しい動画の情報を取得
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

      if (videoError || !newVideo) {
        throw new Error('Failed to save video')
      }

      video = newVideo

      // トランスクリプトを取得
      const transcript = await getVideoTranscript(videoId)
      
      // 言語を検出
      const sourceLanguage = await detectLanguage(transcript[0]?.text || '')
      
      // トランスクリプトをデータベースに保存
      const transcriptData = transcript.map(item => ({
        video_id: video.id,
        start_time: Math.floor(item.start),
        end_time: Math.floor(item.start + item.dur),
        original_text: item.text,
        language_code: sourceLanguage
      }))

      const { error: transcriptError } = await supabaseAdmin
        .from('transcripts')
        .insert(transcriptData)

      if (transcriptError) {
        throw new Error('Failed to save transcript')
      }
    }

    // 翻訳ジョブを作成
    const { data: translationJob, error: jobError } = await supabaseAdmin
      .from('translation_jobs')
      .insert({
        video_id: video.id,
        target_language: targetLanguage,
        status: 'pending'
      })
      .select()
      .single()

    if (jobError || !translationJob) {
      throw new Error('Failed to create translation job')
    }

    // 非同期で翻訳処理を開始
    processTranslation(video.id, targetLanguage, translationJob.id)
      .catch(error => console.error('Translation processing error:', error))

    res.json({
      video,
      jobId: translationJob.id,
      status: 'processing',
      message: 'Translation started'
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
 * 動画のトランスクリプトと翻訳を取得
 */
router.get('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params
    const { language = 'ja' } = req.query

    // 動画情報を取得
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return res.status(404).json({ error: 'Video not found' })
    }

    // トランスクリプトを取得
    const { data: transcripts, error: transcriptError } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('video_id', videoId)
      .order('start_time')

    if (transcriptError) {
      throw new Error('Failed to fetch transcripts')
    }

    // 翻訳を取得
    const { data: translations, error: translationError } = await supabaseAdmin
      .from('translations')
      .select('*')
      .eq('video_id', videoId)
      .eq('target_language', language as string)

    if (translationError) {
      throw new Error('Failed to fetch translations')
    }

    // トランスクリプトと翻訳をマージ
    const transcriptWithTranslations = transcripts?.map(transcript => {
      const translation = translations?.find(t => t.transcript_id === transcript.id)
      return {
        ...transcript,
        translated_text: translation?.translated_text || null
      }
    }) || []

    res.json({
      video,
      transcripts: transcriptWithTranslations
    })

  } catch (error) {
    console.error('Error fetching video data:', error)
    res.status(500).json({ error: 'Failed to fetch video data' })
  }
})

/**
 * 翻訳処理を非同期で実行
 */
async function processTranslation(videoId: string, targetLanguage: string, jobId: string) {
  try {
    // ジョブステータスを更新
    await supabaseAdmin
      .from('translation_jobs')
      .update({ status: 'processing', progress: 0 })
      .eq('id', jobId)

    // トランスクリプトを取得
    const { data: transcripts } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('video_id', videoId)
      .order('start_time')

    if (!transcripts || transcripts.length === 0) {
      throw new Error('No transcripts found')
    }

    // バッチサイズを設定（一度に翻訳するテキスト数）
    const batchSize = 10
    const totalBatches = Math.ceil(transcripts.length / batchSize)
    
    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * batchSize
      const endIndex = Math.min(startIndex + batchSize, transcripts.length)
      const batch = transcripts.slice(startIndex, endIndex)
      
      // バッチ翻訳を実行
      const texts = batch.map(t => t.original_text)
      const translatedTexts = await translateBatch(texts, targetLanguage)
      
      // 翻訳結果をデータベースに保存
      const translationData = batch.map((transcript, index) => ({
        video_id: videoId,
        transcript_id: transcript.id,
        translated_text: translatedTexts[index] || transcript.original_text,
        target_language: targetLanguage,
        translation_model: 'gemini-pro'
      }))
      
      await supabaseAdmin
        .from('translations')
        .insert(translationData)
      
      // 進捗を更新
      const progress = Math.round(((i + 1) / totalBatches) * 100)
      await supabaseAdmin
        .from('translation_jobs')
        .update({ progress })
        .eq('id', jobId)
    }

    // ジョブ完了
    await supabaseAdmin
      .from('translation_jobs')
      .update({ status: 'completed', progress: 100 })
      .eq('id', jobId)

  } catch (error) {
    console.error('Translation processing error:', error)
    
    // エラー状態に更新
    await supabaseAdmin
      .from('translation_jobs')
      .update({ 
        status: 'error', 
        error_message: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', jobId)
  }
}

export default router