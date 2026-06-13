// Translations for the offline / sync status banner.
export const part = {
  en: {
    offline: {
      offline: 'Offline — your changes are saved on this device',
      offlineDisabled: 'Offline — connect to the internet to make changes',
      offlineWithPending: 'Offline — {{count}} change(s) will sync when you reconnect',
      syncing: 'Syncing {{count}} change(s)…',
      entryDisabledError: "You're offline. Turn on offline data entry in Settings to save changes without a connection.",
    },
  },
  hi: {
    offline: {
      offline: 'ऑफ़लाइन — आपके बदलाव इस डिवाइस पर सहेजे गए हैं',
      offlineDisabled: 'ऑफ़लाइन — बदलाव करने के लिए इंटरनेट से कनेक्ट करें',
      offlineWithPending: 'ऑफ़लाइन — {{count}} बदलाव दोबारा कनेक्ट होने पर सिंक होंगे',
      syncing: '{{count}} बदलाव सिंक हो रहे हैं…',
      entryDisabledError: 'आप ऑफ़लाइन हैं। बिना कनेक्शन के बदलाव सहेजने के लिए सेटिंग्स में ऑफ़लाइन डेटा एंट्री चालू करें।',
    },
  },
  pa: {
    offline: {
      offline: 'ਆਫ਼ਲਾਈਨ — ਤੁਹਾਡੇ ਬਦਲਾਅ ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਸੰਭਾਲੇ ਗਏ ਹਨ',
      offlineDisabled: 'ਆਫ਼ਲਾਈਨ — ਬਦਲਾਅ ਕਰਨ ਲਈ ਇੰਟਰਨੈੱਟ ਨਾਲ ਕਨੈਕਟ ਕਰੋ',
      offlineWithPending: 'ਆਫ਼ਲਾਈਨ — {{count}} ਬਦਲਾਅ ਮੁੜ ਕਨੈਕਟ ਹੋਣ ਤੇ ਸਿੰਕ ਹੋਣਗੇ',
      syncing: '{{count}} ਬਦਲਾਅ ਸਿੰਕ ਹੋ ਰਹੇ ਹਨ…',
      entryDisabledError: 'ਤੁਸੀਂ ਆਫ਼ਲਾਈਨ ਹੋ। ਬਿਨਾਂ ਕਨੈਕਸ਼ਨ ਬਦਲਾਅ ਸੰਭਾਲਣ ਲਈ ਸੈਟਿੰਗਾਂ ਵਿੱਚ ਆਫ਼ਲਾਈਨ ਡਾਟਾ ਐਂਟਰੀ ਚਾਲੂ ਕਰੋ।',
    },
  },
} as const;
