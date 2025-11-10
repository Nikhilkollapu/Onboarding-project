import { Navigate, Outlet } from 'react-router-dom';
import { getToken } from '../../services/token';
import { getRoleFromToken } from '../../services/auth';

function ProtectedRoute({ allowedRoles }) {
	const token = getToken();
	if (!token) return <Navigate to="/" replace />;
	const role = (getRoleFromToken(token) || '').toUpperCase();
	if (allowedRoles && !allowedRoles.map(r => r.toUpperCase()).includes(role)) {
		return <Navigate to="/unauthorized" replace />;
	}
	return <Outlet />;
}

export default ProtectedRoute;


