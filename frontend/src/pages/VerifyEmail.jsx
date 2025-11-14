import React, { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./VerifyEmail.css";

const OTP_LENGTH = 6;

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();

  // 之後從 login 帶 email 過來，現在沒帶就用預設
  const email = location.state?.email || "your.email@nyu.edu";

  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const inputsRef = useRef([]);

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

  const handleVerify = (e) => {
    e.preventDefault();
    const code = otpValues.join("");

    if (code.length !== OTP_LENGTH) {
      setError("Please enter the 6-digit code.");
      return;
    }

    setError("");
    setInfoMessage("");
    setLoading(true);

    // 🔜 之後改成真正呼叫 verify OTP API
    setTimeout(() => {
      setLoading(false);
      console.log("Fake verify, OTP:", code);
      setInfoMessage("Verification simulated. (API integration coming soon)");
      // 之後驗證成功再導去目標頁
      // navigate("/");
    }, 800);
  };

  const handleResend = () => {
    setError("");
    setInfoMessage("");
    setResendLoading(true);

    // 🔜 之後改成真正呼叫 resend OTP API
    setTimeout(() => {
      setResendLoading(false);
      console.log("Fake resend OTP to:", email);
      setInfoMessage(
        "A new code would be sent to your email. (This is a fake action for now)"
      );
    }, 600);
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
