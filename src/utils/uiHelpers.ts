export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback
    }
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.setSelectionRange(0, text.length);
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}

export function showToast(message: string, duration = 2000): void {
  let toast = document.getElementById('app-feedback-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-feedback-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 84px;
      left: 50%;
      transform: translateX(-50%) translateY(10px);
      background: rgba(30, 32, 28, 0.92);
      color: #FFFFFF;
      font-size: 0.82rem;
      font-weight: 500;
      padding: 8px 16px;
      border-radius: 20px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      z-index: 99999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.22s ease, transform 0.22s ease;
      white-space: nowrap;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';

  if ((window as any)._toastTimer) {
    clearTimeout((window as any)._toastTimer);
  }

  (window as any)._toastTimer = setTimeout(() => {
    if (toast) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
    }
  }, duration);
}
