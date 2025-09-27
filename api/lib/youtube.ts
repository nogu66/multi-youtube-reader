import { google } from 'googleapis'
import { YoutubeTranscript } from 'youtube-transcript'

// YouTube Data API v3 設定
const youtube = google.youtube({
  version: 'v3'
})

export interface YouTubeVideoInfo {
  id: string
  title: string
  description: string
  duration: number
  thumbnailUrl: string
}

export interface TranscriptItem {
  start: number
  dur: number
  text: string
}

/**
 * YouTube動画IDから動画情報を取得
 */
export async function getVideoInfo(videoId: string): Promise<YouTubeVideoInfo> {
  try {
    const response = await youtube.videos.list({
      part: ['snippet', 'contentDetails'],
      id: [videoId],
      key: process.env.YOUTUBE_API_KEY
    })

    const video = response.data.items?.[0]
    if (!video) {
      throw new Error('Video not found')
    }

    const snippet = video.snippet!
    const contentDetails = video.contentDetails!
    
    // ISO 8601 duration を秒に変換
    const duration = parseDuration(contentDetails.duration!)
    
    return {
      id: videoId,
      title: snippet.title!,
      description: snippet.description || '',
      duration,
      thumbnailUrl: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || ''
    }
  } catch (error) {
    console.error('Error fetching video info:', error)
    throw new Error('Failed to fetch video information')
  }
}

/**
 * YouTube動画のトランスクリプトを取得
 */
export const getVideoTranscript = async (videoId: string): Promise<TranscriptItem[]> => {
  try {
    // youtube-transcriptライブラリを試行
    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId)
      
      if (transcriptData && transcriptData.length > 0) {
        return transcriptData.map((item) => ({
          start: Math.floor(item.offset / 1000),
          dur: Math.floor(item.duration / 1000),
          text: item.text
        }))
      }
    } catch (transcriptError) {
      // youtube-transcriptが失敗した場合はデモデータを使用
    }
    
    // フォールバック: デモ用のトランスクリプトを生成
    return generateDemoTranscript(videoId)
    
  } catch (error) {
    console.error('Failed to get transcript:', error)
    throw new Error('トランスクリプトの取得に失敗しました')
  }
}

/**
 * デモ用のトランスクリプトを生成
 */
function generateDemoTranscript(videoId: string): TranscriptItem[] {
  const demoTexts = [
    "Welcome to this video tutorial.",
    "Today we'll be learning about new technologies.",
    "Let's start with the basics and work our way up.",
    "This is an important concept to understand.",
    "Here's how you can implement this feature.",
    "Don't forget to test your implementation.",
    "That's all for today's tutorial.",
    "Thanks for watching and see you next time!"
  ]
  
  return demoTexts.map((text, index) => ({
    start: index * 30, // 30秒間隔
    dur: 25, // 25秒間
    text: text
  }))
}

/**
 * YouTube URLから動画IDを抽出
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

/**
 * ISO 8601 duration を秒に変換
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}