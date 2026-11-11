import storage from './storage';

const CUSTOM_AVATARS_KEY = 'cp_custom_avatars';
const REGISTERED_USERS_KEY = 'cp_registered_users';

/**
 * Get the full map of custom avatars stored locally
 */
export function getAllCustomAvatars() {
  const map = storage.getItem(CUSTOM_AVATARS_KEY);
  return (map && typeof map === 'object') ? map : {};
}

/**
 * Retrieve the persistent avatar for a given user.
 * Checks user ID, phone, email, and role fallback.
 */
export function getPersistedAvatar(user, fallback = '') {
  if (!user && !fallback) return '';

  const map = getAllCustomAvatars();

  // 1. Direct match by user.id
  if (user?.id && map[user.id]) {
    return map[user.id];
  }

  // 2. Match by clean phone digits
  const phoneDigits = (user?.phone || '').replace(/\D/g, '');
  if (phoneDigits && map[phoneDigits]) {
    return map[phoneDigits];
  }

  // 3. Match by email
  const emailClean = (user?.email || '').trim().toLowerCase();
  if (emailClean && map[emailClean]) {
    return map[emailClean];
  }

  // 4. Role fallback if available
  const isOfficer = user?.role === 'officer';
  const roleFallbackKey = isOfficer ? 'last_officer_avatar' : 'last_citizen_avatar';
  if (map[roleFallbackKey]) {
    return map[roleFallbackKey];
  }

  // 5. Existing user avatar or fallback
  return user?.avatar || fallback;
}

/**
 * Save a custom avatar permanently for a user across sessions.
 * Updates:
 *   1. Custom avatars map (cp_custom_avatars) under ID, phone, email, and role
 *   2. Registered users table (cp_registered_users)
 *   3. Active user session (user_session)
 */
export function savePersistedAvatar(user, avatarBase64) {
  if (!avatarBase64) return;

  // 1. Update Custom Avatars Map
  const map = getAllCustomAvatars();
  const isOfficer = user?.role === 'officer';

  if (user?.id) map[user.id] = avatarBase64;
  const phoneDigits = (user?.phone || '').replace(/\D/g, '');
  if (phoneDigits) map[phoneDigits] = avatarBase64;
  const emailClean = (user?.email || '').trim().toLowerCase();
  if (emailClean) map[emailClean] = avatarBase64;

  // Role fallback
  map[isOfficer ? 'last_officer_avatar' : 'last_citizen_avatar'] = avatarBase64;
  storage.setItem(CUSTOM_AVATARS_KEY, map);

  // 2. Update in registered users database
  try {
    const users = storage.getItem(REGISTERED_USERS_KEY);
    if (Array.isArray(users)) {
      let updated = false;
      const newUsers = users.map(u => {
        const matchId = user?.id && u.id === user.id;
        const matchPhone = phoneDigits && (u.phone || '').replace(/\D/g, '') === phoneDigits;
        const matchEmail = emailClean && (u.email || '').toLowerCase() === emailClean;
        if (matchId || matchPhone || matchEmail) {
          updated = true;
          return { ...u, avatar: avatarBase64 };
        }
        return u;
      });

      if (!updated && user) {
        // Create an entry so subsequent logins remember it
        newUsers.unshift({
          ...user,
          avatar: avatarBase64
        });
      }
      storage.setItem(REGISTERED_USERS_KEY, newUsers);
    }
  } catch (e) {
    console.warn('Could not update registered users avatar:', e);
  }

  // 3. Update active session
  try {
    const session = storage.getItem('user_session');
    if (session && session.user) {
      session.user.avatar = avatarBase64;
      storage.setItem('user_session', session);
    }
  } catch (e) {
    console.warn('Could not update user_session avatar:', e);
  }
}

/**
 * Remove or reset custom avatar for a user
 */
export function removePersistedAvatar(user) {
  const map = getAllCustomAvatars();
  const phoneDigits = (user?.phone || '').replace(/\D/g, '');
  const emailClean = (user?.email || '').trim().toLowerCase();
  const isOfficer = user?.role === 'officer';

  if (user?.id) delete map[user.id];
  if (phoneDigits) delete map[phoneDigits];
  if (emailClean) delete map[emailClean];
  delete map[isOfficer ? 'last_officer_avatar' : 'last_citizen_avatar'];

  storage.setItem(CUSTOM_AVATARS_KEY, map);
}

/**
 * Compress and crop any image file into a compact Base64 JPEG
 * Suitable for instant display, offline storage, and persistence.
 */
export function compressImageToBase64(fileOrBlob, maxDim = 320, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!fileOrBlob) {
      return reject(new Error('No image provided'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Square crop or scale down
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;

          canvas.width = Math.min(maxDim, minDim);
          canvas.height = Math.min(maxDim, minDim);

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Center crop to square
          ctx.drawImage(
            img,
            startX, startY, minDim, minDim,
            0, 0, canvas.width, canvas.height
          );

          const base64 = canvas.toDataURL('image/jpeg', quality);
          resolve(base64);
        } catch (err) {
          // Fallback to original data URL if canvas fails
          resolve(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}
