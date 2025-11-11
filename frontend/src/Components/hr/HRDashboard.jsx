import '../landingpage/LandingPage.css';
import '../candidate/Candidate.css';
import { useState, useEffect } from 'react';
import { logout, decodeToken } from '../../services/auth';
import { httpRequest } from '../../services/http';
import { useNavigate } from 'react-router-dom';
import HRAnalytics from './HRAnalytics';

function HRDashboard() {
    const [active, setActive] = useState('dashboard');
    const navigate = useNavigate();
    const payload = decodeToken();
    const displayName = (payload?.name || 'HR');

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <div className="lp-container">
            <main className="lp-main cand-main">
                <div className="cand-header">Welcome {displayName}</div>
                <div className="cand-layout">
                    <aside className="cand-sidebar">
                        <nav className="cand-nav">
                            <button className={`cand-btn ${active==='dashboard' ? 'active' : ''}`} onClick={() => setActive('dashboard')}>Dashboard</button>
                            <button className={`cand-btn ${active==='analytics' ? 'active' : ''}`} onClick={() => setActive('analytics')}>Analytics</button>
                            <button className={`cand-btn ${active==='candidates' ? 'active' : ''}`} onClick={() => setActive('candidates')}>Candidates</button>
                            <button className={`cand-btn ${active==='jobs' ? 'active' : ''}`} onClick={() => setActive('jobs')}>Job Postings</button>
                            <button className={`cand-btn ${active==='shortlisted' ? 'active' : ''}`} onClick={() => setActive('shortlisted')}>Shortlisted</button>
                            <button className={`cand-btn ${active==='interviews' ? 'active' : ''}`} onClick={() => setActive('interviews')}>Interviews</button>
                            <button className={`cand-btn ${active==='onboarded' ? 'active' : ''}`} onClick={() => setActive('onboarded')}>Onboarded</button>
                            <button className="cand-btn" onClick={handleLogout}>Logout</button>
                        </nav>
                    </aside>
                    <section className="cand-content">
                        {active === 'dashboard' && (
                            <HRDashboardContent />
                        )}
                        {active === 'analytics' && (
                            <HRAnalytics />
                        )}
                        {active === 'candidates' && (
                            <CandidatesContent />
                        )}
                        {active === 'jobs' && (
                            <JobPostingsContent />
                        )}
                        {active === 'shortlisted' && (
                            <ShortlistedContent />
                        )}
                        {active === 'interviews' && (
                            <InterviewTrackingContent />
                        )}
                        {active === 'onboarded' && (
                            <OnboardedCandidatesContent />
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

export default HRDashboard;

function HRDashboardContent() {
    const [stats, setStats] = useState({
        total_candidates: 0,
        active_jobs: 0,
        pending_interviews: 0,
        applications_week: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        try {
            const response = await httpRequest('/hr/dashboard-stats', { method: 'GET' });
            setStats(response);
        } catch (err) {
            console.error('Failed to load dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading dashboard...</div>;
    }

    return (
        <div>
            <h2 className="lp-hero-title">HR Dashboard</h2>
            
            <div className="dashboard-content">
                <div className="profile-section">
                    <h3>Overview</h3>
                    <div className="profile-info">
                        <p><strong>Total Candidates:</strong> {stats.total_candidates}</p>
                        <p><strong>Active Job Postings:</strong> {stats.active_jobs}</p>
                        <p><strong>Pending Interviews:</strong> {stats.pending_interviews}</p>
                        <p><strong>Applications This Week:</strong> {stats.applications_week}</p>
                    </div>
                </div>
                
                <div className="skills-section">
                    <h3>Quick Actions</h3>
                    <div className="profile-info">
                        <p>• Review shortlisted candidates</p>
                        <p>• Track interview progress</p>
                        <p>• Manage onboarded candidates</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CandidatesContent() {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadCandidates();
    }, []);

    async function loadCandidates() {
        try {
            const response = await httpRequest('/hr/candidates', { method: 'GET' });
            setCandidates(response.candidates || []);
        } catch (err) {
            setError(err.message || 'Failed to load candidates');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading candidates...</div>;
    }

    return (
        <div>
            <h2 className="lp-hero-title">All Candidates</h2>
            
            {error && (
                <div className="profile-section">
                    <p style={{color: '#ff9aa2'}}>{error}</p>
                </div>
            )}
            
            {candidates.length === 0 ? (
                <div className="profile-section">
                    <p>No candidates found.</p>
                </div>
            ) : (
                <div className="dashboard-content">
                    {candidates.map((candidate) => (
                        <div key={candidate.id} className="profile-section">
                            <h3>{candidate.name}</h3>
                            <div className="profile-info">
                                <p><strong>Email:</strong> {candidate.email}</p>
                                <p><strong>Date of Birth:</strong> {candidate.dob ? new Date(candidate.dob).toLocaleDateString() : 'Not provided'}</p>
                                <p><strong>Address:</strong> {candidate.address || 'Not provided'}</p>
                                <p><strong>Resume:</strong> {candidate.has_resume ? (
                                    <a href={`http://localhost:4000/uploads/${candidate.resume_path.split(/[\/\\]/).pop()}`} 
                                       target="_blank" 
                                       rel="noopener noreferrer"
                                       style={{color: 'var(--lp-primary)', textDecoration: 'underline'}}>
                                        View Resume
                                    </a>
                                ) : 'Not uploaded'}</p>
                                <p><strong>Registered:</strong> {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : 'Unknown'}</p>
                            </div>
                            {candidate.skills && candidate.skills.length > 0 && (
                                <div className="skills-container" style={{marginTop: '12px'}}>
                                    <strong style={{color: 'var(--lp-primary)', marginBottom: '8px', display: 'block'}}>Skills:</strong>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                        {candidate.skills.map((skill, index) => (
                                            <span key={index} className="skill-tag" style={{fontSize: '12px', padding: '4px 8px'}}>
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function JobPostingsContent() {
    const [postings, setPostings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadPostings();
    }, []);

    async function loadPostings() {
        try {
            const response = await httpRequest('/hr/job-postings', { method: 'GET' });
            setPostings(response.postings || []);
        } catch (err) {
            setError(err.message || 'Failed to load job postings');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading job postings...</div>;
    }

    return (
        <div>
            <h2 className="lp-hero-title">Job Postings</h2>
            
            {error && (
                <div className="profile-section">
                    <p style={{color: '#ff9aa2'}}>{error}</p>
                </div>
            )}
            
            {postings.length === 0 ? (
                <div className="profile-section">
                    <p>No job postings found.</p>
                </div>
            ) : (
                <div className="dashboard-content">
                    {postings.map((posting) => (
                        <div key={posting.id} className="profile-section">
                            <h3>{posting.title}</h3>
                            <div className="profile-info">
                                <p><strong>Client:</strong> {posting.client_name} ({posting.client_email})</p>
                                <p><strong>Description:</strong> {posting.description || 'No description'}</p>
                                <p><strong>Experience Level:</strong> {posting.experience_level || 'Not specified'}</p>
                                <p><strong>Location:</strong> {posting.location || 'Not specified'}</p>
                                <p><strong>Salary Range:</strong> {posting.salary_range || 'Not specified'}</p>
                                <p><strong>Status:</strong> <span style={{color: posting.status === 'active' ? 'var(--lp-primary)' : '#ff9aa2'}}>{posting.status}</span></p>
                                <p><strong>Posted:</strong> {posting.created_at ? new Date(posting.created_at).toLocaleDateString() : 'Unknown'}</p>
                            </div>
                            {posting.required_skills && posting.required_skills.length > 0 && (
                                <div className="skills-container" style={{marginTop: '12px'}}>
                                    <strong style={{color: 'var(--lp-primary)', marginBottom: '8px', display: 'block'}}>Required Skills:</strong>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                        {posting.required_skills.map((skill, index) => (
                                            <span key={index} className="skill-tag" style={{fontSize: '12px', padding: '4px 8px'}}>
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function ShortlistedContent() {
    const [shortlisted, setShortlisted] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [message, setMessage] = useState('');
    
    async function scheduleInterview(candidate) {
        try {
            // Find the requirement this candidate belongs to
            const requirement = shortlisted.find(req => 
                req.candidates.some(c => c.id === candidate.id)
            );
            
            if (!requirement) {
                setMessage('Error: Could not find job requirement');
                return;
            }
            
            await httpRequest('/hr/schedule-interview', {
                method: 'POST',
                body: {
                    requirement_id: requirement.requirement_id,
                    candidate_id: candidate.id
                }
            });
            
            setMessage('Interview scheduled! Client will be notified to set the time.');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage(err.message || 'Failed to schedule interview');
            setTimeout(() => setMessage(''), 3000);
        }
    }

    useEffect(() => {
        loadShortlisted();
    }, []);

    async function loadShortlisted() {
        try {
            const response = await httpRequest('/hr/shortlisted-candidates', { method: 'GET' });
            setShortlisted(response.shortlisted || []);
        } catch (err) {
            setError(err.message || 'Failed to load shortlisted candidates');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading shortlisted candidates...</div>;
    }

    if (selectedCandidate) {
        return (
            <div>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h2 className="lp-hero-title">Candidate Details</h2>
                    <button className="lp-btn" onClick={() => setSelectedCandidate(null)}>Back to List</button>
                </div>
                
                {message && (
                    <div className="profile-section" style={{marginBottom: '20px'}}>
                        <p style={{color: message.includes('success') || message.includes('scheduled') ? 'var(--lp-primary)' : '#ff9aa2'}}>{message}</p>
                    </div>
                )}
                
                <div className="profile-section">
                    <h3>{selectedCandidate.name}</h3>
                    <div className="profile-info">
                        <p><strong>Email:</strong> {selectedCandidate.email}</p>
                        <p><strong>Date of Birth:</strong> {selectedCandidate.dob ? new Date(selectedCandidate.dob).toLocaleDateString() : 'Not provided'}</p>
                        <p><strong>Address:</strong> {selectedCandidate.address || 'Not provided'}</p>
                        <p><strong>Resume:</strong> {selectedCandidate.resume_path ? (
                            <a href={`http://localhost:4000/uploads/${selectedCandidate.resume_path.split(/[\/\\]/).pop()}`} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               style={{color: 'var(--lp-primary)', textDecoration: 'underline'}}>
                                View Resume
                            </a>
                        ) : 'Not uploaded'}</p>
                        <p><strong>Match Score:</strong> <span style={{color: 'var(--lp-primary)', fontSize: '18px', fontWeight: 'bold'}}>{selectedCandidate.match_percentage}%</span></p>
                    </div>
                    
                    {selectedCandidate.matched_skills && selectedCandidate.matched_skills.length > 0 && (
                        <div className="skills-container" style={{marginTop: '16px'}}>
                            <strong style={{color: 'var(--lp-primary)', marginBottom: '8px', display: 'block'}}>Matched Skills:</strong>
                            <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                {selectedCandidate.matched_skills.map((skill, index) => (
                                    <span key={index} className="skill-tag" style={{fontSize: '12px', padding: '4px 8px', backgroundColor: '#4CAF50'}}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                        <div className="skills-container" style={{marginTop: '16px'}}>
                            <strong style={{color: 'var(--lp-primary)', marginBottom: '8px', display: 'block'}}>All Skills:</strong>
                            <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                {selectedCandidate.skills.map((skill, index) => (
                                    <span key={index} className="skill-tag" style={{fontSize: '12px', padding: '4px 8px'}}>
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    <div style={{marginTop: '20px', textAlign: 'center'}}>
                        <button 
                            className="lp-btn" 
                            onClick={() => scheduleInterview(selectedCandidate)}
                            style={{padding: '12px 24px', fontSize: '16px'}}
                        >
                            Schedule Interview
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="lp-hero-title">Shortlisted Candidates</h2>
            
            {error && (
                <div className="profile-section">
                    <p style={{color: '#ff9aa2'}}>{error}</p>
                </div>
            )}
            
            {shortlisted.length === 0 ? (
                <div className="profile-section">
                    <p>No shortlisted candidates found. Candidates are automatically shortlisted based on skill matching (minimum 30% match required).</p>
                </div>
            ) : (
                <div className="dashboard-content">
                    {shortlisted.map((requirement) => (
                        <div key={requirement.requirement_id} className="profile-section">
                            <h3>{requirement.requirement_title}</h3>
                            
                            <div className="skills-container" style={{marginBottom: '16px'}}>
                                <strong style={{color: 'var(--lp-primary)', marginBottom: '8px', display: 'block'}}>Required Skills:</strong>
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                    {requirement.required_skills.map((skill, index) => (
                                        <span key={index} className="skill-tag" style={{fontSize: '12px', padding: '4px 8px'}}>
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            
                            <div style={{display: 'grid', gap: '12px'}}>
                                {requirement.candidates.map((candidate) => (
                                    <div key={candidate.id} style={{
                                        padding: '12px',
                                        border: '1px solid rgba(174, 188, 255, 0.15)',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(11, 16, 32, 0.2)'
                                    }}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <div>
                                                <strong>{candidate.name}</strong>
                                                <p style={{margin: '4px 0', fontSize: '14px', color: '#aaa'}}>{candidate.email}</p>
                                                <p style={{margin: '4px 0', fontSize: '16px', fontWeight: 'bold', color: 'var(--lp-primary)'}}>
                                                    Match Score: {candidate.match_percentage}%
                                                </p>
                                            </div>
                                            <button 
                                                className="lp-btn" 
                                                style={{padding: '8px 16px', fontSize: '14px'}}
                                                onClick={() => setSelectedCandidate(candidate)}
                                            >
                                                More Details
                                            </button>
                                        </div>
                                        
                                        {candidate.matched_skills && candidate.matched_skills.length > 0 && (
                                            <div style={{marginTop: '8px'}}>
                                                <small style={{color: 'var(--lp-primary)'}}>Matched Skills: </small>
                                                {candidate.matched_skills.slice(0, 3).map((skill, index) => (
                                                    <span key={index} style={{
                                                        fontSize: '11px',
                                                        padding: '2px 6px',
                                                        backgroundColor: '#4CAF50',
                                                        color: 'white',
                                                        borderRadius: '12px',
                                                        marginRight: '4px'
                                                    }}>
                                                        {skill}
                                                    </span>
                                                ))}
                                                {candidate.matched_skills.length > 3 && (
                                                    <span style={{fontSize: '11px', color: '#aaa'}}>+{candidate.matched_skills.length - 3} more</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function OnboardedCandidatesContent() {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [assetDetails, setAssetDetails] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState(null);

    useEffect(() => {
        loadOnboardedCandidates();
    }, []);

    async function loadOnboardedCandidates() {
        try {
            const response = await httpRequest('/hr/onboarded-candidates', { method: 'GET' });
            setCandidates(response.candidates || []);
        } catch (err) {
            setError(err.message || 'Failed to load onboarded candidates');
        } finally {
            setLoading(false);
        }
    }

    async function provideAssets(candidate) {
        try {
            await httpRequest('/hr/provide-assets', {
                method: 'POST',
                body: {
                    interview_id: candidate.interview_id,
                    candidate_id: candidate.candidate_id,
                    asset_details: assetDetails
                }
            });
            
            setMessage('Assets provided successfully!');
            setSelectedCandidate(null);
            setAssetDetails('');
            loadOnboardedCandidates(); // Refresh the list
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage(err.message || 'Failed to provide assets');
            setTimeout(() => setMessage(''), 3000);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading onboarded candidates...</div>;
    }

    return (
        <div>
            <h2 className="lp-hero-title">Onboarded Candidates</h2>
            <p style={{marginBottom: '20px', color: '#aaa'}}>Candidates who have been confirmed for onboarding by clients</p>
            
            {message && (
                <div className="profile-section" style={{marginBottom: '20px'}}>
                    <p style={{color: message.includes('success') ? 'var(--lp-primary)' : '#ff9aa2'}}>{message}</p>
                </div>
            )}
            
            {error && (
                <div className="profile-section">
                    <p style={{color: '#ff9aa2'}}>{error}</p>
                </div>
            )}
            
            {candidates.length === 0 ? (
                <div className="profile-section">
                    <p>No onboarded candidates found. Candidates appear here after client confirmation.</p>
                </div>
            ) : (
                <div className="dashboard-content">
                    {candidates.map((candidate) => (
                        <div key={`${candidate.interview_id}-${candidate.candidate_id}`} className="profile-section">
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                                <div style={{flex: 1}}>
                                    <h3>{candidate.candidate_name}</h3>
                                    <div className="profile-info">
                                        <p><strong>Job Title:</strong> {candidate.job_title}</p>
                                        <p><strong>Onboarded:</strong> {new Date(candidate.onboarded_at).toLocaleDateString()}</p>
                                        <p><strong>Assets Status:</strong> 
                                            <span style={{
                                                color: candidate.assets_provided ? '#4CAF50' : '#ff9aa2',
                                                fontWeight: 'bold',
                                                marginLeft: '8px'
                                            }}>
                                                {candidate.assets_provided ? 'Provided' : 'Pending'}
                                            </span>
                                        </p>
                                        {candidate.assets_provided && candidate.asset_details && (
                                            <p><strong>Asset Details:</strong> {candidate.asset_details}</p>
                                        )}
                                        {candidate.assets_provided && candidate.assets_provided_at && (
                                            <p><strong>Assets Provided On:</strong> {new Date(candidate.assets_provided_at).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                </div>
                                <div style={{marginLeft: '20px'}}>
                                    {!candidate.assets_provided && (
                                        <button 
                                            className="lp-btn" 
                                            onClick={() => setSelectedCandidate(candidate)}
                                            style={{padding: '10px 20px', fontSize: '14px'}}
                                        >
                                            Provide Assets
                                        </button>
                                    )}
                                    {candidate.assets_provided && (
                                        <div style={{
                                            padding: '8px 16px',
                                            backgroundColor: '#4CAF50',
                                            color: 'white',
                                            borderRadius: '20px',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}>
                                            ✓ Assets Provided
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Asset Provision Modal */}
            {selectedCandidate && (
                <div className="modal" style={{display: 'block'}}>
                    <div className="modal-content" style={{maxWidth: '500px'}}>
                        <div className="modal-header">
                            <h3 className="modal-title">Provide Assets</h3>
                            <span className="close" onClick={() => {setSelectedCandidate(null); setAssetDetails('');}}>&times;</span>
                        </div>
                        <div className="modal-body">
                            <div style={{marginBottom: '20px'}}>
                                <p><strong>Candidate:</strong> {selectedCandidate.candidate_name}</p>
                                <p><strong>Job Title:</strong> {selectedCandidate.job_title}</p>
                            </div>
                            
                            <div style={{marginBottom: '20px'}}>
                                <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Asset Details:</label>
                                <textarea
                                    value={assetDetails}
                                    onChange={(e) => setAssetDetails(e.target.value)}
                                    placeholder="Enter details about assets provided (laptop, access cards, software licenses, etc.)"
                                    style={{
                                        width: '100%',
                                        minHeight: '100px',
                                        padding: '12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>
                            
                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                                <button 
                                    className="lp-btn" 
                                    style={{backgroundColor: '#6c757d', padding: '10px 20px'}}
                                    onClick={() => {setSelectedCandidate(null); setAssetDetails('');}}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="lp-btn" 
                                    style={{padding: '10px 20px'}}
                                    onClick={() => provideAssets(selectedCandidate)}
                                    disabled={!assetDetails.trim()}
                                >
                                    Confirm Assets Provided
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InterviewTrackingContent() {
    const [trackingData, setTrackingData] = useState({
        pending_client: [],
        scheduled: [],
        completed_accepted: [],
        completed_rejected: [],
        bgv_pending: [],
        vendor_pending: [],
        onboarding_pending: [],
        fully_onboarded: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        loadTrackingData();
    }, []);

    async function loadTrackingData() {
        try {
            const response = await httpRequest('/hr/interview-tracking', { method: 'GET' });
            setTrackingData(response);
        } catch (err) {
            setError(err.message || 'Failed to load interview tracking data');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading interview tracking...</div>;
    }

    const renderInterviewCard = (interview) => (
        <div key={interview.id} style={{
            marginBottom: '16px',
            padding: '16px',
            border: '1px solid var(--lp-outline)',
            borderRadius: '12px',
            backgroundColor: 'var(--lp-card)'
        }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
                <div>
                    <h4 style={{margin: '0 0 4px 0', color: 'var(--lp-text)'}}>{interview.job_title}</h4>
                    <p style={{margin: '0 0 4px 0', color: 'var(--lp-muted)', fontSize: '14px'}}>
                        <strong>Candidate:</strong> {interview.candidate_name} ({interview.candidate_email})
                    </p>
                    <p style={{margin: '0', color: 'var(--lp-muted)', fontSize: '14px'}}>
                        <strong>Client:</strong> {interview.client_name}
                    </p>
                </div>
            </div>
            
            {interview.interview_date && interview.interview_time && (
                <p style={{margin: '0 0 8px 0', fontSize: '14px', color: 'var(--lp-primary)'}}>
                    <strong>Interview:</strong> {new Date(interview.interview_date).toLocaleDateString()} at {interview.interview_time}
                </p>
            )}
            
            {interview.decision && (
                <div style={{marginTop: '12px', padding: '8px', backgroundColor: interview.decision === 'accepted' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)', borderRadius: '8px'}}>
                    <p style={{margin: '0', fontWeight: 'bold', color: interview.decision === 'accepted' ? '#4CAF50' : '#f44336'}}>
                        {interview.decision === 'accepted' ? '✅ ACCEPTED' : '❌ REJECTED'}
                    </p>
                </div>
            )}
            
            {interview.decision === 'accepted' && (
                <div style={{marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    <span style={{
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: interview.bgv_completed ? '#4CAF50' : '#ff9800', color: 'white'
                    }}>
                        {interview.bgv_completed ? '✅ BGV Done' : '⏳ BGV Pending'}
                    </span>
                    <span style={{
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: interview.vendor_completed ? '#4CAF50' : '#ff9800', color: 'white'
                    }}>
                        {interview.vendor_completed ? '✅ Vendor Done' : '⏳ Vendor Pending'}
                    </span>
                    <span style={{
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: interview.onboarding_status === 'yes' ? '#4CAF50' : '#ff9800', color: 'white'
                    }}>
                        {interview.onboarding_status === 'yes' ? '✅ Client Approved' : '⏳ Client Pending'}
                    </span>
                    <span style={{
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        backgroundColor: interview.assets_provided ? '#4CAF50' : '#ff9800', color: 'white'
                    }}>
                        {interview.assets_provided ? '✅ Assets Given' : '⏳ Assets Pending'}
                    </span>
                </div>
            )}
        </div>
    );

    return (
        <div>
            <h2 className="lp-hero-title">Interview Tracking & Management</h2>
            
            {error && (
                <div className="profile-section">
                    <p style={{color: '#ff9aa2'}}>{error}</p>
                </div>
            )}
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px'}}>
                <div style={{padding: '16px', backgroundColor: 'var(--lp-card)', borderRadius: '12px', textAlign: 'center'}}>
                    <h4 style={{margin: '0 0 8px 0', color: '#ff9800'}}>Pending Client</h4>
                    <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold'}}>{trackingData.pending_client.length}</p>
                </div>
                <div style={{padding: '16px', backgroundColor: 'var(--lp-card)', borderRadius: '12px', textAlign: 'center'}}>
                    <h4 style={{margin: '0 0 8px 0', color: 'var(--lp-primary)'}}>Scheduled</h4>
                    <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold'}}>{trackingData.scheduled.length}</p>
                </div>
                <div style={{padding: '16px', backgroundColor: 'var(--lp-card)', borderRadius: '12px', textAlign: 'center'}}>
                    <h4 style={{margin: '0 0 8px 0', color: '#4CAF50'}}>Accepted</h4>
                    <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold'}}>{trackingData.completed_accepted.length}</p>
                </div>
                <div style={{padding: '16px', backgroundColor: 'var(--lp-card)', borderRadius: '12px', textAlign: 'center'}}>
                    <h4 style={{margin: '0 0 8px 0', color: '#f44336'}}>Rejected</h4>
                    <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold'}}>{trackingData.completed_rejected.length}</p>
                </div>
            </div>
            
            <div style={{display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap'}}>
                {[
                    {key: 'overview', label: 'Overview'},
                    {key: 'bgv_pending', label: `BGV Pending (${trackingData.bgv_pending.length})`},
                    {key: 'vendor_pending', label: `Vendor Pending (${trackingData.vendor_pending.length})`},
                    {key: 'onboarding_pending', label: `Client Approval (${trackingData.onboarding_pending.length})`},
                    {key: 'fully_onboarded', label: `Fully Onboarded (${trackingData.fully_onboarded.length})`}
                ].map(tab => (
                    <button
                        key={tab.key}
                        className={`lp-nav-btn ${activeTab === tab.key ? 'lp-nav-btn-primary' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                        style={{padding: '8px 16px', fontSize: '14px'}}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            
            <div className="dashboard-content">
                {activeTab === 'overview' && (
                    <div>
                        {trackingData.pending_client.length > 0 && (
                            <div className="profile-section">
                                <h3 style={{color: '#ff9800'}}>⏳ Pending Client Time Setting</h3>
                                {trackingData.pending_client.map(renderInterviewCard)}
                            </div>
                        )}
                        {trackingData.scheduled.length > 0 && (
                            <div className="profile-section">
                                <h3 style={{color: 'var(--lp-primary)'}}>📅 Scheduled Interviews</h3>
                                {trackingData.scheduled.map(renderInterviewCard)}
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'bgv_pending' && (
                    <div className="profile-section">
                        <h3>📋 BGV Pending</h3>
                        {trackingData.bgv_pending.length === 0 ? (
                            <p>No candidates pending BGV completion.</p>
                        ) : (
                            trackingData.bgv_pending.map(renderInterviewCard)
                        )}
                    </div>
                )}
                
                {activeTab === 'vendor_pending' && (
                    <div className="profile-section">
                        <h3>✅ Vendor Checklist Pending</h3>
                        {trackingData.vendor_pending.length === 0 ? (
                            <p>No candidates pending vendor checklist.</p>
                        ) : (
                            trackingData.vendor_pending.map(renderInterviewCard)
                        )}
                    </div>
                )}
                
                {activeTab === 'onboarding_pending' && (
                    <div className="profile-section">
                        <h3>🏢 Client Approval Pending</h3>
                        {trackingData.onboarding_pending.length === 0 ? (
                            <p>No candidates pending client approval.</p>
                        ) : (
                            trackingData.onboarding_pending.map(renderInterviewCard)
                        )}
                    </div>
                )}
                
                {activeTab === 'fully_onboarded' && (
                    <div className="profile-section">
                        <h3>🎉 Fully Onboarded</h3>
                        {trackingData.fully_onboarded.length === 0 ? (
                            <p>No fully onboarded candidates yet.</p>
                        ) : (
                            trackingData.fully_onboarded.map(renderInterviewCard)
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}