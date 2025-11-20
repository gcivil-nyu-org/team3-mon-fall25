import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateProfile.css";

import { fetchMeStatus } from "../api/users";
import { createProfile, getMyProfile } from "../api/profiles";
import { useAuth } from "../contexts/AuthContext";
import { getLastAuthEmail, clearLastAuthEmail } from "../utils/authEmailStorage";

const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
const BIO_MAX = 500;

const DORM_OPTIONS = [
  "Weinstein Hall",
  "Greenwich Hall",
  "Palladium Hall",
  "Third Avenue North",
  "Founders Hall",
  "Lipton Hall",
  "University Hall",
  "Brittany Hall",
  "Othmer Residence Hall",
];

export default function CreateProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [initializing, setInitializing] = useState(true);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState(() => user?.email || getLastAuthEmail());
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    phone_number: "",
    dorm: "",
    bio: "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: status } = await fetchMeStatus();
        if (!alive) return;
        if (status?.profile_complete) {
          navigate("/", { replace: true });
          return;
        }
      } catch (statusError) {
        console.error("Failed to fetch profile status", statusError);
      }

      try {
        const { data } = await getMyProfile();
        if (!alive) return;
        if (data?.profile_id) {
          navigate("/", { replace: true });
          return;
        }
        setEmail((prev) => data.email || prev || getLastAuthEmail());
      } catch (err) {
        if (err?.response?.status !== 404) {
          console.error("Failed to check existing profile", err);
          if (alive) {
            setSubmitError("Unable to load profile information. Please try again.");
          }
        }
      } finally {
        if (alive) setInitializing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!form.full_name.trim()) next.full_name = "Full name is required";
    if (!form.username.trim()) next.username = "Please choose a username";
    else if (!USERNAME_REGEX.test(form.username)) next.username = "Only letters, numbers, _ and . are allowed";
    else if (form.username.length > 30) next.username = "Max 30 characters";

    if (!form.dorm) next.dorm = "Please select your dorm or residence";

    if (form.bio && form.bio.length > BIO_MAX) next.bio = `Max ${BIO_MAX} characters`;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleUpload = (file) => {
    if (!file) return;
    const okType = ["image/jpeg","image/png","image/webp"].includes(file.type);
    if (!okType) return alert("Only JPG/PNG/WebP images are allowed");
    if (file.size / 1024 / 1024 >= 5) return alert("Image must be smaller than 5MB");

    setAvatarFile(file);
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setSubmitError("");
    try {
      const payload = new FormData();
      payload.append("full_name", form.full_name.trim());
      payload.append("username", form.username.trim());
      if (form.phone_number.trim()) payload.append("phone", form.phone_number.trim());
      payload.append("dorm_location", form.dorm);
      if (form.bio.trim()) payload.append("bio", form.bio.trim());
      if (avatarFile) payload.append("avatar", avatarFile);

      await createProfile(payload);
      alert("Profile completed! Welcome to NYU Marketplace.");
      clearLastAuthEmail();
      navigate("/", { replace: true });
    } catch (err) {
      const apiErr = err?.response?.data || {};
      if (apiErr.username?.length) {
        setErrors((p) => ({ ...p, username: apiErr.username[0] }));
      }
      if (apiErr.full_name?.length) {
        setErrors((p) => ({ ...p, full_name: apiErr.full_name[0] }));
      }
      if (apiErr.dorm_location?.length) {
        setErrors((p) => ({ ...p, dorm: apiErr.dorm_location[0] }));
      }
      setSubmitError(
        apiErr.error ||
          apiErr.detail ||
          "Failed to save your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const bioCount = useMemo(() => form.bio.length, [form.bio]);

  return (
    <div className="cp-page">
      <div className="cp-card">
        <div className="cp-header">
          <div className="cp-icon">✓</div>
          <h1 className="cp-title">Complete Your Profile</h1>
          <p className="cp-subtitle">
            Let's set up your profile to get started on NYU Marketplace
          </p>
        </div>

        <div className="cp-avatarSection">
          <div className="cp-avatarWrap">
            {avatarPreview ? (
              <img className="cp-avatarImg" src={avatarPreview} alt="avatar preview" />
            ) : (
              <span className="cp-avatarPlaceholder">?</span>
            )}
          </div>

          <label className="cp-uploadBtn">
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleUpload(e.target.files?.[0])}
            />
            {avatarFile ? "Change Photo" : "Upload Photo"}
          </label>
          <div className="cp-hint">Optional – You can add a photo later</div>
        </div>

        {initializing ? (
          <div className="cp-loading">Loading…</div>
        ) : (
          <form className="cp-form" onSubmit={onSubmit} noValidate>
            <div className="cp-field">
              <label className="cp-label" htmlFor="cp-full-name">
                Full Name <span className="cp-req">*</span>
              </label>
              <input
                className={`cp-input ${errors.full_name ? "cp-input--error" : ""}`}
                type="text"
                id="cp-full-name"
                name="full_name"
                value={form.full_name}
                onChange={onChange}
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
              {errors.full_name && <div className="cp-error">{errors.full_name}</div>}
            </div>

            <div className="cp-field">
              <label className="cp-label" htmlFor="cp-username">
                Username <span className="cp-req">*</span>
              </label>
              <input
                className={`cp-input ${errors.username ? "cp-input--error" : ""}`}
                type="text"
                id="cp-username"
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder="Choose a unique username"
                autoComplete="username"
                required
              />
              {errors.username && <div className="cp-error">{errors.username}</div>}
              <div className="cp-help">This will be your unique identifier on the platform</div>
            </div>

            <div className="cp-field">
              <label className="cp-label" htmlFor="cp-email">
                NYU Email
              </label>
              <input
                className="cp-input cp-input--readonly"
                type="email"
                id="cp-email"
                value={email || ""}
                readOnly
                aria-readonly="true"
              />
            </div>

            <div className="cp-field">
              <label className="cp-label" htmlFor="cp-phone">
                Phone Number
              </label>
              <input
                className="cp-input"
                type="tel"
                id="cp-phone"
                name="phone_number"
                value={form.phone_number}
                onChange={onChange}
                placeholder="(555) 123-4567"
                autoComplete="tel"
              />
              <div className="cp-help">Optional – Helps buyers contact you</div>
            </div>

            <div className="cp-field">
              <label className="cp-label" htmlFor="cp-dorm">
                Dorm/Residence <span className="cp-req">*</span>
              </label>
              <select
                className={`cp-select ${errors.dorm ? "cp-input--error" : ""}`}
                name="dorm"
                id="cp-dorm"
                value={form.dorm}
                onChange={onChange}
                required
              >
                <option value="">Select your dorm</option>
                {DORM_OPTIONS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.dorm && <div className="cp-error">{errors.dorm}</div>}
            </div>

            <div className="cp-field">
              <label className="cp-label" htmlFor="cp-bio">
                Bio
              </label>
              <textarea
                className={`cp-textarea ${errors.bio ? "cp-input--error" : ""}`}
                id="cp-bio"
                name="bio"
                rows={4}
                value={form.bio}
                onChange={onChange}
                placeholder="Tell others about yourself... (optional)"
                maxLength={BIO_MAX}
              />
              <div className="cp-count">{bioCount}/{BIO_MAX}</div>
              {errors.bio && <div className="cp-error">{errors.bio}</div>}
            </div>

            {submitError && (
              <div className="cp-error cp-error--global">{submitError}</div>
            )}

            <button className="cp-primaryBtn" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Complete Setup & Start Shopping"}
            </button>
            <div className="cp-footnote">
              You can always update your profile later in settings
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
