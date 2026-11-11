import storage from '../utils/storage';
import { getPersistedAvatar, savePersistedAvatar } from '../utils/avatarStorage';

const REGISTERED_USERS_KEY = 'cp_registered_users';

const DEFAULT_USERS = [
  {
    id: 'CIT-4668',
    name: 'Tejas Bhamre',
    email: 'tejas.bhamre@civicpulse.gov',
    phone: '9545286810',
    role: 'citizen',
    password: 'password123',
    ward: 'Citizen Ward',
    address: 'Near R.C. Patel Campus, Karwand Road, Shirpur, 425405',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'CIT-4481',
    name: 'Ananya Sharma',
    email: 'ananya@civicpulse.gov',
    phone: '9876543210',
    role: 'citizen',
    password: 'password123',
    ward: 'Ward 14 - Central Zone',
    address: 'B-42, Park View Apartments, Ward 14',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'OFF-9902',
    name: 'Inspector Rajesh Kumar',
    email: 'rajesh.officer@civicpulse.gov',
    phone: '9876500001',
    role: 'officer',
    password: 'password123',
    department: 'Roads & Infrastructure',
    ward: 'Ward 14 - Central Zone',
    badgeNumber: 'MCD-8841',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

function getStoredUsers() {
  let users = storage.getItem(REGISTERED_USERS_KEY);
  if (!Array.isArray(users) || users.length === 0) {
    storage.setItem(REGISTERED_USERS_KEY, DEFAULT_USERS);
    return [...DEFAULT_USERS];
  }
  // Ensure default registered users (like Tejas Bhamre) are always present even if local cache is older
  for (const def of DEFAULT_USERS) {
    const exists = users.some(u => u.id === def.id || u.phone === def.phone || (u.email && u.email === def.email));
    if (!exists) {
      users.unshift(def);
    }
  }
  storage.setItem(REGISTERED_USERS_KEY, users);
  return users;
}

function saveStoredUser(user) {
  const current = getStoredUsers();
  const filtered = current.filter(u => u.id !== user.id && u.phone !== user.phone && (!u.email || u.email !== user.email));
  filtered.unshift(user);
  storage.setItem(REGISTERED_USERS_KEY, filtered);

  // Sync to disk persistence on backend
  try {
    fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    }).catch(() => {});
  } catch (_) {}
}

export const authApi = {
  /**
   * Verification check: Checks if a person (phone or email) is already registered
   */
  async checkUserRegistered(identifier) {
    await new Promise(res => setTimeout(res, 200));

    const idClean = (identifier || '').trim();
    if (!idClean) {
      return { registered: false, reason: 'empty' };
    }

    const phoneDigits = idClean.replace(/\D/g, '');
    const isEmail = idClean.includes('@');

    const users = getStoredUsers();

    const matched = users.find(u => {
      const matchEmail = isEmail && u.email && u.email.toLowerCase() === idClean.toLowerCase();
      const matchPhone = !isEmail && phoneDigits.length >= 10 && (u.phone || '').replace(/\D/g, '') === phoneDigits;
      return matchEmail || matchPhone;
    });

    if (matched) {
      return {
        registered: true,
        user: {
          id: matched.id,
          name: matched.name,
          role: matched.role,
          email: matched.email,
          phone: matched.phone,
          ward: matched.ward,
          department: matched.department,
          avatar: getPersistedAvatar(matched, matched.avatar)
        }
      };
    }

    return {
      registered: false,
      identifier: idClean,
      reason: 'not_found'
    };
  },

  /**
   * Log in with Email or Phone + Password
   * Pre-verifies registration status before granting login permission.
   */
  async login({ identifier, password, role }) {
    await new Promise(res => setTimeout(res, 350));

    const idClean = (identifier || '').trim();
    if (!idClean) {
      throw new Error('Please enter your mobile number or email address.');
    }
    if (!password) {
      throw new Error('Please enter your password.');
    }

    // Step 1: Verification of registration
    const check = await this.checkUserRegistered(idClean);
    if (!check.registered) {
      const err = new Error(`Account not found! The mobile or email "${idClean}" is not registered in CivicPulse. Please register first.`);
      err.code = 'NOT_REGISTERED';
      err.identifier = idClean;
      throw err;
    }

    // Step 2: Retrieve full user record for credential check
    const users = getStoredUsers();
    const phoneDigits = idClean.replace(/\D/g, '');
    const isEmail = idClean.includes('@');

    const matchedUser = users.find(u => {
      const matchEmail = isEmail && u.email && u.email.toLowerCase() === idClean.toLowerCase();
      const matchPhone = !isEmail && phoneDigits && (u.phone || '').replace(/\D/g, '') === phoneDigits;
      return matchEmail || matchPhone;
    });

    // Step 3: Password verification
    if (matchedUser.password && matchedUser.password !== password) {
      const err = new Error(`Incorrect password for ${matchedUser.name}. Please enter your valid password.`);
      err.code = 'WRONG_PASSWORD';
      throw err;
    }

    // Step 4: Permission granted! Return safe user object with persistent avatar
    const { password: _, ...safeUser } = matchedUser;
    safeUser.avatar = getPersistedAvatar(safeUser, safeUser.avatar);

    return {
      success: true,
      token: `cp-jwt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      user: safeUser
    };
  },

  /**
   * Register a new Citizen or Municipal Officer
   */
  async register({ name, email, phone, password, role = 'citizen', ward, department, badgeNumber, address }) {
    await new Promise(res => setTimeout(res, 450));

    const trimmedName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const phoneDigits = (phone || '').replace(/\D/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('Please enter your full name (minimum 2 characters).');
    }
    if (!phoneDigits || phoneDigits.length < 10) {
      throw new Error('Please enter a valid 10-digit mobile number.');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const users = getStoredUsers();

    // Check if email or phone already exists
    const duplicate = users.find(u =>
      (u.email && u.email.toLowerCase() === cleanEmail) ||
      (u.phone && u.phone.replace(/\D/g, '') === phoneDigits)
    );

    if (duplicate) {
      throw new Error(`An account with this ${duplicate.email === cleanEmail ? 'email' : 'mobile number'} is already registered. Please sign in.`);
    }

    const isOfficer = role === 'officer';
    const randomIdNum = Math.floor(1000 + Math.random() * 9000);

    const newUser = {
      id: isOfficer ? `OFF-${randomIdNum}` : `CIT-${randomIdNum}`,
      name: trimmedName,
      email: cleanEmail,
      phone: phoneDigits,
      role: isOfficer ? 'officer' : 'citizen',
      password: password,
      ward: isOfficer ? (ward || 'Ward 14 - Central Zone') : 'Citizen Ward',
      department: isOfficer ? (department || 'Roads & Infrastructure') : undefined,
      badgeNumber: isOfficer ? (badgeNumber || `MCD-${randomIdNum}`) : undefined,
      address: address || 'Ward 14 - Main Area',
      avatar: isOfficer
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      createdAt: new Date().toISOString()
    };

    saveStoredUser(newUser);

    const { password: _, ...safeUser } = newUser;

    return {
      success: true,
      token: `cp-jwt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      user: safeUser
    };
  },

  // Legacy OTP helpers (kept for backward compatibility)
  async requestOTP(phone, role = 'citizen') {
    await new Promise(res => setTimeout(res, 300));
    return { success: true, message: `OTP sent to ${phone}`, mockOtp: '1234' };
  },

  async verifyOTP(phone, otp, role = 'citizen') {
    return this.login({ identifier: phone, password: 'password123', role });
  }
};

export default authApi;
