import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Youtube, Search, Clock, Play, Trash2, ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface VideoHistory {
  id: string
  youtube_id: string
  title: string
  description?: string
  duration: number
  thumbnail_url?: string
  created_at: string
  updated_at: string
  transcript_count?: number
  translation_count?: number
}

const HomePage: React.FC = () => {
  const [videoUrl, setVideoUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [recentVideos, setRecentVideos] = useState<VideoHistory[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const navigate = useNavigate()

  // 最近の動画履歴を取得
  useEffect(() => {
    fetchRecentVideos()
  }, [])

  const fetchRecentVideos = async () => {
    try {
      setIsLoadingHistory(true)
      
      // 最近の動画を取得（トランスクリプトと翻訳の数も含む）
      const { data: videos, error } = await supabase
        .from('videos')
        .select(`
          *,
          transcripts(count),
          translations(count)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // データを整形
      const formattedVideos: VideoHistory[] = videos?.map(video => ({
        ...video,
        transcript_count: video.transcripts?.[0]?.count || 0,
        translation_count: video.translations?.[0]?.count || 0
      })) || []

      setRecentVideos(formattedVideos)
    } catch (error) {
      console.error('Failed to fetch recent videos:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const validateYouTubeUrl = (url: string): boolean => {
    return extractVideoId(url) !== null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!videoUrl.trim()) {
      setError('YouTube URLを入力してください')
      return
    }

    if (!validateYouTubeUrl(videoUrl)) {
      setError('有効なYouTube URLを入力してください')
      return
    }

    const videoId = extractVideoId(videoUrl)
    if (!videoId) {
      setError('動画IDを取得できませんでした')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // 既存の動画をチェック
      const { data: existingVideo } = await supabase
        .from('videos')
        .select('*')
        .eq('youtube_id', videoId)
        .single()

      if (existingVideo) {
        // 既存の動画がある場合は直接視聴ページへ
        navigate(`/watch/${videoId}`)
        return
      }

      // 新しい動画の場合は分析APIを呼び出し
      const response = await fetch('/api/videos/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: videoUrl })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '動画の分析に失敗しました')
      }

      await response.json()
      
      // 分析が完了したら視聴ページへ遷移
      navigate(`/watch/${videoId}`)
      
      // 履歴を更新
      fetchRecentVideos()
      
    } catch (error) {
      console.error('Error analyzing video:', error)
      setError(error instanceof Error ? error.message : '動画の分析中にエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVideoClick = (videoId: string) => {
    navigate(`/watch/${videoId}`)
  }

  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('この動画を履歴から削除しますか？')) {
      return
    }

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('youtube_id', videoId)

      if (error) throw error
      
      // 履歴を更新
      fetchRecentVideos()
    } catch (error) {
      console.error('Failed to delete video:', error)
      alert('動画の削除に失敗しました')
    }
  }

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今日'
    } else if (diffDays === 1) {
      return '昨日'
    } else if (diffDays < 7) {
      return `${diffDays}日前`
    } else {
      return date.toLocaleDateString('ja-JP')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Youtube className="w-8 h-8 text-red-500 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">
              YouMemo
            </h1>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 動画URL入力セクション */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Add URL
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL
              </label>
              <div className="flex space-x-3">
                <input
                  id="video-url"
                  type="url"
                  value={videoUrl}
                  onChange={(e) => {
                    setVideoUrl(e.target.value)
                    setError('')
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !videoUrl.trim()}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      分析中...
                    </div>
                  ) : (
                    '分析開始'
                  )}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}
            
            <div className="text-sm text-gray-500">
              <p>対応形式: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...</p>
            </div>
          </form>
        </div>

        {/* 最近の動画履歴 */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              最近の動画
            </h2>
          </div>
          
          <div className="p-6">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3 text-gray-600">読み込み中...</span>
              </div>
            ) : recentVideos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Youtube className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>まだ動画がありません</p>
                <p className="text-sm">上記のフォームからYouTube動画を分析してみましょう</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentVideos.map((video) => (
                  <div
                    key={video.youtube_id}
                    onClick={() => handleVideoClick(video.youtube_id)}
                    className="group cursor-pointer bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                  >
                    {/* サムネイル */}
                    <div className="relative aspect-video bg-gray-200 rounded-t-lg overflow-hidden">
                      <img
                        src={video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`
                        }}
                      />
                      
                      {/* 再生時間 */}
                      {video.duration && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                      
                      {/* 再生ボタンオーバーレイ */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 flex items-center justify-center transition-all duration-200">
                        <Play className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                    </div>
                    
                    {/* 動画情報 */}
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                        {video.title}
                      </h3>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                        <span>{formatDate(video.created_at)}</span>
                        {/* <div className="flex items-center space-x-3">
                          {video.transcript_count && video.transcript_count > 0 && (
                            <span className="flex items-center">
                              <Languages className="w-3 h-3 mr-1" />
                              {video.translation_count || 0}/{video.transcript_count}
                            </span>
                          )}
                        </div> */}
                      </div>
                      
                      {/* アクションボタン */}
                      <div className="flex items-center justify-between">
                        <a
                          href={`https://www.youtube.com/watch?v=${video.youtube_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          YouTube
                        </a>
                        
                        <button
                          onClick={(e) => handleDeleteVideo(video.youtube_id, e)}
                          className="text-red-500 hover:text-red-700 p-1 rounded transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default HomePage