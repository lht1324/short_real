import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// 32-byte key is required for AES-256
const getKey = () => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error("ENCRYPTION_KEY is missing in environment variables.");
    }
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== 32) {
        throw new Error("ENCRYPTION_KEY must be a 32-byte hex string.");
    }
    return keyBuffer;
};

export const cryptoUtils = {
    /**
     * Encrypts a text string using AES-256-GCM and binds it to a specific marker (e.g., userId).
     * @param text The plain text to encrypt.
     * @param bindMarker The marker to bind the encryption to (AAD).
     * @returns A string in the format iv:authTag:encryptedText
     */
    encrypt: (text: string, bindMarker: string): string => {
        const iv = crypto.randomBytes(12); // 12 bytes is standard for GCM
        const key = getKey();
        
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        // Add AAD (Additional Authenticated Data)
        cipher.setAAD(Buffer.from(bindMarker, 'utf8'));
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag().toString('hex');
        
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    },

    /**
     * Decrypts an encrypted string that was bound to a specific marker.
     * @param encryptedData The encrypted string (iv:authTag:encryptedText).
     * @param bindMarker The marker the data was bound to. Must match exactly.
     * @returns The decrypted plain text.
     */
    decrypt: (encryptedData: string, bindMarker: string): string => {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error("Invalid encrypted data format.");
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];
        
        const key = getKey();
        
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        
        // Add AAD for verification
        decipher.setAAD(Buffer.from(bindMarker, 'utf8'));
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }
};
