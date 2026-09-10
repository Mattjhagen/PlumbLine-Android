import { useEffect, useRef } from 'react';

interface BackButtonHandlers {
  activeModal: string | null;
  onCloseModal: () => void;
  canGoBackTab: boolean;
  onGoBackTab: () => void;
}

export function useAndroidBackButton({
  activeModal,
  onCloseModal,
  canGoBackTab,
  onGoBackTab,
}: BackButtonHandlers) {
  const activeModalRef = useRef(activeModal);
  const onCloseModalRef = useRef(onCloseModal);
  const canGoBackTabRef = useRef(canGoBackTab);
  const onGoBackTabRef = useRef(onGoBackTab);

  activeModalRef.current = activeModal;
  onCloseModalRef.current = onCloseModal;
  canGoBackTabRef.current = canGoBackTab;
  onGoBackTabRef.current = onGoBackTab;

  // When a modal opens, push a dummy state to history so Android Back button triggers popstate
  useEffect(() => {
    if (activeModal) {
      window.history.pushState({ modal: activeModal }, '');
    }
  }, [activeModal]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If a modal is currently open, close it
      if (activeModalRef.current) {
        onCloseModalRef.current();
        return;
      }

      // If no modal is open but user can go back to previous tab
      if (canGoBackTabRef.current) {
        onGoBackTabRef.current();
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);
}
