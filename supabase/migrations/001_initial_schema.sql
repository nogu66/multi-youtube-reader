-- YouTube トランスクリプト翻訳アプリケーション - 初期データベーススキーマ

-- 動画テーブル (videos)
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_id VARCHAR(20) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);

-- トランスクリプトテーブル (transcripts)
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    original_text TEXT NOT NULL,
    language_code VARCHAR(10) NOT NULL DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_transcripts_video_id ON transcripts(video_id);
CREATE INDEX idx_transcripts_time ON transcripts(video_id, start_time);

-- 翻訳テーブル (translations)
CREATE TABLE translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
    translated_text TEXT NOT NULL,
    target_language VARCHAR(10) NOT NULL,
    translation_model VARCHAR(50) DEFAULT 'gemini-pro',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_translations_video_language ON translations(video_id, target_language);
CREATE INDEX idx_translations_transcript_id ON translations(transcript_id);

-- 翻訳ジョブテーブル (translation_jobs)
CREATE TABLE translation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
    target_language VARCHAR(10) NOT NULL,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    estimated_time INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_translation_jobs_status ON translation_jobs(status);
CREATE INDEX idx_translation_jobs_video_id ON translation_jobs(video_id);

-- RLS (Row Level Security) を有効化
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_jobs ENABLE ROW LEVEL SECURITY;

-- 基本的なRLSポリシー（全ユーザーが読み取り可能）
CREATE POLICY "Allow public read access" ON videos FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON transcripts FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON translations FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON translation_jobs FOR SELECT USING (true);

-- 認証済みユーザーは全操作可能
CREATE POLICY "Allow authenticated users full access" ON videos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access" ON transcripts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access" ON translations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users full access" ON translation_jobs FOR ALL USING (auth.role() = 'authenticated');

-- 権限設定
GRANT SELECT ON videos TO anon;
GRANT ALL PRIVILEGES ON videos TO authenticated;

GRANT SELECT ON transcripts TO anon;
GRANT ALL PRIVILEGES ON transcripts TO authenticated;

GRANT SELECT ON translations TO anon;
GRANT ALL PRIVILEGES ON translations TO authenticated;

GRANT SELECT ON translation_jobs TO anon;
GRANT ALL PRIVILEGES ON translation_jobs TO authenticated;

-- サンプルデータ
INSERT INTO videos (youtube_id, title, description, duration, thumbnail_url)
VALUES 
('dQw4w9WgXcQ', 'Rick Astley - Never Gonna Give You Up', 'Official music video', 212, 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');