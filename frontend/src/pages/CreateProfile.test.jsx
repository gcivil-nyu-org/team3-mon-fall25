import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateProfile from "./CreateProfile";

const mockNavigate = vi.fn();
const mockFetchMeStatus = vi.fn();
const mockGetMyProfile = vi.fn();
const mockCreateProfile = vi.fn();
const mockGetLastAuthEmail = vi.fn();
const mockClearLastAuthEmail = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../api/users", () => ({
  fetchMeStatus: (...args) => mockFetchMeStatus(...args),
}));

vi.mock("../api/profiles", () => ({
  getMyProfile: (...args) => mockGetMyProfile(...args),
  createProfile: (...args) => mockCreateProfile(...args),
}));

vi.mock("../utils/authEmailStorage", () => ({
  getLastAuthEmail: (...args) => mockGetLastAuthEmail(...args),
  clearLastAuthEmail: (...args) => mockClearLastAuthEmail(...args),
}));

describe("CreateProfile page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { email: "student@nyu.edu" } });
    mockGetLastAuthEmail.mockReturnValue("session@nyu.edu");
    mockFetchMeStatus.mockResolvedValue({ data: { profile_complete: false } });
    mockGetMyProfile.mockRejectedValue({
      response: { status: 404 },
    });
    mockCreateProfile.mockResolvedValue({ data: { profile_id: 1 } });
    window.alert = vi.fn();
    if (URL.createObjectURL) {
      vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    } else {
      URL.createObjectURL = vi.fn(() => "blob:test");
    }
    if (URL.revokeObjectURL) {
      vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    } else {
      URL.revokeObjectURL = vi.fn();
    }
  });

  const renderComponent = () => render(<CreateProfile />);

  it("redirects home when profile already complete", async () => {
    mockFetchMeStatus.mockResolvedValueOnce({
      data: { profile_complete: true },
    });

    renderComponent();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
    expect(mockGetMyProfile).not.toHaveBeenCalled();
  });

  it("renders form with required fields and read-only email", async () => {
    renderComponent();

    await waitFor(() =>
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
    );

    const fullName = screen.getByLabelText(/Full Name/i);
    const username = screen.getByLabelText(/Username/i);
    const dorm = screen.getByLabelText(/Location \(Dorm\)/i);
    const email = screen.getByDisplayValue("student@nyu.edu");

    expect(fullName).toHaveAttribute("required");
    expect(username).toHaveAttribute("required");
    expect(dorm).toHaveAttribute("required");
    expect(email).toHaveAttribute("readonly");
  });

  it("shows validation errors when required fields missing", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /complete setup/i })).toBeEnabled()
    );

    await user.click(
      screen.getByRole("button", { name: /complete setup/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Full name is required")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Please choose a username")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Please select your dorm or residence")
      ).toBeInTheDocument();
    });
    expect(mockCreateProfile).not.toHaveBeenCalled();
  });

  it("submits profile data and navigates home on success", async () => {
    const user = userEvent.setup();
    const { container } = renderComponent();

    await waitFor(() => screen.getByLabelText(/Full Name/));

    await user.type(screen.getByLabelText(/Full Name/), "Alex Morgan");
    await user.type(screen.getByLabelText(/Username/), "alexm");
    await user.type(screen.getByLabelText(/Bio/), "NYU student");
    await user.selectOptions(screen.getByLabelText(/Location \(Dorm\)/), [
      "Founders Hall",
    ]);

    const fileInput = container.querySelector('input[type="file"]');
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    await user.upload(fileInput, file);

    await user.click(
      screen.getByRole("button", { name: /complete setup/i })
    );

    await waitFor(() => {
      expect(mockCreateProfile).toHaveBeenCalled();
    });

    const payload = mockCreateProfile.mock.calls[0][0];
    expect(payload).toBeInstanceOf(FormData);
    expect(payload.get("full_name")).toBe("Alex Morgan");
    expect(payload.get("username")).toBe("alexm");
    expect(payload.get("dorm_location")).toBe("Founders Hall");
    expect(payload.get("bio")).toBe("NYU student");
    expect(payload.get("avatar")).toBeInstanceOf(File);

    expect(mockClearLastAuthEmail).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("shows API validation errors returned by backend", async () => {
    const user = userEvent.setup();
    mockCreateProfile.mockRejectedValueOnce({
      response: { data: { username: ["Already taken"] } },
    });

    renderComponent();
    await waitFor(() => screen.getByLabelText(/Full Name/));

    await user.type(screen.getByLabelText(/Full Name/), "Alex Morgan");
    await user.type(screen.getByLabelText(/Username/), "alexm");
    await user.selectOptions(screen.getByLabelText(/Location \(Dorm\)/), [
      "Founders Hall",
    ]);

    await user.click(
      screen.getByRole("button", { name: /complete setup/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Already taken")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to save your profile. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("shows API validation error for full_name field", async () => {
    const user = userEvent.setup();
    mockCreateProfile.mockRejectedValueOnce({
      response: { data: { full_name: ["Invalid name"] } },
    });

    renderComponent();
    await waitFor(() => screen.getByLabelText(/Full Name/));

    await user.type(screen.getByLabelText(/Full Name/), "Alex Morgan");
    await user.type(screen.getByLabelText(/Username/), "alexm");
    await user.selectOptions(screen.getByLabelText(/Location \(Dorm\)/), [
      "Founders Hall",
    ]);

    await user.click(
      screen.getByRole("button", { name: /complete setup/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Invalid name")).toBeInTheDocument();
    });
  });

  it("shows API validation error for dorm_location field", async () => {
    const user = userEvent.setup();
    mockCreateProfile.mockRejectedValueOnce({
      response: { data: { dorm_location: ["Invalid location"] } },
    });

    renderComponent();
    await waitFor(() => screen.getByLabelText(/Full Name/));

    await user.type(screen.getByLabelText(/Full Name/), "Alex Morgan");
    await user.type(screen.getByLabelText(/Username/), "alexm");
    await user.selectOptions(screen.getByLabelText(/Location \(Dorm\)/), [
      "Founders Hall",
    ]);

    await user.click(
      screen.getByRole("button", { name: /complete setup/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Invalid location")).toBeInTheDocument();
    });
  });

  it("shows error detail when API returns detail field", async () => {
    const user = userEvent.setup();
    mockCreateProfile.mockRejectedValueOnce({
      response: { data: { detail: "Server error occurred" } },
    });

    renderComponent();
    await waitFor(() => screen.getByLabelText(/Full Name/));

    await user.type(screen.getByLabelText(/Full Name/), "Alex Morgan");
    await user.type(screen.getByLabelText(/Username/), "alexm");
    await user.selectOptions(screen.getByLabelText(/Location \(Dorm\)/), [
      "Founders Hall",
    ]);

    await user.click(
      screen.getByRole("button", { name: /complete setup/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Server error occurred")).toBeInTheDocument();
    });
  });

  it("shows error when API returns error field", async () => {
    const user = userEvent.setup();
    mockCreateProfile.mockRejectedValueOnce({
      response: { data: { error: "Custom error message" } },
    });

    renderComponent();
    await waitFor(() => screen.getByLabelText(/Full Name/));

    await user.type(screen.getByLabelText(/Full Name/), "Alex Morgan");
    await user.type(screen.getByLabelText(/Username/), "alexm");
    await user.selectOptions(screen.getByLabelText(/Location \(Dorm\)/), [
      "Founders Hall",
    ]);

    await user.click(
      screen.getByRole("button", { name: /complete setup/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Custom error message")).toBeInTheDocument();
    });
  });

  it("handles non-404 errors when checking existing profile", async () => {
    mockGetMyProfile.mockRejectedValueOnce({
      response: { status: 500 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Unable to load profile information/i)).toBeInTheDocument();
    });
  });

  it("handles error when getMyProfile returns data without profile_id", async () => {
    mockGetMyProfile.mockResolvedValueOnce({
      data: { email: "test@nyu.edu" },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/)).toBeInTheDocument();
    });
  });

  it("validates username length exceeds 30 characters", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => screen.getByLabelText(/Username/));

    const usernameInput = screen.getByLabelText(/Username/);
    await user.type(usernameInput, "a".repeat(31));

    await user.click(
      screen.getByRole("button", { name: /complete setup/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Max 30 characters")).toBeInTheDocument();
    });
  });

  it("validates username with invalid characters", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => screen.getByLabelText(/Username/));

    const usernameInput = screen.getByLabelText(/Username/);
    await user.type(usernameInput, "user@name");

    await user.click(
      screen.getByRole("button", { name: /complete setup/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/Only letters, numbers, _ and . are allowed/i)).toBeInTheDocument();
    });
  });

  it("validates bio length exceeds maximum", async () => {
    const user = userEvent.setup();
    renderComponent();

    await waitFor(() => screen.getByLabelText(/Bio/));

    const bioInput = screen.getByLabelText(/Bio/);
    // Remove maxLength attribute to allow typing beyond limit
    bioInput.removeAttribute('maxLength');
    await user.type(bioInput, "a".repeat(501));

    await user.click(
      screen.getByRole("button", { name: /complete setup/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/Max 500 characters/i)).toBeInTheDocument();
    });
  });

  it("handles file upload with invalid file type", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { container } = renderComponent();

    await waitFor(() => screen.getByLabelText(/Full Name/));

    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();
    
    const invalidFile = new File(["content"], "document.pdf", { type: "application/pdf" });
    
    await user.upload(fileInput, invalidFile);

    // Wait for the onChange handler to process
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Only JPG/PNG/WebP images are allowed");
    });

    alertSpy.mockRestore();
  });

  it("handles file upload with file size exceeding 5MB", async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const { container } = renderComponent();

    await waitFor(() => screen.getByLabelText(/Full Name/));

    const fileInput = container.querySelector('input[type="file"]');
    // Create a mock file that appears to be > 5MB
    const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", { type: "image/jpeg" });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });
    await user.upload(fileInput, largeFile);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Image must be smaller than 5MB");
    });

    alertSpy.mockRestore();
  });
});
