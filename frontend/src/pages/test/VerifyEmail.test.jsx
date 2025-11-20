// src/pages/test/VerifyEmail.test.jsx
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VerifyEmail from '../VerifyEmail';
import { endpoints } from '../../api/endpoints';
import apiClient from '../../api/client';

const mockLoginFn = vi.fn();
const mockNavigate = vi.fn();
let mockLocation = { state: { email: 'user@nyu.edu' } };

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLoginFn,
    isAuthenticated: vi.fn(() => false),
    isLoading: false,
  }),
}));

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

// Mock api client
vi.mock('../../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('VerifyEmail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = { state: { email: 'user@nyu.edu' } };
    sessionStorage.clear();
  });

  it('redirects to login if email is missing in location state', async () => {
    mockLocation = { state: undefined };

    render(<VerifyEmail />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('shows error when OTP code is not 6 digits and does not call API', async () => {
    render(<VerifyEmail />);

    const button = screen.getByRole('button', { name: /verify & continue/i });
    fireEvent.click(button);

    expect(
      screen.getByText('Please enter the 6-digit code.')
    ).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('submits OTP successfully, logs in user and redirects home', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: {
        message: 'Email verified successfully',
        access_token: 'access',
        refresh_token: 'refresh',
        user: { id: 1, email: 'user@nyu.edu', is_email_verified: true },
      },
    });

    render(<VerifyEmail />);

    // Fill all 6 OTP inputs with "1"
    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      fireEvent.change(input, { target: { value: '1' } });
    });

    const button = screen.getByRole('button', { name: /verify & continue/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        endpoints.auth.verifyOtp,
        {
          email: 'user@nyu.edu',
          otp: '111111',
        }
      );
      expect(mockLoginFn).toHaveBeenCalledWith(
        'access',
        'refresh',
        { id: 1, email: 'user@nyu.edu', is_email_verified: true }
      );
      expect(mockNavigate).toHaveBeenCalledWith('/create-profile', { replace: true });
    });
  });

  it('resends OTP and shows success message', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: {
        message: 'New verification code sent successfully.',
      },
    });

    render(<VerifyEmail />);

    const resendButton = screen.getByRole('button', { name: /resend otp/i });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        endpoints.auth.resendOtp,
        {
          email: 'user@nyu.edu',
        }
      );
      expect(
        screen.getByText(/verification code sent successfully/i)
      ).toBeInTheDocument();
    });
  });

  it('shows backend error message when verification fails', async () => {
    apiClient.post.mockRejectedValueOnce({
      response: {
        data: { detail: 'Invalid or expired code' },
      },
    });

    render(<VerifyEmail />);

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      fireEvent.change(input, { target: { value: '1' } });
    });

    const button = screen.getByRole('button', { name: /verify & continue/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid or expired code/i)
      ).toBeInTheDocument();
    });
  });

  it('shows fallback error message when verification fails without response data', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Network error'));

    render(<VerifyEmail />);

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      fireEvent.change(input, { target: { value: '1' } });
    });

    const button = screen.getByRole('button', { name: /verify & continue/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to verify the code\. Please try again\./i)
      ).toBeInTheDocument();
    });
  });

  it('shows error when resend OTP fails', async () => {
    apiClient.post.mockRejectedValueOnce({
      response: {
        data: { detail: 'Too many resend attempts' },
      },
    });

    render(<VerifyEmail />);

    const resendButton = screen.getByRole('button', { name: /resend otp/i });
    fireEvent.click(resendButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Too many resend attempts/i)
      ).toBeInTheDocument();
    });
  });

  it('navigates back to login when back button is clicked', () => {
    render(<VerifyEmail />);

    const backButton = screen.getByRole('button', { name: /back to login/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('fills OTP inputs when user pastes a code', () => {
    const { container } = render(<VerifyEmail />);

    const wrapper = container.querySelector('.verify-otp-wrapper');
    const clipboardData = {
      getData: vi.fn().mockReturnValue('123456'),
    };

    fireEvent.paste(wrapper, { clipboardData });

    const inputs = screen.getAllByRole('textbox');
    const code = inputs.map((input) => input.value).join('');
    expect(code).toBe('123456');
  });

  it('moves focus to previous input on backspace when current input is empty', () => {
    render(<VerifyEmail />);

    const inputs = screen.getAllByRole('textbox');

    inputs[2].focus();
    fireEvent.keyDown(inputs[2], { key: 'Backspace' });

    expect(inputs[1]).toHaveFocus();
  });

  it('clears OTP value when input is emptied', () => {
    render(<VerifyEmail />);

    const inputs = screen.getAllByRole('textbox');
    const first = inputs[0];

    fireEvent.change(first, { target: { value: '5' } });
    expect(first.value).toBe('5');

    fireEvent.change(first, { target: { value: '' } });
    expect(first.value).toBe('');
  });

  it('shows missing email error when verifying code without email in location state', async () => {
    mockLocation = { state: undefined };

    render(<VerifyEmail />);

    const inputs = screen.getAllByRole('textbox');
    inputs.forEach((input) => {
      fireEvent.change(input, { target: { value: '1' } });
    });

    const button = screen.getByRole('button', { name: /verify & continue/i });
    fireEvent.click(button);

    await screen.findByText('Missing email. Please login again.');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows missing email error when resending OTP without email in location state', async () => {
    mockLocation = { state: undefined };

    render(<VerifyEmail />);

    const resendButton = screen.getByRole('button', { name: /resend otp/i });
    fireEvent.click(resendButton);

    await screen.findByText('Missing email. Please login again.');
    expect(apiClient.post).not.toHaveBeenCalled();
  });

});
