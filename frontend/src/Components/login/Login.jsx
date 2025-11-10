import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import '../landingpage/LandingPage.css';
import './Login.css';
import { loginApi, getRoleFromToken } from '../../services/auth';

function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
	return (
		<div className="lp-container">
			<header className="lp-header">
				<div className="lp-brand">
					<div className="lp-logo" aria-hidden="true">AI</div>
					<div>
						<h1 className="lp-title">AI-Powered Employee Onboarding</h1>
						<p className="lp-subtitle">Secure login for HR, Clients, and Candidates</p>
					</div>
				</div>
			</header>

			<main className="lp-main">
				<section className="lp-hero auth-card">
					<h2 className="lp-hero-title">Login</h2>
                    <form className="auth-form" onSubmit={async (e) => {
                        e.preventDefault();
                        setError('');
                        try {
                            await loginApi({ email, password });
                            const role = (getRoleFromToken() || '').toUpperCase();
                            if (role === 'HR') navigate('/hr/dashboard');
                            else if (role === 'CLIENT') navigate('/client/dashboard');
                            else navigate('/candidate/dashboard');
                        } catch (err) {
                            setError(err.message || 'Login failed');
                        }
                    }}>
                        <label className="auth-label">Email
                            <input type="email" className="auth-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </label>
					<label className="auth-label">Password
						<div className="auth-input-wrap">
                            <input
								type={showPassword ? 'text' : 'password'}
								className="auth-input"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
							/>
							<button
								type="button"
								className="auth-eye"
								onClick={() => setShowPassword((v) => !v)}
								aria-label={showPassword ? 'Hide password' : 'Show password'}
							>
								{showPassword ? '🙈' : '👁️'}
							</button>
						</div>
                    </label>
                        {error ? <p className="auth-meta" style={{ color: '#ff9aa2' }}>{error}</p> : null}
                        <button type="submit" className="lp-btn">Login</button>
					</form>
					<p className="auth-meta">Don't have an account? <Link to="/signup" className="lp-link">Sign Up</Link></p>
				</section>
			</main>

			<footer className="lp-footer">
				<p className="lp-footer-text">
					Need help? Contact support at <a href="mailto:support@onboarding.ai" className="lp-link">support@onboarding.ai</a>
				</p>
			</footer>
		</div>
	);
}

export default Login;


