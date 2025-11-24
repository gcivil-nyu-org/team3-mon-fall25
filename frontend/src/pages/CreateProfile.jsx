import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateProfile.css";

import { fetchMeStatus } from "../api/users";
import { createProfile, getMyProfile } from "../api/profiles";
import { useAuth } from "../contexts/AuthContext";
import { getLastAuthEmail, clearLastAuthEmail } from "../utils/authEmailStorage";
import { loadDormOptionas } from "../utils/dormOptions";
import { DORM_LOCATIONS_GROUPED } from "../constants/filterOptions";

const USERNAME_REGEX = /^[a-zA-Z0-9_.]+$/;
const BIO_MAX = 500;

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
  const [filterOptions, setFilterOptions] = useState({
    dorm_locations: DORM_LOCATIONS_GROUPED,
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
    let active = true;
    (async () => {
      const options = await loadDormOptionas();
      if (!active) return;
      setFilterOptions({ dorm_locations: options.dorm_locations || DORM_LOCATIONS_GROUPED });
    })();
    return () => {
      active = false;
    };
  }, []);

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
    <div style={{ background: "#F5F5F5", minHeight: "calc(100vh - 64px)", padding: "60px 24px" }}>
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        background: "#fff",
        borderRadius: 16,
        padding: 40,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 8,
          color: "#111",
          textAlign: "center",
        }}>
          Complete Your Profile
        </h1>
        <p style={{
          fontSize: 15,
          color: "#6b7280",
          textAlign: "center",
          marginBottom: 32,
        }}>
          Fill in your details to start shopping and selling
        </p>

        {submitError && (
          <div style={{
            background: "#FEE2E2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            padding: 12,
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 14,
          }}>
            {submitError}
          </div>
        )}

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            border: "1px solid #E5E7EB",
            flexShrink: 0,
          }}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="avatar preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 24, color: "#9CA3AF" }}>?</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label style={{
              display: "inline-block",
              padding: "10px 14px",
              background: "#56018D",
              color: "#fff",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}>
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleUpload(e.target.files?.[0])}
              />
              {avatarFile ? "Change Photo" : "Upload Photo"}
            </label>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
              Optional – JPG/PNG/WebP up to 5MB
            </div>
          </div>
        </div>

        {initializing ? (
          <div style={{ textAlign: "center", color: "#6b7280" }}>Loading…</div>
        ) : (
          <form onSubmit={onSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label htmlFor="cp-full-name" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Full Name *
              </label>
              <input
                id="cp-full-name"
                name="full_name"
                type="text"
                value={form.full_name}
                onChange={onChange}
                placeholder="Enter your full name"
                autoComplete="name"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `1px solid ${errors.full_name ? "#DC2626" : "#E5E7EB"}`,
                  fontSize: 15,
                  outline: "none",
                  background: "#fff",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#56018D"; }}
                onBlur={(e) => { e.target.style.borderColor = errors.full_name ? "#DC2626" : "#E5E7EB"; }}
              />
              {errors.full_name && <div style={{ color: "#DC2626", marginTop: 6, fontSize: 13 }}>{errors.full_name}</div>}
            </div>

            <div>
              <label htmlFor="cp-username" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Username *
              </label>
              <input
                id="cp-username"
                name="username"
                type="text"
                value={form.username}
                onChange={onChange}
                placeholder="Choose a unique username"
                autoComplete="username"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `1px solid ${errors.username ? "#DC2626" : "#E5E7EB"}`,
                  fontSize: 15,
                  outline: "none",
                  background: "#fff",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#56018D"; }}
                onBlur={(e) => { e.target.style.borderColor = errors.username ? "#DC2626" : "#E5E7EB"; }}
              />
              {errors.username && <div style={{ color: "#DC2626", marginTop: 6, fontSize: 13 }}>{errors.username}</div>}
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                This will be your unique identifier on the platform
              </div>
            </div>

            <div>
              <label htmlFor="cp-email" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                NYU Email
              </label>
              <input
                id="cp-email"
                type="email"
                value={email || ""}
                readOnly
                aria-readonly="true"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 15,
                  background: "#F9FAFB",
                  color: "#6b7280",
                }}
              />
            </div>

            <div>
              <label htmlFor="cp-phone" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Phone Number
              </label>
              <input
                id="cp-phone"
                name="phone_number"
                type="tel"
                value={form.phone_number}
                onChange={onChange}
                placeholder="(555) 123-4567"
                autoComplete="tel"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: "1px solid #E5E7EB",
                  fontSize: 15,
                  outline: "none",
                  background: "#fff",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#56018D"; }}
                onBlur={(e) => { e.target.style.borderColor = "#E5E7EB"; }}
              />
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                Optional – Helps buyers contact you
              </div>
            </div>

            <div>
              <label htmlFor="cp-dorm" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Location (Dorm) *
              </label>
              <select
                id="cp-dorm"
                name="dorm"
                value={form.dorm}
                onChange={onChange}
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `1px solid ${errors.dorm ? "#DC2626" : "#E5E7EB"}`,
                  fontSize: 15,
                  outline: "none",
                  background: "#fff",
                  cursor: "pointer",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#56018D"; }}
                onBlur={(e) => { e.target.style.borderColor = errors.dorm ? "#DC2626" : "#E5E7EB"; }}
              >
                <option value="">Select your location</option>
                {filterOptions.dorm_locations ? (
                  <>
                    {filterOptions.dorm_locations.washington_square?.length > 0 && (
                      <optgroup label="Washington Square">
                        {filterOptions.dorm_locations.washington_square.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </optgroup>
                    )}
                    {filterOptions.dorm_locations.downtown?.length > 0 && (
                      <optgroup label="Downtown">
                        {filterOptions.dorm_locations.downtown.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </optgroup>
                    )}
                    {filterOptions.dorm_locations.other?.length > 0 && (
                      <optgroup label="Other">
                        {filterOptions.dorm_locations.other.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </optgroup>
                    )}
                  </>
                ) : null}
              </select>
              {errors.dorm && <div style={{ color: "#DC2626", marginTop: 6, fontSize: 13 }}>{errors.dorm}</div>}
            </div>

            <div>
              <label htmlFor="cp-bio" style={{
                display: "block",
                marginBottom: 6,
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
              }}>
                Bio
              </label>
              <textarea
                id="cp-bio"
                name="bio"
                rows={4}
                value={form.bio}
                onChange={onChange}
                placeholder="Tell others about yourself... (optional)"
                maxLength={BIO_MAX}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 8,
                  border: `1px solid ${errors.bio ? "#DC2626" : "#E5E7EB"}`,
                  fontSize: 15,
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                  background: "#fff",
                }}
                onFocus={(e) => { e.target.style.borderColor = "#56018D"; }}
                onBlur={(e) => { e.target.style.borderColor = errors.bio ? "#DC2626" : "#E5E7EB"; }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <div style={{ color: "#6b7280", fontSize: 12 }}>Optional</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{bioCount}/{BIO_MAX}</div>
              </div>
              {errors.bio && <div style={{ color: "#DC2626", marginTop: 6, fontSize: 13 }}>{errors.bio}</div>}
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? "#9ca3af" : "#56018D",
                color: "#fff",
                padding: "14px 0",
                fontSize: 16,
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                cursor: saving ? "not-allowed" : "pointer",
                marginTop: 12,
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => !saving && (e.target.style.filter = "brightness(1.1)")}
              onMouseOut={(e) => !saving && (e.target.style.filter = "brightness(1)")}
            >
              {saving ? "Saving…" : "Complete Setup & Start Shopping"}
            </button>
            <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13 }}>
              You can always update your profile later in settings
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
