// frontend/src/pages/VerifyEmail.jsx
import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import apiClient from "../api/client";
import { endpoints } from "../api/endpoints";
import "./VerifyEmail.css";

const OTP_LENGTH = 6;

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Login page should call navigate("/verify-email", { state: { email } })
  const email = location.state?.email || "";

  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const inputsRef = useRef([]);

  // If no email is provided (e.g., user hits the URL directly), send them back to login
  useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
    }
  }, [email, navigate]);

  const handleChange = (index, value) => {
    const numericValue = value.replace(/\D/g, "");
    const newOtp = [...otpValues];

    if (!numericValue) {
      newOtp[index] = "";
      setOtpValues(newOtp);
      return;
    }

    newOtp[index] = numericValue[0];
    setOtpValues(newOtp);

    if (index < OTP_LENGTH - 1 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (otpValues[index]) {
        const newOtp = [...otpValues];
        newOtp[index] = "";
        setOtpValues(newOtp);
      } else if (index > 0 && inputsRef.current[index - 1]) {
        inputsRef.current[index - 1].focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!paste) return;

    const newOtp = [...otpValues];
    for (let i = 0; i < OTP_LENGTH; i++) {
      newOtp[i] = paste[i] || "";
    }
    setOtpValues(newOtp);

    const lastIndex = Math.min(paste.length, OTP_LENGTH) - 1;
    if (lastIndex >= 0 && inputsRef.current[lastIndex]) {
      inputsRef.current[lastIndex].focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const code = otpValues.join("");

    if (code.length !== OTP_LENGTH) {
      setError("Please enter the 6-digit code.");
      return;
    }
    if (!email) {
      setError("Missing email. Please login again.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setInfoMessage("");

      const response = await apiClient.post(endpoints.auth.verifyOtp, {
        email,
        otp: code,
      });

      // Backend responds with access_token, refresh_token, and user
      login(
        response.data.access_token,
        response.data.refresh_token,
        response.data.user
      );

      // Verification succeeded → send the user back to the home page (or desired route)
      navigate("/", { replace: true });
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.error ||
          data?.detail ||
          "Failed to verify the code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Missing email. Please login again.");
      return;
    }

    try {
      setResendLoading(true);
      setError("");
      setInfoMessage("");

      const response = await apiClient.post(endpoints.auth.resendOtp, {
        email,
      });

      setInfoMessage(
        response.data.message || "Verification code sent successfully."
      );
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.error ||
          data?.detail ||
          "Failed to resend verification code. Please try again."
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="verify-page">
      <div className="verify-card">
        {/* Back to login */}
        <button
          type="button"
          className="verify-back-btn"
          onClick={handleBackToLogin}
        >
          ← Back to login
        </button>

        {/* Icon */}
        <div className="verify-icon-wrapper">
          <div className="verify-icon">
            <svg
              className="verify-icon-mail"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect
                x="3"
                y="6"
                width="18"
                height="12"
                rx="2"
                ry="2"
                fill="none"
                stroke="#5B21B6"
                strokeWidth="1.8"
              />
              <path
                d="M4 8l8 5 8-5"
                fill="none"
                stroke="#5B21B6"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Title & subtitle */}
        <h2 className="verify-title">Verify Your Email</h2>
        <p className="verify-subtitle">
          We've sent a 6-digit code to{" "}
          <span className="verify-email-text">{email}</span>
        </p>

        {/* OTP form */}
        <form onSubmit={handleVerify}>
          <div className="verify-otp-wrapper" onPaste={handlePaste}>
            {otpValues.map((value, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={value}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                ref={(el) => (inputsRef.current[index] = el)}
                className="verify-otp-input"
              />
            ))}
          </div>

          {error && <div className="verify-error">{error}</div>}
          {infoMessage && <div className="verify-info">{infoMessage}</div>}

          <button
            type="submit"
            disabled={loading}
            className={`verify-submit-btn ${
              loading ? "verify-submit-btn--loading" : ""
            }`}
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendLoading}
          className={`verify-resend-btn ${
            resendLoading ? "verify-resend-btn--loading" : ""
          }`}
        >
          {resendLoading ? "Resending..." : "Resend OTP"}
        </button>

        <p className="verify-footer">
          Didn't receive the code? Check your spam folder or try resending.
        </p>
      </div>
    </div>
  );
}
