// Translations for the offline / sync status banner.
export const part = {
  en: {
    offline: {
      offline: 'Offline — your changes are saved on this device',
      offlineWithPending: 'Offline — {{count}} change(s) will sync when you reconnect',
      syncing: 'Syncing {{count}} change(s)…',
    },
  },
  hi: {
    offline: {
      offline: 'ऑफ़लाइन — आपके बदलाव इस डिवाइस पर सहेजे गए हैं',
      offlineWithPending: 'ऑफ़लाइन — {{count}} बदलाव दोबारा कनेक्ट होने पर सिंक होंगे',
      syncing: '{{count}} बदलाव सिंक हो रहे हैं…',
    },
  },
  pa: {
    offline: {
      offline: 'ਆਫ਼ਲਾਈਨ — ਤੁਹਾਡੇ ਬਦਲਾਅ ਇਸ ਡਿਵਾਈਸ ਉੱਤੇ ਸੰਭਾਲੇ ਗਏ ਹਨ',
      offlineWithPending: 'ਆਫ਼ਲਾਈਨ — {{count}} ਬਦਲਾਅ ਮੁੜ ਕਨੈਕਟ ਹੋਣ ਤੇ ਸਿੰਕ ਹੋਣਗੇ',
      syncing: '{{count}} ਬਦਲਾਅ ਸਿੰਕ ਹੋ ਰਹੇ ਹਨ…',
    },
  },
} as const;
