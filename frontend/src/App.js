import { Routes, Route, Navigate } from 'react-router-dom';
import './styles/glassmorphism.css';
import LandingPage from './Components/landingpage/LandingPage';
import Login from './Components/login/Login';
import Signup from './Components/login/Signup';
import ProtectedRoute from './Components/routing/ProtectedRoute';
import Unauthorized from './Components/unauthorized/Unauthorized';
import HRDashboard from './Components/hr/HRDashboard';
import ClientDashboard from './Components/client/ClientDashboard';
import CandidateDashboard from './Components/candidate/CandidateDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute allowedRoles={["HR"]} />}>
        <Route path="/hr/dashboard" element={<HRDashboard />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["CLIENT"]} />}>
        <Route path="/client/dashboard" element={<ClientDashboard />} />
      </Route>
      <Route element={<ProtectedRoute allowedRoles={["CANDIDATE"]} />}>
        <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
