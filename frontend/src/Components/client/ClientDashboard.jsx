import '../landingpage/LandingPage.css';
import '../candidate/Candidate.css';
import { useState, useEffect } from 'react';
import { logout, decodeToken } from '../../services/auth';
import { httpRequest } from '../../services/http';
import { useNavigate } from 'react-router-dom';

function ClientDashboard() {
    const [active, setActive] = useState('dashboard');
    const navigate = useNavigate();
    const payload = decodeToken();
    const displayName = (payload?.name || 'Client');

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
                            <button className={`cand-btn ${active==='requirements' ? 'active' : ''}`} onClick={() => setActive('requirements')}>Requirements</button>
                            <button className={`cand-btn ${active==='interviews' ? 'active' : ''}`} onClick={() => setActive('interviews')}>Interviews</button>
                            <button className={`cand-btn ${active==='candidates' ? 'active' : ''}`} onClick={() => setActive('candidates')}>Shortlisted</button>
                            <button className={`cand-btn ${active==='reports' ? 'active' : ''}`} onClick={() => setActive('reports')}>Reports</button>
                            <button className="cand-btn" onClick={handleLogout}>Logout</button>
                        </nav>
                    </aside>
                    <section className="cand-content">
                        {active === 'dashboard' && (
                            <ClientDashboardContent />
                        )}
                        {active === 'requirements' && (
                            <RequirementsContent />
                        )}
                        {active === 'interviews' && (
                            <InterviewsContent />
                        )}
                        {active === 'candidates' && (
                            <OnboardingCandidates />
                        )}
                        {active === 'reports' && (
                            <ReportsContent />
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

function ReportsContent() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadReports();
    }, []);

    async function loadReports() {
        try {
            const response = await httpRequest('/client/hiring-reports', { method: 'GET' });
            setReports(response.reports || []);
        } catch (err) {
            console.error('Failed to load reports:', err);
            setMessage('Failed to load reports: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading reports...</div>;
    }

    return (
        <div>
            <h2 className="lp-hero-title">Hiring Reports & Analytics</h2>
            
            {message && (
                <div className="profile-section">
                    <p style={{color: '#ff9aa2'}}>{message}</p>
                </div>
            )}
            
            {reports.length === 0 ? (
                <div className="profile-section">
                    <p>No hiring data available yet. Create job requirements and conduct interviews to see reports.</p>
                </div>
            ) : (
                <div className="dashboard-content">
                    {reports.map((report, index) => (
                        <div key={index} className="profile-section">
                            <h3>{report.job_title}</h3>
                            
                            <div className="profile-info">
                                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px'}}>
                                    <div style={{padding: '12px', backgroundColor: 'rgba(52, 152, 219, 0.1)', borderRadius: '8px', textAlign: 'center'}}>
                                        <h4 style={{margin: '0 0 8px 0', color: 'var(--lp-primary)'}}>Total Interviews</h4>
                                        <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold'}}>{report.total_interviews}</p>
                                    </div>
                                    <div style={{padding: '12px', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px', textAlign: 'center'}}>
                                        <h4 style={{margin: '0 0 8px 0', color: '#4CAF50'}}>Selected</h4>
                                        <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#4CAF50'}}>{report.accepted_count}</p>
                                    </div>
                                    <div style={{padding: '12px', backgroundColor: 'rgba(244, 67, 54, 0.1)', borderRadius: '8px', textAlign: 'center'}}>
                                        <h4 style={{margin: '0 0 8px 0', color: '#f44336'}}>Rejected</h4>
                                        <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#f44336'}}>{report.rejected_count}</p>
                                    </div>
                                    <div style={{padding: '12px', backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: '8px', textAlign: 'center'}}>
                                        <h4 style={{margin: '0 0 8px 0', color: '#ff9800'}}>Onboarded</h4>
                                        <p style={{margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#ff9800'}}>{report.onboarded_count}</p>
                                    </div>
                                </div>
                                
                                {report.required_skills && report.required_skills.length > 0 && (
                                    <div style={{marginBottom: '20px'}}>
                                        <h4 style={{color: 'var(--lp-primary)', marginBottom: '8px'}}>Required Skills for this Role:</h4>
                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                            {report.required_skills.map((skill, skillIndex) => (
                                                <span key={skillIndex} className="skill-tag" style={{fontSize: '12px', padding: '4px 8px'}}>
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {report.selected_candidates && report.selected_candidates.length > 0 && (
                                    <div>
                                        <h4 style={{color: '#4CAF50', marginBottom: '12px'}}>✅ Selected Candidates for this Role:</h4>
                                        {report.selected_candidates.map((candidate, candidateIndex) => (
                                            <div key={candidateIndex} style={{marginBottom: '12px', padding: '12px', backgroundColor: 'rgba(76, 175, 80, 0.05)', border: '1px solid rgba(76, 175, 80, 0.2)', borderRadius: '8px'}}>
                                                <p style={{margin: '0 0 4px 0'}}>
                                                    <strong>{candidate.name}</strong>
                                                    <span style={{marginLeft: '12px', fontSize: '14px', color: '#666'}}>
                                                        Selected on: {new Date(candidate.selected_date).toLocaleDateString()}
                                                    </span>
                                                </p>
                                                <p style={{margin: 0, fontSize: '14px'}}>
                                                    <strong>Onboarding Status:</strong> 
                                                    <span style={{color: candidate.onboarding_status === 'yes' ? '#4CAF50' : candidate.onboarding_status === 'no' ? '#f44336' : '#ff9800', fontWeight: 'bold', marginLeft: '8px'}}>
                                                        {candidate.onboarding_status === 'yes' ? '✅ ONBOARDED' : 
                                                         candidate.onboarding_status === 'no' ? '❌ NOT ONBOARDED' : '⏳ PENDING DECISION'}
                                                    </span>
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {(!report.selected_candidates || report.selected_candidates.length === 0) && report.accepted_count === 0 && (
                                    <div style={{padding: '16px', backgroundColor: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: '8px'}}>
                                        <p style={{margin: 0, color: '#ff9800'}}>
                                            ⚠️ No candidates selected for this role yet.
                                        </p>
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

export default ClientDashboard;

function ClientDashboardContent() {
    const [stats, setStats] = useState({
        active_requirements: 0,
        shortlisted_candidates: 0,
        interviews_scheduled: 0,
        positions_filled: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    async function loadStats() {
        try {
            const response = await httpRequest('/client/dashboard-stats', { method: 'GET' });
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
            <h2 className="lp-hero-title">Client Dashboard</h2>
            
            <div className="dashboard-content">
                <div className="profile-section">
                    <h3>Overview</h3>
                    <div className="profile-info">
                        <p><strong>Active Requirements:</strong> {stats.active_requirements}</p>
                        <p><strong>Shortlisted Candidates:</strong> {stats.shortlisted_candidates}</p>
                        <p><strong>Interviews Scheduled:</strong> {stats.interviews_scheduled}</p>
                        <p><strong>Positions Filled:</strong> {stats.positions_filled}</p>
                    </div>
                </div>
                
                <div className="skills-section">
                    <h3>Quick Actions</h3>
                    <div className="profile-info">
                        <p>• Create new job requirements</p>
                        <p>• Schedule interview times</p>
                        <p>• Review candidate reports</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RequirementsContent() {
    const [pendingRequirements, setPendingRequirements] = useState([]);
    const [completedRequirements, setCompletedRequirements] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Form fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [skillInput, setSkillInput] = useState('');
    const [skills, setSkills] = useState([]);
    const [experienceLevel, setExperienceLevel] = useState('');
    const [location, setLocation] = useState('');
    const [salaryRange, setSalaryRange] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadRequirements();
    }, []);

    async function loadRequirements() {
        try {
            const response = await httpRequest('/client/requirements', { method: 'GET' });
            setPendingRequirements(response.pending || []);
            setCompletedRequirements(response.completed || []);
        } catch (err) {
            console.error('Failed to load requirements:', err);
        } finally {
            setLoading(false);
        }
    }

    function addSkill() {
        if (skillInput.trim() && !skills.includes(skillInput.trim())) {
            setSkills([...skills, skillInput.trim()]);
            setSkillInput('');
        }
    }

    function removeSkill(skillToRemove) {
        setSkills(skills.filter(skill => skill !== skillToRemove));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage('');
        setSubmitting(true);
        
        try {
            await httpRequest('/client/requirements', {
                method: 'POST',
                body: {
                    title,
                    description,
                    required_skills: skills,
                    experience_level: experienceLevel,
                    location,
                    salary_range: salaryRange
                }
            });
            
            setMessage('Requirement created successfully!');
            // Reset form
            setTitle('');
            setDescription('');
            setSkills([]);
            setExperienceLevel('');
            setLocation('');
            setSalaryRange('');
            setShowForm(false);
            
            // Reload requirements
            loadRequirements();
        } catch (err) {
            setMessage(err.message || 'Failed to create requirement');
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading requirements...</div>;
    }

    return (
        <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h2 className="lp-hero-title">Job Requirements</h2>
                <button className="lp-btn" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : 'Add Requirement'}
                </button>
            </div>
            
            {message && (
                <div className="profile-section">
                    <p style={{color: message.includes('success') ? 'var(--lp-primary)' : '#ff9aa2'}}>{message}</p>
                </div>
            )}
            
            {showForm && (
                <form className="cand-form" onSubmit={handleSubmit} style={{marginBottom: '30px'}}>
                    <div className="profile-section">
                        <h3>Create New Requirement</h3>
                        
                        <label className="cand-field">Job Title
                            <input className="cand-input" type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                        </label>
                        
                        <label className="cand-field">Description
                            <textarea className="cand-textarea" value={description} onChange={e => setDescription(e.target.value)} />
                        </label>
                        
                        <label className="cand-field">Required Skills
                            <div style={{display: 'flex', gap: '8px'}}>
                                <input 
                                    className="cand-input" 
                                    type="text" 
                                    value={skillInput} 
                                    onChange={e => setSkillInput(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                                    placeholder="Enter a skill and press Enter"
                                />
                                <button type="button" className="lp-btn" onClick={addSkill}>Add</button>
                            </div>
                        </label>
                        
                        {skills.length > 0 && (
                            <div className="skills-container" style={{marginBottom: '16px'}}>
                                {skills.map((skill, index) => (
                                    <span key={index} className="skill-tag" style={{cursor: 'pointer'}} onClick={() => removeSkill(skill)}>
                                        {skill} ×
                                    </span>
                                ))}
                            </div>
                        )}
                        
                        <label className="cand-field">Experience Level
                            <select className="cand-input" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                                <option value="">Select Experience Level</option>
                                <option value="Entry Level">Entry Level</option>
                                <option value="Mid Level">Mid Level</option>
                                <option value="Senior Level">Senior Level</option>
                                <option value="Lead/Manager">Lead/Manager</option>
                            </select>
                        </label>
                        
                        <label className="cand-field">Location
                            <input className="cand-input" type="text" value={location} onChange={e => setLocation(e.target.value)} />
                        </label>
                        
                        <label className="cand-field">Salary Range
                            <input className="cand-input" type="text" value={salaryRange} onChange={e => setSalaryRange(e.target.value)} placeholder="e.g., $50,000 - $70,000" />
                        </label>
                        
                        <div className="cand-actions">
                            <button className="lp-btn" type="submit" disabled={submitting}>
                                {submitting ? 'Creating...' : 'Create Requirement'}
                            </button>
                        </div>
                    </div>
                </form>
            )}
            
            <div className="dashboard-content">
                <div className="profile-section">
                    <h3>Pending Requirements ({pendingRequirements.length})</h3>
                    <p style={{fontSize: '14px', color: '#666', marginBottom: '16px'}}>Requirements waiting for candidate assignments</p>
                    {pendingRequirements.length === 0 ? (
                        <p>No pending requirements.</p>
                    ) : (
                        pendingRequirements.map((req) => (
                            <div key={req.id} style={{marginBottom: '16px', padding: '16px', border: '1px solid #e3e8f0', borderRadius: '8px', backgroundColor: '#fff9e6'}}>
                                <h4>{req.title}</h4>
                                <div className="profile-info">
                                    <p><strong>Description:</strong> {req.description || 'No description'}</p>
                                    <p><strong>Experience Level:</strong> {req.experience_level || 'Not specified'}</p>
                                    <p><strong>Location:</strong> {req.location || 'Not specified'}</p>
                                    <p><strong>Salary Range:</strong> {req.salary_range || 'Not specified'}</p>
                                    <p><strong>Posted:</strong> {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Unknown'}</p>
                                </div>
                                {req.required_skills && req.required_skills.length > 0 && (
                                    <div className="skills-container" style={{marginTop: '12px'}}>
                                        <strong style={{color: 'var(--lp-primary)', marginBottom: '8px', display: 'block'}}>Required Skills:</strong>
                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                            {req.required_skills.map((skill, index) => (
                                                <span key={index} className="skill-tag" style={{fontSize: '12px', padding: '4px 8px'}}>
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
                
                <div className="profile-section">
                    <h3>Completed Requirements ({completedRequirements.length})</h3>
                    <p style={{fontSize: '14px', color: '#666', marginBottom: '16px'}}>Requirements with candidate assignments</p>
                    {completedRequirements.length === 0 ? (
                        <p>No completed requirements.</p>
                    ) : (
                        completedRequirements.map((req) => (
                            <div key={req.id} style={{marginBottom: '16px', padding: '16px', border: '1px solid #e3e8f0', borderRadius: '8px', backgroundColor: '#f0f9ff'}}>
                                <h4>{req.title}</h4>
                                <div className="profile-info">
                                    <p><strong>Description:</strong> {req.description || 'No description'}</p>
                                    <p><strong>Experience Level:</strong> {req.experience_level || 'Not specified'}</p>
                                    <p><strong>Location:</strong> {req.location || 'Not specified'}</p>
                                    <p><strong>Salary Range:</strong> {req.salary_range || 'Not specified'}</p>
                                    <p><strong>Candidates Assigned:</strong> {req.candidate_count}</p>
                                    <p><strong>Posted:</strong> {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Unknown'}</p>
                                </div>
                                {req.required_skills && req.required_skills.length > 0 && (
                                    <div className="skills-container" style={{marginTop: '12px'}}>
                                        <strong style={{color: 'var(--lp-primary)', marginBottom: '8px', display: 'block'}}>Required Skills:</strong>
                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                            {req.required_skills.map((skill, index) => (
                                                <span key={index} className="skill-tag" style={{fontSize: '12px', padding: '4px 8px'}}>
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function OnboardingCandidates() {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadOnboardingCandidates();
    }, []);

    async function loadOnboardingCandidates() {
        try {
            const response = await httpRequest('/client/onboarding-candidates', { method: 'GET' });
            console.log('Onboarding candidates response:', response);
            setCandidates(response.candidates || []);
        } catch (err) {
            console.error('Failed to load onboarding candidates:', err);
            setMessage('Failed to load candidates: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    }

    async function confirmOnboarding(candidate, confirmation) {
        try {
            await httpRequest('/client/confirm-onboarding', {
                method: 'POST',
                body: {
                    interview_id: candidate.interview_id,
                    candidate_id: candidate.candidate_id,
                    confirmation: confirmation
                }
            });
            setMessage(`${candidate.candidate_name} onboarding ${confirmation === 'yes' ? 'approved' : 'rejected'} successfully!`);
            loadOnboardingCandidates();
        } catch (err) {
            setMessage(err.message || 'Failed to confirm onboarding');
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading candidates...</div>;
    }

    return (
        <div>
            <h2 className="lp-hero-title">Onboarding Confirmation</h2>
            
            {message && (
                <div className="profile-section">
                    <p style={{color: message.includes('success') ? 'var(--lp-primary)' : '#ff9aa2'}}>{message}</p>
                </div>
            )}
            
            {candidates.length === 0 ? (
                <div className="profile-section">
                    <p>No candidates ready for onboarding confirmation.</p>
                    <p style={{fontSize: '14px', color: '#666', marginTop: '10px'}}>
                        Candidates will appear here after they complete: Interview → BGV → Vendor Checklist
                    </p>
                </div>
            ) : (
                <div className="dashboard-content">
                    {candidates.map((candidate) => (
                        <div key={candidate.interview_id} className="profile-section">
                            <h3>{candidate.candidate_name}</h3>
                            <div className="profile-info">
                                <p><strong>Position:</strong> {candidate.job_title}</p>
                                
                                <div style={{marginTop: '16px'}}>
                                    <h4 style={{color: 'var(--lp-primary)', marginBottom: '8px'}}>Required Skills:</h4>
                                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px'}}>
                                        {candidate.required_skills.map((skill, index) => (
                                            <span key={index} className="skill-tag" style={{fontSize: '12px', padding: '4px 8px'}}>
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                
                                <div style={{marginTop: '16px', padding: '12px', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px'}}>
                                    <h4 style={{color: '#4CAF50', marginBottom: '8px'}}>✅ BGV Completed</h4>
                                    <p><strong>Education:</strong> {candidate.education}</p>
                                    <p><strong>Criminal Background:</strong> {candidate.criminal_background === 'no' ? 'Clean' : 'Has Record'}</p>
                                </div>
                                
                                <div style={{marginTop: '16px', padding: '12px', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: '8px'}}>
                                    <h4 style={{color: '#4CAF50', marginBottom: '8px'}}>✅ Vendor Checklist Completed</h4>
                                    <p><strong>Legal Documents:</strong> {candidate.legal_documents}</p>
                                    <p><strong>Training Completed:</strong> {candidate.onboarding_training}</p>
                                    <p><strong>Security Aligned:</strong> {candidate.security_policies}</p>
                                    <p><strong>SLA/KPI Defined:</strong> {candidate.sla_kpi_defined}</p>
                                </div>
                                
                                <div style={{marginTop: '20px', textAlign: 'center'}}>
                                    <h4 style={{marginBottom: '16px', color: '#2c3e50'}}>Do you want to onboard {candidate.candidate_name}?</h4>
                                    <div style={{display: 'flex', gap: '12px', justifyContent: 'center'}}>
                                        <button 
                                            className="lp-btn" 
                                            onClick={() => confirmOnboarding(candidate, 'yes')}
                                            style={{backgroundColor: '#4CAF50', padding: '12px 24px'}}
                                        >
                                            Yes, Onboard
                                        </button>
                                        <button 
                                            className="lp-btn" 
                                            onClick={() => confirmOnboarding(candidate, 'no')}
                                            style={{backgroundColor: '#f44336', padding: '12px 24px'}}
                                        >
                                            No, Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function InterviewsContent() {
    const [pendingInterviews, setPendingInterviews] = useState([]);
    const [scheduledInterviews, setScheduledInterviews] = useState([]);
    const [completedInterviews, setCompletedInterviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [interviewDate, setInterviewDate] = useState('');
    const [interviewTime, setInterviewTime] = useState('');
    const [completingInterview, setCompletingInterview] = useState(null);
    const [decision, setDecision] = useState('');
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        loadInterviews();
    }, []);

    async function loadInterviews() {
        try {
            const [pendingResponse, scheduledResponse, completedResponse] = await Promise.all([
                httpRequest('/client/pending-interviews', { method: 'GET' }),
                httpRequest('/client/scheduled-interviews', { method: 'GET' }),
                httpRequest('/client/completed-interviews', { method: 'GET' })
            ]);
            setPendingInterviews(pendingResponse.interviews || []);
            setScheduledInterviews(scheduledResponse.interviews || []);
            setCompletedInterviews(completedResponse.interviews || []);
        } catch (err) {
            console.error('Failed to load interviews:', err);
        } finally {
            setLoading(false);
        }
    }

    async function confirmInterviewTime() {
        if (!selectedInterview || !interviewDate || !interviewTime) {
            setMessage('Please select date and time');
            return;
        }

        try {
            await httpRequest('/client/set-interview-time', {
                method: 'POST',
                body: {
                    interview_id: selectedInterview.id,
                    interview_date: interviewDate,
                    interview_time: interviewTime
                }
            });

            setMessage('Interview time set successfully!');
            setSelectedInterview(null);
            setInterviewDate('');
            setInterviewTime('');
            loadInterviews();
        } catch (err) {
            setMessage(err.message || 'Failed to set interview time');
        }
    }
    
    async function completeInterview() {
        if (!completingInterview || !decision) {
            setMessage('Please select accept or reject');
            return;
        }

        try {
            await httpRequest('/client/complete-interview', {
                method: 'POST',
                body: {
                    interview_id: completingInterview.id,
                    decision: decision,
                    feedback: feedback
                }
            });

            setMessage(`Interview ${decision} successfully!`);
            setCompletingInterview(null);
            setDecision('');
            setFeedback('');
            loadInterviews();
        } catch (err) {
            setMessage(err.message || 'Failed to complete interview');
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading interviews...</div>;
    }

    return (
        <div>
            <h2 className="lp-hero-title">Interview Scheduling</h2>
            
            {message && (
                <div className="profile-section">
                    <p style={{color: message.includes('success') ? 'var(--lp-primary)' : '#ff9aa2'}}>{message}</p>
                </div>
            )}
            
            {selectedInterview && (
                <div className="profile-section" style={{marginBottom: '20px'}}>
                    <h3>Set Interview Time</h3>
                    <p><strong>Job:</strong> {selectedInterview.job_title}</p>
                    <p><strong>Candidate:</strong> {selectedInterview.candidate_name} ({selectedInterview.candidate_email})</p>
                    
                    <div style={{display: 'grid', gap: '12px', maxWidth: '400px', marginTop: '16px'}}>
                        <label className="cand-field">Interview Date
                            <input 
                                className="cand-input" 
                                type="date" 
                                value={interviewDate} 
                                onChange={e => setInterviewDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </label>
                        
                        <label className="cand-field">Interview Time
                            <input 
                                className="cand-input" 
                                type="time" 
                                value={interviewTime} 
                                onChange={e => setInterviewTime(e.target.value)}
                            />
                        </label>
                        
                        <div style={{display: 'flex', gap: '8px'}}>
                            <button className="lp-btn" onClick={confirmInterviewTime}>
                                Confirm Time
                            </button>
                            <button 
                                className="lp-btn" 
                                style={{backgroundColor: '#666'}} 
                                onClick={() => setSelectedInterview(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {completingInterview && (
                <div className="profile-section" style={{marginBottom: '20px'}}>
                    <h3>Complete Interview</h3>
                    <p><strong>Job:</strong> {completingInterview.job_title}</p>
                    <p><strong>Candidate:</strong> {completingInterview.candidate_name}</p>
                    
                    <div style={{display: 'grid', gap: '12px', maxWidth: '400px', marginTop: '16px'}}>
                        <div>
                            <strong>Decision:</strong>
                            <div style={{display: 'flex', gap: '12px', marginTop: '8px'}}>
                                <label style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <input 
                                        type="radio" 
                                        name="decision" 
                                        value="accepted" 
                                        checked={decision === 'accepted'}
                                        onChange={e => setDecision(e.target.value)}
                                    />
                                    Accept
                                </label>
                                <label style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                    <input 
                                        type="radio" 
                                        name="decision" 
                                        value="rejected" 
                                        checked={decision === 'rejected'}
                                        onChange={e => setDecision(e.target.value)}
                                    />
                                    Reject
                                </label>
                            </div>
                        </div>
                        
                        <label className="cand-field">Feedback
                            <textarea 
                                className="cand-textarea" 
                                value={feedback} 
                                onChange={e => setFeedback(e.target.value)}
                                placeholder="Optional feedback for HR and candidate"
                            />
                        </label>
                        
                        <div style={{display: 'flex', gap: '8px'}}>
                            <button className="lp-btn" onClick={completeInterview}>
                                Submit Decision
                            </button>
                            <button 
                                className="lp-btn" 
                                style={{backgroundColor: '#666'}} 
                                onClick={() => setCompletingInterview(null)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="dashboard-content">
                <div className="profile-section">
                    <h3>Pending Interviews (Set Time)</h3>
                    {pendingInterviews.length === 0 ? (
                        <p>No pending interviews to schedule.</p>
                    ) : (
                        pendingInterviews.map((interview) => (
                            <div key={interview.id} style={{marginBottom: '16px', padding: '12px', border: '1px solid rgba(174, 188, 255, 0.15)', borderRadius: '8px'}}>
                                <h4>{interview.job_title}</h4>
                                <p><strong>Candidate:</strong> {interview.candidate_name} ({interview.candidate_email})</p>
                                <button 
                                    className="lp-btn" 
                                    onClick={() => setSelectedInterview(interview)}
                                    style={{padding: '8px 16px', fontSize: '14px'}}
                                >
                                    Set Interview Time
                                </button>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="profile-section">
                    <h3>Scheduled Interviews</h3>
                    {scheduledInterviews.length === 0 ? (
                        <p>No scheduled interviews.</p>
                    ) : (
                        scheduledInterviews.map((interview) => (
                            <div key={interview.id} style={{marginBottom: '16px', padding: '12px', border: '1px solid rgba(108, 140, 255, 0.3)', borderRadius: '8px', backgroundColor: 'rgba(108, 140, 255, 0.1)'}}>
                                <h4>{interview.job_title}</h4>
                                <p><strong>Candidate:</strong> {interview.candidate_name} ({interview.candidate_email})</p>
                                <p><strong>Date:</strong> {new Date(interview.interview_date).toLocaleDateString()}</p>
                                <p><strong>Time:</strong> {interview.interview_time}</p>
                                
                                <div style={{display: 'flex', gap: '8px', marginTop: '12px'}}>
                                    <button 
                                        className="lp-btn" 
                                        onClick={() => {
                                            const meetingUrl = interview.meeting_url || `https://meet.google.com/new`;
                                            window.open(meetingUrl, '_blank');
                                        }}
                                        style={{backgroundColor: '#4CAF50', padding: '8px 16px', fontSize: '14px'}}
                                    >
                                        Join Interview
                                    </button>
                                    <button 
                                        className="lp-btn" 
                                        onClick={() => setCompletingInterview(interview)}
                                        style={{padding: '8px 16px', fontSize: '14px'}}
                                    >
                                        Complete Interview
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="profile-section">
                    <h3>Completed Interviews</h3>
                    {completedInterviews.length === 0 ? (
                        <p>No completed interviews.</p>
                    ) : (
                        completedInterviews.map((interview) => (
                            <div key={interview.id} style={{marginBottom: '16px', padding: '12px', border: '1px solid rgba(76, 175, 80, 0.3)', borderRadius: '8px', backgroundColor: interview.decision === 'accepted' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)'}}>
                                <h4>{interview.job_title}</h4>
                                <p><strong>Candidate:</strong> {interview.candidate_name} ({interview.candidate_email})</p>
                                <p><strong>Interview Date:</strong> {new Date(interview.interview_date).toLocaleDateString()}</p>
                                <p><strong>Decision:</strong> 
                                    <span style={{color: interview.decision === 'accepted' ? '#4CAF50' : '#f44336', fontWeight: 'bold', marginLeft: '8px'}}>
                                        {interview.decision === 'accepted' ? '✅ SELECTED' : '❌ REJECTED'}
                                    </span>
                                </p>
                                {interview.decision === 'accepted' && (
                                    <p><strong>Onboarding Status:</strong> 
                                        <span style={{color: interview.onboarding_status === 'yes' ? '#4CAF50' : '#ff9800', fontWeight: 'bold', marginLeft: '8px'}}>
                                            {interview.onboarding_status === 'yes' ? '✅ ONBOARDED' : 
                                             interview.onboarding_status === 'no' ? '❌ NOT ONBOARDED' : '⏳ PENDING'}
                                        </span>
                                    </p>
                                )}
                                {interview.feedback && (
                                    <p><strong>Feedback:</strong> {interview.feedback}</p>
                                )}
                                <p style={{fontSize: '12px', color: '#666'}}>
                                    <strong>Decision Date:</strong> {new Date(interview.decision_date).toLocaleDateString()}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}