import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import '../landingpage/LandingPage.css';
import './Signup.css';
import { signupApi, getRoleFromToken } from '../../services/auth';

function Signup() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
	return (
		<div className="lp-container">
			<header className="lp-header">
				<div className="lp-brand">
					<div className="lp-logo" aria-hidden="true">AI</div>
					<div>
						<h1 className="lp-title">AI-Powered Employee Onboarding</h1>
						<p className="lp-subtitle">Create your candidate account</p>
					</div>
				</div>
			</header>

			<main className="lp-main">
				<section className="lp-hero auth-card">
					<h2 className="lp-hero-title">Sign Up</h2>
                    <form className="auth-form" onSubmit={async (e) => {
                        e.preventDefault();
                        setError('');
                        if (password !== confirm) { setError('Passwords do not match'); return; }
                        try {
                            await signupApi({ name, email, password });
                            navigate('/login');
                        } catch (err) {
                            setError(err.message || 'Signup failed');
                        }
                    }}>
                        <label className="auth-label">Full Name
                            <input type="text" className="auth-input" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
                        </label>
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
						<label className="auth-label">Confirm Password
							<div className="auth-input-wrap">
                                <input
									type={showConfirm ? 'text' : 'password'}
									className="auth-input"
                                    placeholder="Confirm password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
								/>
								<button
									type="button"
									className="auth-eye"
									onClick={() => setShowConfirm((v) => !v)}
									aria-label={showConfirm ? 'Hide password' : 'Show password'}
								>
									{showConfirm ? '🙈' : '👁️'}
								</button>
							</div>
						</label>
                        {error ? <p className="auth-meta" style={{ color: '#ff9aa2' }}>{error}</p> : null}
                        <button type="submit" className="lp-btn">Create Account</button>
					</form>
					<p className="auth-meta">Already have an account? <Link to="/login" className="lp-link">Login</Link></p>
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

export default Signup;


