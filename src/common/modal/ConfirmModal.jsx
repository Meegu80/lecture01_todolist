import "./ConfirmModal.css";

const ConfirmModal = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <p className="modal-message">{message}</p>
                <div className="modal-btn-group">
                    <button className="modal-cancel-btn" onClick={onCancel}>취소</button>
                    <button className="modal-confirm-btn" onClick={onConfirm}>삭제</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;