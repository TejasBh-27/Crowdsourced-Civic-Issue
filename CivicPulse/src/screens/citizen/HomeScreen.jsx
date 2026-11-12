import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchComplaints, setSelectedComplaint } from '../../store/slices/complaintSlice';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import COLORS from '../../constants/colors';
import STRINGS from '../../constants/strings';
import { isComplaintOwnedByUser } from '../../utils/userFilter';

const StatCard = ({ count, label, subtitle, color, bg, icon }) => (
  <div style={{
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '16px',
    flex: 1,
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    transition: 'all 0.2s ease',
    cursor: 'default'
  }}>
    <div style={{
      width: '46px',
      height: '46px',
      borderRadius: '12px',
      backgroundColor: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      flexShrink: 0
    }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '24px', fontWeight: '800', color: COLORS.textPrimary, lineHeight: 1.1 }}>
        {count}
      </div>
      <div style={{ fontSize: '12px', fontWeight: '700', color: color, marginTop: '2px' }}>
        {label}
      </div>
      {subtitle && (
        <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '1px' }}>
          {subtitle}
        </div>
      )}
    </div>
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
  }, [dispatch, user?.id, user?.phone]);

  // Strict per-user isolation: only complaints belonging to this logged-in citizen
  const userComplaints = (items || []).filter(c => isComplaintOwnedByUser(c, user));

  const pendingCount = userComplaints.filter(c => c.status === 'Submitted' || c.status === 'Pending').length;
  const inProgressCount = userComplaints.filter(c => c.status === 'In Progress' || c.status === 'Verified_Assigned').length;
  const resolvedCount = userComplaints.filter(c => c.status === 'Resolved').length;

  const handleOpenDetail = (item) => {
    dispatch(setSelectedComplaint(item));
    navigation.navigate('ComplaintDetail');
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '90px' }}>

      {/* Top Hero Section */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #064E3B 100%)',
        padding: '32px 20px 36px',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)'
      }}>
        {/* Subtle decorative circles */}
        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(13,148,136,0.15)' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '10%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        <div className="cp-container" style={{ position: 'relative', zIndex: 1 }}>
          {/* Top Right Profile Quick Link with User Avatar */}
          <div
            onClick={() => navigation.navigate('Profile')}
            style={{
              position: 'absolute',
              top: '0',
              right: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '4px 10px 4px 4px',
              borderRadius: '30px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              transition: 'all 0.2s ease',
              zIndex: 2
            }}
            title="View and Edit Profile Photo"
          >
            <div style={{ position: 'relative' }}>
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                alt="Profile"
                style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', display: 'block' }}
              />
              <span style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#10B981',
                border: '2px solid #064E3B'
              }} />
            </div>
            <span style={{ color: '#FFFFFF', fontSize: '11px', fontWeight: '700' }}>
              Profile ⚙️
            </span>
          </div>

          <div className="cp-hero-row" style={{ display: 'flex', gap: '24px' }}>

            {/* Left Column: Greeting, User, Status */}
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
                  {greeting} 👋
                </span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  color: '#10B981',
                  background: 'rgba(16, 185, 129, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }}></span>
                  Citizen Portal Active
                </span>
              </div>

              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '6px' }}>
                {user?.name || 'Citizen'}
              </h1>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '16px' }}>
                <span>📍</span>
                <span>{user?.ward || 'Ward 14 - Central Zone'}</span>
                <span style={{ opacity: 0.4 }}>•</span>
                <span>Verified Resident</span>
              </div>

              {/* Action buttons on desktop */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => navigation.navigate('ReportIssue')}
                  style={{
                    backgroundColor: COLORS.primary,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <span>📷</span> Report New Issue
                </button>
                <button
                  type="button"
                  onClick={() => navigation.navigate('MyComplaints')}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                >
                  <span>📋</span> My Reports ({userComplaints.length})
                </button>
              </div>
            </div>

            {/* Right Column: 3 Metric Cards */}
            <div style={{ flex: '1 1 500px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '800',
                color: 'rgba(255, 255, 255, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px'
              }}>
                Issue Resolution Overview
              </div>
              <div className="cp-home-stats-grid" style={{ display: 'grid', gap: '10px' }}>
                <StatCard
                  count={pendingCount}
                  label="Submitted"
                  subtitle="Awaiting AI/Review"
                  color="#D97706"
                  bg="#FEF3C7"
                  icon="📁"
                />
                <StatCard
                  count={inProgressCount}
                  label="In Progress"
                  subtitle="Assigned to Crew"
                  color="#8B5CF6"
                  bg="#EDE9FE"
                  icon="⚡"
                />
                <StatCard
                  count={resolvedCount}
                  label="Resolved"
                  subtitle="Closed & Verified"
                  color="#059669"
                  bg="#D1FAE5"
                  icon="✅"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Body Content Container */}
      <div className="cp-container" style={{ padding: '24px 20px' }}>

        {/* AI Action Banner */}
        <div
          onClick={() => navigation.navigate('ReportIssue')}
          style={{
            background: 'linear-gradient(135deg, #0D9488 0%, #0369A1 100%)',
            borderRadius: '24px',
            padding: '24px',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: '0 8px 28px rgba(13, 148, 136, 0.28)',
            marginBottom: '32px',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 34px rgba(13, 148, 136, 0.38)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 8px 28px rgba(13, 148, 136, 0.28)';
          }}
        >
          <div className="cp-banner-desktop-row" style={{ display: 'flex' }}>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '800',
                letterSpacing: '0.04em',
                marginBottom: '10px'
              }}>
                <span>⚡</span> INSTANT CIVIC REPORTING
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                Spotted a civic issue in your ward?
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.5, maxWidth: '640px', marginBottom: '14px' }}>
                Snap a photo. Our automated intake system verifies your submission and routes it directly to the responsible municipal department for swift action.
              </p>

              {/* 3 Step Badge Trail */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.9)' }}>
                <span style={{ background: 'rgba(0,0,0,0.15)', padding: '4px 8px', borderRadius: '6px' }}>
                  1. Photo Evidence
                </span>
                <span style={{ opacity: 0.6 }}>→</span>
                <span style={{ background: 'rgba(0,0,0,0.15)', padding: '4px 8px', borderRadius: '6px' }}>
                  2. Auto Ward Routing
                </span>
                <span style={{ opacity: 0.6 }}>→</span>
                <span style={{ background: 'rgba(0,0,0,0.15)', padding: '4px 8px', borderRadius: '6px' }}>
                  3. Field Action & Fix
                </span>
              </div>
            </div>

            <div style={{ alignSelf: 'center' }}>
              <div style={{
                backgroundColor: '#FFFFFF',
                color: COLORS.primaryDark,
                fontWeight: '800',
                fontSize: '13px',
                padding: '12px 20px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
              }}>
                <span>📷</span> Report Issue Now <span>→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: COLORS.textPrimary }}>
                Browse by Category
              </div>
              <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
                Choose an issue type to pre-fill your complaint report
              </div>
            </div>
          </div>

          <div className="cp-categories-grid" style={{ display: 'grid', gap: '12px' }}>
            {STRINGS.categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => navigation.navigate('ReportIssue', { preselectedCategory: cat.id })}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '16px 12px',
                  border: '1.5px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-sm)',
                  textAlign: 'center'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.borderColor = cat.color;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  backgroundColor: `${cat.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px'
                }}>
                  {cat.icon}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '800', color: COLORS.textPrimary, lineHeight: 1.3 }}>
                  {cat.label}
                </div>
                <div style={{ fontSize: '10px', color: COLORS.textMuted }}>
                  {cat.dept ? cat.dept.split('&')[0] : 'Municipal'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Complaints Section */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: COLORS.textPrimary }}>
                Recent Complaints
              </div>
              <div style={{ fontSize: '12px', color: COLORS.textMuted }}>
                Live updates and officer progress on reports in your area
              </div>
            </div>
            {userComplaints.length > 0 && (
              <span
                onClick={() => navigation.navigate('MyComplaints')}
                style={{
                  fontSize: '13px',
                  fontWeight: '700',
                  color: COLORS.primary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                View All ({userComplaints.length}) →
              </span>
            )}
          </div>

          {isLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
              {[1, 2].map(i => (
                <div key={i} className="skeleton" style={{ height: '140px', borderRadius: '16px' }} />
              ))}
            </div>
          ) : userComplaints.length === 0 ? (
            /* Rich Empty State for New Users */
            <div style={{
              textAlign: 'center',
              padding: '48px 24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1.5px dashed var(--border)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(13, 148, 136, 0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                marginBottom: '14px'
              }}>
                📋
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '6px' }}>
                No Complaints Filed Yet
              </h3>
              <p style={{ fontSize: '13px', color: COLORS.textSecondary, maxWidth: '440px', margin: '0 auto 18px', lineHeight: 1.5 }}>
                You haven't reported any civic issues in your area yet. Spot a pothole, leaking pipe, or damaged streetlight? File a report now with instant AI verification!
              </p>
              <button
                type="button"
                onClick={() => navigation.navigate('ReportIssue')}
                style={{
                  backgroundColor: COLORS.primary,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)'
                }}
              >
                <span>📷</span> File First Complaint Now →
              </button>
            </div>
          ) : (
            <div className="cp-complaints-grid">
              {userComplaints.slice(0, 4).map((item, idx) => (
                <div
                  key={item.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${idx * 0.08}s` }}
                >
                  <Card onClick={() => handleOpenDetail(item)} elevated style={{ height: '100%' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'}
                        alt={item.title}
                        style={{
                          width: '72px',
                          height: '72px',
                          borderRadius: '12px',
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1px solid var(--border)'
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '10px', fontWeight: '800', color: COLORS.textMuted }}>
                            {item.id}
                          </span>
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="truncate" style={{ fontSize: '14px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '4px' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '11px', color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>📍</span>
                          <span className="truncate">{item.location?.address || 'Ward 14'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: COLORS.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        🏷️ {item.categoryLabel || item.category || 'Civic Issue'}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: COLORS.primary, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Details →
                      </span>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
