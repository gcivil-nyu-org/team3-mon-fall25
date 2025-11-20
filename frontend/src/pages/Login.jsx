import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';
import apiClient from '../api/client';
import {endpoints} from '../api/endpoints';


import {useLocation} from 'react-router-dom';


export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    console.log("Login mounted, state:", location.state);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const {login} = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate NYU email
        if (!email.endsWith('@nyu.edu')) {
            setError('Please use your NYU email address (@nyu.edu)');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.post(endpoints.auth.login, {
                email,
                password,
            });

            // Store tokens and user data
            login(
                response.data.access_token,
                response.data.refresh_token,
                response.data.user
            );

            // Show message if it's a new user
            if (response.data.is_new_user) {
                console.log('Welcome! Your account has been created.');
            }

      // Redirect to home
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;

      // New user: automatically register then redirect to OTP verification
      if (status === 404) {
        try {
          await apiClient.post(endpoints.auth.register, {
            email,
            password,
          });

          navigate('/verify-email', { state: { email } });
          return;
        } catch (regErr) {
          const regData = regErr.response?.data;
          setError(
            regData?.error ||
              regData?.email?.[0] ||
              'Registration failed. Please try again.'
          );
          return;
        }
      }

      // Existing unverified user: trigger OTP flow and redirect to OTP page
      if (status === 403 && data?.requires_verification) {
        try {
          await apiClient.post(endpoints.auth.sendOtp, { email });
        } catch (sendErr) {
          console.error('Failed to send OTP:', sendErr);
          // We still send the user to OTP page; error message will show there.
        }

        navigate('/verify-email', { state: { email } });
        return;
      }

      // Fallback: show login error as before
      setError(
        data?.error ||
          data?.email?.[0] ||
          'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: '#56018D',
                padding: '20px',
            }}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '10px',
                    padding: '40px',
                    maxWidth: '400px',
                    width: '100%',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                }}
            >
                <h2 style={{color: '#56018D', marginBottom: '10px', textAlign: 'center'}}>
                    NYU Marketplace
                </h2>
                <p style={{color: '#666', textAlign: 'center', marginBottom: '30px'}}>
                    Login or create an account with your NYU email
                </p>

                <form onSubmit={handleSubmit}>
                    <div style={{marginBottom: '20px'}}>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '5px',
                                color: '#333',
                                fontWeight: '500',
                            }}
                        >
                            NYU Email
                        </label>
                        <input
                            type="email"
                            placeholder="your.email@nyu.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '5px',
                                fontSize: '16px',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div style={{marginBottom: '20px'}}>
                        <label
                            style={{
                                display: 'block',
                                marginBottom: '5px',
                                color: '#333',
                                fontWeight: '500',
                            }}
                        >
                            Password
                        </label>
                        <input
                            type="password"
                            placeholder="Minimum 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #ddd',
                                borderRadius: '5px',
                                fontSize: '16px',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {error && (
                        <div
                            style={{
                                padding: '12px',
                                marginBottom: '20px',
                                background: '#fee',
                                color: '#c00',
                                borderRadius: '5px',
                                fontSize: '14px',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: loading ? '#999' : '#56018D',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s',
                        }}
                        onMouseOver={(e) => {
                            if (!loading) e.target.style.background = '#6D02B0';
                        }}
                        onMouseOut={(e) => {
                            if (!loading) e.target.style.background = '#56018D';
                        }}
                    >
                        {loading ? 'Loading...' : 'Login / Register'}
                    </button>
                </form>

                <p style={{marginTop: '20px', textAlign: 'center', color: '#666', fontSize: '14px'}}>
                    First time? We'll automatically create your account!
                </p>
            </div>
        </div>
    );
}
