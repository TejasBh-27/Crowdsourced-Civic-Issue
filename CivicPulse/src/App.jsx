import React, { useState, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from './store/store';
import { checkAuthSession, logout } from './store/slices/authSlice';

import SplashScreen from './screens/auth/SplashScreen';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import OTPScreen from './screens/auth/OTPScreen';

import HomeScreen from './screens/citizen/HomeScreen';
import ReportIssueScreen from './screens/citizen/ReportIssueScreen';
import MyComplaintsScreen from './screens/citizen/MyComplaintsScreen';
import ComplaintDetailScreen from './screens/citizen/ComplaintDetailScreen';
import ProfileScreen from './screens/citizen/ProfileScreen';

import OfficerHomeScreen from './screens/officer/OfficerHomeScreen';
import AssignedComplaintsScreen from './screens/officer/AssignedComplaintsScreen';
import ResolveComplaintScreen from './screens/officer/ResolveComplaintScreen';

import COLORS from './constants/colors';

function AppContent() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('Login');
  const [screenParams, setScreenParams] = useState({});
  const [screenHistory, setScreenHistory] = useState([]);

  const dispatch = useDispatch();
  const { isAuthenticated, role, user } = useSelector((state) => state.auth);

  useEffect(() => {
    // Try to restore session
    dispatch(checkAuthSession()).finally(() => {
      setTimeout(() => setIsAppLoading(false), 1200);
    });
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      const homeScreen = role === 'officer' ? 'OfficerHome' : 'Home';
      setCurrentScreen(homeScreen);
      setScreenHistory([homeScreen]);
    } else if (!isAppLoading) {
      if (currentScreen !== 'Register') {
        setCurrentScreen('Login');
        setScreenHistory(['Login']);
      }
    }
  }, [isAuthenticated, role, isAppLoading]);

  const navigation = {
    navigate: (screenName, params = {}) => {
      setScreenHistory(h => [...h, screenName]);
      setScreenParams(params);
      setCurrentScreen(screenName);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    goBack: () => {
      const newHistory = [...screenHistory];
      newHistory.pop();
      const prev = newHistory[newHistory.length - 1];
      if (prev) {
        setScreenHistory(newHistory);
        setCurrentScreen(prev);
        setScreenParams({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const homeScreen = role === 'officer' ? 'OfficerHome' : 'Home';
        setCurrentScreen(homeScreen);
        setScreenHistory([homeScreen]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const route = { params: screenParams };

  if (isAppLoading) {
    return <SplashScreen />;
  }

  const renderActiveScreen = () => {
    if (!isAuthenticated) {
      switch (currentScreen) {
        case 'Register': return <RegisterScreen navigation={navigation} route={route} />;
        case 'OTP': return <OTPScreen navigation={navigation} route={route} />;
        case 'Login':
        default: return <LoginScreen navigation={navigation} route={route} />;
      }
    }

    if (role === 'officer') {
      switch (currentScreen) {
        case 'AssignedComplaints': return <AssignedComplaintsScreen navigation={navigation} route={route} />;
        case 'ResolveComplaint': return <ResolveComplaintScreen navigation={navigation} route={route} />;
        case 'Profile': return <ProfileScreen navigation={navigation} route={route} />;
        case 'OfficerHome':
        default: return <OfficerHomeScreen navigation={navigation} route={route} />;
      }
    }

    switch (currentScreen) {
      case 'ReportIssue': return <ReportIssueScreen navigation={navigation} route={route} />;
      case 'MyComplaints': return <MyComplaintsScreen navigation={navigation} route={route} />;
      case 'ComplaintDetail': return <ComplaintDetailScreen navigation={navigation} route={route} />;
      case 'Profile': return <ProfileScreen navigation={navigation} route={route} />;
      case 'Home':
      default: return <HomeScreen navigation={navigation} route={route} />;
    }
  };

  const CITIZEN_NAV = [
    { screen: 'Home', icon: '🏛️', label: 'Home' },
    { screen: 'ReportIssue', icon: '📝', label: 'Report Issue' },
    { screen: 'MyComplaints', icon: '📋', label: 'My Complaints' },
    { screen: 'Profile', icon: '👤', label: 'Profile' },
  ];

  const OFFICER_NAV = [
    { screen: 'OfficerHome', icon: '📊', label: 'Dashboard' },
    { screen: 'AssignedComplaints', icon: '⚡', label: 'Assigned Tasks' },
    { screen: 'Profile', icon: '👤', label: 'Profile' },
  ];

  const navItems = role === 'officer' ? OFFICER_NAV : CITIZEN_NAV;

  // Don't show nav on auth screens
  const noNavScreens = ['ResolveComplaint', 'ComplaintDetail', 'OTP', 'Login', 'Register'];
  const showNav = isAuthenticated && !noNavScreens.includes(currentScreen);

  return (
    <div className="cp-shell">
      {/* Desktop Responsive Header (Visible on Desktop/Tablet >= 768px) */}
      {showNav && (
        <header className="cp-desktop-header">
          <div className="cp-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0 }}>
            {/* Logo */}
            <div
              onClick={() => navigation.navigate(role === 'officer' ? 'OfficerHome' : 'Home')}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(13, 148, 136, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}>
                🏛️
              </div>
              <div>
                <div style={{ color: '#FFFFFF', fontSize: '17px', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  CivicPulse
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '9px', fontWeight: '700', letterSpacing: '0.04em' }}>
                  {role === 'officer' ? 'OFFICER PORTAL' : 'MUNICIPAL GOVERNANCE'}
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {navItems.map((item) => {
                const isActive = currentScreen === item.screen;
                return (
                  <button
                    key={item.screen}
                    type="button"
                    className={`cp-desktop-nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => navigation.navigate(item.screen)}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Actions: Quick Report Button + User Chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {role === 'citizen' && (
                <button
                  type="button"
                  onClick={() => navigation.navigate('ReportIssue')}
                  style={{
                    backgroundColor: COLORS.primary,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 10px rgba(13, 148, 136, 0.35)'
                  }}
                >
                  <span>📷</span> Report Issue
                </button>
              )}

              {/* User Avatar + Profile Info */}
              <div
                onClick={() => navigation.navigate('Profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                  alt="User"
                  style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: '700', lineHeight: 1.1 }}>
                    {user?.name ? user.name.split(' ')[0] : 'Citizen'}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', fontWeight: '600' }}>
                    {role === 'officer' ? 'Officer' : 'Citizen'}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => dispatch(logout())}
                title="Logout"
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.6)',
                  padding: '7px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>🚪</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1, width: '100%' }}>
        {renderActiveScreen()}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible only on screens < 768px) */}
      {showNav && (
        <nav className="cp-nav cp-mobile-nav">
          {navItems.map((item) => {
            const isActive = currentScreen === item.screen;
            return (
              <button
                key={item.screen}
                type="button"
                className={`cp-nav-btn ${isActive ? 'active' : ''}`}
                onClick={() => navigation.navigate(item.screen)}
                style={{ color: isActive ? COLORS.primary : COLORS.textMuted }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-1px',
                    width: '24px',
                    height: '3px',
                    backgroundColor: COLORS.primary,
                    borderRadius: '2px 2px 0 0'
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
