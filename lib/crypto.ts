import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const STATE_SALT = process.env.ENCRYPTION_KEY || 'state-signing-key-not-set';
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

/**
 * Sign OAuth state with HMAC to prevent CSRF attacks
 * @param payload Object to include in the state (e.g. { workspaceId })
 * @returns Base64-encoded string with HMAC signature
 */
export function signOAuthState(payload: Record<string, any>): string {
    const hmac = crypto.createHmac('sha256', STATE_SALT);
    const data = JSON.stringify(payload);
    hmac.update(data);
    const sig = hmac.digest('hex');
    return Buffer.from(JSON.stringify({ ...payload, sig })).toString('base64');
}

/**
 * Verify OAuth state signature to prevent CSRF attacks
 * @param state The base64-encoded state string from callback
 * @returns The decoded payload if valid, throws if invalid
 */
export function verifyOAuthState(state: string): Record<string, any> {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
    const { sig, ...payload } = decoded;
    if (!sig) {
        throw new Error('Missing state signature');
    }
    const hmac = crypto.createHmac('sha256', STATE_SALT);
    hmac.update(JSON.stringify(payload));
    const expected = hmac.digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        throw new Error('Invalid state signature - possible CSRF attack');
    }
    return payload;
}
