import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser, setRole, clearAuthError } from '../../store/slices/authSlice';
import Button from '../../components/Button';
import Card from '../../components/Card';
import COLORS from '../../constants/colors';
import { validateEmail, validatePhone, validatePassword } from '../../utils/validators';

const WARDS = [
  'Ward 14 - Central Zone',
  'Ward 07 - Market & Commercial District',
  'Ward 03 - Residential North',
  'Ward 11 - South Industrial Area',
  'Ward 05 - West Suburbs',
];

const DEPARTMENTS = [
  'Roads & Infrastructure',
  'Sanitation & Solid Waste',
  'Water Supply & Leakage',
  'Electrical Grid & Streetlights',
  'Drainage & Sewage',
  'Traffic & Parking'
];

export default function RegisterScreen({ navigation, route }) {
  const initialRole = route?.params?.role || 'citizen';
  const initialIdentifier = (route?.params?.identifier || '').trim();
  const isInitialEmail = initialIdentifier.includes('@');

  const [selectedRole, setSelectedRole] = useState(initialRole);

  const [formData, setFormData] = useState({
    name: '',
    phone: isInitialEmail ? '' : initialIdentifier.replace(/\D/g, ''),
    email: isInitialEmail ? initialIdentifier : '',
    ward: WARDS[0],
    department: DEPARTMENTS[0],
    badgeNumber: '',
    address: '',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [touched, setTouched] = useState(false);

  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);

  const handleRoleChange = (newRole) => {
    setSelectedRole(newRole);
    dispatch(setRole(newRole));
    dispatch(clearAuthError());
    setValidationError('');
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationError('');
  };

  const handleRegister = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setTouched(true);
    setValidationError('');
    dispatch(clearAuthError());

    // Validations
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setValidationError('Please enter your full name (at least 2 letters)');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!validatePhone(cleanPhone)) {
      setValidationError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!validateEmail(formData.email)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    // Officer specific validation for the 3 officer-only fields
    if (selectedRole === 'officer') {
      if (!formData.ward) {
        setValidationError('Please select assigned Municipal Ward / Area');
        return;
      }
      if (!formData.department) {
        setValidationError('Please select assigned Department');
        return;
      }
      if (!formData.badgeNumber.trim()) {
        setValidationError('Please enter your Officer Badge / Staff ID');
        return;
      }
    }

    if (!validatePassword(formData.password)) {
      setValidationError('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setValidationError('Passwords do not match');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      phone: cleanPhone,
      email: formData.email.trim().toLowerCase(),
      role: selectedRole,
      password: formData.password,
      address: formData.address.trim() || (selectedRole === 'officer' ? `${formData.ward}, Civic Area` : 'City Resident'),
      ...(selectedRole === 'officer' ? {
        ward: formData.ward,
        department: formData.department,
        badgeNumber: formData.badgeNumber.trim()
      } : {
        ward: 'Citizen Ward'
      })
    };

    const result = await dispatch(registerUser(payload));
    if (registerUser.fulfilled.match(result)) {
      alert(`🎉 Welcome to CivicPulse, ${payload.name}!\n\nYour account has been registered successfully. You are now logged in as ${payload.name}.`);
      navigation.navigate(selectedRole === 'officer' ? 'OfficerHome' : 'Home');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F0F9F8 0%, #FFFFFF 100%)',
      padding: '0',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(145deg, #0F172A 0%, #134E4A 100%)',
        padding: '36px 24px 28px',
        borderBottomLeftRadius: '32px',
        borderBottomRightRadius: '32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(13,148,136,0.15)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(13,148,136,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', border: '1px solid rgba(255,255,255,0.15)' }}>
              🏛️
            </div>
            <div>
              <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '800', letterSpacing: '-0.02em' }}>CivicPulse</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', fontWeight: '600' }}>REGISTRATION PORTAL</div>
            </div>
          </div>

          <h1 style={{ color: '#FFFFFF', fontSize: '26px', fontWeight: '800', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '6px' }}>
            Create Your Account
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.4 }}>
            {selectedRole === 'officer'
              ? 'Register as a Municipal Officer to manage assigned complaints & department tasks.'
              : 'Register as a Citizen to file and track civic issues in your city.'}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, padding: '20px 20px 36px', maxWidth: '480px', width: '100%', margin: '0 auto' }}>

        {/* Informative notice if redirected from login */}
        {initialIdentifier && (
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>ℹ️</span>
            <div style={{ fontSize: '12px', color: '#1E40AF', lineHeight: 1.4 }}>
              Setting up registration for <strong>"{initialIdentifier}"</strong>. Complete the details below to activate your account.
            </div>
          </div>
        )}

        {/* Role Selector */}
        <Card style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: COLORS.textMuted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Register As
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {[
              { value: 'citizen', label: 'Citizen', icon: '👤', desc: 'File & Track Issues' },
              { value: 'officer', label: 'Mun. Officer', icon: '👮', desc: 'Department Official' }
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleRoleChange(r.value)}
                style={{
                  flex: 1,
                  padding: '12px 10px',
                  borderRadius: '12px',
                  border: selectedRole === r.value ? `2px solid ${COLORS.primary}` : '1.5px solid var(--border)',
                  backgroundColor: selectedRole === r.value ? COLORS.primaryLight : '#F8FAFC',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '22px', marginBottom: '4px' }}>{r.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: selectedRole === r.value ? COLORS.primaryDark : COLORS.textPrimary }}>{r.label}</div>
                <div style={{ fontSize: '10px', color: COLORS.textMuted, marginTop: '2px' }}>{r.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Registration Form Card */}
        <Card style={{ marginBottom: '16px' }}>
          <form onSubmit={handleRegister}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: COLORS.textPrimary }}>
                {selectedRole === 'officer' ? 'Officer Information' : 'Citizen Information'}
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '6px',
                background: selectedRole === 'officer' ? '#FEF3C7' : COLORS.primaryLight,
                color: selectedRole === 'officer' ? '#B45309' : COLORS.primaryDark
              }}>
                {selectedRole === 'officer' ? 'Staff Official' : 'Public Citizen'}
              </span>
            </div>

            {/* 1. Full Name */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '6px' }}>
                Full Name <span style={{ color: COLORS.rejected }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g. Rahul Sharma"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1.5px solid var(--border)',
                  borderRadius: '10px',
                  padding: '11px 12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: COLORS.textPrimary,
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            </div>

            {/* 2. Mobile Number */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '6px' }}>
                Mobile Number <span style={{ color: COLORS.rejected }}>*</span>
              </label>
              <div style={{
                display: 'flex',
                border: '1.5px solid var(--border)',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#FFFFFF'
              }}>
                <span style={{ backgroundColor: '#F8FAFC', padding: '11px 12px', borderRight: '1px solid var(--border)', fontWeight: '800', fontSize: '13px', color: COLORS.textPrimary }}>
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                  placeholder="10-digit mobile"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '11px 12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: COLORS.textPrimary,
                    fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>

            {/* 3. Email Address */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '6px' }}>
                Email Address <span style={{ color: COLORS.rejected }}>*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="e.g. rahul.sharma@example.com"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1.5px solid var(--border)',
                  borderRadius: '10px',
                  padding: '11px 12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: COLORS.textPrimary,
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            </div>

            {/* Officer Specific Fields: ONLY rendered when selectedRole === 'officer' */}
            {selectedRole === 'officer' && (
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1.5px dashed #CBD5E1',
                borderRadius: '12px',
                padding: '14px 12px',
                marginBottom: '14px'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>👮</span> Municipal Officer Details
                </div>

                {/* Option 1: Municipal Ward / Area */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '6px' }}>
                    Municipal Ward / Area <span style={{ color: COLORS.rejected }}>*</span>
                  </label>
                  <select
                    value={formData.ward}
                    onChange={(e) => handleChange('ward', e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1.5px solid var(--border)',
                      borderRadius: '10px',
                      padding: '11px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: COLORS.textPrimary,
                      backgroundColor: '#FFFFFF',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  >
                    {WARDS.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>

                {/* Option 2: Assigned Department */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '6px' }}>
                    Assigned Department <span style={{ color: COLORS.rejected }}>*</span>
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1.5px solid var(--border)',
                      borderRadius: '10px',
                      padding: '11px 12px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: COLORS.textPrimary,
                      backgroundColor: '#FFFFFF',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Option 3: Officer Badge / Staff ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '6px' }}>
                    Officer Badge / Staff ID <span style={{ color: COLORS.rejected }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.badgeNumber}
                    onChange={(e) => handleChange('badgeNumber', e.target.value)}
                    placeholder="e.g. MCD-4091 or OFF-102"
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1.5px solid var(--border)',
                      borderRadius: '10px',
                      padding: '11px 12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: COLORS.textPrimary,
                      backgroundColor: '#FFFFFF',
                      fontFamily: 'inherit',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '6px' }}>
                Password (min 6 characters) <span style={{ color: COLORS.rejected }}>*</span>
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--border)',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF'
              }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Create a strong password"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    padding: '11px 12px',
                    fontSize: '14px',
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
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    color: COLORS.textMuted
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: COLORS.textPrimary, marginBottom: '6px' }}>
                Confirm Password <span style={{ color: COLORS.rejected }}>*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="Re-enter your password"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  border: '1.5px solid var(--border)',
                  borderRadius: '10px',
                  padding: '11px 12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: COLORS.textPrimary,
                  fontFamily: 'inherit',
                  outline: 'none'
                }}
              />
            </div>

            {/* Error Message */}
            {(validationError || error) && (
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

            {/* Submit Button */}
            <Button
              title={isLoading ? 'Creating Account...' : `Register as ${selectedRole === 'officer' ? 'Officer' : 'Citizen'}`}
              onPress={handleRegister}
              loading={isLoading}
              size="large"
            />

            {/* Switch to Login */}
            <div style={{
              marginTop: '16px',
              textAlign: 'center',
              paddingTop: '14px',
              borderTop: '1px solid var(--border-light)'
            }}>
              <span style={{ fontSize: '13px', color: COLORS.textSecondary }}>
                Already have an account?{' '}
              </span>
              <button
                type="button"
                onClick={() => {
                  dispatch(clearAuthError());
                  navigation.navigate('Login');
                }}
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
                Sign In here
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
