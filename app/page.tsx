export default function HomePage() {
	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#0a0a0a',
				color: '#fff',
			}}
		>
			<div style={{ textAlign: 'center' }}>
				<h1 style={{ fontSize: 32, fontWeight: 700 }}>Esporting</h1>
				<p style={{ color: '#888', marginTop: 8 }}>
					Live eSports Scores & Results
				</p>
			</div>
		</div>
	);
}
