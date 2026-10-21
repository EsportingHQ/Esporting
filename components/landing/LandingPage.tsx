'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export type WaitlistRole = 'gamer' | 'organizer' | 'team' | 'fan';

export function LandingPage() {
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<WaitlistRole>('gamer');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Initial form submit opens role selection modal
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setStatus('idle');
    setMessage('');
    setIsModalOpen(true);
  };

  // Final submit sending email + role to API
  const handleFinalSubmit = async (roleToSubmit?: WaitlistRole) => {
    const role = roleToSubmit || selectedRole;
    setStatus('loading');
    setMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || 'Unable to join waitlist. Please try again.');
        setIsModalOpen(false);
        return;
      }

      setStatus('success');
      setMessage(data.message || "You're on the waitlist!");
      setEmail('');
      setIsModalOpen(false);
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
      setIsModalOpen(false);
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

        /* Modal Popup */
        .landing-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(11, 11, 13, 0.78);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: landing-fade-in 0.25s ease-out;
        }

        .landing-modal-card {
          background: #111114;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 36px 32px 32px;
          max-width: 480px;
          width: 100%;
          position: relative;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(255, 31, 109, 0.12);
          animation: landing-pop-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .landing-modal-close {
          position: absolute;
          top: 18px;
          right: 20px;
          background: transparent;
          border: none;
          color: #77767C;
          font-size: 24px;
          cursor: pointer;
          line-height: 1;
          padding: 6px;
          border-radius: 8px;
          transition: color 0.15s ease;
        }

        .landing-modal-close:hover {
          color: var(--white);
        }

        .landing-modal-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--cyan);
          background: rgba(0, 224, 255, 0.1);
          padding: 4px 12px;
          border-radius: 20px;
          margin-bottom: 14px;
        }

        .landing-modal-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: var(--white);
          line-height: 1.25;
          margin-bottom: 8px;
        }

        .landing-modal-desc {
          font-size: 14px;
          color: #B7B7BC;
          margin: 0 0 24px;
          line-height: 1.5;
        }

        .landing-role-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }

        .landing-role-btn {
          background: #18181C;
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--white);
        }

        .landing-role-btn:hover {
          background: #202025;
          border-color: rgba(255, 31, 109, 0.4);
          transform: translateY(-2px);
        }

        .landing-role-btn.active {
          background: rgba(255, 31, 109, 0.12);
          border-color: var(--pink);
          box-shadow: 0 0 20px rgba(255, 31, 109, 0.25);
        }

        .landing-role-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: #0B0B0D;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }

        .landing-role-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 15px;
          font-weight: 700;
          line-height: 1.2;
        }

        .landing-role-hint {
          font-size: 11px;
          color: #77767C;
          line-height: 1.35;
        }

        .landing-role-btn.active .landing-role-hint {
          color: #D4D4D8;
        }

        .landing-modal-submit {
          width: 100%;
          padding: 15px 24px;
          border-radius: 12px;
          border: none;
          background: var(--pink);
          color: var(--white);
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }

        .landing-modal-submit:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
        }

        .landing-modal-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @keyframes landing-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes landing-pop-in {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 720px) {
          .landing-role-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .landing-modal-card {
            padding: 28px 22px 24px;
          }
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

          <form className="landing-waitlist-form" id="waitlist" onSubmit={handleInitialSubmit}>
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

      {/* Role Selection Modal Popup */}
      {isModalOpen && (
        <div
          className="landing-modal-backdrop"
          onClick={() => !status.startsWith('loading') && setIsModalOpen(false)}
        >
          <div
            className="landing-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
          >
            <button
              type="button"
              className="landing-modal-close"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close modal"
              disabled={status === 'loading'}
            >
              ×
            </button>

            <div className="landing-modal-badge">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E0FF] animate-pulse" />
              Quick question
            </div>

            <h3 id="role-modal-title" className="landing-modal-title">
              What best describes you?
            </h3>
            <p className="landing-modal-desc">
              We&apos;re tailoring the debut experience for your corner of the esports world.
            </p>

            <div className="landing-role-grid">
              {/* Option 1: Gamer / Player */}
              <button
                type="button"
                className={`landing-role-btn ${selectedRole === 'gamer' ? 'active' : ''}`}
                onClick={() => setSelectedRole('gamer')}
              >
                <div className="landing-role-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selectedRole === 'gamer' ? '#FF1F6D' : '#FAFAFA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="3" />
                    <line x1="6" y1="12" x2="10" y2="12" />
                    <line x1="8" y1="10" x2="8" y2="14" />
                    <circle cx="15" cy="12" r="1" fill="#FAFAFA" />
                    <circle cx="18" cy="12" r="1" fill="#FAFAFA" />
                  </svg>
                </div>
                <span className="landing-role-name">Gamer / Player</span>
                <span className="landing-role-hint">Compete, grind rankings, and track stats</span>
              </button>

              {/* Option 2: Fan / Spectator */}
              <button
                type="button"
                className={`landing-role-btn ${selectedRole === 'fan' ? 'active' : ''}`}
                onClick={() => setSelectedRole('fan')}
              >
                <div className="landing-role-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selectedRole === 'fan' ? '#FF1F6D' : '#FAFAFA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={selectedRole === 'fan' ? '#FF1F6D' : 'none'} />
                  </svg>
                </div>
                <span className="landing-role-name">Esports Fan</span>
                <span className="landing-role-hint">Follow live matches and tournaments</span>
              </button>

              {/* Option 3: Tournament Organizer */}
              <button
                type="button"
                className={`landing-role-btn ${selectedRole === 'organizer' ? 'active' : ''}`}
                onClick={() => setSelectedRole('organizer')}
              >
                <div className="landing-role-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selectedRole === 'organizer' ? '#FF1F6D' : '#FAFAFA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                </div>
                <span className="landing-role-name">Organizer</span>
                <span className="landing-role-hint">Run brackets, events, and broadcasts</span>
              </button>

              {/* Option 4: Esports Team / Org */}
              <button
                type="button"
                className={`landing-role-btn ${selectedRole === 'team' ? 'active' : ''}`}
                onClick={() => setSelectedRole('team')}
              >
                <div className="landing-role-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={selectedRole === 'team' ? '#FF1F6D' : '#FAFAFA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill={selectedRole === 'team' ? '#FF1F6D' : 'none'} />
                  </svg>
                </div>
                <span className="landing-role-name">Esports Team</span>
                <span className="landing-role-hint">Rosters, team hub, and live results</span>
              </button>
            </div>

            <button
              type="button"
              className="landing-modal-submit"
              onClick={() => handleFinalSubmit(selectedRole)}
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Securing your spot...' : 'Confirm & Join Waitlist'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
