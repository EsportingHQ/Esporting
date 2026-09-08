-- API Quota Monitoring Table
-- Tracks rate limits, quota errors, and sync metrics for observability

CREATE TABLE api_quota_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'pandascore', 'supabase'
  metric_type TEXT NOT NULL, -- 'rate_limit', 'quota_error', 'sync_success'
  count INT DEFAULT 1,
  endpoint TEXT,
  status_code INT,
  recorded_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient querying by source and time
CREATE INDEX idx_api_quota_logs_source_time ON api_quota_logs(source, recorded_at DESC);
CREATE INDEX idx_api_quota_logs_metric_type ON api_quota_logs(metric_type, recorded_at DESC);
CREATE INDEX idx_api_quota_logs_recorded_at ON api_quota_logs(recorded_at DESC);

-- Enable RLS
ALTER TABLE api_quota_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view api quota logs"
  ON api_quota_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Service role can insert logs (PandaScore sync function)
CREATE POLICY "Service role can insert quota logs"
  ON api_quota_logs
  FOR INSERT
  WITH CHECK (true);

-- Table for alerting thresholds
CREATE TABLE quota_alert_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL UNIQUE, -- 'rate_limit', 'quota_error'
  threshold_per_hour INT DEFAULT 5, -- alert if >5 events per hour
  alert_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE quota_alert_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view and update alert settings
CREATE POLICY "Admins can manage alert settings"
  ON quota_alert_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Initialize alert thresholds
INSERT INTO quota_alert_settings (metric_type, threshold_per_hour, alert_enabled)
VALUES
  ('rate_limit', 5, true),
  ('quota_error', 3, true)
ON CONFLICT (metric_type) DO NOTHING;

-- View for last 24h metrics summary
CREATE VIEW quota_metrics_24h AS
SELECT
  source,
  metric_type,
  COUNT(*) as event_count,
  MAX(recorded_at) as last_event,
  MIN(recorded_at) as first_event,
  jsonb_agg(DISTINCT status_code) as status_codes
FROM api_quota_logs
WHERE recorded_at > NOW() - INTERVAL '24 hours'
GROUP BY source, metric_type;

-- View for hourly breakdown (last 7 days)
CREATE VIEW quota_metrics_hourly AS
SELECT
  source,
  metric_type,
  DATE_TRUNC('hour', recorded_at) as hour,
  COUNT(*) as event_count
FROM api_quota_logs
WHERE recorded_at > NOW() - INTERVAL '7 days'
GROUP BY source, metric_type, DATE_TRUNC('hour', recorded_at)
ORDER BY hour DESC;
