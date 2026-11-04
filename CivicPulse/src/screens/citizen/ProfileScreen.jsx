import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import Button from '../../components/Button';
import Card from '../../components/Card';
import COLORS from '../../constants/colors';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { user, role } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.complaints);

  const resolvedCount = items.filter(c => c.status === 'Resolved').length;
  const activeCount = items.filter(c => c.status === 'In Progress' || c.status === 'Verified_Assigned').length;

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      dispatch(logout());
    }
  };

  const isOfficer = role === 'officer';

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '100px' }}>
      {/* Header with gradient */}
      <div style={{
        background: isOfficer
          ? 'linear-gradient(145deg, #0F172A 0%, #312E81 100%)'
          : 'linear-gradient(145deg, #0F172A 0%, #134E4A 100%)',
        padding: '40px 20px 48px',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
            <img
              src={user?.avatar || (isOfficer
                ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
                : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150')}
              alt="Avatar"
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${COLORS.primary}`, display: 'block' }}
            />
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#10B981',
              border: '2px solid #0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px'
            }}>✓</div>
          </div>

          <h2 style={{ color: '#FFFFFF', fontSize: '22px', fontWeight: '800', marginBottom: '4px', letterSpacing: '-0.03em' }}>
            {user?.name || (isOfficer ? 'Inspector Rajesh Kumar' : 'Ananya Sharma')}
          </h2>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: isOfficer ? 'rgba(99,102,241,0.25)' : 'rgba(13,148,136,0.25)',
            color: isOfficer ? '#A5B4FC' : '#5EEAD4',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '10px',
            fontWeight: '800',
            marginBottom: '4px'
          }}>
            {isOfficer ? '👮‍♂️ MUNICIPAL OFFICER' : '👤 CITIZEN'}
          </div>

          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
            {user?.ward || 'Ward 14 — Central Zone'}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', marginTop: '-20px' }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: COLORS.resolved }}>{resolvedCount}</div>
            <div style={{ fontSize: '11px', color: COLORS.textMuted, fontWeight: '600', marginTop: '3px' }}>Resolved</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: COLORS.inProgress }}>{activeCount}</div>
            <div style={{ fontSize: '11px', color: COLORS.textMuted, fontWeight: '600', marginTop: '3px' }}>Active</div>
          </div>
          <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '16px', textAlign: 'center', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '28px', fontWeight: '800', color: COLORS.assigned }}>{items.length}</div>
            <div style={{ fontSize: '11px', color: COLORS.textMuted, fontWeight: '600', marginTop: '3px' }}>Total</div>
          </div>
        </div>

        {/* Account Details */}
        <Card elevated style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Account Details
          </div>

          {[
            { icon: '📱', label: 'Phone', value: user?.phone ? `+91 ${user.phone}` : '+91 98765 43210' },
            { icon: '📍', label: 'Ward', value: user?.ward || 'Ward 14 — Central Zone' },
            isOfficer ? { icon: '🏛️', label: 'Department', value: user?.department || 'Roads & Infrastructure' } : { icon: '🏠', label: 'Address', value: user?.address || 'B-42, Park View Apartments' },
            isOfficer ? { icon: '🪪', label: 'Badge No.', value: user?.badgeNumber || 'MCD-8841' } : null,
            { icon: '🆔', label: 'User ID', value: user?.id || (isOfficer ? 'OFF-9902' : 'CIT-4481') },
          ].filter(Boolean).map((row, idx) => (
            <div key={idx} style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              paddingBottom: '10px',
              marginBottom: '10px',
              borderBottom: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{row.icon}</span>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: COLORS.textMuted }}>{row.label}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: COLORS.textPrimary }}>{row.value}</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Tech Stack Info */}
        <Card style={{ marginBottom: '16px', backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: '#15803D', marginBottom: '8px' }}>🤖 AI Stack (Semester Project)</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {['TensorFlow CV', 'DistilBERT NLP', 'Scikit-Learn ML', 'FastAPI Python', 'Node.js Gateway', 'MongoDB Atlas', 'Socket.io', 'FCM Push'].map(t => (
              <span key={t} style={{
                background: '#D1FAE5',
                color: '#064E3B',
                padding: '3px 8px',
                borderRadius: '9999px',
                fontSize: '10px',
                fontWeight: '700'
              }}>{t}</span>
            ))}
          </div>
        </Card>

        {/* Logout */}
        <Button
          title="🚪 Log Out"
          onPress={handleLogout}
          variant="outline"
          size="large"
        />
      </div>
    </div>
  );
}
