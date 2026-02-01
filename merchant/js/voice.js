// BoonLink Voice Announcement System
// Multi-language support: Chinese, English, Thai

const voiceTemplates = {
    zh: {
        withNote: '收款到账 {amount} 泰铢。备注：{note}',
        withoutNote: '收款到账 {amount} 泰铢'
    },
    en: {
        withNote: 'Payment received. {amount} Baht. Note: {note}',
        withoutNote: 'Payment received. {amount} Baht'
    },
    th: {
        // Natural Thai: "รับเงินแล้ว X บาท" = Received X Baht
        withNote: 'รับเงินแล้ว {amount} บาท หมายเหตุ {note}',
        withoutNote: 'รับเงินแล้ว {amount} บาท'
    }
};

const languageCodes = {
    zh: 'zh-CN',
    en: 'en-US',
    th: 'th-TH'
};

// Play voice announcement
async function playVoiceAnnouncement(amountTHB, note, language = 'zh') {
    console.log('🔊 Playing voice:', { amount: amountTHB, note, language });
    
    if (!('speechSynthesis' in window)) {
        console.error('Speech synthesis not supported');
        throw new Error('语音合成不支持');
    }

    // Generate voice text
    const template = note
        ? voiceTemplates[language]?.withNote || voiceTemplates.zh.withNote
        : voiceTemplates[language]?.withoutNote || voiceTemplates.zh.withoutNote;

    // Format amount - round to whole number for natural speech
    const formattedAmount = Math.round(amountTHB).toLocaleString();
    
    const voiceText = template
        .replace('{amount}', formattedAmount)
        .replace('{note}', note || '');

    console.log('🔊 Voice text:', voiceText, 'Language:', language);

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Wait for voices to load
    await ensureVoicesLoaded();

    const utterance = new SpeechSynthesisUtterance(voiceText);
    const langCode = languageCodes[language] || 'zh-CN';
    utterance.lang = langCode;
    
    // Find the best voice for this language
    const voices = window.speechSynthesis.getVoices();
    console.log('🔊 Available voices:', voices.length);
    
    // Try to find a voice that matches the language
    let selectedVoice = null;
    const langPrefix = langCode.split('-')[0]; // 'th', 'zh', 'en'
    
    // Priority: exact match > language prefix match > any voice
    selectedVoice = voices.find(v => v.lang === langCode) ||
                    voices.find(v => v.lang.startsWith(langPrefix)) ||
                    voices.find(v => v.lang.toLowerCase().includes(langPrefix));
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('🔊 Selected voice:', selectedVoice.name, selectedVoice.lang);
    } else {
        console.warn('🔊 No voice found for', langCode, '- using default');
    }
    
    // Adjust speech settings
    utterance.rate = language === 'th' ? 0.9 : 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    return new Promise((resolve, reject) => {
        utterance.onend = () => {
            console.log('🔊 Voice finished');
            resolve();
        };
        utterance.onerror = (e) => {
            console.error('🔊 Voice error:', e);
            reject(e);
        };

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50]);
        }

        window.speechSynthesis.speak(utterance);
    });
}

// Ensure voices are loaded (some browsers load them async)
function ensureVoicesLoaded() {
    return new Promise((resolve) => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
            return;
        }
        
        // Wait for voices to load
        window.speechSynthesis.onvoiceschanged = () => {
            resolve(window.speechSynthesis.getVoices());
        };
        
        // Timeout after 1 second
        setTimeout(() => resolve([]), 1000);
    });
}

// Get/Set voice settings
function getVoiceSettings() {
    const defaults = {
        autoPlay: true,
        language: 'zh'
    };
    const saved = localStorage.getItem('voiceSettings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            console.log('🔊 Loaded voice settings:', parsed);
            return parsed;
        } catch (e) {
            console.error('🔊 Failed to parse voice settings');
        }
    }
    return defaults;
}

function setVoiceSettings(settings) {
    console.log('🔊 Saving voice settings:', settings);
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
}

// Export for use in HTML
window.playVoiceAnnouncement = playVoiceAnnouncement;
window.getVoiceSettings = getVoiceSettings;
window.setVoiceSettings = setVoiceSettings;
