export const sessionStore = {
  setItem(key, value) {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn('sessionStorage setItem error:', e);
    }
  },

  getItem(key) {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      }
      return null;
    } catch (e) {
      console.warn('sessionStorage getItem error:', e);
      return null;
    }
  },

  removeItem(key) {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('sessionStorage removeItem error:', e);
    }
  },

  clear() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.clear();
      }
    } catch (e) {
      console.warn('sessionStorage clear error:', e);
    }
  }
};

export const storage = {
  setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage setItem error:', e);
    }
  },

  getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.warn('Storage getItem error:', e);
      return null;
    }
  },

  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('Storage removeItem error:', e);
    }
  },

  clear() {
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
  }
};

export default storage;
