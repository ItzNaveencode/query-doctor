import React from 'react';

export default function ResultDisplay({ data }) {
  if (!data) return null;

  return (
    <div className="result-container">
      <h2>Analysis Results</h2>
      
      <div className="result-card">
        <h3>Primary Issue</h3>
        <p><strong>Type:</strong> {data.issue}</p>
        <p>{data.reason}</p>
      </div>

      {data.suggestion && (
        <div className="result-card">
          <h3>Suggested Optimization</h3>
          <div className="code-block">{data.suggestion}</div>
        </div>
      )}

      {data.estimated_impact && (
        <div className="result-card">
          <h3>Simulation Impact</h3>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Cost Before</span>
              <span className="metric-value">{data.estimated_impact.before_cost}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Cost After</span>
              <span className="metric-value">{data.estimated_impact.after_cost}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Improvement</span>
              <span className="metric-value">{data.estimated_impact.improvement_factor}x</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Row Waste</span>
              <span className="metric-value">{data.metrics?.waste || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {data.tradeoffs && (
        <div className="result-card">
          <h3>Risk Tradeoffs</h3>
          <div className="metrics-grid">
            <div className="metric-item">
              <span className="metric-label">Write Penalty</span>
              <span className="metric-value">{data.tradeoffs.write_penalty}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Index Quality</span>
              <span className="metric-value">{data.tradeoffs.index_quality}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Storage Estimate</span>
              <span className="metric-value">{data.tradeoffs.storage_estimate}</span>
            </div>
          </div>
        </div>
      )}

      {data.decision && (
        <div className={"decision-box decision-" + data.decision.replace(' ', '')}>
          Verdict: {data.decision}
        </div>
      )}
    </div>
  );
}
