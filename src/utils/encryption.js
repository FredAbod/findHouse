const crypto = require('crypto');

// Encryption key should be 32 bytes (256 bits) for AES-256
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const IV_LENGTH = 16;

/**
 * Encrypt a string using AES-256-CBC
 * @param {string} text - The plaintext to encrypt
 * @returns {string} - The encrypted text in format: iv:encryptedData
 */
function encrypt(text) {
  if (!text) return null;
  
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc', 
    Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), 
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string using AES-256-CBC
 * @param {string} text - The encrypted text in format: iv:encryptedData
 * @returns {string} - The decrypted plaintext
 */
function decrypt(text) {
  if (!text) return null;
  
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), 
      iv
    );
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
}

/**
 * Mask an ID number showing only last 4 digits
 * @param {string} idNumber - The ID number to mask
 * @returns {string} - Masked ID number like ***1234
 */
function maskIdNumber(idNumber) {
  if (!idNumber || idNumber.length < 4) return '****';
  return '***' + idNumber.slice(-4);
}

/**
 * Hash a value (one-way, for comparison purposes)
 * @param {string} value - The value to hash
 * @returns {string} - The hashed value
 */
function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

module.exports = {
  encrypt,
  decrypt,
  maskIdNumber,
  hash
};
