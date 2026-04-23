import React, { useState } from 'react';
import ResultDisplay from './components/ResultDisplay';

function App() {
  const [query, setQuery] = useState("");
  const [schema, setSchema] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Dynamically resolve the backend API URL. 
  // If the user deployed to Render and set VITE_API_URL=https://host.onrender.com, we auto-append /api
  let API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
  if (API_BASE.endsWith('.onrender.com')) {
    API_BASE = `${API_BASE}/api`;
  }
  // Strip trailing slashes to prevent //analyze
  API_BASE = API_BASE.replace(/\/$/, "");

  const loadExample = () => {
    setSchema("CREATE TABLE users (\n  id INT,\n  last_login DATE\n);");
    setQuery("SELECT * FROM users WHERE last_login < '2025-01-01';");
    setError(null);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!query.trim()) {
      setError("Please provide a SQL query to analyze.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          schema: schema.trim() || undefined
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Server rejected the request. Please check your schema/query safety.');
      } else {
        setResult(data.data);
      }
    } catch (err) {
      setError('Network error: Cannot reach the backend server. Make sure the API is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>🩺 QueryDoctor</h1>
      <p className="subtitle">AI Database Performance Assistant</p>

      <div className="input-section">
        <button className="demo-btn" onClick={loadExample}>Try Example</button>
        
        <div className="input-group">
          <label htmlFor="schema">Schema (Optional - CREATE TABLE only)</label>
          <textarea
            id="schema"
            value={schema}
            onChange={(e) => setSchema(e.target.value)}
            placeholder="e.g. CREATE TABLE users (id INT, last_login DATE);"
          />
        </div>

        <div className="input-group">
          <label htmlFor="query">SQL Query (SELECT only)</label>
          <textarea
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. SELECT * FROM users WHERE last_login < '2025-01-01';"
          />
        </div>

        <button 
          className="analyze-btn" 
          onClick={handleAnalyze} 
          disabled={loading || !query.trim()}
        >
          {loading ? 'Analyzing...' : 'Analyze Query'}
        </button>
      </div>

      {loading && <div className="loading">Running HypoPG Simulation & Risk Analysis...</div>}

      {error && <div className="error"><strong>Error:</strong> {error}</div>}

      <ResultDisplay data={result} />
    </div>
  );
}

export default App;
