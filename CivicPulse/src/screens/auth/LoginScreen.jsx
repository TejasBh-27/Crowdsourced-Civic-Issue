import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, setRole, clearAuthError } from '../../store/slices/authSlice';
import authApi from '../../api/authApi';
import Button from '../../components/Button';
import Card from '../../components/Card';
import COLORS from '../../constants/colors';

export default function LoginScreen({ navigation, route }) {
  // Start with clean, empty inputs by default (unless prefilled from registration)
  const [identifier, setIdentifier] = useState(route?.params?.prefillIdentifier || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [touched, setTouched] = useState(false);

  // Verification state: 'idle' | 'checking' | 'registered' | 'not_registered'
  const [verifyStatus, setVerifyStatus] = useState('idle');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [notRegisteredAlert, setNotRegisteredAlert] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const dispatch = useDispatch();
  const { role, isLoading, error } = useSelector((state) => state.auth);

  // When routed with params (e.g. after newly registering)
  useEffect(() => {
    if (route?.params?.prefillIdentifier) {
      setIdentifier(route?.params?.prefillIdentifier);
    }
    if (route?.params?.role) {
      dispatch(setRole(route?.params?.role));
    }
  }, [route?.params, dispatch]);

  // Run verification ONLY when user has entered a full 10-digit phone or email
  useEffect(() => {
    const clean = identifier.trim();
    const phoneDigits = clean.replace(/\D/g, '');
    const isEmail = clean.includes('@') && clean.includes('.');
    const isPhone = phoneDigits.length === 10;

    if (!isEmail && !isPhone) {
      setVerifyStatus('idle');
      setVerifiedUser(null);
      setNotRegisteredAlert(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsVerifying(true);
      try {
        const res = await authApi.checkUserRegistered(clean);
        if (res.registered) {
          setVerifyStatus('registered');
          setVerifiedUser(res.user);
          setNotRegisteredAlert(null);
          if (res.user.role && res.user.role !== role) {
            dispatch(setRole(res.user.role));
          }
        } else {
          setVerifyStatus('not_registered');
          setVerifiedUser(null);
        }
      } catch (e) {
        setVerifyStatus('idle');
      } finally {
        setIsVerifying(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [identifier, role, dispatch]);

  const handleRoleChange = (newRole) => {
    dispatch(setRole(newRole));
    dispatch(clearAuthError());
    setValidationError('');
    setNotRegisteredAlert(null);
  };

  const handleLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setTouched(true);
    setValidationError('');
    setNotRegisteredAlert(null);
    dispatch(clearAuthError());

    const cleanId = identifier.trim();
    if (!cleanId) {
      setValidationError('Please enter your mobile number or email address');
      return;
    }
    if (!password) {
      setValidationError('Please enter your password');
      return;
    }

    // Step 1: Pre-Login Verification
    setIsVerifying(true);
    const check = await authApi.checkUserRegistered(cleanId);
    setIsVerifying(false);

    if (!check.registered) {
      // DENY LOGIN PERMISSION: User is not registered!
      setVerifyStatus('not_registered');
      setNotRegisteredAlert({
        identifier: cleanId,
        role: role
      });
      return;
    }

    // Step 2: User is verified as registered! Give permission to authenticate
    setVerifyStatus('registered');
    setVerifiedUser(check.user);

    const effectiveRole = check.user.role || role;
    if (effectiveRole !== role) {
      dispatch(setRole(effectiveRole));
    }

    // Step 3: Check credentials and log in
    await dispatch(loginUser({ identifier: cleanId, password, role: effectiveRole }));
  };

  const navigateToRegister = (prefillId = '') => {
    dispatch(clearAuthError());
    setNotRegisteredAlert(null);
    navigation.navigate('Register', {
      role,
      identifier: prefillId || identifier.trim()
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F0F9F8 0%, #FFFFFF 100%)',
      padding: '0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top hero banner */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #134E4A 100%)',
        padding: '44px 24px 30px',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(13,148,136,0.15)' }} />
        <div style={{ position: 'absolute', bottom: '-20px', left: '20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '13px', background: 'rgba(13,148,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1px solid rgba(255,255,255,0.15)' }}>
              🏛️
            </div>
            <div>
              <div style={{ color: '#FFFFFF', fontSize: '20px', fontWeight: '800', letterSpacing: '-0.03em' }}>CivicPulse</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: '600' }}>MUNICIPAL GOVERNANCE PLATFORM</div>
            </div>
          </div>

          <h1 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '800', letterSpacing: '-0.03em', lineHeight: 1.18, marginBottom: '8px' }}>
            Report. Track.<br />Resolve Civic Issues.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.45 }}>
            Verified sign-in for Citizens & Municipal Officers. Unregistered users must sign up first.
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 20px 36px', maxWidth: '480px', width: '100%', margin: '0 auto' }}>

        {/* Role Selector */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Select Your Role
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { value: 'citizen', label: 'Citizen', icon: '👤', desc: 'File & Track Complaints' },
              { value: 'officer', label: 'Mun. Officer', icon: '👮', desc: 'Manage Ward Tasks' }
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

        {/* POST-REGISTRATION SUCCESS BANNER (Shown after registering) */}
        {route?.params?.justRegistered && (
          <div style={{
            backgroundColor: '#ECFDF5',
            border: '1.5px solid #10B981',
            borderRadius: '14px',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.12)'
          }}>
            <span style={{ fontSize: '24px' }}>🎉</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#065F46', marginBottom: '2px' }}>
                Registration Successful!
              </div>
              <div style={{ fontSize: '12px', color: '#047857', lineHeight: 1.4 }}>
                Account created for <strong>{route.params.registeredName}</strong>. Please enter your password to sign in and enter the portal.
              </div>
            </div>
          </div>
        )}

        {/* NOT REGISTERED WARNING BANNER (When person is not registered) */}
        {notRegisteredAlert && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '2px solid #F87171',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '16px',
            boxShadow: '0 4px 14px rgba(239, 68, 68, 0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '26px' }}>🛑</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#991B1B', marginBottom: '4px' }}>
                  Permission Denied: User Not Registered!
                </div>
                <div style={{ fontSize: '12px', color: '#7F1D1D', lineHeight: 1.45, marginBottom: '12px' }}>
                  The mobile or email <strong>"{notRegisteredAlert.identifier}"</strong> is not found in the CivicPulse database. You must register first before you can log in.
                </div>
                <button
                  type="button"
                  onClick={() => navigateToRegister(notRegisteredAlert.identifier)}
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 14px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>📝</span> Register Now with this Mobile/Email →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Form Card */}
        <Card style={{ marginBottom: '16px' }}>
          <form onSubmit={handleLogin}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '16px', fontWeight: '800', color: COLORS.textPrimary }}>
                {role === 'officer' ? 'Officer Login' : 'Citizen Login'}
              </div>
              <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', background: COLORS.primaryLight, color: COLORS.primaryDark }}>
                {role === 'officer' ? 'Officer App' : 'Citizen App'}
              </span>
            </div>

            {/* Mobile / Email Input */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary }}>
                  Mobile Number or Email
                </label>

                {/* Pre-verification Status Badge (only shown when user entered text) */}
                {isVerifying ? (
                  <span style={{ fontSize: '10px', color: COLORS.textMuted, fontWeight: '600' }}>
                    🔍 Checking...
                  </span>
                ) : identifier.trim() && verifyStatus === 'registered' && verifiedUser ? (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#047857',
                    background: '#D1FAE5',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    ✓ Registered ({verifiedUser.name.split(' ')[0]})
                  </span>
                ) : identifier.trim() && verifyStatus === 'not_registered' ? (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: '#B45309',
                    background: '#FEF3C7',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    ⚠️ Not registered
                  </span>
                ) : null}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: `1.5px solid ${
                  identifier.trim() && verifyStatus === 'registered' ? '#10B981' :
                  identifier.trim() && verifyStatus === 'not_registered' ? '#F59E0B' :
                  'var(--border)'
                }`,
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
                transition: 'border-color 0.2s ease'
              }}>
                <span style={{ padding: '0 12px', fontSize: '16px', color: COLORS.textMuted }}>
                  📱
                </span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setTouched(false);
                    setNotRegisteredAlert(null);
                  }}
                  placeholder="e.g. 9876543210 or name@civicpulse.gov"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '12px 14px 12px 0',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: COLORS.textPrimary,
                    fontFamily: 'inherit'
                  }}
                />
                {identifier.trim() && verifyStatus === 'registered' && (
                  <span style={{ paddingRight: '12px', color: '#10B981', fontSize: '16px' }} title="User is registered">
                    ✅
                  </span>
                )}
                {identifier.trim() && verifyStatus === 'not_registered' && (
                  <span style={{ paddingRight: '12px', color: '#F59E0B', fontSize: '16px' }} title="Not registered">
                    ⚠️
                  </span>
                )}
              </div>

              {/* Informative helper note under input */}
              {identifier.trim() && verifyStatus === 'not_registered' && (
                <div style={{ fontSize: '11px', color: '#D97706', marginTop: '4px', fontWeight: '600' }}>
                  This mobile/email is not registered. Please register first.
                </div>
              )}
              {identifier.trim() && verifyStatus === 'registered' && verifiedUser && (
                <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: '600' }}>
                  ✓ Account confirmed for <strong>{verifiedUser.name}</strong> ({verifiedUser.role === 'officer' ? `Officer - ${verifiedUser.department || 'Ward'}` : 'Citizen'})
                </div>
              )}
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '6px' }}>
                Password
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--border)',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                overflow: 'hidden'
              }}>
                <span style={{ padding: '0 12px', fontSize: '16px', color: COLORS.textMuted }}>
                  🔒
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setTouched(false); }}
                  placeholder="Enter your password"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '12px 8px 12px 0',
                    fontSize: '15px',
                    fontWeight: '600',
                    color: COLORS.textPrimary,
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: COLORS.textMuted
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Validation or Auth Error */}
            {(validationError || error) && !notRegisteredAlert && (
              <div style={{
                color: COLORS.rejected,
                backgroundColor: COLORS.rejectedBg,
                padding: '10px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>⚠️</span>
                <span>{validationError || error}</span>
              </div>
            )}

            {/* Login Button */}
            <Button
              title={
                isVerifying ? 'Verifying Registration...' :
                isLoading ? 'Signing In...' :
                `Sign In as ${role === 'officer' ? 'Officer' : 'Citizen'}`
              }
              onPress={handleLogin}
              loading={isLoading || isVerifying}
              size="large"
            />

            {/* Registration Switch Option */}
            <div style={{
              marginTop: '18px',
              textAlign: 'center',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                First time here or not registered?{' '}
              </span>
              <button
                type="button"
                onClick={() => navigateToRegister()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: COLORS.primary,
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Register First (Create Account)
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
