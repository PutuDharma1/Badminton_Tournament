import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading, isAuthenticated } = useAuth();

    // Show loading state while checking authentication
    if (loading) {
        return (
            <div className="main-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: 40,
                        height: 40,
                        border: '4px solid #e5e7eb',
                        borderTop: '4px solid #3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }}></div>
                    <p style={{ color: '#9ca3af' }}>Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check role-based access if roles are specified
    if (roles && roles.length > 0) {
        const hasRequiredRole = roles.includes(user.role);

        if (!hasRequiredRole) {
            // Redirect to appropriate dashboard based on user's actual role
            const dashboardRoutes = {
                COMMITTEE: '/committee',
                PLAYER: '/player',
                REFEREE: '/referee',
                ADMIN: '/',
            };

            return <Navigate to={dashboardRoutes[user.role] || '/'} replace />;
        }
    }

    // User is authenticated and has required role
    return children;
};

export default ProtectedRoute;
