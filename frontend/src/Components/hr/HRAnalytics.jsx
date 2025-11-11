import '../landingpage/LandingPage.css';
import '../candidate/Candidate.css';
import { useState, useEffect } from 'react';
import { httpRequest } from '../../services/http';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
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
    indigo: '#6366f1',       // Indigo
    lime: '#84cc16',         // Lime
    orange: '#f97316'        // Orange
};

const CHART_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.purple, COLORS.teal];
const GRADIENT_START = '#667eea';
const GRADIENT_END = '#764ba2';

function HRAnalytics() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeRange, setTimeRange] = useState('30d');
    const [showCustomRange, setShowCustomRange] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const exportToCSV = () => {
        if (!analytics) return;

        const csvData = [];
        csvData.push(['HR Recruitment Analytics Report']);
        csvData.push(['Generated on:', new Date().toLocaleDateString()]);
        csvData.push([]);
        
        // Overview Metrics
        csvData.push(['Overview Metrics']);
        csvData.push(['Applications This Week', analytics.overview_metrics.applications_this_week]);
        csvData.push(['Success Rate', `${analytics.overview_metrics.success_rate}%`]);
        csvData.push(['Average Time to Hire', `${analytics.overview_metrics.avg_time_to_hire} days`]);
        csvData.push(['Active Positions', analytics.overview_metrics.active_positions]);
        csvData.push([]);
        
        // Interview Outcomes
        csvData.push(['Interview Outcomes']);
        csvData.push(['Selected', analytics.interview_outcomes.accepted]);
        csvData.push(['Rejected', analytics.interview_outcomes.rejected]);
        csvData.push(['Pending', analytics.interview_outcomes.pending]);
        csvData.push([]);
        
        // Hiring Funnel
        csvData.push(['Hiring Funnel']);
        csvData.push(['Stage', 'Count']);
        csvData.push(['Applications', analytics.hiring_funnel.applications]);
        csvData.push(['Shortlisted', analytics.hiring_funnel.shortlisted]);
        csvData.push(['Scheduled', analytics.hiring_funnel.scheduled]);
        csvData.push(['Interviewed', analytics.hiring_funnel.interviewed]);
        csvData.push(['Selected', analytics.hiring_funnel.selected]);
        csvData.push(['Onboarded', analytics.hiring_funnel.onboarded]);
        csvData.push([]);
        
        // Top Skills
        csvData.push(['Top Skills']);
        csvData.push(['Skill', 'Count']);
        analytics.top_skills.forEach(skill => {
            csvData.push([skill.skill, skill.count]);
        });
        
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `HR_Analytics_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const applyCustomRange = () => {
        if (startDate && endDate) {
            setTimeRange('custom');
            loadAnalytics();
        }
    };

    const resetToPreset = (range) => {
        setTimeRange(range);
        setShowCustomRange(false);
        setStartDate('');
        setEndDate('');
    };

    useEffect(() => {
        if (timeRange !== 'custom') {
            loadAnalytics();
        }
    }, [timeRange]);

    async function loadAnalytics() {
        try {
            setLoading(true);
            
            // Build query parameters
            let queryParams = `?range=${timeRange}`;
            if (timeRange === 'custom' && startDate && endDate) {
                queryParams += `&start_date=${startDate}&end_date=${endDate}`;
            }
            
            const response = await httpRequest(`/hr/analytics${queryParams}`, { method: 'GET' });
            setAnalytics(response);
        } catch (err) {
            setError(err.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="lp-hero-title">Loading analytics...</div>;
    }

    if (error) {
        return (
            <div className="profile-section">
                <p style={{color: '#ff9aa2'}}>{error}</p>
            </div>
        );
    }

    const { overview_metrics, applicants_over_time, interview_outcomes, service_line_breakdown, hiring_funnel, top_skills } = analytics;

    // Prepare data for charts with enhanced colors
    const outcomesPieData = [
        { name: 'Selected', value: interview_outcomes.accepted, color: COLORS.success },
        { name: 'Rejected', value: interview_outcomes.rejected, color: COLORS.danger },
        { name: 'Pending', value: interview_outcomes.pending, color: COLORS.warning }
    ];

    const funnelData = [
        { name: 'Applications', value: hiring_funnel.applications, percentage: 100 },
        { name: 'Shortlisted', value: hiring_funnel.shortlisted, percentage: (hiring_funnel.shortlisted / hiring_funnel.applications * 100).toFixed(1) },
        { name: 'Scheduled', value: hiring_funnel.scheduled, percentage: (hiring_funnel.scheduled / hiring_funnel.applications * 100).toFixed(1) },
        { name: 'Interviewed', value: hiring_funnel.interviewed, percentage: (hiring_funnel.interviewed / hiring_funnel.applications * 100).toFixed(1) },
        { name: 'Selected', value: hiring_funnel.selected, percentage: (hiring_funnel.selected / hiring_funnel.applications * 100).toFixed(1) },
        { name: 'Onboarded', value: hiring_funnel.onboarded, percentage: (hiring_funnel.onboarded / hiring_funnel.applications * 100).toFixed(1) }
    ];

    return (
        <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px'}}>
                <h2 className="lp-hero-title" style={{margin: 0}}>📊 Recruitment Analytics</h2>
                <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center'}}>
                    <button 
                        className={`lp-nav-btn ${timeRange === '7d' ? 'lp-nav-btn-primary' : ''}`}
                        onClick={() => resetToPreset('7d')}
                        style={{padding: '8px 16px', fontSize: '14px'}}
                    >
                        Last 7 Days
                    </button>
                    <button 
                        className={`lp-nav-btn ${timeRange === '30d' ? 'lp-nav-btn-primary' : ''}`}
                        onClick={() => resetToPreset('30d')}
                        style={{padding: '8px 16px', fontSize: '14px'}}
                    >
                        Last 30 Days
                    </button>
                    <button 
                        className={`lp-nav-btn ${timeRange === '90d' ? 'lp-nav-btn-primary' : ''}`}
                        onClick={() => resetToPreset('90d')}
                        style={{padding: '8px 16px', fontSize: '14px'}}
                    >
                        Last 90 Days
                    </button>
                    <button 
                        className={`lp-nav-btn ${showCustomRange ? 'lp-nav-btn-primary' : ''}`}
                        onClick={() => setShowCustomRange(!showCustomRange)}
                        style={{padding: '8px 16px', fontSize: '14px'}}
                    >
                        📅 Custom Range
                    </button>
                    <button 
                        className="lp-btn"
                        onClick={exportToCSV}
                        style={{padding: '8px 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px'}}
                    >
                        📥 Export CSV
                    </button>
                </div>
            </div>

            {/* Custom Date Range Picker */}
            {showCustomRange && (
                <div className="profile-section" style={{marginBottom: '24px', padding: '20px'}}>
                    <h3 style={{marginBottom: '16px', color: '#1a2b4b', fontSize: '18px'}}>📅 Select Custom Date Range</h3>
                    <div style={{display: 'grid', gridTemplateColumns: 'auto auto auto', gap: '16px', alignItems: 'end', maxWidth: '700px'}}>
                        <div>
                            <label style={{display: 'block', marginBottom: '8px', fontWeight: '500', color: '#445168'}}>
                                Start Date
                            </label>
                            <input 
                                type="date"
                                className="cand-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                max={endDate || new Date().toISOString().split('T')[0]}
                                style={{padding: '10px'}}
                            />
                        </div>
                        <div>
                            <label style={{display: 'block', marginBottom: '8px', fontWeight: '500', color: '#445168'}}>
                                End Date
                            </label>
                            <input 
                                type="date"
                                className="cand-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                max={new Date().toISOString().split('T')[0]}
                                style={{padding: '10px'}}
                            />
                        </div>
                        <button 
                            className="lp-btn"
                            onClick={applyCustomRange}
                            disabled={!startDate || !endDate}
                            style={{padding: '10px 24px', fontSize: '14px'}}
                        >
                            Apply Range
                        </button>
                    </div>
                    {timeRange === 'custom' && startDate && endDate && (
                        <div style={{marginTop: '12px', padding: '12px', backgroundColor: '#e7f3ff', borderRadius: '8px', border: '1px solid #4ea1ff'}}>
                            <strong style={{color: COLORS.primary}}>
                                Showing data from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
                            </strong>
                        </div>
                    )}
                </div>
            )}

            {/* Overview Metrics Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <MetricCard
                    title="Applications This Week"
                    value={overview_metrics.applications_this_week}
                    change={overview_metrics.applications_change}
                    icon="📊"
                />
                <MetricCard
                    title="Success Rate"
                    value={`${overview_metrics.success_rate}%`}
                    icon="✅"
                />
                <MetricCard
                    title="Avg Time to Hire"
                    value={`${overview_metrics.avg_time_to_hire} days`}
                    icon="⏱️"
                />
                <MetricCard
                    title="Active Positions"
                    value={overview_metrics.active_positions}
                    icon="💼"
                />
            </div>

            {/* Charts Grid */}
            <div className="dashboard-content">
                {/* Applicants Over Time */}
                <div className="profile-section">
                    <h3 style={{marginBottom: '20px', color: '#1a2b4b'}}>📈 Applications Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={applicants_over_time}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                                dataKey="date" 
                                tick={{fontSize: 12}}
                                tickFormatter={(date) => {
                                    const d = new Date(date);
                                    return `${d.getMonth() + 1}/${d.getDate()}`;
                                }}
                            />
                            <YAxis />
                            <Tooltip 
                                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                            />
                            <Legend />
                            <Bar dataKey="count" fill={COLORS.primary} name="Applications" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Interview Outcomes */}
                <div className="profile-section">
                    <h3 style={{marginBottom: '20px', color: '#1a2b4b'}}>🎯 Interview Outcomes</h3>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-around'}}>
                        <ResponsiveContainer width="60%" height={300}>
                            <PieChart>
                                <Pie
                                    data={outcomesPieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {outcomesPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{width: '35%'}}>
                            <div style={{marginBottom: '12px'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                    <div style={{width: '16px', height: '16px', backgroundColor: '#4CAF50', borderRadius: '3px'}}></div>
                                    <strong>Selected: {interview_outcomes.accepted}</strong>
                                </div>
                            </div>
                            <div style={{marginBottom: '12px'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                    <div style={{width: '16px', height: '16px', backgroundColor: '#f44336', borderRadius: '3px'}}></div>
                                    <strong>Rejected: {interview_outcomes.rejected}</strong>
                                </div>
                            </div>
                            <div>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                    <div style={{width: '16px', height: '16px', backgroundColor: '#ff9800', borderRadius: '3px'}}></div>
                                    <strong>Pending: {interview_outcomes.pending}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Service Line Breakdown */}
                <div className="profile-section">
                    <h3 style={{marginBottom: '20px', color: '#1a2b4b'}}>📋 Interviews by Job Title</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={service_line_breakdown} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="title" type="category" width={150} tick={{fontSize: 11}} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill={COLORS.success} name="Interviews" radius={[0, 8, 8, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Hiring Funnel */}
                <div className="profile-section">
                    <h3 style={{marginBottom: '20px', color: '#1a2b4b'}}>🔄 Hiring Funnel</h3>
                    <div style={{padding: '20px 0'}}>
                        {funnelData.map((stage, index) => (
                            <div key={stage.name} style={{marginBottom: '16px'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                                    <strong>{stage.name}</strong>
                                    <span style={{color: '#666'}}>
                                        {stage.value} candidates ({stage.percentage}%)
                                    </span>
                                </div>
                                <div style={{
                                    height: '40px',
                                    backgroundColor: '#e9eef7',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${stage.percentage}%`,
                                        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        transition: 'width 0.5s ease'
                                    }}>
                                        {stage.percentage > 10 && `${stage.percentage}%`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Skills */}
                <div className="profile-section">
                    <h3 style={{marginBottom: '20px', color: '#1a2b4b'}}>🔧 Top Skills in Demand</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={top_skills} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="skill" type="category" width={120} tick={{fontSize: 12}} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill={COLORS.purple} name="Job Postings" radius={[0, 8, 8, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, change, icon }) {
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
                    {change !== undefined && (
                        <div style={{
                            fontSize: '12px',
                            color: change >= 0 ? COLORS.success : COLORS.danger,
                            marginTop: '4px',
                            fontWeight: '600'
                        }}>
                            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last week
                        </div>
                    )}
                </div>
                <div style={{fontSize: '32px'}}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default HRAnalytics;

