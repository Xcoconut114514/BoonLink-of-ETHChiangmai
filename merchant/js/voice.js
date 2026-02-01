// BoonLink Voice Announcement System
// Multi-language support: Chinese, English, Thai

const voiceTemplates = {
    zh: {
        withNote: 'BoonLink 收款到账 {amount} 泰铢。备注：{note}',
        withoutNote: 'BoonLink 收款到账 {amount} 泰铢'
    },
    en: {
        withNote: 'BoonLink payment received. {amount} Thai Baht. Note: {note}',
        withoutNote: 'BoonLink payment received. {amount} Thai Baht'
    },
    th: {
        // Optimized Thai pronunciation - more natural speech pattern
        withNote: 'บุญลิงค์ รับชำระเงิน {amount} บาท หมายเหตุ {note}',
        withoutNote: 'บุญลิงค์ รับชำระเงิน {amount} บาท'
    }
};

const languageCodes = {
    zh: 'zh-CN',
    en: 'en-US',
    th: 'th-TH'
};

// Play voice announcement
function playVoiceAnnouncement(amountTHB, note, language = 'zh') {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            console.error('Speech synthesis not supported');
            reject(new Error('语音合成不支持'));
            return;
        }

        // Generate voice text
        const template = note
            ? voiceTemplates[language].withNote
            : voiceTemplates[language].withoutNote;

        // Format amount for Thai - use Thai number reading
        let formattedAmount = amountTHB.toFixed(2);
        
        const voiceText = template
            .replace('{amount}', formattedAmount)
            .replace('{note}', note || '');

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(voiceText);
        utterance.lang = languageCodes[language] || 'zh-CN';
        
        // Adjust speech rate based on language
        if (language === 'th') {
            utterance.rate = 0.85; // Slightly slower for Thai
            utterance.pitch = 1.0;
        } else {
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
        }
        utterance.volume = 1.0;

        // Try to find a native voice for the language
        const voices = window.speechSynthesis.getVoices();
        const langCode = languageCodes[language];
        const nativeVoice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
        if (nativeVoice) {
            utterance.voice = nativeVoice;
        }

        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(e);

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50]);
        }

        window.speechSynthesis.speak(utterance);
    });
}

// Get/Set voice settings
function getVoiceSettings() {
    const defaults = {
        autoPlay: true,
        language: 'zh'
    };
    const saved = localStorage.getItem('voiceSettings');
    return saved ? JSON.parse(saved) : defaults;
}

function setVoiceSettings(settings) {
    localStorage.setItem('voiceSettings', JSON.stringify(settings));
}

// Export for use in HTML
window.playVoiceAnnouncement = playVoiceAnnouncement;
window.getVoiceSettings = getVoiceSettings;
window.setVoiceSettings = setVoiceSettings;
