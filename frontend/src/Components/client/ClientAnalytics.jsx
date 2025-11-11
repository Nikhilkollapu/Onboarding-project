import React, { useState, useEffect } from 'react';
import { httpRequest } from '../../services/http';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../candidate/Candidate.css';

// Professional color palette (matching HR/Candidate dashboards)
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

const CHART_COLORS = [
    COLORS.primary,
    COLORS.success,
    COLORS.purple,
    COLORS.teal,
    COLORS.pink,
    COLORS.indigo,
    COLORS.warning
];

function ClientAnalytics() {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [timeRange, setTimeRange] = useState('30d');
    const [showCustomRange, setShowCustomRange] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeCustomRange, setActiveCustomRange] = useState(null);

    useEffect(() => {
        loadAnalytics();
    }, []);

    async function loadAnalytics(customStart = null, customEnd = null) {
        setLoading(true);
        setError('');
        
        try {
            let url = `/client/analytics?range=${timeRange}`;
            if (customStart && customEnd) {
                url = `/client/analytics?start_date=${customStart}&end_date=${customEnd}`;
            }
            
            const response = await httpRequest(url, { method: 'GET' });
            setAnalytics(response);
        } catch (err) {
            console.error('Failed to load analytics:', err);
            setError('Failed to load analytics: ' + (err.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    }

    function handleTimeRangeChange(range) {
        setTimeRange(range);
        setShowCustomRange(false);
        setActiveCustomRange(null);
        loadAnalytics();
    }

    function handleCustomRangeApply() {
        if (!startDate || !endDate) {
            setError('Please select both start and end dates');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            setError('Start date must be before end date');
            return;
        }
        
        setActiveCustomRange({ start: startDate, end: endDate });
        loadAnalytics(startDate, endDate);
        setError('');
    }

    function exportToCSV() {
        if (!analytics) return;

        const csvRows = [];
        
        // Header
        csvRows.push('Client Analytics Report');
        csvRows.push(`Generated: ${new Date().toLocaleString()}`);
        csvRows.push(`Time Range: ${timeRange}`);
        csvRows.push('');
        
        // Overview Metrics
        csvRows.push('OVERVIEW METRICS');
        csvRows.push('Metric,Value');
        csvRows.push(`Total Requirements,${analytics.overview?.total_requirements || 0}`);
        csvRows.push(`Candidates in Pipeline,${analytics.overview?.candidates_in_pipeline || 0}`);
        csvRows.push(`Interviews Completed,${analytics.overview?.interviews_completed || 0}`);
        csvRows.push(`Positions Filled,${analytics.overview?.positions_filled || 0}`);
        csvRows.push(`Average Time to Fill (days),${analytics.overview?.avg_time_to_fill || 'N/A'}`);
        csvRows.push(`Success Rate,${analytics.overview?.success_rate || 0}%`);
        csvRows.push('');
        
        // Requirements Over Time
        if (analytics.requirements_over_time?.length > 0) {
            csvRows.push('REQUIREMENTS OVER TIME');
            csvRows.push('Date,Count');
            analytics.requirements_over_time.forEach(item => {
                csvRows.push(`${item.date},${item.count}`);
            });
            csvRows.push('');
        }
        
        // Interview Outcomes
        if (analytics.interview_outcomes?.length > 0) {
            csvRows.push('INTERVIEW OUTCOMES');
            csvRows.push('Status,Count');
            analytics.interview_outcomes.forEach(item => {
                csvRows.push(`${item.status},${item.count}`);
            });
            csvRows.push('');
        }
        
        // Top Skills
        if (analytics.top_skills?.length > 0) {
            csvRows.push('TOP REQUESTED SKILLS');
            csvRows.push('Skill,Count');
            analytics.top_skills.forEach(item => {
                csvRows.push(`${item.skill},${item.count}`);
            });
            csvRows.push('');
        }
        
        // Candidates by Job Title
        if (analytics.candidates_by_job?.length > 0) {
            csvRows.push('CANDIDATES BY JOB TITLE');
            csvRows.push('Job Title,Count');
            analytics.candidates_by_job.forEach(item => {
                csvRows.push(`${item.job_title},${item.count}`);
            });
        }
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `client_analytics_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    if (loading) {
        return <div className="lp-hero-title">Loading analytics...</div>;
    }

    if (error && !analytics) {
        return (
            <div className="profile-section">
                <p style={{ color: COLORS.danger }}>{error}</p>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="profile-section">
                <p>No analytics data available.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <h2 className="lp-hero-title" style={{ margin: 0 }}>📊 Client Analytics Dashboard</h2>
                
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                        className="lp-btn" 
                        onClick={() => handleTimeRangeChange('7d')}
                        style={{ 
                            padding: '8px 16px',
                            backgroundColor: timeRange === '7d' && !activeCustomRange ? COLORS.primary : '#6c8cff',
                            fontSize: '14px'
                        }}
                    >
                        Last 7 Days
                    </button>
                    <button 
                        className="lp-btn" 
                        onClick={() => handleTimeRangeChange('30d')}
                        style={{ 
                            padding: '8px 16px',
                            backgroundColor: timeRange === '30d' && !activeCustomRange ? COLORS.primary : '#6c8cff',
                            fontSize: '14px'
                        }}
                    >
                        Last 30 Days
                    </button>
                    <button 
                        className="lp-btn" 
                        onClick={() => handleTimeRangeChange('90d')}
                        style={{ 
                            padding: '8px 16px',
                            backgroundColor: timeRange === '90d' && !activeCustomRange ? COLORS.primary : '#6c8cff',
                            fontSize: '14px'
                        }}
                    >
                        Last 90 Days
                    </button>
                    <button 
                        className="lp-btn" 
                        onClick={() => setShowCustomRange(!showCustomRange)}
                        style={{ 
                            padding: '8px 16px',
                            backgroundColor: activeCustomRange ? COLORS.primary : '#6c8cff',
                            fontSize: '14px'
                        }}
                    >
                        📅 Custom Range
                    </button>
                    <button 
                        className="lp-btn" 
                        onClick={exportToCSV}
                        style={{ 
                            padding: '8px 16px',
                            backgroundColor: COLORS.success,
                            fontSize: '14px'
                        }}
                    >
                        📥 Export CSV
                    </button>
                </div>
            </div>

            {showCustomRange && (
                <div className="profile-section" style={{ marginBottom: '24px', padding: '16px' }}>
                    <h4 style={{ marginBottom: '12px', color: COLORS.primary }}>Select Custom Date Range</h4>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'end', flexWrap: 'wrap' }}>
                        <label className="cand-field" style={{ margin: 0 }}>
                            Start Date
                            <input 
                                type="date" 
                                className="cand-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                max={endDate || new Date().toISOString().split('T')[0]}
                            />
                        </label>
                        <label className="cand-field" style={{ margin: 0 }}>
                            End Date
                            <input 
                                type="date" 
                                className="cand-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </label>
                        <button 
                            className="lp-btn"
                            onClick={handleCustomRangeApply}
                            disabled={!startDate || !endDate}
                            style={{ 
                                padding: '8px 16px',
                                opacity: (!startDate || !endDate) ? 0.5 : 1,
                                cursor: (!startDate || !endDate) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            Apply Range
                        </button>
                    </div>
                </div>
            )}

            {activeCustomRange && (
                <div style={{ 
                    padding: '12px 16px', 
                    backgroundColor: 'rgba(78, 161, 255, 0.1)',
                    borderLeft: `4px solid ${COLORS.primary}`,
                    marginBottom: '24px',
                    borderRadius: '4px'
                }}>
                    <strong style={{ color: COLORS.primary }}>
                        Showing data from {new Date(activeCustomRange.start).toLocaleDateString()} to {new Date(activeCustomRange.end).toLocaleDateString()}
                    </strong>
                </div>
            )}

            {/* Overview Metrics Cards */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px', 
                marginBottom: '24px' 
            }}>
                <div className="profile-section" style={{ 
                    background: `linear-gradient(135deg, ${COLORS.primary}15 0%, ${COLORS.primary}05 100%)`,
                    border: `1px solid ${COLORS.primary}40`
                }}>
                    <h4 style={{ color: COLORS.primary, fontSize: '14px', marginBottom: '8px' }}>📋 Total Requirements</h4>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0', color: COLORS.primary }}>
                        {analytics.overview?.total_requirements || 0}
                    </p>
                    {analytics.overview?.requirements_change !== undefined && (
                        <p style={{ 
                            fontSize: '14px', 
                            color: analytics.overview.requirements_change >= 0 ? COLORS.success : COLORS.danger,
                            fontWeight: 'bold'
                        }}>
                            {analytics.overview.requirements_change >= 0 ? '▲' : '▼'} 
                            {Math.abs(analytics.overview.requirements_change)}% vs previous period
                        </p>
                    )}
                </div>

                <div className="profile-section" style={{ 
                    background: `linear-gradient(135deg, ${COLORS.purple}15 0%, ${COLORS.purple}05 100%)`,
                    border: `1px solid ${COLORS.purple}40`
                }}>
                    <h4 style={{ color: COLORS.purple, fontSize: '14px', marginBottom: '8px' }}>👥 Candidates in Pipeline</h4>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0', color: COLORS.purple }}>
                        {analytics.overview?.candidates_in_pipeline || 0}
                    </p>
                </div>

                <div className="profile-section" style={{ 
                    background: `linear-gradient(135deg, ${COLORS.teal}15 0%, ${COLORS.teal}05 100%)`,
                    border: `1px solid ${COLORS.teal}40`
                }}>
                    <h4 style={{ color: COLORS.teal, fontSize: '14px', marginBottom: '8px' }}>🎯 Interviews Completed</h4>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0', color: COLORS.teal }}>
                        {analytics.overview?.interviews_completed || 0}
                    </p>
                </div>

                <div className="profile-section" style={{ 
                    background: `linear-gradient(135deg, ${COLORS.success}15 0%, ${COLORS.success}05 100%)`,
                    border: `1px solid ${COLORS.success}40`
                }}>
                    <h4 style={{ color: COLORS.success, fontSize: '14px', marginBottom: '8px' }}>✅ Positions Filled</h4>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0', color: COLORS.success }}>
                        {analytics.overview?.positions_filled || 0}
                    </p>
                </div>

                <div className="profile-section" style={{ 
                    background: `linear-gradient(135deg, ${COLORS.warning}15 0%, ${COLORS.warning}05 100%)`,
                    border: `1px solid ${COLORS.warning}40`
                }}>
                    <h4 style={{ color: COLORS.warning, fontSize: '14px', marginBottom: '8px' }}>⏱️ Avg Time to Fill</h4>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0', color: COLORS.warning }}>
                        {analytics.overview?.avg_time_to_fill ? `${analytics.overview.avg_time_to_fill}d` : 'N/A'}
                    </p>
                </div>

                <div className="profile-section" style={{ 
                    background: `linear-gradient(135deg, ${COLORS.indigo}15 0%, ${COLORS.indigo}05 100%)`,
                    border: `1px solid ${COLORS.indigo}40`
                }}>
                    <h4 style={{ color: COLORS.indigo, fontSize: '14px', marginBottom: '8px' }}>🎉 Success Rate</h4>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0', color: COLORS.indigo }}>
                        {analytics.overview?.success_rate || 0}%
                    </p>
                </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                
                {/* Requirements Over Time */}
                {analytics.requirements_over_time && analytics.requirements_over_time.length > 0 && (
                    <div className="profile-section">
                        <h3 style={{ color: COLORS.primary }}>📈 Requirements Posted Over Time</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.requirements_over_time}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e3e8f0', borderRadius: '8px' }}
                                    formatter={(value) => [`${value} requirements`, 'Count']}
                                />
                                <Bar dataKey="count" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Interview Outcomes */}
                {analytics.interview_outcomes && analytics.interview_outcomes.length > 0 && (
                    <div className="profile-section">
                        <h3 style={{ color: COLORS.primary }}>🎯 Interview Outcomes</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={analytics.interview_outcomes}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={(entry) => `${entry.status}: ${entry.count}`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="count"
                                >
                                    {analytics.interview_outcomes.map((entry, index) => {
                                        let color = COLORS.warning;
                                        if (entry.status === 'Accepted' || entry.status === 'accepted') color = COLORS.success;
                                        if (entry.status === 'Rejected' || entry.status === 'rejected') color = COLORS.danger;
                                        if (entry.status === 'Pending' || entry.status === 'pending') color = COLORS.warning;
                                        return <Cell key={`cell-${index}`} fill={color} />;
                                    })}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e3e8f0', borderRadius: '8px' }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Top Skills Requested */}
                {analytics.top_skills && analytics.top_skills.length > 0 && (
                    <div className="profile-section">
                        <h3 style={{ color: COLORS.primary }}>🔥 Top Skills Requested</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.top_skills} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
                                <XAxis type="number" stroke="#64748b" fontSize={12} />
                                <YAxis dataKey="skill" type="category" stroke="#64748b" fontSize={12} width={100} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e3e8f0', borderRadius: '8px' }}
                                    formatter={(value) => [`${value} times`, 'Count']}
                                />
                                <Bar dataKey="count" fill={COLORS.purple} radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Candidates by Job Title */}
                {analytics.candidates_by_job && analytics.candidates_by_job.length > 0 && (
                    <div className="profile-section">
                        <h3 style={{ color: COLORS.primary }}>👔 Candidates by Job Title</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={analytics.candidates_by_job}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f0" />
                                <XAxis dataKey="job_title" stroke="#64748b" fontSize={12} angle={-45} textAnchor="end" height={100} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e3e8f0', borderRadius: '8px' }}
                                    formatter={(value) => [`${value} candidates`, 'Count']}
                                />
                                <Bar dataKey="count" fill={COLORS.teal} radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Hiring Pipeline Funnel */}
                {analytics.pipeline_funnel && analytics.pipeline_funnel.length > 0 && (
                    <div className="profile-section" style={{ gridColumn: '1 / -1' }}>
                        <h3 style={{ color: COLORS.primary }}>🚀 Hiring Pipeline Funnel</h3>
                        <div style={{ padding: '20px' }}>
                            {analytics.pipeline_funnel.map((stage, index) => {
                                const maxCount = analytics.pipeline_funnel[0]?.count || 1;
                                const widthPercent = (stage.count / maxCount) * 100;
                                const color = CHART_COLORS[index % CHART_COLORS.length];
                                
                                return (
                                    <div key={index} style={{ marginBottom: '16px' }}>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            marginBottom: '4px',
                                            fontSize: '14px',
                                            fontWeight: '500'
                                        }}>
                                            <span>{stage.stage}</span>
                                            <span style={{ color }}>{stage.count}</span>
                                        </div>
                                        <div style={{ 
                                            width: '100%', 
                                            height: '32px', 
                                            backgroundColor: '#f1f5f9',
                                            borderRadius: '8px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{ 
                                                width: `${widthPercent}%`, 
                                                height: '100%', 
                                                backgroundColor: color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                paddingRight: '12px',
                                                color: '#fff',
                                                fontWeight: 'bold',
                                                fontSize: '12px',
                                                transition: 'width 0.5s ease'
                                            }}>
                                                {stage.percentage ? `${stage.percentage}%` : ''}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ClientAnalytics;

