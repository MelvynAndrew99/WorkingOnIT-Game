import { useEffect, useId, useRef } from 'react';
import './managerPopup.css';

export default function ManagerPopup({
  open,
  onClose,
  onBuildRoad,
  example = false,
  paused = false,
}: {
  open: boolean;
  onClose: () => void;
  onBuildRoad: () => void;
  example?: boolean;
  paused?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const ignoreNextCloseRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const bodyId = useId();

  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const handleClose = () => {
      const previous = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previous?.isConnected) {
        previous.focus();
      }
      if (ignoreNextCloseRef.current) {
        ignoreNextCloseRef.current = false;
        return;
      }
      onCloseRef.current();
    };

    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        const active = document.activeElement;
        previousFocusRef.current = active instanceof HTMLElement ? active : null;
        dialog.showModal();
      }
      return;
    }

    if (dialog.open) {
      ignoreNextCloseRef.current = true;
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="manager-popup"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      <header className="manager-popup__header">
        <p className="manager-popup__badge">City manager</p>
        <h2 id={titleId} className="manager-popup__title">
          More roads!
        </h2>
      </header>

      <div id={bodyId} className="manager-popup__body" tabIndex={0}>
        {example ? (
          <p className="manager-popup__preface">
            A plan for future road blockages.
          </p>
        ) : null}

        <blockquote className="manager-popup__quote">
          We need more roads! I knew this town had potential.
        </blockquote>

        <p className="manager-popup__follow">
          Build a way around the wreck. Keep those customers moving. Now that's
          an improvement people will notice!
        </p>

        <p className="manager-popup__crew">
          <span className="manager-popup__crew-label">Crew</span>
          Keep an approach open for us. We've still got people to help.
        </p>

        <ul className="manager-popup__steps">
          <li>Connect roads on both sides of the blockage.</li>
          <li>Use a diversion if you need one.</li>
          <li>Keep crew access open.</li>
        </ul>

        <p className="manager-popup__caveat">
          A bypass gives traffic another route. The required crews still need
          to reach the scene and clear the wreck.
        </p>

        <p className="manager-popup__paused">{paused ? 'Traffic is paused. Resume it from your objective when you are ready.' : 'Traffic keeps moving while you read.'}</p>
      </div>

      <div className="manager-popup__actions">
        <button
          type="button"
          className="manager-popup__button manager-popup__button--primary"
          onClick={onBuildRoad}
        >
          Plan a route
        </button>
        <button
          type="button"
          className="manager-popup__button manager-popup__button--secondary"
          onClick={onClose}
        >
          Back to my city
        </button>
      </div>
    </dialog>
  );
}
