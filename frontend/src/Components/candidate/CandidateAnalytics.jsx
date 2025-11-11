import '../landingpage/LandingPage.css';
import './Candidate.css';
import { useState, useEffect } from 'react';
import { httpRequest } from '../../services/http';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

// Enhanced Professional Color Palette  
const COLORS = {
    primary: '#4ea1ff',      // Bright Blue
    success: '#10b981',      // Emerald Green
    warning: '#f59e0b',      // Amber
    danger: '#ef4444',       // Red
    purple: '#8b5cf6',       // Violet
    teal: '#14b8a6',         // Teal
    pink: '#ec4899',         // Pink
    indigo: '#6366f1'        // Indigo
};

const GRADIENT_START = '#667eea';
const GRADIENT_END = '#764ba2';

function CandidateAnalytics() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadAnalytics();
    }, []);

    async function loadAnalytics() {
        try {
            setLoading(true);
            const response = await httpRequest('/candidate/analytics', { method: 'GET' });
            setAnalytics(response);
        } catch (err) {
            setError(err.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading your analytics...</div>;
    }

    if (error) {
        return (
            <div className="profile-section">
                <p style={{color: '#ff9aa2'}}>{error}</p>
            </div>
        );
    }

    const { journey_timeline, application_status, interview_performance, candidate_skills } = analytics;

    // Prepare data for application status pie chart with enhanced colors
    const statusPieData = [
        { name: 'Pending Interviews', value: application_status.pending, color: COLORS.warning },
        { name: 'Offers Received', value: application_status.offers, color: COLORS.success },
        { name: 'Rejected', value: application_status.rejected, color: COLORS.danger }
    ].filter(item => item.value > 0);

    // Prepare timeline data
    const timelineStages = [
        { label: 'Application Submitted', date: journey_timeline.application_date, icon: '📝', completed: true },
        { label: 'Interview Scheduled', date: journey_timeline.first_interview_scheduled, icon: '📅', completed: !!journey_timeline.first_interview_scheduled },
        { label: 'Interview Completed', date: journey_timeline.interview_completed, icon: '✅', completed: !!journey_timeline.interview_completed },
        { label: 'Decision Received', date: journey_timeline.decision_date, icon: journey_timeline.decision === 'accepted' ? '🎉' : '📋', completed: !!journey_timeline.decision_date },
        { label: 'BGV Completed', date: journey_timeline.bgv_completed, icon: '🔍', completed: !!journey_timeline.bgv_completed },
        { label: 'Vendor Process Completed', date: journey_timeline.vendor_completed, icon: '✔️', completed: !!journey_timeline.vendor_completed },
        { label: 'Onboarded', date: journey_timeline.onboarding_date, icon: '🎊', completed: !!journey_timeline.onboarding_date }
    ];

    // Prepare skills radar data (top 5 skills)
    const radarData = candidate_skills.slice(0, 5).map(skill => ({
        skill: skill.length > 15 ? skill.substring(0, 12) + '...' : skill,
        proficiency: 100 // Since we don't have proficiency levels, we'll show 100%
    }));

    return (
        <div>
            <h2 className="lp-hero-title" style={{marginBottom: '24px'}}>🚀 My Career Journey</h2>

            {/* Performance Overview Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <MetricCard
                    title="Total Interviews"
                    value={interview_performance.total_interviews}
                    icon="🎯"
                />
                <MetricCard
                    title="Success Rate"
                    value={`${interview_performance.success_rate}%`}
                    icon="✨"
                />
                <MetricCard
                    title="Pending Applications"
                    value={application_status.pending}
                    icon="⏳"
                />
                <MetricCard
                    title="Offers Received"
                    value={application_status.offers}
                    icon="🎁"
                />
            </div>

            <div className="dashboard-content">
                {/* Journey Timeline */}
                <div className="profile-section">
                    <h3 style={{marginBottom: '24px', color: '#1a2b4b'}}>📍 Your Journey Timeline</h3>
                    <div style={{position: 'relative', paddingLeft: '40px'}}>
                        {/* Vertical Line */}
                        <div style={{
                            position: 'absolute',
                            left: '20px',
                            top: '10px',
                            bottom: '10px',
                            width: '3px',
                            background: 'linear-gradient(to bottom, #4ea1ff, #e9eef7)',
                            borderRadius: '2px'
                        }}></div>

                        {timelineStages.map((stage, index) => (
                            <div key={index} style={{
                                position: 'relative',
                                marginBottom: '32px',
                                paddingLeft: '20px'
                            }}>
                                {/* Timeline Dot */}
                                <div style={{
                                    position: 'absolute',
                                    left: '-28px',
                                    top: '4px',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: stage.completed ? COLORS.primary : '#e9eef7',
                                    border: '3px solid white',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px'
                                }}>
                                    {stage.completed && '✓'}
                                </div>

                                {/* Stage Content */}
                                <div style={{
                                    backgroundColor: stage.completed ? 'rgba(78, 161, 255, 0.05)' : '#f8f9fa',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: `1px solid ${stage.completed ? 'rgba(78, 161, 255, 0.2)' : '#e3e8f0'}`
                                }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                        <span style={{fontSize: '20px'}}>{stage.icon}</span>
                                        <strong style={{color: stage.completed ? '#1a2b4b' : '#7f8c8d'}}>
                                            {stage.label}
                                        </strong>
                                    </div>
                                    {stage.date && (
                                        <div style={{fontSize: '14px', color: '#7f8c8d', marginLeft: '28px'}}>
                                            {new Date(stage.date).toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'long', 
                                                day: 'numeric' 
                                            })}
                                        </div>
                                    )}
                                    {!stage.date && !stage.completed && (
                                        <div style={{fontSize: '14px', color: '#bdc3c7', marginLeft: '28px', fontStyle: 'italic'}}>
                                            Not yet reached
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Application Status */}
                {statusPieData.length > 0 && (
                    <div className="profile-section">
                        <h3 style={{marginBottom: '20px', color: '#1a2b4b'}}>📊 Application Status</h3>
                        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap'}}>
                            <ResponsiveContainer width="60%" height={300} minWidth={300}>
                                <PieChart>
                                    <Pie
                                        data={statusPieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {statusPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{minWidth: '200px'}}>
                                {statusPieData.map((item, index) => (
                                    <div key={index} style={{marginBottom: '12px'}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                            <div style={{
                                                width: '16px', 
                                                height: '16px', 
                                                backgroundColor: item.color, 
                                                borderRadius: '3px'
                                            }}></div>
                                            <strong>{item.name}: {item.value}</strong>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Your Skills Profile */}
                {candidate_skills.length > 0 && (
                    <div className="profile-section">
                        <h3 style={{marginBottom: '20px', color: '#1a2b4b'}}>🔧 Your Skills Profile</h3>
                        
                        {radarData.length >= 3 && (
                            <div style={{marginBottom: '24px'}}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="skill" tick={{fontSize: 12}} />
                                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                                        <Radar 
                                            name="Skills" 
                                            dataKey="proficiency" 
                                            stroke={COLORS.primary} 
                                            fill={COLORS.primary} 
                                            fillOpacity={0.6} 
                                        />
                                        <Legend />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        <div>
                            <strong style={{color: '#1a2b4b', display: 'block', marginBottom: '12px'}}>
                                All Your Skills ({candidate_skills.length}):
                            </strong>
                            <div className="skills-container">
                                {candidate_skills.map((skill, index) => (
                                    <span key={index} className="skill-tag">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Interview Performance */}
                {interview_performance.total_interviews > 0 && (
                    <div className="profile-section">
                        <h3 style={{marginBottom: '20px', color: '#1a2b4b'}}>📈 Interview Performance</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '16px'
                        }}>
                            <div style={{
                                padding: '20px',
                                backgroundColor: 'rgba(78, 161, 255, 0.08)',
                                borderRadius: '12px',
                                border: `2px solid ${COLORS.primary}`,
                                textAlign: 'center'
                            }}>
                                <div style={{fontSize: '14px', color: '#7f8c8d', marginBottom: '8px'}}>
                                    Interviews Completed
                                </div>
                                <div style={{fontSize: '36px', fontWeight: 'bold', color: COLORS.primary}}>
                                    {interview_performance.total_interviews}
                                </div>
                            </div>
                            <div style={{
                                padding: '20px',
                                backgroundColor: interview_performance.success_rate >= 50 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                borderRadius: '12px',
                                border: `2px solid ${interview_performance.success_rate >= 50 ? COLORS.success : COLORS.warning}`,
                                textAlign: 'center'
                            }}>
                                <div style={{fontSize: '14px', color: '#7f8c8d', marginBottom: '8px'}}>
                                    Success Rate
                                </div>
                                <div style={{
                                    fontSize: '36px', 
                                    fontWeight: 'bold', 
                                    color: interview_performance.success_rate >= 50 ? COLORS.success : COLORS.warning
                                }}>
                                    {interview_performance.success_rate}%
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Motivational Message */}
                <div className="profile-section" style={{
                    background: `linear-gradient(135deg, ${GRADIENT_START} 0%, ${GRADIENT_END} 100%)`,
                    color: 'white',
                    textAlign: 'center'
                }}>
                    <h3 style={{color: 'white', marginBottom: '12px'}}>
                        {journey_timeline.onboarding_date ? '🎊 Congratulations!' : '💪 Keep Going!'}
                    </h3>
                    <p style={{fontSize: '16px', lineHeight: '1.6', margin: 0}}>
                        {journey_timeline.onboarding_date 
                            ? 'You have successfully completed your onboarding journey. Welcome aboard!'
                            : journey_timeline.decision === 'accepted'
                            ? 'Great progress! Complete the remaining steps to finish your onboarding.'
                            : application_status.pending > 0
                            ? `You have ${application_status.pending} pending interview${application_status.pending > 1 ? 's' : ''}. Stay prepared and confident!`
                            : 'Your journey starts here. Keep applying and showcasing your amazing skills!'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon }) {
    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid #e3e8f0',
            boxShadow: '0 4px 18px rgba(0,0,0,0.05)'
        }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <div style={{flex: 1}}>
                    <div style={{fontSize: '14px', color: '#7f8c8d', marginBottom: '8px'}}>
                        {title}
                    </div>
                    <div style={{fontSize: '28px', fontWeight: 'bold', color: '#1a2b4b'}}>
                        {value}
                    </div>
                </div>
                <div style={{fontSize: '32px'}}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default CandidateAnalytics;

