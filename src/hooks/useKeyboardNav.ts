// src/hooks/useKeyboardNav.ts
// Keyboard navigation helper:
// Ctrl+K / Cmd+K → open search
// Escape → close search
// Arrow keys (Up/Down) → navigate results
// Enter → go to selected page

export interface KeyboardNavHandlers {
  onOpenSearch?: () => void;
  onCloseSearch?: () => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  onSelectCurrent?: () => void;
}

/**
 * Mendaftarkan event listener global keyboard navigation
 */
export function setupKeyboardNav(handlers: KeyboardNavHandlers): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleKeyDown = (e: KeyboardEvent) => {
    // 1. Ctrl+K atau Cmd+K untuk membuka search modal
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      handlers.onOpenSearch?.();
      return;
    }

    // 2. Escape untuk menutup search modal
    if (e.key === 'Escape') {
      handlers.onCloseSearch?.();
      return;
    }

    // 3. Arrow Down untuk navigasi hasil ke bawah
    if (e.key === 'ArrowDown') {
      if (handlers.onNavigateNext) {
        e.preventDefault();
        handlers.onNavigateNext();
      }
      return;
    }

    // 4. Arrow Up untuk navigasi hasil ke atas
    if (e.key === 'ArrowUp') {
      if (handlers.onNavigatePrev) {
        e.preventDefault();
        handlers.onNavigatePrev();
      }
      return;
    }

    // 5. Enter untuk memilih item aktif
    if (e.key === 'Enter') {
      if (handlers.onSelectCurrent) {
        e.preventDefault();
        handlers.onSelectCurrent();
      }
      return;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}

/**
 * Script inisialisasi default yang menghubungkan elemen search-modal DOM
 */
export function initDefaultSearchKeyboardNav(modalId = 'search-modal', inputId = 'search-input'): void {
  if (typeof document === 'undefined') return;

  const modal = document.getElementById(modalId);
  const input = document.getElementById(inputId) as HTMLInputElement | null;

  setupKeyboardNav({
    onOpenSearch: () => {
      modal?.classList.remove('hidden');
      input?.focus();
    },
    onCloseSearch: () => {
      modal?.classList.add('hidden');
    }
  });
}
