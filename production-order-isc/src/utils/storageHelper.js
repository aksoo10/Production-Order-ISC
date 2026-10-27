/**
 * ANDRITZ ISC - LocalStorage Helper with TTL (Time To Live) Expiration
 * Default Data Cache TTL: 1 Menit (60.000 ms)
 * Catatan: Sesi login pengguna dan konfigurasi aplikasi TIDAK boleh kedaluwarsa otomatis.
 */

export const STORAGE_EXPIRY_MS = 60 * 1000; // 1 menit (60 detik) untuk cache data

/**
 * Daftar key yang TIDAK BOLEH kedaluwarsa secara otomatis (Persistent Keys).
 * Sesi login, pengaturan sandi, dan preferensi tampilan tetap aktif sampai pengguna klik "Keluar".
 */
export const PERSISTENT_KEYS = [
  'isc_production_session',
  'isc_production_admin_password',
  'isc_production_user_password',
  'isc_production_theme',
  'isc_production_sidebar',
  'isc_production_zoom'
];

/**
 * Menyimpan data ke localStorage.
 * - Key persisten (sesi pengguna, tema, password) disimpan tanpa kedaluwarsa.
 * - Data cache lainnya diberi batas kedaluwarsa 1 menit (ttlMs).
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs - Durasi kedaluwarsa dalam ms (default: 1 menit untuk cache)
 */
export function setStorageItem(key, value, ttlMs = STORAGE_EXPIRY_MS) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const isPersistent = PERSISTENT_KEYS.includes(key);
    const envelope = {
      value,
      expiry: isPersistent ? null : Date.now() + ttlMs,
      savedAt: Date.now(),
      persistent: isPersistent
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch (err) {
    console.warn(`[storageHelper] Gagal menyimpan ${key}:`, err);
  }
}

/**
 * Mengambil data dari localStorage dengan verifikasi masa berlaku.
 * - Key persisten (sesi pengguna) tidak pernah kedaluwarsa.
 * - Data cache yang melebihi 1 menit akan dibersihkan otomatis.
 * @param {string} key
 * @param {any} defaultValue
 * @returns {any}
 */
export function getStorageItem(key, defaultValue = null) {
  if (typeof window === 'undefined' || !window.localStorage) return defaultValue;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return defaultValue;

    const parsed = JSON.parse(raw);

    // Cek apakah data memiliki amplop format
    if (parsed && typeof parsed === 'object' && 'value' in parsed) {
      // Key persisten tidak pernah kedaluwarsa
      if (PERSISTENT_KEYS.includes(key) || parsed.persistent || parsed.expiry === null) {
        return parsed.value;
      }

      // Verifikasi expiry untuk cache data
      if (parsed.expiry && Date.now() > parsed.expiry) {
        window.localStorage.removeItem(key);
        return defaultValue;
      }
      return parsed.value;
    }

    return parsed;
  } catch {
    const raw = window.localStorage.getItem(key);
    return raw !== null ? raw : defaultValue;
  }
}

/**
 * Menghapus data spesifik dari localStorage
 * @param {string} key
 */
export function removeStorageItem(key) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[storageHelper] Gagal menghapus ${key}:`, err);
  }
}

/**
 * Memeriksa apakah data di localStorage sudah kedaluwarsa (> 1 menit)
 * Key persisten (sesi, preferensi) selalu mengembalikan false (tidak pernah kedaluwarsa otomatis).
 * @param {string} key
 * @returns {boolean}
 */
export function isStorageItemExpired(key) {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  if (PERSISTENT_KEYS.includes(key)) return false;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return true;

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'expiry' in parsed) {
      if (parsed.expiry === null || parsed.persistent) return false;
      return Date.now() > parsed.expiry;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Membersihkan semua data cache aplikasi ISC di localStorage yang sudah melewati batas kedaluwarsa 1 menit.
 * Key persisten (sesi pengguna, password, tema) TIDAK AKAN PERNAH dihapus.
 * @returns {string[]} daftar key yang telah dibersihkan
 */
export function purgeExpiredStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  const expiredKeys = [];
  try {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
      // Lewati key persisten agar sesi pengguna tidak keluar
      if (PERSISTENT_KEYS.includes(key)) {
        continue;
      }

      if (key.startsWith('isc_')) {
        if (isStorageItemExpired(key)) {
          window.localStorage.removeItem(key);
          expiredKeys.push(key);
        }
      }
    }
  } catch (err) {
    console.warn('[storageHelper] Kesalahan saat membersihkan storage kedaluwarsa:', err);
  }
  return expiredKeys;
}
