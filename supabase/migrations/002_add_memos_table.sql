-- メモ機能のためのテーブル追加

-- メモテーブル (memos)
CREATE TABLE memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    timestamp_seconds INTEGER, -- 動画の特定の時間に関連付けられたメモの場合
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_memos_video_id ON memos(video_id);
CREATE INDEX idx_memos_timestamp ON memos(video_id, timestamp_seconds);
CREATE INDEX idx_memos_created_at ON memos(created_at DESC);

-- RLS (Row Level Security) を有効化
ALTER TABLE memos ENABLE ROW LEVEL SECURITY;

-- 基本的なRLSポリシー（全ユーザーが読み取り可能）
CREATE POLICY "Allow public read access" ON memos FOR SELECT USING (true);

-- 認証済みユーザーは全操作可能
CREATE POLICY "Allow authenticated users full access" ON memos FOR ALL USING (auth.role() = 'authenticated');

-- 権限設定
GRANT SELECT ON memos TO anon;
GRANT ALL PRIVILEGES ON memos TO authenticated;

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_memos_updated_at BEFORE UPDATE ON memos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();