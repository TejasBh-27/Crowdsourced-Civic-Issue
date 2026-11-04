import { API_CONFIG } from '../constants/api';

export const authApi = {
  async requestOTP(phone, role = 'citizen') {
    await new Promise(res => setTimeout(res, 400));
    if (!phone) throw new Error('Phone number is required');
    return {
      success: true,
      message: `OTP sent to ${phone}`,
      mockOtp: '1234'
    };
  },

  async verifyOTP(phone, otp, role = 'citizen') {
    await new Promise(res => setTimeout(res, 500));
    if (otp !== '1234' && otp !== '0000') {
      throw new Error('Invalid OTP code. Try entering 1234');
    }

    const user = role === 'officer' ? {
      id: 'OFF-9902',
      name: 'Inspector Rajesh Kumar',
      phone: phone,
      role: 'officer',
      department: 'Roads & Infrastructure',
      ward: 'Ward 14 - Central Zone',
      badgeNumber: 'MCD-8841',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    } : {
      id: 'CIT-4481',
      name: 'Ananya Sharma',
      phone: phone,
      role: 'citizen',
      ward: 'Ward 14 - Central Zone',
      address: 'B-42, Park View Apartments',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    };

    return {
      success: true,
      token: `mock-jwt-token-${Date.now()}`,
      user
    };
  }
};

export default authApi;
