import React from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import "./DeleteAccountModal.css";

export default function DeleteAccountModal({ onClose, onConfirm }) {
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <FaExclamationTriangle className="alert-icon" />
          <h2 className="modal-title">Are you absolutely sure?</h2>
        </div>

        <div className="modal-content">
          <p className="warning-text">
            This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
          </p>

          <ul className="deletion-list">
            <li>All your active and sold listings</li>
            <li>All your messages and conversations</li>
            <li>Your profile information and statistics</li>
            <li>Your transaction history</li>
          </ul>
        </div>

        <div className="button-container">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="delete-button" onClick={onConfirm}>
            Yes, Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
