'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export function LandingPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to join waitlist. Please try again.');
        return;
      }

      setStatus('success');
      setMessage(data.message || "You're on the waitlist!");
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <div className="landing-root min-h-screen bg-[#0B0B0D] text-[#FAFAFA] font-['Inter',sans-serif]">
      <style jsx global>{`
        :root {
          --ink: #0B0B0D;
          --white: #FFFFFF;
          --pink: #FF1F6D;
          --cyan: #00E0FF;
          --gray-50: #F6F6F7;
          --gray-200: #E4E4E7;
          --gray-500: #77767C;
          --gray-700: #3A393E;
        }

        .landing-wrap {
          max-width: 1080px;
          margin: 0 auto;
          padding: 0 32px;
        }

        .landing-heading {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          margin: 0;
        }

        /* Nav */
        .landing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 32px;
          max-width: 1080px;
          margin: 0 auto;
          position: relative;
          z-index: 10;
        }

        .landing-nav-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .landing-nav-preview {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #B7B7BC;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 9px 18px;
          border-radius: 20px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .landing-nav-preview:hover {
          color: var(--white);
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .landing-nav-cta {
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--white);
          background: var(--pink);
          padding: 10px 20px;
          border-radius: 20px;
          text-decoration: none;
          transition: transform 0.2s ease, opacity 0.2s ease;
        }

        .landing-nav-cta:hover {
          opacity: 0.95;
          transform: translateY(-1px);
        }

        /* Hero */
        .landing-hero {
          background: var(--ink);
          color: var(--white);
          padding: 60px 0 90px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .landing-hero .landing-wrap {
          position: relative;
          z-index: 2;
        }

        .landing-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 31, 109, 0.14);
          color: var(--pink);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.08em;
          padding: 7px 16px;
          border-radius: 20px;
          margin-bottom: 28px;
          text-transform: uppercase;
        }

        .landing-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--pink);
          animation: landing-blink 1.6s infinite;
        }

        @keyframes landing-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .landing-hero h1 {
          font-size: 56px;
          line-height: 1.08;
          letter-spacing: -0.02em;
          max-width: 680px;
          margin: 0 auto;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
        }

        .landing-hero h1 .landing-accent {
          color: var(--pink);
        }

        .landing-hero-sub {
          color: #B7B7BC;
          font-size: 17px;
          max-width: 520px;
          margin: 24px auto 0;
          line-height: 1.6;
        }

        /* Waitlist Form */
        .landing-waitlist-form {
          display: flex;
          gap: 10px;
          max-width: 440px;
          margin: 40px auto 0;
        }

        .landing-waitlist-form input {
          flex: 1;
          padding: 15px 18px;
          border-radius: 10px;
          border: 1px solid #2A2A2E;
          background: #151517;
          color: var(--white);
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .landing-waitlist-form input:focus {
          border-color: var(--pink);
        }

        .landing-waitlist-form input::placeholder {
          color: #6B6B70;
        }

        .landing-waitlist-form button {
          padding: 15px 26px;
          border-radius: 10px;
          border: none;
          background: var(--pink);
          color: var(--white);
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .landing-waitlist-form button:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .landing-waitlist-form button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .landing-form-note {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11.5px;
          color: #6B6B70;
          margin-top: 14px;
          letter-spacing: 0.02em;
        }

        .landing-form-message {
          margin-top: 14px;
          font-size: 14px;
          font-weight: 500;
        }

        /* Features */
        .landing-features {
          padding: 90px 0;
          background: var(--white);
          color: var(--ink);
        }

        .landing-section-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--pink);
          text-align: center;
          margin: 0 0 12px;
        }

        .landing-section-title {
          font-size: 32px;
          text-align: center;
          max-width: 600px;
          margin: 0 auto;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          line-height: 1.25;
          color: var(--ink);
        }

        .landing-feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-top: 52px;
        }

        .landing-feature-card {
          background: var(--gray-50);
          border: 1px solid var(--gray-200);
          border-radius: 16px;
          padding: 32px 28px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .landing-feature-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.05);
        }

        .landing-feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 11px;
          background: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .landing-feature-card h3 {
          font-size: 18px;
          margin-bottom: 10px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          color: var(--ink);
        }

        .landing-feature-card p {
          font-size: 14px;
          color: var(--gray-500);
          margin: 0;
          line-height: 1.6;
        }

        /* Launch Teaser */
        .landing-teaser {
          background: var(--ink);
          color: var(--white);
          border-radius: 24px;
          padding: 64px 48px;
          margin: 0 32px 90px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .landing-teaser-inner {
          max-width: 560px;
          margin: 0 auto;
          position: relative;
          z-index: 2;
        }

        .landing-teaser .landing-section-eyebrow {
          color: var(--cyan);
        }

        .landing-teaser h2 {
          font-size: 30px;
          color: var(--white);
          margin-bottom: 16px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          line-height: 1.25;
        }

        .landing-teaser p {
          color: #B7B7BC;
          font-size: 15px;
          margin: 0;
          line-height: 1.6;
        }

        /* Social Proof */
        .landing-proof {
          text-align: center;
          padding: 0 0 90px;
          background: var(--white);
        }

        .landing-proof-count {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
        }

        .landing-proof-count span {
          color: var(--pink);
          font-weight: 700;
        }

        .landing-avatars {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .landing-avatars .av {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--gray-200);
          border: 3px solid var(--white);
          margin-left: -10px;
        }

        .landing-avatars .av:first-child {
          margin-left: 0;
        }

        .landing-avatars .av-1 { background: #3A393E; }
        .landing-avatars .av-2 { background: #77767C; }
        .landing-avatars .av-3 { background: #A1A1AA; }
        .landing-avatars .av-4 { background: #E4E4E7; }
        .landing-avatars .av-5 { background: #FF1F6D; opacity: 0.8; }

        /* Footer */
        .landing-footer {
          border-top: 1px solid var(--gray-200);
          padding: 40px 0;
          background: var(--white);
        }

        .landing-footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .landing-footer-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 16px;
          color: var(--ink);
        }

        .landing-footer-tag {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: var(--gray-500);
          letter-spacing: 0.04em;
          margin-top: 4px;
        }

        .landing-footer-links {
          display: flex;
          gap: 22px;
          font-size: 13px;
        }

        .landing-footer-links a {
          color: var(--gray-500);
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .landing-footer-links a:hover {
          color: var(--ink);
        }

        @media (max-width: 720px) {
          .landing-nav {
            padding: 16px 20px;
            flex-direction: column;
            align-items: stretch;
            gap: 14px;
          }
          .landing-nav-actions {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .landing-nav-preview,
          .landing-nav-cta {
            flex: 1;
            text-align: center;
            justify-content: center;
            display: flex;
            align-items: center;
            font-size: 11.5px;
            padding: 8px 12px;
            white-space: nowrap;
          }
          .landing-hero h1 {
            font-size: 38px;
          }
          .landing-feature-grid {
            grid-template-columns: 1fr;
          }
          .landing-waitlist-form {
            flex-direction: column;
          }
          .landing-teaser {
            padding: 48px 28px;
            margin: 0 20px 70px;
          }
        }
      `}</style>

      {/* Nav */}
      <header className="bg-white">
        <nav className="landing-nav">
          <Link href="/" className="inline-flex items-center">
            <svg width="150" height="34" viewBox="0 0 450 116" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(0,4)">
                <rect x="0" y="0" width="90" height="90" rx="20" fill="#0B0B0D"/>
                <polygon points="49,16 30,49 40,49 34,73 60,39 46,39" fill="#FF1F6D"/>
                <circle cx="69" cy="21" r="6" fill="#00E0FF"/>
              </g>
              <text x="106" y="66" fontFamily="'Space Grotesk',sans-serif" fontSize="46" fontWeight="700" letterSpacing="-1">
                <tspan fill="#0B0B0D">esporting</tspan><tspan fill="#FF1F6D">hq</tspan>
              </text>
            </svg>
          </Link>

          <div className="landing-nav-actions">
            <Link href="/feed" className="landing-nav-preview">
              Live scores
            </Link>
            <a href="#waitlist" className="landing-nav-cta">
              Join waitlist
            </a>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-wrap">
          <div className="landing-pill">
            <span className="landing-pulse" />
            Coming soon
          </div>
          <h1>
            Live Scores.<br />
            <span className="landing-accent">Every Game.</span>
          </h1>
          <p className="landing-hero-sub">
            Esportinghq is the fastest way to follow competitive esports — every match, every score, tracked the moment it happens. We&apos;re getting ready to go live.
          </p>

          <form className="landing-waitlist-form" id="waitlist" onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              disabled={status === 'loading'}
            />
            <button type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Joining...' : 'Join the waitlist'}
            </button>
          </form>

          {status === 'success' && (
            <p className="landing-form-message text-[#00E0FF]">
              ✓ {message}
            </p>
          )}

          {status === 'error' && (
            <p className="landing-form-message text-[#FF1F6D]">
              ✕ {message}
            </p>
          )}

          <p className="landing-form-note">
            NO SPAM · ONE EMAIL WHEN WE GO LIVE · UNSUBSCRIBE ANYTIME
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="landing-wrap">
          <p className="landing-section-eyebrow">What&apos;s coming</p>
          <h2 className="landing-section-title">
            Everything you refresh five tabs for — in one place, live.
          </h2>
          <div className="landing-feature-grid">
            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <polygon points="11,2 4,11 8,11 6,18 15,8 10,8" fill="#FF1F6D"/>
                </svg>
              </div>
              <h3>Every match, tracked live</h3>
              <p>Scores update the second something happens — no refreshing, no stale numbers, across every title that matters.</p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="3" fill="#00E0FF"/>
                  <circle cx="10" cy="10" r="8" fill="none" stroke="#00E0FF" strokeWidth="1.5" opacity="0.4"/>
                </svg>
              </div>
              <h3>Built for the moment</h3>
              <p>Round-by-round updates, roster changes, and match state — delivered as it unfolds, not after the fact.</p>
            </div>

            <div className="landing-feature-card">
              <div className="landing-feature-icon">
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <rect x="2" y="2" width="7" height="7" rx="1.5" fill="#FF1F6D"/>
                  <rect x="11" y="2" width="7" height="7" rx="1.5" fill="#FF1F6D" opacity="0.5"/>
                  <rect x="2" y="11" width="7" height="7" rx="1.5" fill="#FF1F6D" opacity="0.5"/>
                  <rect x="11" y="11" width="7" height="7" rx="1.5" fill="#FF1F6D" opacity="0.25"/>
                </svg>
              </div>
              <h3>Teams, brackets, results</h3>
              <p>One home for tournament coverage — no more piecing it together across five different sites.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Launch Teaser */}
      <div className="bg-white pb-6">
        <section className="landing-teaser">
          <div className="landing-teaser-inner">
            <p className="landing-section-eyebrow">The launch</p>
            <h2>We&apos;re saving our debut for the big stage.</h2>
            <p>Esportinghq is holding its public launch for a major event on the competitive calendar. Join the waitlist now, and you&apos;ll be live with us from the opening match.</p>
          </div>
        </section>
      </div>

      {/* Social Proof */}
      <section className="landing-proof">
        <div className="landing-wrap">
          <div className="landing-avatars">
            <div className="av av-1" />
            <div className="av av-2" />
            <div className="av av-3" />
            <div className="av av-4" />
            <div className="av av-5" />
          </div>
          <p className="landing-proof-count">
            Join <span>500+</span> fans already on the list
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-wrap landing-footer-row">
          <div>
            <div className="landing-footer-logo">
              <svg width="26" height="26" viewBox="0 0 200 200">
                <rect width="200" height="200" rx="44" fill="#0B0B0D"/>
                <polygon points="110,37 67,110 90,110 77,163 133,87 103,87" fill="#FF1F6D"/>
                <circle cx="153" cy="47" r="13" fill="#00E0FF"/>
              </svg>
              <span>esporting<span style={{ color: 'var(--pink)' }}>hq</span><span style={{ fontSize: '10px', color: 'var(--gray-500)' }}> TM</span></span>
            </div>
            <p className="landing-footer-tag">LIVE SCORES. EVERY GAME.</p>
          </div>
          <div className="landing-footer-links">
            <a href="https://x.com/esportinghq" target="_blank" rel="noopener noreferrer">Twitter / X</a>
            <a href="https://instagram.com/esportinghq" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://discord.gg/esportinghq" target="_blank" rel="noopener noreferrer">Discord</a>
            <Link href="/feed" style={{ color: 'var(--pink)', fontWeight: 600 }}>Live Feed →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
