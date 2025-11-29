import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Profile() {
    const { user, updateProfile, logout } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (error) setError('');
        if (success) setSuccess('');
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            await updateProfile(formData);
            setSuccess('Profile updated successfully!');
            setIsEditing(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
        });
        setIsEditing(false);
        setError('');
        setSuccess('');
    };

    // Get role color
    const getRoleColor = () => {
        const colors = {
            COMMITTEE: '#3b82f6',
            PLAYER: '#10b981',
            REFEREE: '#f59e0b',
            ADMIN: '#ef4444',
        };
        return colors[user?.role] || '#6b7280';
    };

    // Get user initials
    const getUserInitials = () => {
        if (!user?.name) return 'U';
        const names = user.name.split(' ');
        if (names.length >= 2) {
            return `${names[0][0]}${names[1][0]}`.toUpperCase();
        }
        return user.name[0].toUpperCase();
    };

    return (
        <div className="main-content">
            <h1 className="page-title">My Profile</h1>
            <p className="page-subtitle">Manage your account information</p>

            {success && (
                <div style={{
                    padding: 12,
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 8,
                    marginBottom: 16
                }}>
                    <p style={{ color: '#16a34a', fontSize: 14, margin: 0 }}>{success}</p>
                </div>
            )}

            {error && (
                <div style={{
                    padding: 12,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    marginBottom: 16
                }}>
                    <p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>{error}</p>
                </div>
            )}

            <div style={{ maxWidth: 600 }}>
                {/* Profile Header */}
                <div className="card" style={{ marginBottom: 24, textAlign: 'center' }}>
                    <div
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: getRoleColor(),
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 28,
                            fontWeight: 600,
                            margin: '0 auto 16px',
                        }}
                    >
                        {getUserInitials()}
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{user?.name}</h2>
                    <p style={{
                        fontSize: 13,
                        color: getRoleColor(),
                        padding: '4px 12px',
                        background: `${getRoleColor()}20`,
                        borderRadius: 999,
                        display: 'inline-block',
                        fontWeight: 500
                    }}>
                        {user?.role}
                    </p>
                </div>

                {/* Profile Info */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Personal Information</h3>
                        {!isEditing ? (
                            <button className="btn-outline" onClick={() => setIsEditing(true)} style={{ fontSize: 13, padding: '6px 12px' }}>
                                Edit
                            </button>
                        ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="btn-primary"
                                    onClick={handleSave}
                                    disabled={loading}
                                    style={{ fontSize: 13, padding: '6px 12px', opacity: loading ? 0.7 : 1 }}
                                >
                                    {loading ? 'Saving...' : 'Save'}
                                </button>
                                <button className="btn-outline" onClick={handleCancel} disabled={loading} style={{ fontSize: 13, padding: '6px 12px' }}>
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {isEditing ? (
                        <div>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="form-input"
                                    value={formData.name}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={loading}
                                />
                            </div>

                            {user?.role === 'PLAYER' && (
                                <>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            className="form-input"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Birth Date</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={user.birthDate ? new Date(user.birthDate).toLocaleDateString() : 'Not set'}
                                            disabled
                                            style={{ background: 'rgba(15, 23, 42, 0.5)', cursor: 'not-allowed' }}
                                        />
                                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Birth date cannot be changed</p>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Gender</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={user.gender || 'Not set'}
                                            disabled
                                            style={{ background: 'rgba(15, 23, 42, 0.5)', cursor: 'not-allowed' }}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16, fontSize: 14 }}>
                            <div>
                                <span style={{ color: '#9ca3af' }}>Full Name:</span>{' '}
                                <span style={{ fontWeight: 500 }}>{user?.name}</span>
                            </div>
                            <div>
                                <span style={{ color: '#9ca3af' }}>Email:</span>{' '}
                                <span style={{ fontWeight: 500 }}>{user?.email}</span>
                            </div>
                            {user?.role === 'PLAYER' && (
                                <>
                                    {user.phone && (
                                        <div>
                                            <span style={{ color: '#9ca3af' }}>Phone:</span>{' '}
                                            <span style={{ fontWeight: 500 }}>{user.phone}</span>
                                        </div>
                                    )}
                                    {user.birthDate && (
                                        <div>
                                            <span style={{ color: '#9ca3af' }}>Birth Date:</span>{' '}
                                            <span style={{ fontWeight: 500 }}>{new Date(user.birthDate).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                    {user.gender && (
                                        <div>
                                            <span style={{ color: '#9ca3af' }}>Gender:</span>{' '}
                                            <span style={{ fontWeight: 500 }}>{user.gender}</span>
                                        </div>
                                    )}
                                </>
                            )}
                            <div>
                                <span style={{ color: '#9ca3af' }}>Member Since:</span>{' '}
                                <span style={{ fontWeight: 500 }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Account Actions */}
                <div className="card" style={{ marginTop: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Account Actions</h3>
                    <button
                        className="btn-outline"
                        onClick={() => {
                            if (confirm('Are you sure you want to logout?')) {
                                logout();
                            }
                        }}
                        style={{ color: '#f87171', borderColor: '#f87171', width: '100%' }}
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Profile;
