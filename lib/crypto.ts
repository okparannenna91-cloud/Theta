import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard IV length
const AUTH_TAG_LENGTH = 16;
const KEY = process.env.ENCRYPTION_KEY;

/**
 * Encrypt sensitive information using AES-256-GCM
 * @param text The plain text to encrypt
 * @returns Encrypted string in format iv:authTag:encrypted
 */
export function encrypt(text: string): string {
    if (!KEY) {
        throw new Error('ENCRYPTION_KEY is not defined in environment variables');
    }

    // Ensure key is the correct length (32 bytes for aes-256)
    const keyBuffer = Buffer.from(KEY, 'hex');
    if (keyBuffer.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be a 32-byte hex string');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    // Return combined string: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt information encrypted with the encrypt function
 * @param encryptedData The string in format iv:authTag:encrypted
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
    if (!KEY) {
        throw new Error('ENCRYPTION_KEY is not defined in environment variables');
    }

    const keyBuffer = Buffer.from(KEY, 'hex');
    if (keyBuffer.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be a 32-byte hex string');
    }

    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encryptedText] = parts;

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
