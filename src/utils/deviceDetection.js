// Device Detection Utility
// ========================================

/**
 * Advanced device detection using user agent string
 * This provides accurate device, OS, and browser detection
 */
export const detectDevice = (userAgent) => {
  const ua = userAgent.toLowerCase();
  
  // Device Detection
  let device = 'Desktop';
  let deviceType = 'desktop';
  
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
    if (/tablet|ipad/i.test(ua)) {
      device = 'Tablet';
      deviceType = 'tablet';
    } else {
      device = 'Mobile';
      deviceType = 'mobile';
    }
  }

  // Operating System Detection
  let os = 'Unknown';
  let osVersion = '';
  
  if (/windows/i.test(ua)) {
    os = 'Windows';
    const match = ua.match(/windows nt (\d+\.\d+)/i);
    osVersion = match ? match[1] : '';
  } else if (/mac/i.test(ua)) {
    os = 'macOS';
    const match = ua.match(/mac os x (\d+[._]\d+)/i);
    osVersion = match ? match[1].replace('_', '.') : '';
  } else if (/linux/i.test(ua)) {
    os = 'Linux';
    if (/ubuntu/i.test(ua)) os = 'Ubuntu';
    else if (/debian/i.test(ua)) os = 'Debian';
    else if (/fedora/i.test(ua)) os = 'Fedora';
  } else if (/android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/android (\d+(?:\.\d+)?)/i);
    osVersion = match ? match[1] : '';
  } else if (/ios|iphone|ipad/i.test(ua)) {
    os = 'iOS';
    const match = ua.match(/os (\d+[._]\d+)/i);
    osVersion = match ? match[1].replace('_', '.') : '';
  }

  // Browser Detection
  let browser = 'Unknown';
  let browserVersion = '';
  
  // Chrome
  if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) {
    browser = 'Chrome';
    const match = ua.match(/chrome\/(\d+(?:\.\d+)?)/i);
    browserVersion = match ? match[1] : '';
  }
  // Firefox
  else if (/firefox/i.test(ua)) {
    browser = 'Firefox';
    const match = ua.match(/firefox\/(\d+(?:\.\d+)?)/i);
    browserVersion = match ? match[1] : '';
  }
  // Safari
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Safari';
    const match = ua.match(/version\/(\d+(?:\.\d+)?)/i);
    browserVersion = match ? match[1] : '';
  }
  // Edge
  else if (/edge|edg/i.test(ua)) {
    browser = 'Edge';
    const match = ua.match(/(?:edge|edg)\/(\d+(?:\.\d+)?)/i);
    browserVersion = match ? match[1] : '';
  }
  // Opera
  else if (/opera|opr/i.test(ua)) {
    browser = 'Opera';
    const match = ua.match(/(?:opera|opr)\/(\d+(?:\.\d+)?)/i);
    browserVersion = match ? match[1] : '';
  }
  // Internet Explorer
  else if (/msie|trident/i.test(ua)) {
    browser = 'Internet Explorer';
    const match = ua.match(/(?:msie |rv:)(\d+(?:\.\d+)?)/i);
    browserVersion = match ? match[1] : '';
  }

  // Additional Device Information
  let brand = '';
  let model = '';
  
  if (/iphone/i.test(ua)) {
    brand = 'Apple';
    model = 'iPhone';
  } else if (/ipad/i.test(ua)) {
    brand = 'Apple';
    model = 'iPad';
  } else if (/mac/i.test(ua)) {
    brand = 'Apple';
    model = 'Mac';
  } else if (/android/i.test(ua)) {
    const match = ua.match(/; ([^)]+)\)/);
    if (match) {
      const deviceInfo = match[1];
      const parts = deviceInfo.split(';');
      if (parts.length >= 2) {
        brand = parts[0].trim();
        model = parts[1].trim();
      }
    }
  }

  // Screen Resolution (if available)
  const screenResolution = typeof window !== 'undefined' 
    ? `${window.screen.width}x${window.screen.height}`
    : 'Unknown';

  // Language
  const language = typeof navigator !== 'undefined' 
    ? navigator.language || navigator.userLanguage
    : 'Unknown';

  // Timezone
  const timezone = typeof Intl !== 'undefined' 
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'Unknown';

  return {
    // Basic info
    device,
    deviceType,
    os,
    osVersion: osVersion || 'Unknown',
    browser,
    browserVersion: browserVersion || 'Unknown',
    
    // Detailed info
    brand: brand || 'Unknown',
    model: model || 'Unknown',
    screenResolution,
    language,
    timezone,
    
    // Raw user agent for debugging
    userAgent: ua,
    
    // Formatted strings
    deviceString: `${device} (${os} ${osVersion})`,
    browserString: `${browser} ${browserVersion}`,
    fullString: `${browser} ${browserVersion} on ${os} ${osVersion} (${device})`
  };
};

/**
 * Get device icon based on device type
 */
export const getDeviceIcon = (deviceType) => {
  const icons = {
    desktop: '🖥️',
    laptop: '💻',
    tablet: '📱',
    mobile: '📱',
    unknown: '📱'
  };
  return icons[deviceType] || icons.unknown;
};

/**
 * Get browser icon based on browser name
 */
export const getBrowserIcon = (browser) => {
  const icons = {
    chrome: '🌐',
    firefox: '🦊',
    safari: '🧭',
    edge: '📐',
    opera: '🎭',
    'internet explorer': '🔍',
    unknown: '🌐'
  };
  return icons[browser.toLowerCase()] || icons.unknown;
};

/**
 * Get OS icon based on operating system
 */
export const getOSIcon = (os) => {
  const icons = {
    windows: '🪟',
    macos: '🍎',
    linux: '🐧',
    android: '🤖',
    ios: '📱',
    ubuntu: '🐧',
    debian: '🐧',
    fedora: '🐧',
    unknown: '💻'
  };
  return icons[os.toLowerCase()] || icons.unknown;
};

/**
 * Check if device is mobile
 */
export const isMobile = (userAgent) => {
  const ua = userAgent.toLowerCase();
  return /mobile|android|iphone|ipad|phone/i.test(ua);
};

/**
 * Check if device is tablet
 */
export const isTablet = (userAgent) => {
  const ua = userAgent.toLowerCase();
  return /tablet|ipad/i.test(ua);
};

/**
 * Check if device is desktop
 */
export const isDesktop = (userAgent) => {
  return !isMobile(userAgent) && !isTablet(userAgent);
};

/**
 * Get device category for analytics
 */
export const getDeviceCategory = (userAgent) => {
  if (isTablet(userAgent)) return 'tablet';
  if (isMobile(userAgent)) return 'mobile';
  return 'desktop';
};

/**
 * Format device information for display
 */
export const formatDeviceInfo = (deviceInfo) => {
  return {
    ...deviceInfo,
    display: {
      device: `${deviceInfo.device} (${deviceInfo.brand} ${deviceInfo.model})`,
      browser: `${deviceInfo.browser} ${deviceInfo.browserVersion}`,
      os: `${deviceInfo.os} ${deviceInfo.osVersion}`,
      full: deviceInfo.fullString
    },
    icons: {
      device: getDeviceIcon(deviceInfo.deviceType),
      browser: getBrowserIcon(deviceInfo.browser),
      os: getOSIcon(deviceInfo.os)
    }
  };
};

// Export default for convenience
export default {
  detectDevice,
  getDeviceIcon,
  getBrowserIcon,
  getOSIcon,
  isMobile,
  isTablet,
  isDesktop,
  getDeviceCategory,
  formatDeviceInfo
};
