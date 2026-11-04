import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaints, setSelectedComplaint } from '../../store/slices/complaintSlice';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import AiInspectionBadge from '../../components/AiInspectionBadge';
import COLORS from '../../constants/colors';
import STRINGS from '../../constants/strings';

const StatCard = ({ count, label, color, bg, icon }) => (
  <div style={{
    backgroundColor: bg,
    borderRadius: '16px',
    padding: '14px 12px',
    flex: 1,
    textAlign: 'center',
    border: `1px solid ${color}25`
  }}>
    <div style={{ fontSize: '10px', marginBottom: '4px' }}>{icon}</div>
    <div style={{ fontSize: '26px', fontWeight: '800', color, lineHeight: 1 }}>{count}</div>
    <div style={{ fontSize: '10px', fontWeight: '700', color: `${color}BB`, marginTop: '3px' }}>{label}</div>
  </div>
);

export default function HomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items, isLoading } = useSelector((state) => state.complaints);
  const [greeting, setGreeting] = useState('Good Morning');

  useEffect(() => {
    dispatch(fetchComplaints());
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening');
  }, [dispatch]);

  const pendingCount = items.filter(c => c.status === 'Submitted' || c.status === 'Pending').length;
  const inProgressCount = items.filter(c => c.status === 'In Progress' || c.status === 'Verified_Assigned').length;
  const resolvedCount = items.filter(c => c.status === 'Resolved').length;

  const handleOpenDetail = (item) => {
    dispatch(setSelectedComplaint(item));
    navigation.navigate('ComplaintDetail');
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #134E4A 100%)',
        padding: '28px 20px 32px',
        borderBottomLeftRadius: '28px',
        borderBottomRightRadius: '28px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(13,148,136,0.15)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: '4px' }}>
              {greeting} 👋
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.03em', marginBottom: '4px' }}>
              {user?.name || 'Ananya Sharma'}
            </h2>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📍</span> {user?.ward || 'Ward 14 — Central Zone'}
            </div>
          </div>

          <div
            onClick={() => navigation.navigate('Profile')}
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
              alt="Avatar"
              style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: `2.5px solid ${COLORS.primary}`, display: 'block' }}
            />
            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '14px', height: '14px', borderRadius: '50%', background: '#10B981', border: '2px solid #0F172A' }} />
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
          <StatCard count={pendingCount} label="Submitted" color="#D97706" bg="#FEF3C7" icon="📬" />
          <StatCard count={inProgressCount} label="Active" color="#8B5CF6" bg="#EDE9FE" icon="⚙️" />
          <StatCard count={resolvedCount} label="Resolved" color="#059669" bg="#D1FAE5" icon="✅" />
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {/* CTA Banner */}
        <div
          onClick={() => navigation.navigate('ReportIssue')}
          className="animate-pulse-glow"
          style={{
            background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
            borderRadius: '20px',
            padding: '20px',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: '0 10px 30px rgba(13, 148, 136, 0.35)',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontSize: '9px', fontWeight: '800', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
            🤖 FASTAPI AI-POWERED REPORTING
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '6px', letterSpacing: '-0.02em' }}>
            Spotted a civic issue?
          </h3>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, marginBottom: '16px' }}>
            TensorFlow CV inspects photo clarity ➔ DistilBERT NLP routes department ➔ Scikit-learn ML scores priority.
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FFFFFF',
            color: COLORS.primaryDark,
            fontWeight: '800',
            fontSize: '12px',
            padding: '8px 16px',
            borderRadius: '10px'
          }}>
            📷 Report Issue Now <span>→</span>
          </div>
        </div>

        {/* Categories */}
        <div className="section-title" style={{ marginBottom: '12px' }}>Browse by Category</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '24px' }}>
          {STRINGS.categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => navigation.navigate('ReportIssue', { preselectedCategory: cat.id })}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '14px',
                padding: '12px 8px',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '12px', backgroundColor: `${cat.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                {cat.icon}
              </div>
              <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 1.2 }}>
                {cat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Complaints */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Recent Complaints</div>
          <span
            onClick={() => navigation.navigate('MyComplaints')}
            style={{ fontSize: '12px', fontWeight: '700', color: COLORS.primary, cursor: 'pointer' }}
          >
            View All →
          </span>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2].map(i => (
              <div key={i} className="skeleton" style={{ height: '110px', borderRadius: '16px' }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📂</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: COLORS.textSecondary }}>No complaints yet</div>
            <div style={{ fontSize: '12px', color: COLORS.textMuted, marginTop: '4px' }}>Report your first civic issue!</div>
          </div>
        ) : (
          items.slice(0, 3).map((item, idx) => (
            <div
              key={item.id}
              className="animate-fade-in"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <Card onClick={() => handleOpenDetail(item)} elevated>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <img
                    src={item.image}
                    alt={item.title}
                    style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: COLORS.textMuted }}>{item.id}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="truncate" style={{ fontSize: '13px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '3px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11px', color: COLORS.textMuted }}>📍 {item.location?.address}</div>
                  </div>
                </div>
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                  <AiInspectionBadge aiResult={item.aiInspection} compact />
                </div>
              </Card>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
