import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { requestOTP, setRole } from '../../store/slices/authSlice';
import Button from '../../components/Button';
import Card from '../../components/Card';
import COLORS from '../../constants/colors';
import { validatePhone } from '../../utils/validators';

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState('9876543210');
  const [validationError, setValidationError] = useState('');
  const [touched, setTouched] = useState(false);

  const dispatch = useDispatch();
  const { role, isLoading, error } = useSelector((state) => state.auth);

  const handleRoleChange = (newRole) => dispatch(setRole(newRole));

  const handleSendOTP = async () => {
    setTouched(true);
    setValidationError('');
    if (!validatePhone(phone)) {
      setValidationError('Please enter a valid 10-digit mobile number');
      return;
    }
    const result = await dispatch(requestOTP({ phone, role }));
    if (requestOTP.fulfilled.match(result)) {
      navigation.navigate('OTP', { phone });
    }
  };

  const isPhoneValid = phone.length === 10 && /^\d+$/.test(phone);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F0F9F8 0%, #FFFFFF 100%)',
      padding: '0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top hero */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #134E4A 100%)',
        padding: '48px 24px 32px',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(13,148,136,0.15)' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(13,148,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', border: '1px solid rgba(255,255,255,0.15)' }}>🏛️</div>
            <div>
              <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.03em' }}>CivicPulse</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: '600' }}>MUNICIPAL GOVERNANCE PLATFORM</div>
            </div>
          </div>

          <h1 style={{ color: '#FFFFFF', fontSize: '30px', fontWeight: '800', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '8px' }}>
            Report. Track.<br />Resolve Civic Issues.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: 1.5 }}>
            AI-powered (TensorFlow CV + DistilBERT NLP) smart complaint routing — from citizen filing to officer resolution.
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '24px 20px', maxWidth: '480px', width: '100%', margin: '0 auto' }}>

        {/* Role Selector */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Select Your Role
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { value: 'citizen', label: 'Citizen', icon: '👤', desc: 'File & Track Complaints' },
              { value: 'officer', label: 'Mun. Officer', icon: '👮‍♂️', desc: 'Manage Ward Tasks' }
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleRoleChange(r.value)}
                style={{
                  flex: 1,
                  padding: '12px 10px',
                  borderRadius: '12px',
                  border: role === r.value ? `2px solid ${COLORS.primary}` : '1.5px solid var(--border)',
                  backgroundColor: role === r.value ? COLORS.primaryLight : '#F8FAFC',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>{r.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: role === r.value ? COLORS.primaryDark : COLORS.textPrimary }}>{r.label}</div>
                <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px' }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Phone Input */}
        <Card style={{ marginBottom: '0' }}>
          <div style={{ fontSize: '12px', fontWeight: '800', color: COLORS.textPrimary, marginBottom: '10px' }}>
            Mobile Number
          </div>

          <div style={{
            display: 'flex',
            border: `1.5px solid ${touched && !isPhoneValid ? COLORS.rejected : isPhoneValid ? COLORS.primary : 'var(--border)'}`,
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '12px',
            transition: 'border-color 0.2s ease',
            boxShadow: isPhoneValid ? `0 0 0 3px ${COLORS.primaryLight}` : 'none'
          }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRight: '1px solid var(--border)', fontWeight: '800', fontSize: '14px', color: COLORS.textPrimary, whiteSpace: 'nowrap' }}>
              🇮🇳 +91
            </div>
            <input
              type="tel"
              maxLength={10}
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setTouched(false); }}
              placeholder="10-digit mobile"
              style={{ flex: 1, border: 'none', outline: 'none', padding: '12px 14px', fontSize: '16px', fontWeight: '600', color: COLORS.textPrimary, fontFamily: 'inherit' }}
            />
            {isPhoneValid && <div style={{ padding: '12px 12px', display: 'flex', alignItems: 'center', fontSize: '18px' }}>✅</div>}
          </div>

          {(validationError || error) && (
            <div style={{ color: COLORS.rejected, fontSize: '12px', fontWeight: '600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⚠️ {validationError || error}
            </div>
          )}

          <Button
            title={`Send OTP to ${role === 'officer' ? 'Officer Portal' : 'Citizen App'}`}
            onPress={handleSendOTP}
            loading={isLoading}
            size="large"
          />

          <div style={{ backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '10px 12px', marginTop: '14px', border: '1px solid #BFDBFE', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '16px' }}>💡</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#1E40AF', marginBottom: '2px' }}>Demo Credentials</div>
              <div style={{ fontSize: '12px', color: '#1E3A8A', lineHeight: 1.4 }}>
                Any 10-digit number works. Enter OTP <strong>1234</strong> on next screen.
                Try both <strong>Citizen</strong> and <strong>Officer</strong> roles.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
