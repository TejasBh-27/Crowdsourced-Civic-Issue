import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOTP } from '../../store/slices/authSlice';
import Button from '../../components/Button';
import COLORS from '../../constants/colors';

export default function OTPScreen({ route, navigation }) {
  const { phone } = route?.params || { phone: '9876543210' };
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const dispatch = useDispatch();
  const { role, isLoading, error } = useSelector((state) => state.auth);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setResendTimer(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleVerify = async () => {
    if (otp.length !== 4) return;
    await dispatch(verifyOTP({ phone, otp, role }));
  };

  const handleResend = () => {
    setOtp('1234');
    setResendTimer(30);
    setCanResend(false);
  };

  const handleOtpChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setOtp(val);
  };

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (otp.length === 4) {
      const t = setTimeout(() => {
        dispatch(verifyOTP({ phone, otp, role }));
      }, 300);
      return () => clearTimeout(t);
    }
  }, [otp]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F0F9F8 0%, #FFFFFF 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 20px',
      paddingTop: '0'
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(145deg, #0F172A 0%, #134E4A 100%)',
        padding: '48px 24px 32px',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        marginBottom: '28px'
      }}>
        <button
          type="button"
          onClick={() => navigation.goBack()}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: '13px', cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ← Back
        </button>
        <h2 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '6px' }}>
          Verify Your Number
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px' }}>
          Enter the 4-digit OTP sent to <strong style={{ color: '#FFFFFF' }}>+91 {phone}</strong>
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* OTP Input */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '28px 24px',
          boxShadow: '0 4px 24px rgba(15,23,42,0.08)',
          border: '1px solid var(--border)',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            4-Digit Verification Code
          </div>

          {/* OTP Boxes Display */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
            {[0, 1, 2, 3].map(i => {
              const char = otp[i];
              const isActive = otp.length === i;
              return (
                <div
                  key={i}
                  style={{
                    width: '56px',
                    height: '64px',
                    borderRadius: '14px',
                    border: `2.5px solid ${char ? COLORS.primary : isActive ? COLORS.primaryDark : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: '800',
                    color: COLORS.primaryDark,
                    background: char ? COLORS.primaryLight : isActive ? '#F0FDFA' : '#F8FAFC',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? `0 0 0 3px ${COLORS.primaryLight}` : 'none'
                  }}
                >
                  {char || (isActive ? '|' : '')}
                </div>
              );
            })}
          </div>

          {/* Hidden actual input */}
          <input
            type="tel"
            maxLength={4}
            value={otp}
            onChange={handleOtpChange}
            autoFocus
            style={{
              position: 'absolute',
              opacity: 0,
              width: '1px',
              height: '1px',
              pointerEvents: 'none'
            }}
          />
          
          {/* Tap to type */}
          <div
            onClick={() => document.querySelector('input[type=tel]')?.focus()}
            style={{
              fontSize: '11px',
              color: COLORS.textMuted,
              marginBottom: '16px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              background: '#F8FAFC',
              border: '1px dashed var(--border)'
            }}
          >
            👆 Tap here then type your OTP
          </div>

          {error && (
            <div style={{ color: COLORS.rejected, fontSize: '12px', fontWeight: '600', marginBottom: '12px', padding: '8px', background: COLORS.rejectedBg, borderRadius: '8px' }}>
              ⚠️ {error}
            </div>
          )}

          <Button
            title="Verify & Continue"
            onPress={handleVerify}
            loading={isLoading}
            size="large"
            disabled={otp.length !== 4}
          />

          <div style={{ marginTop: '16px', fontSize: '12px', color: COLORS.textSecondary }}>
            {canResend ? (
              <span onClick={handleResend} style={{ color: COLORS.primary, fontWeight: '700', cursor: 'pointer' }}>
                Resend OTP
              </span>
            ) : (
              <span>Resend in <strong style={{ color: COLORS.primaryDark }}>{resendTimer}s</strong></span>
            )}
          </div>
        </div>

        {/* Demo hint */}
        <div style={{
          padding: '12px 14px',
          background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)',
          borderRadius: '14px',
          border: '1px solid #BFDBFE',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '20px' }}>🔑</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#1E40AF' }}>Demo OTP</div>
            <div style={{ fontSize: '12px', color: '#1E3A8A' }}>Enter <strong>1234</strong> — it auto-submits when complete!</div>
          </div>
          <button
            type="button"
            onClick={() => setOtp('1234')}
            style={{ marginLeft: 'auto', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Use 1234
          </button>
        </div>
      </div>
    </div>
  );
}
