import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MainPage from './pages/MainPage';
import LatestNews from './pages/LatestNews';
import Athletes from './pages/Athletes';
import Rankings from './pages/Rankings';
import NationalRecords from './pages/NationalRecords';
import RecordsPage from './pages/RecordsPage';
import Teams from './pages/Teams';
import Competitions from './pages/Competitions';
import LearnClimbing from './pages/LearnClimbing';
import Photos from './pages/Photos';
import About from './pages/About';
import Contact from './pages/Contact';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* If already logged in, redirect from /login to dashboard */}
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <Login />
      } />

      {/* All dashboard pages are protected behind auth */}
      <Route element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="/" element={<Dashboard />} />
        <Route path="/main" element={<MainPage />} />
        <Route path="/latest-news" element={<LatestNews />} />
        <Route path="/athletes" element={<Athletes />} />
        <Route path="/rankings" element={<Rankings />} />
        <Route path="/national-records" element={<NationalRecords />} />
        <Route path="/records-page" element={<RecordsPage />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/competitions" element={<Competitions />} />
        <Route path="/learn-climbing" element={<LearnClimbing />} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
