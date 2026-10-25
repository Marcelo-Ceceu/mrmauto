-- Adiciona a coluna video_url na tabela vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS video_url text;

-- Comentário da coluna
COMMENT ON COLUMN public.vehicles.video_url IS 'URL do vídeo do veículo (YouTube, Vimeo ou link direto)';
