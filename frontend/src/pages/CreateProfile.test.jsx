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
    const dorm = screen.getByLabelText(/Dorm\/Residence/i);
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
    await user.selectOptions(screen.getByLabelText(/Dorm\/Residence/), [
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
    await user.selectOptions(screen.getByLabelText(/Dorm\/Residence/), [
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
});
