import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Register() {
    const navigate = useNavigate();
    const { register, loading } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'PLAYER', // Default to Player
        // Player-specific fields
        birthDate: '',
        gender: '',
        phone: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        if (error) setError('');
    };

    const validateForm = () => {
        // Check required fields
        if (!formData.name || !formData.email || !formData.password) {
            return 'Please fill in all required fields';
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            return 'Please enter a valid email address';
        }

        // Password validation
        if (formData.password.length < 6) {
            return 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            return 'Passwords do not match';
        }

        // Player-specific validation
        if (formData.role === 'PLAYER') {
            if (!formData.birthDate) {
                return 'Birth date is required for players';
            }
            if (!formData.gender) {
                return 'Gender is required for players';
            }

            // Check birth date is in the past
            const birthDate = new Date(formData.birthDate);
            if (birthDate >= new Date()) {
                return 'Birth date must be in the past';
            }
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate form
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            // Prepare data based on role
            const userData = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
            };

            // Add player-specific fields if role is PLAYER
            if (formData.role === 'PLAYER') {
                userData.birthDate = formData.birthDate;
                userData.gender = formData.gender;
                if (formData.phone) {
                    userData.phone = formData.phone;
                }
            }

            await register(userData);

            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        }
    };

    const isPlayer = formData.role === 'PLAYER';

    return (
        <div className="main-content" style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px', paddingBottom: '40px' }}>
            <div className="form-card" style={{ maxWidth: 500, width: '100%' }}>
                <h2 className="form-title">Create Account</h2>
                <p className="form-subtitle">
                    Join the badminton tournament platform
                </p>

                {error && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        marginBottom: '16px'
                    }}>
                        <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{error}</p>
                    </div>
                )}

                {success && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        marginBottom: '16px'
                    }}>
                        <p style={{ color: '#16a34a', fontSize: '14px', margin: 0 }}>{success}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">I am a...</label>
                        <select
                            name="role"
                            className="form-input"
                            value={formData.role}
                            onChange={handleChange}
                            disabled={loading}
                        >
                            <option value="PLAYER">Player</option>
                            <option value="COMMITTEE">Committee</option>
                            <option value="REFEREE">Referee</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            placeholder="John Doe"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email *</label>
                        <input
                            type="email"
                            name="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password *</label>
                        <input
                            type="password"
                            name="password"
                            className="form-input"
                            placeholder="Min. 6 characters"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm Password *</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            className="form-input"
                            placeholder="Re-enter password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                        />
                    </div>

                    {/* Player-specific fields */}
                    {isPlayer && (
                        <>
                            <div style={{
                                borderTop: '1px solid #e5e7eb',
                                paddingTop: '16px',
                                marginTop: '16px',
                                marginBottom: '16px'
                            }}>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px', fontWeight: 500 }}>
                                    Player Information
                                </p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Birth Date *</label>
                                <input
                                    type="date"
                                    name="birthDate"
                                    className="form-input"
                                    value={formData.birthDate}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Gender *</label>
                                <select
                                    name="gender"
                                    className="form-input"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    disabled={loading}
                                >
                                    <option value="">Select gender</option>
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Phone (Optional)</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    className="form-input"
                                    placeholder="+1234567890"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                            </div>
                        </>
                    )}

                    <button
                        className="btn-primary mt-16"
                        type="submit"
                        disabled={loading}
                        style={{ width: '100%', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                    <p style={{ color: '#9ca3af', fontSize: '14px' }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Register;
