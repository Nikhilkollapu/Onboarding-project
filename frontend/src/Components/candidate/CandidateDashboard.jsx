import '../landingpage/LandingPage.css';
import './Candidate.css';
import { useState, useEffect } from 'react';
import { logout, decodeToken } from '../../services/auth';
import { httpRequest } from '../../services/http';
import { useNavigate } from 'react-router-dom';

function CandidateDashboard() {
    const [active, setActive] = useState('dashboard');
    const navigate = useNavigate();
    const payload = decodeToken();
    const displayName = (payload?.name || 'Candidate');

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
                            <button className={`cand-btn ${active==='profile' ? 'active' : ''}`} onClick={() => setActive('profile')}>Profile</button>
                            <button className={`cand-btn ${active==='interviews' ? 'active' : ''}`} onClick={() => setActive('interviews')}>Interviews</button>
                            <button className={`cand-btn ${active==='vacancies' ? 'active' : ''}`} onClick={() => setActive('vacancies')}>Vacancies</button>
                            <button className="cand-btn" onClick={handleLogout}>Logout</button>
                        </nav>
                    </aside>
                    <section className="cand-content">
                        {active === 'dashboard' && (
                            <DashboardContent />
                        )}
                        {active === 'profile' && (
                            <ProfileForm defaultName={displayName} defaultEmail={payload?.email || ''} />
                        )}
                        {active === 'interviews' && (
                            <CandidateInterviews />
                        )}
                        {active === 'vacancies' && (
                            <h2 className="lp-hero-title">Open Vacancies</h2>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

export default CandidateDashboard;

function DashboardContent() {
    const [profileData, setProfileData] = useState(null);
    const [skills, setSkills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        try {
            // Load profile data
            const profile = await httpRequest('/candidate/profile', { method: 'GET' });
            setProfileData(profile);
            
            // Load skills if resume exists
            if (profile?.resume_path) {
                try {
                    const skillsResponse = await httpRequest('/candidate/skills', { method: 'POST' });
                    if (skillsResponse?.skills) {
                        setSkills(skillsResponse.skills);
                    }
                } catch (e) {
                    console.log('Skills extraction failed:', e);
                }
            }
        } catch (e) {
            console.log('Failed to load profile:', e);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading...</div>;
    }

    return (
        <div>
            <h2 className="lp-hero-title">Dashboard</h2>
            
            {profileData ? (
                <div className="dashboard-content">
                    <div className="profile-section">
                        <h3>Personal Information</h3>
                        <div className="profile-info">
                            <p><strong>Name:</strong> {profileData.name || 'Not provided'}</p>
                            <p><strong>Email:</strong> {profileData.email || 'Not provided'}</p>
                            <p><strong>Date of Birth:</strong> {profileData.dob ? new Date(profileData.dob).toLocaleDateString() : 'Not provided'}</p>
                            <p><strong>Address:</strong> {profileData.address || 'Not provided'}</p>
                            <p><strong>Resume:</strong> {profileData.resume_path ? (
                                <a href={`http://localhost:4000/uploads/${profileData.resume_path.split(/[\/\\]/).pop()}`} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   style={{color: 'var(--lp-primary)', textDecoration: 'underline'}}>
                                    View Resume
                                </a>
                            ) : 'Not uploaded'}</p>
                        </div>
                    </div>
                    
                    {skills.length > 0 && (
                        <div className="skills-section">
                            <h3>Extracted Skills</h3>
                            <div className="skills-container">
                                {skills.map((skill, index) => (
                                    <span key={index} className="skill-tag">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="no-profile">
                    <p>No profile data found. Please complete your profile first.</p>
                </div>
            )}
        </div>
    );
}

function ProfileForm({ defaultName, defaultEmail }) {
    const [name, setName] = useState(defaultName || '');
    const [email, setEmail] = useState(defaultEmail || '');
    const [dob, setDob] = useState('');
    const [address, setAddress] = useState('');
    const [resume, setResume] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Load existing profile
    useEffect(() => {
        (async () => {
            try {
                // Load profile data
                const data = await httpRequest('/candidate/profile', { method: 'GET' });
                if (data) {
                    setName(data.name || defaultName || '');
                    setEmail(data.email || defaultEmail || '');
                    setDob(data.dob ? data.dob.substring(0,10) : '');
                    setAddress(data.address || '');
                }
            } catch (err) {
                // If profile doesn't exist, use default values
                setName(defaultName || '');
                setEmail(defaultEmail || '');
            }
        })();
    }, [defaultName, defaultEmail]);

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage('');
        setLoading(true);
        try {
            const form = new FormData();
            form.append('name', name);
            form.append('email', email);
            if (dob) form.append('dob', dob);
            if (address) form.append('address', address);
            if (resume) form.append('resume', resume);
            
            await httpRequest('/candidate/profile', { method: 'POST', body: form });
            setMessage('Profile saved');
        } catch (err) {
            setMessage(err?.message || 'Failed to save');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form className="cand-form" onSubmit={handleSubmit}>
            <h2 className="lp-hero-title">Your Profile</h2>
            <label className="cand-field">Name
                <input className="cand-input" type="text" value={name} onChange={e => setName(e.target.value)} required />
            </label>
            <label className="cand-field">Email
                <input className="cand-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </label>
            <label className="cand-field">Date of Birth
                <input className="cand-input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
            </label>
            <label className="cand-field">Address
                <textarea className="cand-textarea" value={address} onChange={e => setAddress(e.target.value)} />
            </label>
            <label className="cand-field">Resume (PDF)
                <input className="cand-file" type="file" accept="application/pdf" onChange={e => setResume(e.target.files?.[0] || null)} />
            </label>
            {message ? <div className="auth-meta" style={{color:'#aebcff'}}>{message}</div> : null}
            <div className="cand-actions">
                <button className="lp-btn" type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</button>
            </div>
        </form>
    );
}

function CandidateInterviews() {
    const [interviews, setInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showBgvPopup, setShowBgvPopup] = useState(false);
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [showBgvForm, setShowBgvForm] = useState(false);
    const [showVendorChecklist, setShowVendorChecklist] = useState(false);

    useEffect(() => {
        loadInterviews();
    }, []);
    
    useEffect(() => {
        // Check for accepted interviews and show popup only if not handled before
        const acceptedInterview = interviews.find(i => i.decision === 'accepted' && i.status === 'completed' && !i.popup_handled);
        if (acceptedInterview && !showBgvPopup) {
            setSelectedInterview(acceptedInterview);
            setShowBgvPopup(true);
        }
    }, [interviews, showBgvPopup]);

    async function loadInterviews() {
        try {
            const response = await httpRequest('/interviews/my-interviews', { method: 'GET' });
            setInterviews(response.interviews || []);
        } catch (err) {
            setError(err.message || 'Failed to load interviews');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading interviews...</div>;
    }

    return (
        <div>
            <h2 className="lp-hero-title">My Interviews</h2>
            
            {error && (
                <div className="profile-section">
                    <p style={{color: '#ff9aa2'}}>{error}</p>
                </div>
            )}
            
            {showBgvPopup && (
                <div className="popup-overlay">
                    <div className="popup-card">
                        <h3 style={{color: 'var(--lp-secondary)', marginBottom: '16px'}}>🎉 Congratulations!</h3>
                        <p style={{marginBottom: '16px', color: 'var(--lp-text)'}}>You have been accepted for the position: <strong>{selectedInterview?.job_title}</strong></p>
                        <p style={{marginBottom: '20px', color: 'var(--lp-muted)'}}>Please complete your Background Verification (BGV) to proceed with onboarding.</p>
                        <div style={{display: 'flex', gap: '12px'}}>
                            <button 
                                className="lp-nav-btn lp-nav-btn-primary" 
                                onClick={() => {
                                    setShowBgvPopup(false);
                                    setShowBgvForm(true);
                                }}
                            >
                                Complete BGV
                            </button>
                            <button 
                                className="lp-nav-btn" 
                                style={{backgroundColor: 'var(--lp-muted)', borderColor: 'var(--lp-muted)'}} 
                                onClick={async () => {
                                    try {
                                        await httpRequest('/candidate/bgv-popup-shown', {
                                            method: 'POST',
                                            body: { interview_id: selectedInterview.id }
                                        });
                                        loadInterviews();
                                    } catch (e) {
                                        console.error('Failed to mark popup shown:', e);
                                    }
                                    setShowBgvPopup(false);
                                }}
                            >
                                Later
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {showBgvForm && (
                <BgvForm 
                    interview={selectedInterview} 
                    onClose={() => setShowBgvForm(false)}
                    onSubmit={() => {
                        setShowBgvForm(false);
                        setShowBgvPopup(false);
                        setShowVendorChecklist(true);
                        loadInterviews(); // Reload to update popup status
                    }}
                />
            )}
            
            {showVendorChecklist && (
                <VendorChecklist 
                    interview={selectedInterview} 
                    onClose={() => setShowVendorChecklist(false)}
                    onSubmit={() => {
                        setShowVendorChecklist(false);
                        loadInterviews(); // Reload to update popup status
                    }}
                />
            )}
            
            {interviews.length === 0 ? (
                <div className="profile-section">
                    <p>No interviews scheduled yet.</p>
                </div>
            ) : (
                <div className="dashboard-content">
                    {interviews.map((interview) => (
                        <div key={interview.id} className="profile-section">
                            <h3>{interview.job_title}</h3>
                            <div className="profile-info">
                                <p><strong>Client:</strong> {interview.other_party_name}</p>
                                <p><strong>Email:</strong> {interview.other_party_email}</p>
                                {interview.third_party_name && (
                                    <p><strong>HR:</strong> {interview.third_party_name}</p>
                                )}
                                <p><strong>Status:</strong> 
                                    <span style={{
                                        color: interview.status === 'scheduled' ? 'var(--lp-primary)' : 
                                               interview.status === 'pending_client' ? '#ff9aa2' : '#aaa',
                                        fontWeight: 'bold',
                                        marginLeft: '8px'
                                    }}>
                                        {interview.status === 'scheduled' ? 'Scheduled' : 
                                         interview.status === 'pending_client' ? 'Pending Time Confirmation' : 
                                         interview.status}
                                    </span>
                                </p>
                                
                                {interview.status === 'scheduled' && interview.interview_date && interview.interview_time && (
                                    <div style={{
                                        marginTop: '12px',
                                        padding: '12px',
                                        backgroundColor: 'rgba(108, 140, 255, 0.1)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(108, 140, 255, 0.3)'
                                    }}>
                                        <p style={{margin: '0 0 4px 0', fontWeight: 'bold', color: 'var(--lp-primary)'}}>
                                            Interview Details:
                                        </p>
                                        <p style={{margin: '0'}}>
                                            <strong>Date:</strong> {new Date(interview.interview_date).toLocaleDateString()}
                                        </p>
                                        <p style={{margin: '0 0 12px 0'}}>
                                            <strong>Time:</strong> {interview.interview_time}
                                        </p>
                                        <button 
                                            className="lp-btn" 
                                            onClick={() => {
                                                const meetingUrl = interview.meeting_url || `https://meet.google.com/new`;
                                                window.open(meetingUrl, '_blank');
                                            }}
                                            style={{
                                                backgroundColor: '#4CAF50',
                                                padding: '8px 16px',
                                                fontSize: '14px'
                                            }}
                                        >
                                            Join Interview
                                        </button>
                                    </div>
                                )}
                                
                                <p><strong>Applied:</strong> {interview.created_at ? new Date(interview.created_at).toLocaleDateString() : 'Unknown'}</p>
                                
                                {interview.status === 'completed' && interview.decision && (
                                    <div style={{
                                        marginTop: '12px',
                                        padding: '12px',
                                        backgroundColor: interview.decision === 'accepted' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 154, 162, 0.1)',
                                        borderRadius: '8px',
                                        border: `1px solid ${interview.decision === 'accepted' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 154, 162, 0.3)'}`
                                    }}>
                                        <p style={{margin: '0 0 4px 0', fontWeight: 'bold', color: interview.decision === 'accepted' ? '#4CAF50' : '#ff9aa2'}}>
                                            Interview Result: {interview.decision === 'accepted' ? 'ACCEPTED ✅' : 'REJECTED'}
                                        </p>
                                        {interview.decision === 'accepted' && (
                                            <div style={{marginTop: '8px'}}>
                                                {!interview.bgv_completed ? (
                                                    <button 
                                                        className="lp-btn" 
                                                        onClick={() => {
                                                            setSelectedInterview(interview);
                                                            setShowBgvForm(true);
                                                        }}
                                                        style={{padding: '6px 12px', fontSize: '14px', marginRight: '8px'}}
                                                    >
                                                        Complete BGV
                                                    </button>
                                                ) : (
                                                    <div style={{display: 'inline-block', padding: '6px 12px', fontSize: '14px', color: '#4CAF50', fontWeight: 'bold', marginRight: '8px'}}>
                                                        ✅ BGV Completed
                                                    </div>
                                                )}
                                                
                                                {interview.bgv_completed && !interview.vendor_completed ? (
                                                    <button 
                                                        className="lp-btn" 
                                                        onClick={() => {
                                                            setSelectedInterview(interview);
                                                            setShowVendorChecklist(true);
                                                        }}
                                                        style={{padding: '6px 12px', fontSize: '14px'}}
                                                    >
                                                        Complete Vendor Checklist
                                                    </button>
                                                ) : interview.vendor_completed ? (
                                                    <div style={{display: 'inline-block', padding: '6px 12px', fontSize: '14px', color: '#4CAF50', fontWeight: 'bold'}}>
                                                        ✅ Onboarding Complete
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                        {interview.feedback && (
                                            <p style={{margin: '0'}}>
                                                <strong>Feedback:</strong> {interview.feedback}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function BgvForm({ interview, onClose, onSubmit }) {
    const [profileData, setProfileData] = useState(null);
    const [education, setEducation] = useState('');
    const [criminalBackground, setCriminalBackground] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadProfileData();
    }, []);

    async function loadProfileData() {
        try {
            const profile = await httpRequest('/candidate/profile', { method: 'GET' });
            setProfileData(profile);
        } catch (err) {
            console.error('Failed to load profile:', err);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!education || !criminalBackground) {
            setMessage('Please fill all fields');
            return;
        }

        setLoading(true);
        try {
            await httpRequest('/candidate/bgv', {
                method: 'POST',
                body: {
                    interview_id: interview.id,
                    education: education,
                    criminal_background: criminalBackground
                }
            });
            setMessage('BGV form submitted successfully!');
            setTimeout(() => onSubmit(), 1500);
        } catch (err) {
            setMessage(err.message || 'Failed to submit BGV form');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="popup-overlay" style={{zIndex: 1001}}>
            <div className="popup-card" style={{maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto'}}>
                <h3 style={{marginBottom: '20px'}}>Background Verification Form</h3>
                
                <form onSubmit={handleSubmit}>
                    <div style={{marginBottom: '20px'}}>
                        <h4 style={{color: 'var(--lp-primary)', marginBottom: '12px'}}>Personal Details</h4>
                        <div style={{padding: '12px', backgroundColor: 'rgba(174, 188, 255, 0.1)', borderRadius: '8px'}}>
                            <p><strong>Name:</strong> {profileData?.name || 'Not provided'}</p>
                            <p><strong>Email:</strong> {profileData?.email || 'Not provided'}</p>
                            <p><strong>Date of Birth:</strong> {profileData?.dob ? new Date(profileData.dob).toLocaleDateString() : 'Not provided'}</p>
                            <p style={{margin: 0}}><strong>Address:</strong> {profileData?.address || 'Not provided'}</p>
                        </div>
                    </div>
                    
                    <label className="cand-field">Education Details
                        <textarea 
                            className="cand-textarea" 
                            value={education} 
                            onChange={e => setEducation(e.target.value)}
                            placeholder="Enter your educational qualifications, institutions, years of study, etc."
                            required
                        />
                    </label>
                    
                    <div className="cand-field">
                        <label style={{display: 'block', marginBottom: '8px'}}>Criminal Background Check</label>
                        <div style={{display: 'flex', gap: '16px'}}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <input 
                                    type="radio" 
                                    name="criminal" 
                                    value="no" 
                                    checked={criminalBackground === 'no'}
                                    onChange={e => setCriminalBackground(e.target.value)}
                                    required
                                />
                                No criminal record
                            </label>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <input 
                                    type="radio" 
                                    name="criminal" 
                                    value="yes" 
                                    checked={criminalBackground === 'yes'}
                                    onChange={e => setCriminalBackground(e.target.value)}
                                    required
                                />
                                Have criminal record
                            </label>
                        </div>
                    </div>
                    
                    {message && (
                        <div style={{color: message.includes('success') ? '#4CAF50' : '#ff9aa2', marginBottom: '16px'}}>
                            {message}
                        </div>
                    )}
                    
                    <div style={{display: 'flex', gap: '12px', marginTop: '20px'}}>
                        <button className="lp-btn" type="submit" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit BGV'}
                        </button>
                        <button 
                            className="lp-btn" 
                            type="button"
                            style={{backgroundColor: '#666'}} 
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function VendorChecklist({ interview, onClose, onSubmit }) {
    const [legalDocuments, setLegalDocuments] = useState('');
    const [onboardingTraining, setOnboardingTraining] = useState('');
    const [securityPolicies, setSecurityPolicies] = useState('');
    const [slaKpiDefined, setSlaKpiDefined] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        if (!legalDocuments || !onboardingTraining || !securityPolicies || !slaKpiDefined) {
            setMessage('Please answer all questions');
            return;
        }

        setLoading(true);
        try {
            await httpRequest('/candidate/vendor-checklist', {
                method: 'POST',
                body: {
                    interview_id: interview.id,
                    legal_documents: legalDocuments,
                    onboarding_training: onboardingTraining,
                    security_policies: securityPolicies,
                    sla_kpi_defined: slaKpiDefined
                }
            });
            setMessage('Vendor checklist completed successfully! Onboarding process is now complete.');
            setTimeout(() => onSubmit(), 2000);
        } catch (err) {
            setMessage(err.message || 'Failed to submit vendor checklist');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="popup-overlay" style={{zIndex: 1002}}>
            <div className="popup-card" style={{maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto'}}>
                <h3 style={{marginBottom: '20px'}}>Vendor Onboarding Checklist</h3>
                
                <form onSubmit={handleSubmit}>
                    <div className="cand-field">
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Have all required legal and compliance documents been submitted and verified?</label>
                        <div style={{display: 'flex', gap: '16px'}}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <input 
                                    type="radio" 
                                    name="legal" 
                                    value="yes" 
                                    checked={legalDocuments === 'yes'}
                                    onChange={e => setLegalDocuments(e.target.value)}
                                    required
                                />
                                Yes
                            </label>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <input 
                                    type="radio" 
                                    name="legal" 
                                    value="no" 
                                    checked={legalDocuments === 'no'}
                                    onChange={e => setLegalDocuments(e.target.value)}
                                    required
                                />
                                No
                            </label>
                        </div>
                    </div>
                    
                    <div className="cand-field">
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Has the vendor completed the onboarding training or orientation sessions?</label>
                        <div style={{display: 'flex', gap: '16px'}}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <input 
                                    type="radio" 
                                    name="training" 
                                    value="yes" 
                                    checked={onboardingTraining === 'yes'}
                                    onChange={e => setOnboardingTraining(e.target.value)}
                                    required
                                />
                                Yes
                            </label>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <input 
                                    type="radio" 
                                    name="training" 
                                    value="no" 
                                    checked={onboardingTraining === 'no'}
                                    onChange={e => setOnboardingTraining(e.target.value)}
                                    required
                                />
                                No
                            </label>
                        </div>
                    </div>
                    
                    <div className="cand-field">
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Are the vendor's systems and processes aligned with our data security and privacy policies?</label>
                        <div style={{display: 'flex', gap: '16px'}}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <input 
                                    type="radio" 
                                    name="security" 
                                    value="yes" 
                                    checked={securityPolicies === 'yes'}
                                    onChange={e => setSecurityPolicies(e.target.value)}
                                    required
                                />
                                Yes
                            </label>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <input 
                                    type="radio" 
                                    name="security" 
                                    value="no" 
                                    checked={securityPolicies === 'no'}
                                    onChange={e => setSecurityPolicies(e.target.value)}
                                    required
                                />
                                No
                            </label>
                        </div>
                    </div>
                    
                    <div className="cand-field">
                        <label style={{display: 'block', marginBottom: '8px', fontWeight: 'bold'}}>Are SLAs (Service Level Agreements) and KPIs (Key Performance Indicators) clearly defined and agreed upon?</label>
                        <div style={{display: 'flex', gap: '16px'}}>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <input 
                                    type="radio" 
                                    name="sla" 
                                    value="yes" 
                                    checked={slaKpiDefined === 'yes'}
                                    onChange={e => setSlaKpiDefined(e.target.value)}
                                    required
                                />
                                Yes
                            </label>
                            <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <input 
                                    type="radio" 
                                    name="sla" 
                                    value="no" 
                                    checked={slaKpiDefined === 'no'}
                                    onChange={e => setSlaKpiDefined(e.target.value)}
                                    required
                                />
                                No
                            </label>
                        </div>
                    </div>
                    
                    {message && (
                        <div style={{color: message.includes('success') ? '#4CAF50' : '#ff9aa2', marginBottom: '16px'}}>
                            {message}
                        </div>
                    )}
                    
                    <div style={{display: 'flex', gap: '12px', marginTop: '20px'}}>
                        <button className="lp-btn" type="submit" disabled={loading}>
                            {loading ? 'Submitting...' : 'Complete Onboarding'}
                        </button>
                        <button 
                            className="lp-btn" 
                            type="button"
                            style={{backgroundColor: '#666'}} 
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}