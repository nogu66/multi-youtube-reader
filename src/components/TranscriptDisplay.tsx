import React, { useState, useEffect, useRef } from 'react'
import { Clock, Languages, Copy, Check, Search, Filter } from 'lucide-react'

interface TranscriptItem {
  id: string
  start_time: number
  end_time: number
  original_text: string
  translated_text?: string | null
  language_code: string
}

interface TranscriptDisplayProps {
  transcripts: TranscriptItem[]
  currentTime: number
  onTimestampClick: (time: number) => void
  targetLanguage: string
  isTranslating?: boolean
  translationProgress?: number
  className?: string
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcripts,
  currentTime,
  onTimestampClick,
  targetLanguage,
  isTranslating = false,
  translationProgress = 0,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showOriginal, setShowOriginal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filteredTranscripts, setFilteredTranscripts] = useState<TranscriptItem[]>(transcripts)
  const activeItemRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 検索フィルタリング
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTranscripts(transcripts)
      return
    }

    const filtered = transcripts.filter(item => {
      const textToSearch = showOriginal ? item.original_text : (item.translated_text || item.original_text)
      return textToSearch.toLowerCase().includes(searchQuery.toLowerCase())
    })
    setFilteredTranscripts(filtered)
  }, [searchQuery, transcripts, showOriginal])

  // 現在の再生時間に基づいてアクティブなアイテムを自動スクロール
  useEffect(() => {
    if (activeItemRef.current && containerRef.current) {
      const container = containerRef.current
      const activeItem = activeItemRef.current
      const containerRect = container.getBoundingClientRect()
      const activeItemRect = activeItem.getBoundingClientRect()

      if (
        activeItemRect.top < containerRect.top ||
        activeItemRect.bottom > containerRect.bottom
      ) {
        activeItem.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })
      }
    }
  }, [currentTime])

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const isActive = (item: TranscriptItem): boolean => {
    return currentTime >= item.start_time && currentTime <= item.end_time
  }

  const handleCopyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const getDisplayText = (item: TranscriptItem): string => {
    if (showOriginal) {
      return item.original_text
    }
    return item.translated_text || item.original_text
  }

  const hasTranslation = (item: TranscriptItem): boolean => {
    return Boolean(item.translated_text)
  }

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Languages className="w-5 h-5 mr-2" />
            トランスクリプト
          </h2>
          
          {/* 言語切り替えボタン */}
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              showOriginal
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {showOriginal ? '原文' : '翻訳'}
          </button>
        </div>
        
        {/* 翻訳進行状況 */}
        {isTranslating && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>翻訳中...</span>
              <span>{translationProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${translationProgress}%` }}
              />
            </div>
          </div>
        )}
        
        {/* 検索バー */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="トランスクリプトを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
        
        {/* 検索結果数 */}
        {searchQuery && (
          <p className="text-sm text-gray-500 mt-2">
            {filteredTranscripts.length} 件の結果
          </p>
        )}
      </div>
      
      {/* トランスクリプトリスト */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin"
      >
        {filteredTranscripts.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {searchQuery ? '検索結果が見つかりません' : 'トランスクリプトがありません'}
          </div>
        ) : (
          filteredTranscripts.map((item) => {
            const active = isActive(item)
            const displayText = getDisplayText(item)
            const hasTranslatedText = hasTranslation(item)
            
            return (
              <div
                key={item.id}
                ref={active ? activeItemRef : null}
                className={`group p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-blue-50 border-blue-200 shadow-md'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                }`}
                onClick={() => onTimestampClick(item.start_time)}
              >
                {/* タイムスタンプ */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onTimestampClick(item.start_time)
                    }}
                    className={`flex items-center text-sm font-mono px-2 py-1 rounded transition-colors ${
                      active
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(item.start_time)}
                  </button>
                  
                  {/* コピーボタン */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopyText(displayText, item.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/50 transition-all"
                    title="テキストをコピー"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>
                
                {/* テキスト内容 */}
                <div className="text-sm leading-relaxed">
                  <p className={`${active ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {displayText}
                  </p>
                  
                  {/* 翻訳状態インジケーター */}
                  {!showOriginal && (
                    <div className="mt-2 flex items-center text-xs">
                      {hasTranslatedText ? (
                        <span className="text-green-600 flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                          翻訳済み
                        </span>
                      ) : (
                        <span className="text-gray-500 flex items-center">
                          <div className="w-2 h-2 bg-gray-400 rounded-full mr-1" />
                          原文
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* 検索ハイライト表示用の隠し要素 */}
                {searchQuery && displayText.toLowerCase().includes(searchQuery.toLowerCase()) && (
                  <div className="mt-1 text-xs text-blue-600">
                    検索にマッチ
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      
      {/* フッター統計 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {transcripts.length} セグメント
          </span>
          <span>
            {transcripts.filter(hasTranslation).length} / {transcripts.length} 翻訳済み
          </span>
        </div>
      </div>
    </div>
  )
}

export default TranscriptDisplay