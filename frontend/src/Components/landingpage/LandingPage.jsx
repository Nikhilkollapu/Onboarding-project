import { Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
	return (
		<div className="lp-container">
			<header className="lp-header">
				<div className="lp-brand">
					<div className="lp-logo" aria-hidden="true">AI</div>
					<div className="lp-title-section">
						<h1 className="lp-title">AI-Powered Employee Onboarding</h1>
						<p className="lp-subtitle">Streamlined onboarding for HR, Clients, and Candidates</p>
					</div>
				</div>
				<div className="lp-nav">
					<Link to="/login" className="lp-nav-btn">Login</Link>
					<Link to="/signup" className="lp-nav-btn lp-nav-btn-primary">Sign Up</Link>
				</div>
			</header>

			<main className="lp-main">
				<section className="lp-hero">
					<div className="lp-hero-image">
						<img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=400&fit=crop&crop=center" alt="Team collaboration" className="hero-img" />
					</div>
					<div className="lp-hero-content">
						<h2 className="lp-hero-title">Welcome to Your Smart Onboarding Hub</h2>
						<p className="lp-hero-desc">
							Automate workflows, personalize candidate journeys, and collaborate securely across teams.
						</p>
						<div className="lp-features">
							<div className="feature-item">
								<div className="feature-icon">🎯</div>
								<span>Smart Matching</span>
							</div>
							<div className="feature-item">
								<div className="feature-icon">⚡</div>
								<span>Fast Processing</span>
							</div>
							<div className="feature-item">
								<div className="feature-icon">🔒</div>
								<span>Secure Platform</span>
							</div>
						</div>
					</div>
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

export default LandingPage;


