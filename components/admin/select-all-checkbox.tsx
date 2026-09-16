'use client';

export function SelectAllCheckbox() {
	return (
		<input
			type="checkbox"
			aria-label="Select all articles"
			className="h-4 w-4 rounded border-border-line bg-bg-void text-accent-readout focus:ring-accent-readout"
			onChange={(e) => {
				const checked = e.currentTarget.checked;
				document
					.querySelectorAll<HTMLInputElement>(
						'input[name="article_ids"]',
					)
					.forEach((input) => {
						input.checked = checked;
					});
			}}
		/>
	);
}
