import React from 'react';
import { AppLogo } from './AppLogo';

interface LandingPageProps {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: LandingPageProps) {
  const scrollToDemo = () => {
    document.querySelector('.assistant-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page-container">
      {/* SCOPED LANDING PAGE STYLES - Removed automatically on unmount */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700&display=swap');
        
        .landing-page-container {
          background: #09090B;
          color: #FAFAFA;
          font-family: 'Space Grotesk', sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
          width: 100%;
          position: relative;
        }

        .landing-page-container * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        /* NOISE TEXTURE */
        .landing-noise {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 999;
          opacity: .03;
          mix-blend-mode: overlay;
        }
        .landing-noise svg {
          width: 100%;
          height: 100%;
        }

        /* NAV */
        .landing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          height: 48px;
          border-bottom: 1px solid #3F3F46;
          position: sticky;
          top: 0;
          z-index: 100;
          background: #0A0A0A;
        }
        .landing-nav-logo {
          font-family: 'Barlow Condensed', sans-serif;
          font-weight: 700;
          font-size: 20px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .landing-nav-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .landing-nav-btn {
          background: #DFE104;
          color: #000;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          border: none;
          padding: 10px 20px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .landing-nav-btn:hover {
          transform: scale(1.05);
        }

        /* MARQUEE */
        .landing-marquee-strip {
          background: #DFE104;
          color: #000;
          overflow: hidden;
          white-space: nowrap;
          padding: 10px 0;
          border-top: 1px solid #DFE104;
          border-bottom: 1px solid #DFE104;
        }
        .landing-marquee-track {
          display: inline-flex;
          animation: landing-marquee 18s linear infinite;
        }
        .landing-marquee-item {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          padding: 0 40px;
        }
        .landing-marquee-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          background: #000;
          border-radius: 50%;
          vertical-align: middle;
          margin-right: 40px;
        }
        @keyframes landing-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        /* HERO */
        .landing-hero {
          padding: 80px 32px 64px;
          border-bottom: 1px solid #3F3F46;
          position: relative;
          overflow: hidden;
        }
        .landing-hero-eyebrow {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #DFE104;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .landing-hero-eyebrow::before {
          content: '';
          width: 32px;
          height: 1px;
          background: #DFE104;
        }
        .landing-hero-title {
          font-size: clamp(3.2rem, 9vw, 7.5rem);
          font-weight: 700;
          text-transform: uppercase;
          line-height: 0.88;
          letter-spacing: -0.03em;
          margin-bottom: 32px;
        }
        .landing-hero-title .accent-line {
          color: #DFE104;
        }
        .landing-hero-title .chaos-container {
          display: inline-flex;
          align-items: baseline;
          position: relative;
          white-space: nowrap;
        }
        .landing-hero-title .chaos-in {
          color: #27272A;
          margin-right: 0.15em;
        }
        .landing-hero-title .chaos-box {
          background: #09090B;
          color: #DFE104;
          padding: 0.05em 0.14em;
          display: inline-block;
          line-height: 0.85;
          transform: translateY(0.04em);
        }
        .landing-hero-title .chaos-os {
          color: #27272A;
        }
        .landing-hero-sub {
          font-size: clamp(0.95rem, 2vw, 1.2rem);
          color: #A1A1AA;
          max-width: 480px;
          line-height: 1.5;
          margin-bottom: 48px;
        }
        .landing-hero-actions {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          align-items: center;
        }
        .landing-btn-primary {
          background: #DFE104;
          color: #000;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: none;
          padding: 18px 36px;
          cursor: pointer;
          transition: transform 0.2s, scale 0.2s;
        }
        .landing-btn-primary:hover {
          transform: scale(1.05);
        }
        .landing-btn-primary:active {
          transform: scale(0.95);
        }
        .landing-btn-outline {
          background: transparent;
          color: #FAFAFA;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: 2px solid #3F3F46;
          padding: 18px 36px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
        }
        .landing-btn-outline:hover {
          background: #FAFAFA;
          color: #000;
          border-color: #FAFAFA;
        }

        /* HERO BG NUMBER */
        .landing-hero-bg-num {
          position: absolute;
          right: -20px;
          top: -20px;
          font-size: clamp(8rem, 22vw, 18rem);
          font-weight: 700;
          color: #27272A;
          opacity: 0.3;
          line-height: 1;
          pointer-events: none;
          user-select: none;
          z-index: 0;
          letter-spacing: -0.06em;
        }
        .landing-hero-content {
          position: relative;
          z-index: 1;
        }

        /* STATS BAR */
        .landing-stats-bar {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          border-bottom: 1px solid #3F3F46;
        }
        .landing-stat-item {
          padding: 32px 32px;
          border-right: 1px solid #3F3F46;
          position: relative;
          overflow: hidden;
          transition: background 0.3s, color 0.3s;
        }
        .landing-stat-item:last-child {
          border-right: none;
        }
        .landing-stat-item:hover {
          background: #DFE104;
        }
        .landing-stat-num {
          font-size: clamp(2.5rem, 6vw, 4rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: -0.04em;
          line-height: 1;
          transition: color 0.3s;
        }
        .landing-stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #A1A1AA;
          margin-top: 8px;
          transition: color 0.3s;
        }
        .landing-stat-item:hover .landing-stat-num,
        .landing-stat-item:hover .landing-stat-label {
          color: #000;
        }

        /* FEATURES SECTION */
        .landing-section-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #DFE104;
          padding: 40px 32px 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .landing-section-label::before {
          content: '';
          width: 32px;
          height: 1px;
          background: #DFE104;
        }
        .landing-section-title {
          font-size: clamp(2rem, 6vw, 5rem);
          font-weight: 700;
          text-transform: uppercase;
          line-height: 0.9;
          letter-spacing: -0.03em;
          padding: 20px 32px 40px;
        }

        /* FEATURE CARDS GRID */
        .landing-features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: #3F3F46;
          border-top: 1px solid #3F3F46;
        }
        .landing-feat-card {
          background: #09090B;
          padding: 40px 32px;
          cursor: default;
          transition: background 0.3s;
          position: relative;
          overflow: hidden;
        }
        .landing-feat-card:hover {
          background: #DFE104;
        }
        .landing-feat-icon {
          font-size: 28px;
          margin-bottom: 20px;
          transition: filter 0.3s;
        }
        .landing-feat-card:hover .landing-feat-icon {
          filter: invert(1);
        }
        .landing-feat-num {
          font-size: clamp(4rem, 8vw, 7rem);
          font-weight: 700;
          color: #27272A;
          line-height: 1;
          letter-spacing: -0.04em;
          position: absolute;
          right: 24px;
          top: 16px;
          pointer-events: none;
          transition: color 0.3s;
        }
        .landing-feat-card:hover .landing-feat-num {
          color: rgba(0, 0, 0, 0.1);
        }
        .landing-feat-title {
          font-size: clamp(1.2rem, 2.5vw, 1.8rem);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin-bottom: 12px;
          transition: color 0.3s;
          max-width: 260px;
        }
        .landing-feat-desc {
          font-size: 14px;
          color: #A1A1AA;
          line-height: 1.6;
          max-width: 280px;
          transition: color 0.3s;
        }
        .landing-feat-card:hover .landing-feat-title,
        .landing-feat-card:hover .landing-feat-desc {
          color: #000;
        }
        .landing-feat-card:hover .landing-feat-desc {
          color: rgba(0, 0, 0, 0.7);
        }

        /* AI ASSISTANT SECTION */
        .landing-assistant-section {
          padding: 64px 32px;
          border-top: 1px solid #3F3F46;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: center;
        }
        .landing-assistant-visual {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .landing-orb-wrap {
          position: relative;
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .landing-orb-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid #DFE104;
          animation: landing-pulse-ring 3s ease-out infinite;
        }
        .landing-orb-ring:nth-child(1) {
          width: 200px;
          height: 200px;
          opacity: 0.3;
          animation-delay: 0s;
        }
        .landing-orb-ring:nth-child(2) {
          width: 150px;
          height: 150px;
          opacity: 0.5;
          animation-delay: 0.5s;
        }
        .landing-orb-ring:nth-child(3) {
          width: 100px;
          height: 100px;
          opacity: 0.7;
          animation-delay: 1s;
        }
        @keyframes landing-pulse-ring {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.05); opacity: 0.2; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        .landing-orb-core {
          width: 72px;
          height: 72px;
          background: #DFE104;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          font-size: 32px;
          position: relative;
        }
        .landing-orb-core::after {
          content: '';
          position: absolute;
          inset: -3px;
          background: #DFE104;
          z-index: -1;
          filter: blur(12px);
          opacity: 0.4;
        }
        .landing-assistant-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .landing-assistant-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #DFE104;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .landing-assistant-label::before {
          content: '';
          width: 24px;
          height: 1px;
          background: #DFE104;
        }
        .landing-assistant-title {
          font-size: clamp(1.8rem, 4vw, 3.2rem);
          font-weight: 700;
          text-transform: uppercase;
          line-height: 0.95;
          letter-spacing: -0.03em;
          margin-bottom: 20px;
        }
        .landing-assistant-desc {
          font-size: 15px;
          color: #A1A1AA;
          line-height: 1.6;
          max-width: 360px;
          margin-bottom: 32px;
        }
        .landing-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          border: 1px solid #3F3F46;
          padding: 8px 16px;
          color: #A1A1AA;
        }
        .landing-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00ff88;
          animation: landing-blink 1.5s ease-in-out infinite;
        }
        @keyframes landing-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* TESTIMONIALS MARQUEE */
        .landing-testimonials-section {
          border-top: 1px solid #3F3F46;
          padding-top: 48px;
        }
        .landing-testi-marquee-wrap {
          overflow: hidden;
          padding: 16px 0 48px;
        }
        .landing-testi-track {
          display: inline-flex;
          gap: 24px;
          animation: landing-marquee2 30s linear infinite;
        }
        .landing-testi-card {
          background: #27272A;
          border: 1px solid #3F3F46;
          padding: 28px;
          width: 280px;
          flex-shrink: 0;
        }
        .landing-testi-quote {
          font-size: 14px;
          color: #FAFAFA;
          line-height: 1.6;
          margin-bottom: 16px;
        }
        .landing-testi-author {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #DFE104;
        }
        @keyframes landing-marquee2 {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        /* CTA SECTION */
        .landing-cta-section {
          background: #DFE104;
          padding: 80px 32px;
          border-top: 1px solid #DFE104;
        }
        .landing-cta-inner {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 32px;
          flex-wrap: wrap;
        }
        .landing-cta-title {
          font-size: clamp(2.5rem, 7vw, 6rem);
          font-weight: 700;
          text-transform: uppercase;
          line-height: 0.88;
          letter-spacing: -0.04em;
          color: #000;
          max-width: 580px;
        }
        .landing-cta-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: flex-start;
        }
        .landing-cta-btn {
          background: #000;
          color: #FAFAFA;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border: 2px solid #000;
          padding: 18px 40px;
          cursor: pointer;
          white-space: nowrap;
          transition: transform 0.2s;
        }
        .landing-cta-btn:hover {
          transform: scale(1.05);
        }
        .landing-cta-sub {
          font-size: 12px;
          color: rgba(0, 0, 0, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* FOOTER */
        .landing-footer {
          border-top: 1px solid #3F3F46;
          padding: 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          background: #09090B;
        }
        .landing-footer-logo {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .landing-footer-logo span {
          color: #DFE104;
        }
        .landing-footer-meta {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #A1A1AA;
        }

        /* RESPONSIVE */
        @media(max-width:600px){
          .landing-stats-bar {
            grid-template-columns: 1fr;
          }
          .landing-stat-item {
            border-right: none;
            border-bottom: 1px solid #3F3F46;
          }
          .landing-features-grid {
            grid-template-columns: 1fr;
          }
          .landing-assistant-section {
            grid-template-columns: 1fr;
          }
          .landing-cta-inner {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      ` }} />

      {/* NOISE */}
      <div className="landing-noise" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg">
          <filter id="n"><feTurbulence baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/></filter>
          <rect width="100%" height="100%" filter="url(#n)"/>
        </svg>
      </div>

      {/* NAV */}
      <nav className="landing-nav">
        <div className="flex items-center gap-3">
          <AppLogo className="w-8 h-8" />
          <span className="font-sans font-bold text-3xl text-white tracking-[0.2em] flex items-center gap-3">
            <span>K</span>
            <span>E</span>
            <span>N</span>
            <span>S</span>
            <div className="flex flex-col gap-0.5 mt-1">
              <div className="w-3 h-0.5 bg-[#DFE104]"></div>
              <div className="w-3 h-0.5 bg-[#DFE104]"></div>
              <div className="w-3 h-0.5 bg-[#DFE104]"></div>
            </div>
            <span>E</span>
            <span>I</span>
          </span>
        </div>
        <div className="landing-nav-right">
          {/* Badge 'Premium AI Tier' removed because it is too sloppy as requested */}
          <button className="landing-nav-btn" onClick={onEnterApp}>Open Dashboard →</button>
        </div>
      </nav>

      {/* TOP MARQUEE */}
      <div className="landing-marquee-strip" aria-hidden="true">
        <div className="landing-marquee-track">
          <span className="landing-marquee-item">Decision Engine Online</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Critical Tasks Resolved</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Calendar Gap Analyzer Active</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Streak: 5 Days Saved</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Velocity Rate: 0.7/Day</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Focus Blocks Locked</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Decision Engine Online</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Critical Tasks Resolved</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Calendar Gap Analyzer Active</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Streak: 5 Days Saved</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Velocity Rate: 0.7/Day</span><span className="landing-marquee-dot"></span>
          <span className="landing-marquee-item">Focus Blocks Locked</span><span className="landing-marquee-dot"></span>
        </div>
      </div>

      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-bg-num" aria-hidden="true">AI</div>
        <div className="landing-hero-content">
          <div className="landing-hero-eyebrow">The Last-Minute Companion</div>
          <h1 className="landing-hero-title">
            STOP<br/>
            <span className="accent-line">DROWNING</span><br/>
            <span className="chaos-container">
              <span className="chaos-in">IN</span>
              <span className="chaos-box">CHA</span>
              <span className="chaos-os">OS</span>
            </span>
          </h1>
          <p className="landing-hero-sub">Dump your chaotic thoughts. AI structures, schedules, and prioritizes everything—so you ship what matters before the clock runs out.</p>
          <div className="landing-hero-actions">
            <button className="landing-btn-primary" onClick={onEnterApp}>Brain-Dump Now →</button>
            <button className="landing-btn-outline" onClick={scrollToDemo}>Watch It Work</button>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="landing-stats-bar" role="list">
        <div className="landing-stat-item" role="listitem">
          <div className="landing-stat-num">9.5</div>
          <div className="landing-stat-label">Max Critical Score</div>
        </div>
        <div className="landing-stat-item" role="listitem">
          <div className="landing-stat-num">56%</div>
          <div className="landing-stat-label">Avg Clearance Rate</div>
        </div>
        <div className="landing-stat-item" role="listitem">
          <div className="landing-stat-num">∞</div>
          <div className="landing-stat-label">Focus Blocks Available</div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="landing-section-label" aria-label="Features section">What It Does</div>
      <h2 className="landing-section-title">FOUR<br/>WEAPONS</h2>

      <div className="landing-features-grid" role="list">
        <div className="landing-feat-card" role="listitem" tabIndex={0}>
          <div className="landing-feat-num" aria-hidden="true">01</div>
          <div className="landing-feat-icon" aria-hidden="true">🧠</div>
          <h3 className="landing-feat-title">AI Task Intake</h3>
          <p className="landing-feat-desc">Speak or type chaos. AI parses intent, assigns urgency scores, and slots every task into your day automatically.</p>
        </div>
        <div className="landing-feat-card" role="listitem" tabIndex={0}>
          <div className="landing-feat-num" aria-hidden="true">02</div>
          <div className="landing-feat-icon" aria-hidden="true">📅</div>
          <h3 className="landing-feat-title">Calendar Gap Analyzer</h3>
          <p className="landing-feat-desc">Scans your calendar for gaps. Auto-blocks focus time for critical tasks. No manual scheduling—ever again.</p>
        </div>
        <div className="landing-features-grid-spacer sm:hidden" />
        <div className="landing-feat-card" role="listitem" tabIndex={0}>
          <div className="landing-feat-num" aria-hidden="true">03</div>
          <div className="landing-feat-icon" aria-hidden="true">⚡</div>
          <h3 className="landing-feat-title">Task Velocity Engine</h3>
          <p className="landing-feat-desc">Real-time analytics on your completion rate vs incoming demand. See where you're falling behind before it's too late.</p>
        </div>
        <div className="landing-feat-card" role="listitem" tabIndex={0}>
          <div className="landing-feat-num" aria-hidden="true">04</div>
          <div className="landing-feat-icon" aria-hidden="true">🔥</div>
          <h3 className="landing-feat-title">Monthly Heatmap</h3>
          <p className="landing-feat-desc">Build unstoppable momentum. Track your daily wins, protect your streak, and level up from Apprentice to habit machine.</p>
        </div>
      </div>

      {/* AI ASSISTANT SECTION */}
      <section className="landing-assistant-section">
        <div className="landing-assistant-visual">
          <div className="landing-orb-wrap" role="img" aria-label="Kensei assistant icon, animated">
            <div className="landing-orb-ring"></div>
            <div className="landing-orb-ring"></div>
            <div className="landing-orb-ring"></div>
            <div className="landing-orb-core" aria-hidden="true">🛟</div>
          </div>
        </div>
        <div className="landing-assistant-info">
          <div className="landing-assistant-label">Your Co-Pilot</div>
          <h2 className="landing-assistant-title">Meet<br/>Lumio</h2>
          <p className="landing-assistant-desc">Not a chatbot. A decision engine. Tap the pulsing lifebuoy anytime—get instant task breakdowns, deadline warnings, and next-step clarity in seconds.</p>
          <div className="landing-status-pill">
            <span className="landing-status-dot" aria-hidden="true"></span>
            Decision Engine Online
          </div>
        </div>
      </section>

      {/* TESTIMONIALS MARQUEE */}
      <section className="landing-testimonials-section">
        <div className="landing-section-label">Social Proof</div>
        <div className="landing-testi-marquee-wrap" aria-label="Testimonials">
          <div className="landing-testi-track" aria-hidden="true">
            <div className="landing-testi-card"><p className="landing-testi-quote">"I shipped my project with 20 minutes to spare. I don't know how I used to function without this."</p><div className="landing-testi-author">@Priya_Dev</div></div>
            <div className="landing-testi-card"><p className="landing-testi-quote">"The calendar gap analyzer saved me from double-booking a critical deadline. Game-changing."</p><div className="landing-testi-author">@Marcus_Builds</div></div>
            <div className="landing-testi-card"><p className="landing-testi-quote">"Brain-dumping into voice input and watching AI sort everything in real time is genuinely magical."</p><div className="landing-testi-author">@SoraDesigns</div></div>
            <div className="landing-testi-card"><p className="landing-testi-quote">"My streak hit 14 days. I've never been this consistent in my life. The heatmap is addictive."</p><div className="landing-testi-author">@Kai_Builds</div></div>
            <div className="landing-testi-card"><p className="landing-testi-quote">"I shipped my project with 20 minutes to spare. I don't know how I used to function without this."</p><div className="landing-testi-author">@Priya_Dev</div></div>
            <div className="landing-testi-card"><p className="landing-testi-quote">"The calendar gap analyzer saved me from double-booking a critical deadline. Game-changing."</p><div className="landing-testi-author">@Marcus_Builds</div></div>
            <div className="landing-testi-card"><p className="landing-testi-quote">"Brain-dumping into voice input and watching AI sort everything in real time is genuinely magical."</p><div className="landing-testi-author">@SoraDesigns</div></div>
            <div className="landing-testi-card"><p className="landing-testi-quote">"My streak hit 14 days. I've never been this consistent in my life. The heatmap is addictive."</p><div className="landing-testi-author">@Kai_Builds</div></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta-section">
        <div className="landing-cta-inner">
          <h2 className="landing-cta-title">STOP<br/>LOSING TIME.<br/>START NOW.</h2>
          <div className="landing-cta-actions">
            <button className="landing-cta-btn" onClick={onEnterApp}>Open Kensei →</button>
            <div className="landing-cta-sub">Free to use · No signup required</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer" style={{ justifyContent: 'center', padding: '24px 32px', borderTop: '1px solid #18181B' }}>
        <div style={{ color: '#71717A', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'monospace' }}>
          © 2026 Kensei. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
