// Utility for Web Notifications API and sound chime
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.warn('Erro ao solicitar permissão de notificações:', error);
    return 'denied';
  }
}

export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    // Pleasant two-tone chime
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    // Audio might require user interaction first
  }
}

export function getAppLogoUrl(): string {
  const base = (import.meta as any).env?.BASE_URL || '/';
  return `${base}logo.png`;
}

export function getAppBadgeUrl(): string {
  const base = (import.meta as any).env?.BASE_URL || '/';
  return `${base}pwa-192x192.png`;
}

export function sendWebNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    requireInteraction?: boolean;
  }
): boolean {
  playNotificationChime();

  if (!isNotificationSupported()) {
    console.warn('Web Notifications API não suportada neste navegador.');
    return false;
  }

  if (Notification.permission === 'granted') {
    const resolvedIcon = options.icon || getAppLogoUrl();
    const resolvedBadge = options.badge || getAppBadgeUrl();
    const resolvedTag = options.tag || `minha-glico-${Date.now()}`;

    // Prefer Service Worker registration showNotification for full PWA Push support on mobile/desktop
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          if (reg && typeof reg.showNotification === 'function') {
            return reg.showNotification(title, {
              body: options.body,
              icon: resolvedIcon,
              badge: resolvedBadge,
              tag: resolvedTag,
              requireInteraction: options.requireInteraction ?? true,
              vibrate: [200, 100, 200],
            } as NotificationOptions);
          }
          throw new Error('No SW showNotification');
        })
        .catch(() => {
          try {
            const notif = new Notification(title, {
              body: options.body,
              icon: resolvedIcon,
              badge: resolvedBadge,
              tag: resolvedTag,
              requireInteraction: options.requireInteraction ?? true,
            });
            notif.onclick = () => {
              window.focus();
              notif.close();
            };
          } catch (err) {
            console.warn('Erro ao disparar fallback Notification:', err);
          }
        });
      return true;
    }

    try {
      const notif = new Notification(title, {
        body: options.body,
        icon: resolvedIcon,
        badge: resolvedBadge,
        tag: resolvedTag,
        requireInteraction: options.requireInteraction ?? true,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
      return true;
    } catch (e) {
      console.warn('Erro ao disparar Web Notification:', e);
      return false;
    }
  }

  return false;
}
