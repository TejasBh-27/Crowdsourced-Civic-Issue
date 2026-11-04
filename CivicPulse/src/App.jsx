import React, { useState, useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { store } from './store/store';
import { checkAuthSession } from './store/slices/authSlice';
import { useDispatch } from 'react-redux';

import SplashScreen from './screens/auth/SplashScreen';
import LoginScreen from './screens/auth/LoginScreen';
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
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  useEffect(() => {
    // Try to restore session
    dispatch(checkAuthSession()).finally(() => {
      setTimeout(() => setIsAppLoading(false), 1500); // Give splash time to show
    });
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      const homeScreen = role === 'officer' ? 'OfficerHome' : 'Home';
      setCurrentScreen(homeScreen);
      setScreenHistory([homeScreen]);
    } else if (!isAppLoading) {
      setCurrentScreen('Login');
      setScreenHistory(['Login']);
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
    { screen: 'ReportIssue', icon: '📷', label: 'Report' },
    { screen: 'MyComplaints', icon: '📂', label: 'Complaints' },
    { screen: 'Profile', icon: '👤', label: 'Profile' },
  ];

  const OFFICER_NAV = [
    { screen: 'OfficerHome', icon: '📊', label: 'Dashboard' },
    { screen: 'AssignedComplaints', icon: '📋', label: 'Tasks' },
    { screen: 'Profile', icon: '👤', label: 'Profile' },
  ];

  const navItems = role === 'officer' ? OFFICER_NAV : CITIZEN_NAV;

  // Don't show nav on sub-screens
  const noNavScreens = ['ResolveComplaint', 'ComplaintDetail', 'OTP'];
  const showNav = isAuthenticated && !noNavScreens.includes(currentScreen);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
      <main style={{ flex: 1, width: '100%' }}>
        {renderActiveScreen()}
      </main>

      {showNav && (
        <nav className="cp-nav">
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
