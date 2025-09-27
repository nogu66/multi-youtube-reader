import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings, Download, Share2, AlertCircle, RefreshCw } from 'lucide-react'
import VideoPlayer from '../components/VideoPlayer'
import MemoPanel from '../components/MemoPanel'
import { supabase } from '../lib/supabase'
import type { Video } from '../lib/supabase'

// interface TranscriptItem {
//   id: string
//   start_time: number
//   end_time: number
//   original_text: string
//   translated_text?: string | null
//   language_code: string
// }

// interface TranslationJob {
//   id: string
//   status: 'pending' | 'processing' | 'completed' | 'failed'
//   progress: number
//   target_language: string
//   estimated_completion?: string
// }

const WatchPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  
  const [video, setVideo] = useState<Video | null>(null)
  // const [transcripts, setTranscripts] = useState<TranscriptItem[]>([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  // const [translationJob, setTranslationJob] = useState<TranslationJob | null>(null)
  // const [targetLanguage, setTargetLanguage] = useState('ja')
  const [,] = useState<unknown>(null)

  // 動画データとトランスクリプトを取得
  const fetchVideoData = useCallback(async () => {
    if (!videoId) return

    try {
      setIsLoading(true)
      setError('')

      // 動画情報を取得
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('youtube_id', videoId)
        .single()

      if (videoError) {
        if (videoError.code === 'PGRST116') {
          setError('動画が見つかりません')
        } else {
          throw videoError
        }
        return
      }

      setVideo(videoData)

      // // トランスクリプトを取得
      // const { data: transcriptData, error: transcriptError } = await supabase
      //   .from('transcripts')
      //   .select('*')
      //   .eq('video_id', videoData.id)
      //   .order('start_time', { ascending: true })

      // if (transcriptError) throw transcriptError

      // // 翻訳データを取得
      // const { data: translationData, error: translationError } = await supabase
      //   .from('translations')
      //   .select('*')
      //   .eq('video_id', videoData.id)
      //   .eq('target_language', targetLanguage)

      // if (translationError) throw translationError

      // // トランスクリプトと翻訳をマージ
      // const mergedTranscripts: TranscriptItem[] = transcriptData?.map(transcript => {
      //   const translation = translationData?.find(t => t.transcript_id === transcript.id)
      //   return {
      //     id: transcript.id,
      //     start_time: transcript.start_time,
      //     end_time: transcript.end_time,
      //     original_text: transcript.text,
      //     translated_text: translation?.translated_text || null,
      //     language_code: transcript.language_code
      //   }
      // }) || []

      // setTranscripts(mergedTranscripts)

      // // 進行中の翻訳ジョブをチェック
      // const { data: jobData } = await supabase
      //   .from('translation_jobs')
      //   .select('*')
      //   .eq('video_id', videoData.id)
      //   .eq('target_language', targetLanguage)
      //   .in('status', ['pending', 'processing'])
      //   .order('created_at', { ascending: false })
      //   .limit(1)
      //   .single()

      // if (jobData) {
      //   setTranslationJob({
      //     id: jobData.id,
      //     status: jobData.status,
      //     progress: jobData.progress || 0,
      //     target_language: jobData.target_language,
      //     estimated_completion: jobData.estimated_completion
      //   })
        
      //   // 進行中の場合は定期的にステータスをチェック
      //   if (jobData.status === 'processing') {
      //     startPollingTranslationStatus(jobData.id)
      //   }
      // }

    } catch (error) {
      console.error('Failed to fetch video data:', error)
      setError('動画データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [videoId])

  // // 翻訳ステータスのポーリング
  // const startPollingTranslationStatus = useCallback((jobId: string) => {
  //   const pollInterval = setInterval(async () => {
  //     try {
  //       const response = await fetch(`/api/translate/status/${jobId}`)
  //       if (!response.ok) return

  //       const jobStatus = await response.json()
        
  //       setTranslationJob(prev => prev ? {
  //         ...prev,
  //         status: jobStatus.status,
  //         progress: jobStatus.progress || 0,
  //         estimated_completion: jobStatus.estimated_completion
  //       } : null)

  //       // 完了または失敗した場合はポーリングを停止
  //       if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
  //         clearInterval(pollInterval)
          
  //         if (jobStatus.status === 'completed') {
  //           // 翻訳が完了したらデータを再取得
  //           fetchVideoData()
  //         }
  //       }
  //     } catch (error) {
  //       console.error('Failed to poll translation status:', error)
  //     }
  //   }, 2000) // 2秒間隔でポーリング

  //   // コンポーネントがアンマウントされた時にクリーンアップ
  //   return () => clearInterval(pollInterval)
  // }, [fetchVideoData])

  useEffect(() => {
    fetchVideoData()
  }, [fetchVideoData])

  // プレイヤーの時間更新
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  // タイムスタンプクリック時の動画シーク
  // const handleTimestampClick = useCallback((time: number) => {
  //   if (playerRef) {
  //     setCurrentTime(time)
  //   }
  // }, [playerRef])

  // // 翻訳開始
  // const startTranslation = async () => {
  //   if (!videoId) return

  //   try {
  //     const response = await fetch('/api/videos/analyze', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json'
  //       },
  //       body: JSON.stringify({ 
  //         url: `https://www.youtube.com/watch?v=${videoId}`,
  //         targetLanguage
  //       })
  //     })

  //     if (!response.ok) {
  //       const errorData = await response.json()
  //       throw new Error(errorData.error || '翻訳の開始に失敗しました')
  //     }

  //     const result = await response.json()
      
  //     if (result.translationJobId) {
  //       setTranslationJob({
  //         id: result.translationJobId,
  //         status: 'pending',
  //         progress: 0,
  //         target_language: targetLanguage
  //       })
        
  //       startPollingTranslationStatus(result.translationJobId)
  //     }
  //   } catch (error) {
  //     console.error('Failed to start translation:', error)
  //     alert(error instanceof Error ? error.message : '翻訳の開始に失敗しました')
  //   }
  // }

  // エラー時の再試行
  const handleRetry = () => {
    fetchVideoData()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">動画データを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-3">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              再試行
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ホームに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">動画が見つかりません</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    )
  }

  // const hasTranslations = transcripts.some(t => t.translated_text)
  // const isTranslating = translationJob && (translationJob.status === 'pending' || translationJob.status === 'processing')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 line-clamp-1">
                  {video.title}
                </h1>
                <p className="text-sm text-gray-500">
                  {video.duration ? `${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}` : ''}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* 翻訳開始ボタン */}
              {/* {!isTranslating && (
                <button
                  onClick={startTranslation}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  翻訳開始
                </button>
              )} */}
              
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側: 動画プレイヤー */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <VideoPlayer
                videoId={videoId!}
                onTimeUpdate={handleTimeUpdate}
                className="w-full"
              />
              
              {/* 動画情報 */}
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {video.title}
                </h2>
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span>{new Date(video.created_at).toLocaleDateString('ja-JP')}</span>
                </div>
                
                {video.description && (
                  <div className="text-sm text-gray-700">
                    <p className="line-clamp-3">{video.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右側: メモパネル */}
          <div className="lg:col-span-1">
            <MemoPanel 
              videoId={video.id} 
              currentTime={currentTime}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

export default WatchPage