export default function Toast({ toast }) {
  return (
    <div className={`toast${toast.visible ? " visible" : ""}${toast.error ? " error" : ""}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
