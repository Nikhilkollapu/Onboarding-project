import '../landingpage/LandingPage.css';
import { Link } from 'react-router-dom';

function Unauthorized() {
	return (
		<div className="lp-container">
			<header className="lp-header">
				<div className="lp-brand">
					<div className="lp-logo" aria-hidden="true">AI</div>
					<div>
						<h1 className="lp-title">Access Restricted</h1>
						<p className="lp-subtitle">You don't have permission to view this page.</p>
					</div>
				</div>
			</header>
			<main className="lp-main">
				<section className="lp-hero">
					<h2 className="lp-hero-title">Unauthorized</h2>
					<div className="lp-actions">
						<Link to="/" className="lp-btn">Go Home</Link>
					</div>
				</section>
			</main>
		</div>
	);
}

export default Unauthorized;


