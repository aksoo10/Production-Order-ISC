/**
 * ANDRITZ ISC - LocalStorage Helper with TTL (Time To Live) Expiration
 * Default TTL: 1 Menit (60.000 ms)
 */

export const STORAGE_EXPIRY_MS = 60 * 1000; // 1 menit (60 detik)

/**
 * Menyimpan data ke localStorage dengan batas waktu kedaluwarsa 1 menit
 * @param {string} key
 * @param {any} value
 * @param {number} ttlMs - Durasi dalam milidetik (default: 60000 / 1 menit)
 */
export function setStorageItem(key, value, ttlMs = STORAGE_EXPIRY_MS) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const envelope = {
      value,
      expiry: Date.now() + ttlMs,
      savedAt: Date.now()
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch (err) {
    console.warn(`[storageHelper] Gagal menyimpan ${key}:`, err);
  }
}

/**
 * Mengambil data dari localStorage dengan verifikasi masa berlaku (1 menit).
 * Jika data sudah melewati 1 menit, data otomatis dihapus dan mengembalikan defaultValue.
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

    // Cek apakah data memiliki amplop expiry
    if (parsed && typeof parsed === 'object' && 'expiry' in parsed && 'value' in parsed) {
      if (Date.now() > parsed.expiry) {
        // Sudah kedaluwarsa (> 1 menit)! Hapus dari localStorage
        window.localStorage.removeItem(key);
        return defaultValue;
      }
      return parsed.value;
    }

    // Jika data lama belum beramplop expiry, perlakukan sebagai data baru dengan expiry 1 menit
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
 * @param {string} key
 * @returns {boolean}
 */
export function isStorageItemExpired(key) {
  if (typeof window === 'undefined' || !window.localStorage) return true;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return true;

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'expiry' in parsed) {
      return Date.now() > parsed.expiry;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Membersihkan semua data aplikasi ISC di localStorage yang sudah melewati batas kedaluwarsa 1 menit
 * @returns {string[]} daftar key yang telah dibersihkan
 */
export function purgeExpiredStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  const expiredKeys = [];
  try {
    const keys = Object.keys(window.localStorage);
    for (const key of keys) {
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
