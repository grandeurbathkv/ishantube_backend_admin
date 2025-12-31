import axios from 'axios';

// TextMeBot API configuration
const TEXTMEBOT_API_KEY = 'drbG3t73RbHN';
const TEXTMEBOT_BASE_URL = 'https://api.textmebot.com';

/**
 * Generate a 6-digit OTP
 * @returns {string} 6-digit OTP
 */
export const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via WhatsApp using TextMeBot API
 * @param {string} phoneNumber - Phone number with country code (e.g., 918384015791)
 * @param {string} otp - OTP to send
 * @param {string} registrationType - Type of registration (e.g., 'Channel Partner', 'Architect', 'Party', 'Site')
 * @returns {Promise<object>} API response
 */
export const sendWhatsAppOTP = async (phoneNumber, otp, registrationType = 'registration') => {
    try {
        console.log('📱 Step 1: Starting WhatsApp OTP send process...');
        console.log('📱 Step 2: Input phone number:', phoneNumber);
        console.log('📱 Step 3: Generated OTP:', otp);
        console.log('📱 Step 3.5: Registration Type:', registrationType);

        // Format phone number - ensure it has country code
        let formattedPhone = phoneNumber.replace(/\D/g, '');
        console.log('📱 Step 4: Phone after removing non-digits:', formattedPhone);

        // If number starts with 0, remove it
        if (formattedPhone.startsWith('0')) {
            formattedPhone = formattedPhone.substring(1);
            console.log('📱 Step 5: Phone after removing leading 0:', formattedPhone);
        }

        // Add country code if not present (assuming India +91)
        if (!formattedPhone.startsWith('91') && formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
            console.log('📱 Step 6: Phone after adding country code:', formattedPhone);
        }

        const message = `Your OTP for ${registrationType} registration is: ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`;
        console.log('📱 Step 7: Message prepared:', message);

        const apiUrl = `${TEXTMEBOT_BASE_URL}/send.php`;
        console.log('📱 Step 8: API URL:', apiUrl);
        console.log('📱 Step 9: API Key:', TEXTMEBOT_API_KEY);

        // Send message via TextMeBot API using GET request
        console.log('📱 Step 10: Making API call...');
        const response = await axios.get(apiUrl, {
            params: {
                apikey: TEXTMEBOT_API_KEY,
                phone: formattedPhone,
                text: message
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'IshantubBackend/1.0'
            },
            timeout: 10000 // 10 second timeout
        });

        console.log('📱 Step 11: API Response Status:', response.status);
        console.log('📱 Step 12: API Response Data:', response.data);
        console.log('✅ WhatsApp OTP sent successfully:', {
            phone: formattedPhone,
            status: response.data
        });

        return {
            success: true,
            phone: formattedPhone,
            response: response.data
        };
    } catch (error) {
        console.error('❌ Error sending WhatsApp OTP - Full error:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error response status:', error.response?.status);
        console.error('❌ Error response data:', error.response?.data);
        console.error('❌ Error response headers:', error.response?.headers);
        console.error('❌ Error config:', {
            url: error.config?.url,
            method: error.config?.method,
            params: error.config?.params
        });

        // Check for specific error messages from TextMeBot API
        if (error.response?.data && typeof error.response.data === 'string') {
            const errorData = error.response.data;

            if (errorData.includes('disconnected from the API')) {
                throw new Error('WhatsApp sender number is disconnected. Please reconnect at: https://api.textmebot.com/status.php?apikey=' + TEXTMEBOT_API_KEY);
            }

            if (errorData.includes('not expecting to receive')) {
                throw new Error('Recipient is not expecting messages. Please ensure the number has opted in to receive messages.');
            }
        }

        throw new Error('Failed to send OTP via WhatsApp. Please check API configuration.');
    }
};

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid
 */
export const validatePhoneNumber = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
    // Check if it's 10 digits (without country code) or 12 digits (with 91)
    return cleaned.length === 10 || (cleaned.length === 12 && cleaned.startsWith('91'));
};

/**
 * Store OTP in memory with expiration (5 minutes)
 * In production, use Redis or database for better scalability
 */
const otpStore = new Map();

/**
 * Store OTP for a phone number
 * @param {string} phoneNumber - Phone number
 * @param {string} otp - OTP to store
 */
export const storeOTP = (phoneNumber, otp) => {
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpStore.set(phoneNumber, { otp, expiresAt });

    // Auto-cleanup after expiration
    setTimeout(() => {
        otpStore.delete(phoneNumber);
    }, 5 * 60 * 1000);
};

/**
 * Verify OTP for a phone number
 * @param {string} phoneNumber - Phone number
 * @param {string} otp - OTP to verify
 * @returns {boolean} True if valid
 */
export const verifyOTP = (phoneNumber, otp) => {
    const stored = otpStore.get(phoneNumber);

    if (!stored) {
        return false; // OTP not found
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(phoneNumber);
        return false; // OTP expired
    }

    if (stored.otp === otp) {
        otpStore.delete(phoneNumber); // Remove OTP after successful verification
        return true;
    }

    return false; // Invalid OTP
};

/**
 * Clear OTP for a phone number
 * @param {string} phoneNumber - Phone number
 */
export const clearOTP = (phoneNumber) => {
    otpStore.delete(phoneNumber);
};
