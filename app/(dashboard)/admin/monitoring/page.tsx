'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, TrendingUp, AlertTriangle, Zap, Download } from 'lucide-react';

interface QuotaMetric {
	recorded_at: string;
	metric_type: string;
	count: number;
	endpoint: string;
	status_code: number;
}

interface HourlyMetric {
	hour: string;
	metric_type: string;
	event_count: number;
}

export default function MonitoringPage() {
	const [metrics24h, setMetrics24h] = useState<QuotaMetric[]>([]);
	const [hourlyData, setHourlyData] = useState<HourlyMetric[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const loadMetrics = async () => {
			try {
				const supabase = createClient();

				// Load last 24h metrics
				const { data: data24h, error: err24h } = await supabase
					.from('api_quota_logs')
					.select('recorded_at, metric_type, count, endpoint, status_code')
					.gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
					.order('recorded_at', { ascending: false })
					.limit(100);

				if (err24h) throw err24h;

				// Load hourly breakdown (last 7 days) from view
				const { data: viewData, error: errView } = await supabase
					.from('quota_metrics_hourly')
					.select('hour, metric_type, event_count')
					.gte('hour', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
					.order('hour', { ascending: false })
					.limit(168); // 7 days * 24 hours

				if (errView) {
					console.warn('Failed to load hourly metrics:', errView);
					// Continue with 24h data even if hourly fails
				} else if (viewData) {
					setHourlyData(viewData as HourlyMetric[]);
				}

				setMetrics24h((data24h as QuotaMetric[]) || []);
			} catch (err) {
				console.error('Failed to load metrics:', err);
				setError(err instanceof Error ? err.message : 'Failed to load metrics');
			} finally {
				setIsLoading(false);
			}
		};

		loadMetrics();
	}, []);

	const rateLimitCount = metrics24h
		.filter((m) => m.metric_type === 'rate_limit')
		.reduce((sum, m) => sum + (m.count || 0), 0);

	const quotaErrorCount = metrics24h
		.filter((m) => m.metric_type === 'quota_error')
		.reduce((sum, m) => sum + (m.count || 0), 0);

	const syncSuccessCount = metrics24h
		.filter((m) => m.metric_type === 'sync_success')
		.reduce((sum, m) => sum + (m.count || 0), 0);

	const handleExportCSV = () => {
		const csv = [
			['Timestamp', 'Type', 'Count', 'Endpoint', 'Status Code'],
			...metrics24h.map((m) => [
				new Date(m.recorded_at).toISOString(),
				m.metric_type,
				m.count,
				m.endpoint,
				m.status_code,
			]),
		]
			.map((row) => row.map((cell) => `"${cell}"`).join(','))
			.join('\n');

		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `quota-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-8">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Link
						href="/admin"
						className="p-2 hover:bg-bg-surface rounded transition-colors"
					>
						<ArrowLeft className="w-5 h-5 text-accent-readout" />
					</Link>
					<div>
						<h1 className="font-display font-black text-2xl uppercase tracking-wider text-text-primary">
							API Quota Monitoring
						</h1>
						<p className="text-xs text-text-muted font-data mt-1">
							24-HOUR AND 7-DAY METRICS DASHBOARD
						</p>
					</div>
				</div>
				<button
					onClick={handleExportCSV}
					className="flex items-center gap-2 px-3 py-2 bg-bg-surface border border-border-line hover:border-accent-readout/40 rounded text-xs font-display font-bold text-text-muted hover:text-text-primary transition-colors"
				>
					<Download className="w-4 h-4" />
					Export CSV
				</button>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-bg-surface border border-border-line rounded p-5 space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
							Rate Limits (24h)
						</span>
						<Zap className={`w-4 h-4 ${rateLimitCount > 0 ? 'text-accent-alert' : 'text-text-muted'}`} />
					</div>
					<p className="text-3xl font-data font-black text-text-primary">
						{rateLimitCount}
					</p>
					<p className="text-[10px] text-text-muted">HTTP 429 responses</p>
				</div>

				<div className="bg-bg-surface border border-border-line rounded p-5 space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
							Quota Errors (24h)
						</span>
						<AlertTriangle className={`w-4 h-4 ${quotaErrorCount > 0 ? 'text-accent-alert' : 'text-text-muted'}`} />
					</div>
					<p className="text-3xl font-data font-black text-text-primary">
						{quotaErrorCount}
					</p>
					<p className="text-[10px] text-text-muted">HTTP 403 responses</p>
				</div>

				<div className="bg-bg-surface border border-border-line rounded p-5 space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-[10px] font-display font-bold text-text-muted uppercase tracking-wider">
							Syncs Completed (24h)
						</span>
						<TrendingUp className="w-4 h-4 text-state-win" />
					</div>
					<p className="text-3xl font-data font-black text-text-primary">
						{syncSuccessCount}
					</p>
					<p className="text-[10px] text-text-muted">Successful operations</p>
				</div>
			</div>

			{/* Loading / Error State */}
			{isLoading && (
				<div className="text-center py-12">
					<p className="text-xs text-text-muted">Loading metrics...</p>
				</div>
			)}

			{error && (
				<div className="bg-accent-alert/10 border border-accent-alert/30 rounded p-4">
					<p className="text-xs text-accent-alert font-medium">Error: {error}</p>
				</div>
			)}

			{!isLoading && !error && (
				<>
					{/* Event Timeline */}
					<div className="space-y-4">
						<h2 className="font-display font-bold text-lg uppercase tracking-wide text-text-primary">
							Recent Events (Last 24h)
						</h2>

						{metrics24h.length === 0 ? (
							<div className="text-center py-8 bg-bg-surface border border-border-line rounded">
								<p className="text-xs text-text-muted">No metrics recorded in the last 24 hours</p>
							</div>
						) : (
							<div className="space-y-2 max-h-96 overflow-y-auto">
								{metrics24h.map((metric, idx) => {
									const isAlert = metric.metric_type === 'rate_limit' || metric.metric_type === 'quota_error';
									return (
										<div
											key={idx}
											className={`flex items-center justify-between p-3 rounded border ${
												isAlert
													? 'bg-accent-alert/5 border-accent-alert/20'
													: 'bg-bg-surface border-border-line'
											}`}
										>
											<div className="flex items-center gap-3">
												{metric.metric_type === 'rate_limit' && (
													<Zap className="w-4 h-4 text-accent-alert" />
												)}
												{metric.metric_type === 'quota_error' && (
													<AlertTriangle className="w-4 h-4 text-accent-alert" />
												)}
												{metric.metric_type === 'sync_success' && (
													<TrendingUp className="w-4 h-4 text-state-win" />
												)}
												<div>
													<p className="text-xs font-display font-bold uppercase text-text-primary">
														{metric.metric_type.replace('_', ' ')}
													</p>
													<p className="text-[10px] text-text-muted">
														{new Date(metric.recorded_at).toLocaleString()}
													</p>
												</div>
											</div>
											<div className="text-right">
												<p className="text-xs font-data font-black text-text-primary">
													{metric.count} event{metric.count !== 1 ? 's' : ''}
												</p>
												<p className="text-[10px] text-text-muted">
													HTTP {metric.status_code}
												</p>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Hourly Breakdown Info */}
					{hourlyData.length > 0 && (
						<div className="space-y-4">
							<h2 className="font-display font-bold text-lg uppercase tracking-wide text-text-primary">
								Hourly Breakdown (Last 7 Days)
							</h2>
							<div className="bg-bg-surface border border-border-line rounded p-4">
								<p className="text-xs text-text-muted mb-3">
									Total unique hours with metrics: {new Set(hourlyData.map((m) => m.hour)).size}
								</p>
								<div className="space-y-2 max-h-64 overflow-y-auto">
									{hourlyData.slice(0, 24).map((metric, idx) => (
										<div key={idx} className="flex items-center justify-between text-xs">
											<span className="text-text-muted">
												{new Date(metric.hour).toLocaleString()}
											</span>
											<span className="text-text-muted">
												{metric.metric_type.replace('_', ' ')}:
											</span>
											<span className="font-data font-bold text-text-primary">
												{metric.event_count}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
