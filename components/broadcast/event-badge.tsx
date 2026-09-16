import { TallyLight } from './tally-light';

export type EventStatus = 'scheduled' | 'delayed' | 'live' | 'completed' | 'cancelled' | 'walkover';

interface EventBadgeProps {
  status: EventStatus | string;
  className?: string;
}

export function EventBadge({ status, className = '' }: EventBadgeProps) {
  const normalizedStatus = status.toLowerCase() as EventStatus;

  const styles: Record<EventStatus, string> = {
    live: 'border-accent-signal/40 text-accent-signal bg-accent-signal/5 font-semibold',
    scheduled: 'border-border-line text-text-muted bg-bg-surface/50',
    delayed: 'border-amber-500/30 text-amber-400 bg-amber-500/5',
    completed: 'border-state-win/30 text-state-win bg-state-win/5',
    cancelled: 'border-state-alert/30 text-state-alert bg-state-alert/5',
    walkover: 'border-state-alert/20 text-state-alert bg-state-alert/5',
  };

  const labels: Record<EventStatus, string> = {
    live: 'LIVE',
    scheduled: 'UPCOMING',
    delayed: 'DELAYED',
    completed: 'FINISHED',
    cancelled: 'CANCELLED',
    walkover: 'WALKOVER',
  };

  const currentStyle = styles[normalizedStatus] || styles.scheduled;
  const currentLabel = labels[normalizedStatus] || normalizedStatus.toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 border rounded text-xs font-display tracking-wider ${currentStyle} ${className}`}
    >
      {normalizedStatus === 'live' && <TallyLight size="sm" />}
      <span>{currentLabel}</span>
    </span>
  );
}
