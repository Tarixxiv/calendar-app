import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ textAlign: 'center' }}>
                <h3 style={{ color: '#e74c3c' }}>{title}</h3>
                <p>{message}</p>
                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                    <button onClick={onConfirm} className="btn-danger">Yes, Delete</button>
                    <button onClick={onCancel} className="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;