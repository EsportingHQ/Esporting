'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { dayKey } from '@/hooks/useLiveFeed';

interface DateBarProps {
	selected: Date;
	onSelect: (d: Date) => void;
	matchDays: Record<string, number>;
	liveCount: number;
	liveOnly: boolean;
	onToggleLive: () => void;
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

function startOfDay(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}
function sameDay(a: Date, b: Date) {
	return dayKey(a) === dayKey(b);
}

function centerLabel(d: Date, today: Date) {
	if (sameDay(d, today)) return 'Today';
	if (sameDay(d, addDays(today, -1))) return 'Yesterday';
	if (sameDay(d, addDays(today, 1))) return 'Tomorrow';
	return `${DAY_NAMES[d.getDay()].charAt(0)}${DAY_NAMES[d.getDay()].slice(1).toLowerCase()}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

export function DateBar({
	selected,
	onSelect,
	matchDays,
	liveCount,
	liveOnly,
	onToggleLive,
}: DateBarProps) {
	const today = useMemo(() => startOfDay(new Date()), []);
	const [open, setOpen] = useState(false);
	const [viewMonth, setViewMonth] = useState(
		new Date(selected.getFullYear(), selected.getMonth(), 1),
	);
	const stripRef = useRef<HTMLDivElement>(null);
	const selectedRef = useRef<HTMLButtonElement>(null);

	// 31-day window centred on the selected day for the swipe strip
	const strip = useMemo(
		() => Array.from({ length: 31 }, (_, i) => addDays(selected, i - 15)),
		[selected],
	);

	useEffect(() => {
		const el = selectedRef.current;
		const box = stripRef.current;
		if (el && box) {
			box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2;
		}
	}, [selected]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open]);

	const monthCells = useMemo(() => {
		const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
		const lead = (first.getDay() + 6) % 7; // week starts Monday
		const days = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
		const cells: (Date | null)[] = Array(lead).fill(null);
		for (let i = 1; i <= days; i++) {
			cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i));
		}
		return cells;
	}, [viewMonth]);

	const pick = (d: Date) => {
		onSelect(startOfDay(d));
		setOpen(false);
	};

	return (
		<div className="space-y-3">
			{/* Top row: LIVE · ‹ Today › · calendar */}
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onToggleLive}
					aria-pressed={liveOnly}
					className={`h-11 min-w-11 px-3 rounded-full font-display font-bold text-[11px] tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
						liveOnly
							? 'bg-accent-primary text-white border-accent-primary shadow-[0_0_15px_rgba(255,31,109,0.4)]'
							: 'bg-text-primary/[0.04] text-text-primary border-text-primary/[0.1] hover:bg-text-primary/[0.08]'
					}`}
				>
					{liveCount > 0 && (
						<span className={`w-1.5 h-1.5 rounded-full animate-pulse ${liveOnly ? 'bg-white' : 'bg-accent-primary'}`} />
					)}
					LIVE
					{liveCount > 0 && <span className="font-data">{liveCount}</span>}
				</button>

				<div className="flex-1 flex items-center justify-center gap-1 sm:gap-3">
					<button
						type="button"
						aria-label="Previous day"
						onClick={() => onSelect(addDays(selected, -1))}
						className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-text-primary/[0.06] transition-colors"
					>
						<ChevronLeft className="w-5 h-5" />
					</button>
					<button
						type="button"
						onClick={() => onSelect(today)}
						className="font-display font-black text-lg sm:text-xl text-text-primary min-w-[8.5rem] text-center"
					>
						{centerLabel(selected, today)}
					</button>
					<button
						type="button"
						aria-label="Next day"
						onClick={() => onSelect(addDays(selected, 1))}
						className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-text-primary/[0.06] transition-colors"
					>
						<ChevronRight className="w-5 h-5" />
					</button>
				</div>

				<button
					type="button"
					aria-label="Open calendar"
					onClick={() => {
						setViewMonth(new Date(selected.getFullYear(), selected.getMonth(), 1));
						setOpen(true);
					}}
					className="h-11 w-11 rounded-full bg-text-primary/[0.04] border border-text-primary/[0.1] hover:bg-text-primary/[0.08] transition-colors flex flex-col items-center justify-center leading-none"
				>
					<span className="w-5 h-1 rounded-t-sm bg-accent-primary" />
					<span className="w-5 border-x border-b border-text-primary/60 rounded-b-sm font-data font-bold text-[11px] text-text-primary pt-0.5 pb-0.5 text-center">
						{selected.getDate()}
					</span>
				</button>
			</div>

			{/* Swipe strip */}
			<div
				ref={stripRef}
				className="flex gap-1.5 overflow-x-auto scrollbar-none scroll-smooth -mx-1 px-1 py-1"
			>
				{strip.map((d) => {
					const isSel = sameDay(d, selected);
					const isToday = sameDay(d, today);
					const count = matchDays[dayKey(d)] ?? 0;
					return (
						<button
							key={dayKey(d)}
							ref={isSel ? selectedRef : undefined}
							type="button"
							onClick={() => onSelect(d)}
							aria-label={`${d.toDateString()}${count ? `, ${count} matches` : ''}`}
							aria-pressed={isSel}
							className={`shrink-0 w-[3.4rem] py-2 rounded-2xl flex flex-col items-center gap-0.5 border transition-all ${
								isSel
									? 'bg-accent-primary border-accent-primary text-white shadow-[0_0_15px_rgba(255,31,109,0.35)]'
									: isToday
									? 'border-accent-primary/50 text-text-primary bg-accent-primary/[0.06]'
									: 'border-text-primary/[0.06] bg-text-primary/[0.02] text-text-muted hover:text-text-primary hover:bg-text-primary/[0.05]'
							}`}
						>
							<span className="text-[10px] font-display font-semibold tracking-wider">
								{DAY_NAMES[d.getDay()]}
							</span>
							<span className="font-data font-bold text-base leading-none">{d.getDate()}</span>
							<span
								className={`w-1 h-1 rounded-full ${
									count > 0 ? (isSel ? 'bg-white' : 'bg-accent-cyan') : 'bg-transparent'
								}`}
							/>
						</button>
					);
				})}
			</div>

			{/* Month calendar sheet */}
			{open && (
				<div
					className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
					onClick={() => setOpen(false)}
				>
					<div
						role="dialog"
						aria-label="Choose a date"
						onClick={(e) => e.stopPropagation()}
						className="w-full sm:max-w-sm bg-bg-surface border border-text-primary/[0.1] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl"
					>
						<div className="flex items-center justify-between mb-4">
							<button
								type="button"
								aria-label="Previous month"
								onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
								className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-text-primary/[0.06]"
							>
								<ChevronLeft className="w-5 h-5" />
							</button>
							<span className="font-display font-black text-base">
								{MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
							</span>
							<div className="flex items-center gap-1">
								<button
									type="button"
									aria-label="Next month"
									onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
									className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-text-primary/[0.06]"
								>
									<ChevronRight className="w-5 h-5" />
								</button>
								<button
									type="button"
									aria-label="Close calendar"
									onClick={() => setOpen(false)}
									className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-text-primary/[0.06] text-text-muted"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						</div>

						<div className="grid grid-cols-7 gap-y-1 text-center">
							{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((n, i) => (
								<span key={i} className="text-[10px] font-display font-semibold text-text-muted py-1">
									{n}
								</span>
							))}
							{monthCells.map((d, i) => {
								if (!d) return <span key={`e${i}`} />;
								const isSel = sameDay(d, selected);
								const isToday = sameDay(d, today);
								const count = matchDays[dayKey(d)] ?? 0;
								return (
									<button
										key={dayKey(d)}
										type="button"
										onClick={() => pick(d)}
										className={`mx-auto w-10 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 font-data text-sm transition-colors ${
											isSel
												? 'bg-accent-primary text-white font-bold'
												: isToday
												? 'border border-accent-primary/60 text-text-primary font-bold'
												: 'text-text-primary hover:bg-text-primary/[0.06]'
										}`}
									>
										<span className="leading-none">{d.getDate()}</span>
										<span
											className={`w-1 h-1 rounded-full ${
												count > 0 ? (isSel ? 'bg-white' : 'bg-accent-cyan') : 'bg-transparent'
											}`}
										/>
									</button>
								);
							})}
						</div>

						<button
							type="button"
							onClick={() => pick(today)}
							className="mt-4 w-full py-2.5 rounded-xl bg-text-primary/[0.05] border border-text-primary/[0.08] font-display font-bold text-xs tracking-wider hover:bg-text-primary/[0.09]"
						>
							GO TO TODAY
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
