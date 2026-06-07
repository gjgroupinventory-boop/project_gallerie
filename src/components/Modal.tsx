import React from 'react';
import { createPortal } from 'react-dom';
import { XCircle } from 'lucide-react';

interface ModalProps {
    children: React.ReactNode;
    onClose: () => void;
    title: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string;
    variant?: 'default' | 'sharp';
}

export const Modal: React.FC<ModalProps> = ({ children, onClose, title, footer, maxWidth = 'max-w-2xl', variant = 'sharp' }) => {
    const isSharp = variant !== 'default';
    return createPortal(
        <div 
            className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                style={isSharp ? { borderRadius: '0px' } : undefined}
                className={`bg-white w-full ${maxWidth} shadow-[0_32px_80px_rgba(0,0,0,0.3),0_8px_32px_rgba(0,0,0,0.1)] max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200 border border-slate-200 ${isSharp ? 'rounded-none' : 'rounded-xl'} overflow-hidden`}
            >
                <div className="px-8 py-5 flex justify-between items-center bg-white border-b border-[#F3F3F3] flex-shrink-0">
                    <h3 
                        id="modal-title"
                        className="text-xl font-semibold text-[#323130] tracking-tight"
                    >
                        {title}
                    </h3>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-[#605E5C] hover:bg-[#EDEBE9] rounded-sm transition-colors"
                    >
                        <XCircle size={20} />
                    </button>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 p-8 bg-[#F3F3F3]">{children}</div>
                {footer && (
                    <div className="flex-shrink-0 px-8 py-6 bg-white border-t border-[#E1E1E1]">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
