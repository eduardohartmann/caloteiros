import { useEffect, useState } from "react";

export default function useToast() {
  const [toast, setToast] = useState({ message: "", visible: false, error: false });

  useEffect(() => {
    if (!toast.visible) return undefined;
    const timer = window.setTimeout(
      () => setToast((c) => ({ ...c, visible: false })),
      3600
    );
    return () => window.clearTimeout(timer);
  }, [toast.visible, toast.message]);

  function notify(message, error = false) {
    setToast({ message, error, visible: true });
  }

  return { toast, notify };
}
