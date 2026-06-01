import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isMouseDownInside = useRef(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    // Check if mousedown is inside the modal content
    const target = e.target as HTMLElement;
    const modalContent = overlayRef.current?.querySelector('.modal-content');
    isMouseDownInside.current = modalContent?.contains(target) ?? false;
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if both mousedown and mouseup were outside the modal content
    if (e.target === overlayRef.current && !isMouseDownInside.current) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onMouseDown={handleMouseDown}
      onClick={handleOverlayClick}
    >
      <div className="modal-content">
        {title && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
        )}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
