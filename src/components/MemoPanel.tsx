import React, { useState, useEffect } from 'react'
import { Clock, Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import type { Memo } from '../types/memo'

interface MemoPanelProps {
  videoId: string
  currentTime?: number
}

interface MemoFormData {
  content: string
  timestamp_seconds?: number
}

const MemoPanel: React.FC<MemoPanelProps> = ({ videoId, currentTime }) => {
  const [memos, setMemos] = useState<Memo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<MemoFormData>({
    content: '',
    timestamp_seconds: undefined
  })

  // メモ一覧を取得
  const fetchMemos = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/videos/${videoId}/memos`)
      if (!response.ok) {
        throw new Error('Failed to fetch memos')
      }
      const data = await response.json()
      setMemos(data || [])
    } catch (error) {
      console.error('Error fetching memos:', error)
      setError('メモの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // メモを作成
  const createMemo = async () => {
    if (!formData.content.trim()) return

    try {
      const response = await fetch(`http://localhost:3001/api/videos/${videoId}/memos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: formData.content.trim(),
          timestamp_seconds: formData.timestamp_seconds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create memo')
      }

      const data = await response.json()
      setMemos(prev => [data, ...prev])
      setFormData({ content: '', timestamp_seconds: undefined })
      setIsCreating(false)
    } catch (error) {
      console.error('Error creating memo:', error)
      setError('メモの作成に失敗しました')
    }
  }

  // メモを更新
  const updateMemo = async (id: string) => {
    if (!formData.content.trim()) return

    try {
      const response = await fetch(`http://localhost:3001/api/memos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: formData.content.trim(),
          timestamp_seconds: formData.timestamp_seconds
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update memo')
      }

      const data = await response.json()
      setMemos(prev => prev.map(memo => memo.id === id ? data : memo))
      setEditingId(null)
      setFormData({ content: '', timestamp_seconds: undefined })
    } catch (error) {
      console.error('Error updating memo:', error)
      setError('メモの更新に失敗しました')
    }
  }

  // メモを削除
  const deleteMemo = async (id: string) => {
    if (!confirm('このメモを削除しますか？')) return

    try {
      const response = await fetch(`http://localhost:3001/api/memos/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete memo')
      }

      setMemos(prev => prev.filter(memo => memo.id !== id))
    } catch (error) {
      console.error('Error deleting memo:', error)
      setError('メモの削除に失敗しました')
    }
  }

  // 編集開始
  const startEdit = (memo: Memo) => {
    setEditingId(memo.id)
    setFormData({
      content: memo.content,
      timestamp_seconds: memo.timestamp_seconds
    })
  }

  // 編集キャンセル
  const cancelEdit = () => {
    setEditingId(null)
    setIsCreating(false)
    setFormData({ content: '', timestamp_seconds: undefined })
  }

  // 新規作成開始
  const startCreate = () => {
    setIsCreating(true)
    setFormData({
      content: '',
      timestamp_seconds: currentTime ? Math.floor(currentTime) : undefined
    })
  }

  // 時間フォーマット
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    fetchMemos()
  }, [videoId])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">メモ</h3>
          <button
            onClick={startCreate}
            disabled={isCreating || editingId !== null}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Plus className="w-4 h-4" />
            新規メモ
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 text-sm mt-1"
            >
              閉じる
            </button>
          </div>
        )}

        {/* 新規作成フォーム */}
        {isCreating && (
          <div className="border rounded-lg p-3 bg-gray-50">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.timestamp_seconds !== undefined}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      timestamp_seconds: e.target.checked 
                        ? (currentTime ? Math.floor(currentTime) : 0)
                        : undefined
                    }))}
                  />
                  現在の時間に関連付ける
                  {formData.timestamp_seconds !== undefined && (
                    <span className="text-blue-600 font-medium">
                      ({formatTime(formData.timestamp_seconds)})
                    </span>
                  )}
                </label>
              </div>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="メモを入力してください..."
                className="w-full p-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={createMemo}
                  disabled={!formData.content.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Save className="w-4 h-4" />
                  保存
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                >
                  <X className="w-4 h-4" />
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* メモ一覧 */}
        {memos.length === 0 && !isCreating ? (
          <div className="text-center py-8 text-gray-500">
            <p>まだメモがありません</p>
            <p className="text-sm">「新規メモ」ボタンからメモを作成できます</p>
          </div>
        ) : (
          <div className="space-y-3">
            {memos.map((memo) => (
              <div key={memo.id} className="border rounded-lg p-3 hover:bg-gray-50">
                {editingId === memo.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.timestamp_seconds !== undefined}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            timestamp_seconds: e.target.checked 
                              ? (memo.timestamp_seconds || (currentTime ? Math.floor(currentTime) : 0))
                              : undefined
                          }))}
                        />
                        時間に関連付ける
                        {formData.timestamp_seconds !== undefined && (
                          <span className="text-blue-600 font-medium">
                            ({formatTime(formData.timestamp_seconds)})
                          </span>
                        )}
                      </label>
                    </div>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full p-2 border rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateMemo(memo.id)}
                        disabled={!formData.content.trim()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <Save className="w-4 h-4" />
                        保存
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
                      >
                        <X className="w-4 h-4" />
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {memo.timestamp_seconds !== undefined && (
                          <div className="flex items-center gap-1 text-sm text-blue-600 mb-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(memo.timestamp_seconds)}
                          </div>
                        )}
                        <p className="text-gray-900 whitespace-pre-wrap">{memo.content}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(memo.created_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(memo)}
                          disabled={isCreating || editingId !== null}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteMemo(memo.id)}
                          disabled={isCreating || editingId !== null}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MemoPanel