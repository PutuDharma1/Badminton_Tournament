import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// Pages
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import CommitteeDashboard from './pages/CommitteeDashboard.jsx'
import Profile from './pages/Profile.jsx'
import Peserta from './pages/Peserta.jsx'
import Matches from './pages/Matches.jsx'
import Wasit from './pages/Wasit.jsx'
import Settings from './pages/Settings.jsx'
import Homepage from './pages/Homepage.jsx'
import TournamentPage from './pages/Tournament.jsx'

// Layout
import MainLayout from './layouts/MainLayout.jsx'

// Components
import ProtectedRoute from './components/ProtectedRoute.jsx'

// Context
import { AuthProvider } from './context/AuthContext.jsx'

const router = createBrowserRouter([
  // Public routes
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  // Protected routes
  {
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <Homepage />,
      },
      {
        path: "/committee",
        element: (
          <ProtectedRoute roles={['COMMITTEE']}>
            <CommitteeDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: "/tournament/:id",
        element: <TournamentPage />,
      },
      {
        path: "/players",
        element: <Peserta />,
      },
      {
        path: "/matches",
        element: <Matches />,
      },
      {
        path: "/referee",
        element: <Wasit />,
      },
      {
        path: "/settings",
        element: <Settings />,
      },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)