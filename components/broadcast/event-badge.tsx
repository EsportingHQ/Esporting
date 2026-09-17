import { TallyLight } from './tally-light';

export type EventStatus = 'scheduled' | 'delayed' | 'live' | 'completed' | 'cancelled' | 'walkover';

interface EventBadgeProps {
  status: EventStatus | string;
  className?: string;
}

export function EventBadge({ status, className = '' }: EventBadgeProps) {
  const normalizedStatus = status.toLowerCase() as EventStatus;

  const styles: Record<EventStatus, string> = {
    live: 'border-accent-live/30 text-accent-live bg-accent-live/15 font-bold shadow-[0_0_12px_rgba(239,68,68,0.2)]',
    scheduled: 'border-white/[0.08] text-text-muted bg-white/[0.03]',
    delayed: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
    completed: 'border-state-win/30 text-state-win bg-state-win/10 font-semibold',
    cancelled: 'border-state-alert/30 text-state-alert bg-state-alert/10',
    walkover: 'border-state-alert/20 text-state-alert bg-state-alert/10',
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 border rounded-full text-[11px] font-display font-semibold tracking-wider ${currentStyle} ${className}`}
    >
      {normalizedStatus === 'live' && <TallyLight size="sm" />}
      <span>{currentLabel}</span>
    </span>
  );
}
