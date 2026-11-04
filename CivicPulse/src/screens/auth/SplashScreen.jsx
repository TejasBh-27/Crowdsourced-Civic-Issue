import React, { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);

  const STEPS = [
    'Connecting to MongoDB Atlas...',
    'Initializing TensorFlow CV Model...',
    'Loading DistilBERT NLP Engine...',
    'Starting Node.js API Gateway...',
    'Ready!'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
    }, 20);
    const stepInterval = setInterval(() => {
      setStep(s => Math.min(s + 1, STEPS.length - 1));
    }, 200);
    return () => { clearInterval(interval); clearInterval(stepInterval); };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0F172A 0%, #0D9488 60%, #0F766E 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background circles */}
      <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

      {/* Logo */}
      <div
        className="animate-pulse-glow"
        style={{
          width: '88px',
          height: '88px',
          borderRadius: '28px',
          background: 'rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          marginBottom: '24px',
          border: '1px solid rgba(255,255,255,0.2)',
          animation: 'splashLogo 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both'
        }}
      >
        🏛️
      </div>

      <h1 style={{ color: '#FFFFFF', fontSize: '36px', fontWeight: '800', letterSpacing: '-0.04em', marginBottom: '6px' }}>
        CivicPulse
      </h1>
      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', fontWeight: '500', textAlign: 'center', maxWidth: '280px', lineHeight: 1.5, marginBottom: '40px' }}>
        AI-Powered Municipal Governance Platform
      </p>

      {/* Progress Bar */}
      <div style={{ width: '100%', maxWidth: '280px', marginBottom: '16px' }}>
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #5EEAD4, #FFFFFF)',
            borderRadius: '2px',
            transition: 'width 0.05s linear',
            boxShadow: '0 0 8px rgba(255,255,255,0.5)'
          }} />
        </div>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '600', fontFamily: 'monospace' }}>
        {STEPS[step]}
      </p>

      {/* Tech Stack Pills */}
      <div style={{ position: 'absolute', bottom: '32px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['TensorFlow CV', 'DistilBERT NLP', 'Scikit-Learn ML', 'Node.js Gateway', 'MongoDB Atlas'].map((tech) => (
          <span key={tech} style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.55)',
            padding: '3px 8px',
            borderRadius: '9999px',
            fontSize: '9px',
            fontWeight: '700',
            letterSpacing: '0.05em'
          }}>
            {tech}
          </span>
        ))}
      </div>
    </div>
  );
}
