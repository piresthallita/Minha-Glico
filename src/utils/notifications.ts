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

export function sendWebNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
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
    try {
      const notif = new Notification(title, {
        body: options.body,
        icon: options.icon || 'https://fav.farm/🩸',
        tag: options.tag || 'minha-glico-reminder',
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
