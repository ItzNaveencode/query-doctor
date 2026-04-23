const express = require('express');
const router = express.Router();
const monitor = require('../db_monitor/monitor');
const analyzer = require('../analyzer/explain');
const recommender = require('../recommender/index_gen');

// GET /queries/slow -> returns slow queries list
router.get('/queries/slow', async (req, res) => {
  try {
    const slowQueries = await monitor.getSlowQueries();
    res.json({ success: true, data: slowQueries });
  } catch (error) {
    console.error('Error fetching slow queries:', error);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

// POST /analyze -> Analyze a specific query execution plan
router.post('/analyze', async (req, res) => {
  const { query, schema } = req.body;
  
  if (!query) {
    return res.status(400).json({ success: false, error: 'SQL query is required' });
  }

  let client = monitor.pool;
  let isTransaction = false;

  try {
    if (schema) {
      // Validate schema
      const upperSchema = schema.toUpperCase();
      const forbidden = ['INSERT ', 'UPDATE ', 'DELETE ', 'DROP ', 'ALTER '];
      if (forbidden.some(kw => upperSchema.includes(kw))) {
         return res.status(400).json({ success: false, error: 'Unsafe schema: Only CREATE TABLE allowed.'});
      }
      
      const statements = schema.split(';').filter(s => s.trim().length > 0);
      if (statements.length > 1) {
         return res.status(400).json({ success: false, error: 'Unsafe schema: Multiple statements not allowed.'});
      }
      if (!upperSchema.includes('CREATE TABLE')) {
         return res.status(400).json({ success: false, error: 'Unsafe schema: Must contain CREATE TABLE.'});
      }

      if (monitor.pool) {
        client = await monitor.pool.connect();
        isTransaction = true;
        await client.query('BEGIN');
        await client.query(schema);
      }
    }

    // 1. Get execution plan via EXPLAIN ANALYZE
    const plan = await monitor.getExecutionPlan(query, client);
    
    // 2. Detect issues (e.g., Sequential Scan)
    const issue = analyzer.detectIssues(plan);
    
    if (!issue) {
      if (isTransaction) { await client.query('ROLLBACK'); client.release(); }
      return res.json({ 
        success: true, 
        data: { issue: 'No major issues detected', suggestion: null, reason: 'Index usage is optimal' } 
      });
    }

    // 3. Generate recommendation based on issue
    const recommendation = recommender.generateRecommendation(issue);

    // 4. Simulate the recommended index using HypoPG
    let simulationResult = null;
    let riskAnalysis = null;
    if (recommendation.sql) {
      const simulator = require('../simulator/hypopg');
      simulationResult = await simulator.simulateIndex(query, recommendation.sql, client);
      
      // 5. Run Risk and Tradeoff Evaluation
      const riskAnalyzer = require('../recommender/riskAnalyzer');
      // Pass table and column parsed from issue
      riskAnalysis = await riskAnalyzer.analyzeRisk(
        issue.tableName, 
        issue.column, 
        simulationResult, 
        issue.metrics,
        client
      );
    }

    if (isTransaction) {
      await client.query('ROLLBACK');
      client.release();
    }

    res.json({
      success: true,
      data: {
        issue: issue.type,
        reason: recommendation.reason,
        suggestion: recommendation.sql,
        metrics: issue.metrics,
        estimated_impact: simulationResult,
        tradeoffs: riskAnalysis ? riskAnalysis.tradeoffs : null,
        decision: riskAnalysis ? riskAnalysis.decision : null
      }
    });
  } catch (error) {
    console.error('Error analyzing query:', error);
    if (isTransaction && client && typeof client.query === 'function') {
      try { await client.query('ROLLBACK'); } catch(e){}
      client.release();
    }
    res.status(500).json({ success: false, error: error.message || 'Analysis failed' });
  }
});

module.exports = router;
