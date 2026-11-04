import React, { useState } from 'react';
import COLORS from '../constants/colors';

const BADGE_CONFIG = {
  cv: {
    icon: '🔬',
    label: 'Computer Vision',
    model: 'OpenCV Laplacian Variance',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
  nlp: {
    icon: '💬',
    label: 'NLP Classifier',
    model: 'TF-IDF + LogisticRegression',
    color: '#0369A1',
    bg: '#E0F2FE',
  },
  ml: {
    icon: '📊',
    label: 'Priority ML',
    model: 'RandomForestClassifier',
    color: '#B45309',
    bg: '#FEF3C7',
  },
};

const URGENCY_COLOR = {
  low:      { bg: '#DCFCE7', text: '#166534' },
  medium:   { bg: '#FEF3C7', text: '#92400E' },
  high:     { bg: '#FEE2E2', text: '#991B1B' },
  critical: { bg: '#FCA5A5', text: '#7F1D1D' },
};

export default function AiInspectionBadge({ aiResult }) {
  const [expanded, setExpanded] = useState(false);

  if (!aiResult) return null;

  const isVerified  = aiResult.aiVerified;
  const cvResult    = aiResult.cvResult  || {};
  const nlpResult   = aiResult.nlpResult || {};
  const mlResult    = aiResult.mlPriority || {};

  // Detect if real Python AI results (have laplacianVariance / topFeatures)
  const isRealAI = !!(cvResult.laplacianVariance || nlpResult.topFeatures);

  const urgencyLevel = (mlResult.level || 'medium').toLowerCase();
  const urgencyColors = URGENCY_COLOR[urgencyLevel] || URGENCY_COLOR.medium;

  return (
    <div style={{ marginBottom: '16px' }}>

      {/* ── Header strip ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: isVerified
            ? 'linear-gradient(135deg, #0F172A 0%, #134E4A 100%)'
            : 'linear-gradient(135deg, #7F1D1D 0%, #991B1B 100%)',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: '14px',
          padding: '14px 16px',
          cursor: 'pointer',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>{isVerified ? '✅' : '❌'}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '13px', fontWeight: '800' }}>
              {isVerified ? 'AI Pipeline: Verified ✓' : 'AI Pipeline: Rejected ✗'}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '1px' }}>
              {isRealAI
                ? '🟢 Real AI (OpenCV + sklearn) · tap to expand'
                : '🟡 Mock AI (demo mode) · tap to expand'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isVerified && mlResult.level && (
            <span style={{
              backgroundColor: urgencyColors.bg,
              color: urgencyColors.text,
              padding: '3px 10px',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: '800',
              textTransform: 'uppercase',
            }}>
              {urgencyLevel}
            </span>
          )}
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {/* ── Rejection reason ──────────────────────────────────────────────── */}
      {!isVerified && aiResult.rejectionReason && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1.5px solid #FCA5A5',
          borderRadius: '10px',
          padding: '10px 14px',
          marginTop: '8px',
          fontSize: '12px',
          color: '#991B1B',
          lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: '800' }}>Rejection Reason: </span>
          {aiResult.rejectionReason}
        </div>
      )}

      {/* ── Expanded model details ─────────────────────────────────────────── */}
      {expanded && (
        <div style={{
          marginTop: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          animation: 'fadeIn 0.2s ease',
        }}>

          {/* CV Module */}
          <ModelCard
            config={BADGE_CONFIG.cv}
            rows={[
              ['Status',    isVerified ? '✅ Image Accepted' : '❌ Image Rejected'],
              ['Algorithm', 'Laplacian Variance (cv2.Laplacian)'],
              ['Clarity',   cvResult.clarityScore != null ? `${cvResult.clarityScore}/100` : '—'],
              ...(cvResult.laplacianVariance != null
                ? [['Laplacian Var', cvResult.laplacianVariance.toFixed(2)]]
                : []),
              ...(cvResult.brightness != null
                ? [['Brightness', `${cvResult.brightness}`], ['Contrast', `${cvResult.contrast}`]]
                : []),
              ['Dimensions',   cvResult.dimensions || '—'],
              ['Confidence',   cvResult.confidence != null ? `${(cvResult.confidence * 100).toFixed(1)}%` : `${Math.round((cvResult.clarityScore || 90))}%`],
              ['Model',        cvResult.model || 'CivicCV-OpenCV v1.0'],
            ]}
          />

          {/* NLP Module */}
          {(isVerified || nlpResult) && (
            <ModelCard
              config={BADGE_CONFIG.nlp}
              rows={[
                ['Department',  nlpResult.departmentLabel || nlpResult.department || '—'],
                ['Confidence',  nlpResult.confidence != null ? `${(nlpResult.confidence * 100).toFixed(1)}%` : '—'],
                ...(nlpResult.topFeatures?.length
                  ? [['Top Keywords', nlpResult.topFeatures.slice(0, 4).join(', ')]]
                  : []),
                ['Model',       nlpResult.model || 'TF-IDF + LogisticRegression (sklearn)'],
              ]}
            />
          )}

          {/* ML Priority */}
          {(isVerified || mlResult) && mlResult.score != null && (
            <ModelCard
              config={BADGE_CONFIG.ml}
              rows={[
                ['Priority Score', `${mlResult.score}/100`],
                ['Level',          (mlResult.level || '—').toUpperCase()],
                ...(mlResult.featureImportances?.length
                  ? [['Top Feature', mlResult.featureImportances
                      .slice()
                      .sort((a, b) => b.importance - a.importance)[0]?.feature || '—']]
                  : []),
                ['Model', mlResult.model || 'RandomForestClassifier (sklearn)'],
              ]}
            />
          )}

          {/* Real AI source badge */}
          <div style={{
            backgroundColor: isRealAI ? '#F0FDF4' : '#FFFBEB',
            border: `1px solid ${isRealAI ? '#BBF7D0' : '#FDE68A'}`,
            borderRadius: '10px',
            padding: '8px 12px',
            fontSize: '10px',
            color: isRealAI ? '#166534' : '#92400E',
            display: 'flex',
            gap: '6px',
            alignItems: 'flex-start',
            lineHeight: 1.5,
          }}>
            <span>{isRealAI ? '🟢' : '🟡'}</span>
            <span>
              {isRealAI
                ? 'Results from real Python FastAPI service (port 8000) · OpenCV 4.10 · scikit-learn 1.5'
                : 'Mock AI (demo mode) — start ai-service/ to enable real models'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ModelCard({ config, rows }) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: `1.5px solid ${config.color}30`,
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Model header */}
      <div style={{
        backgroundColor: config.bg,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '16px' }}>{config.icon}</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: config.color }}>{config.label}</div>
          <div style={{ fontSize: '9px', color: config.color + 'AA', fontWeight: '600' }}>{config.model}</div>
        </div>
      </div>

      {/* Rows */}
      <div style={{ padding: '6px 12px 10px' }}>
        {rows.map(([key, val], i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '4px 0',
            borderBottom: i < rows.length - 1 ? '1px solid #F1F5F9' : 'none',
            gap: '8px',
          }}>
            <span style={{ fontSize: '10px', color: COLORS.textMuted, fontWeight: '700', flexShrink: 0 }}>{key}</span>
            <span style={{ fontSize: '11px', color: COLORS.textPrimary, fontWeight: '600', textAlign: 'right', wordBreak: 'break-word' }}>
              {val}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
