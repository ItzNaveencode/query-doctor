const monitor = require('../db_monitor/monitor');

// Mock data values for MVP if DB is not fully seeded with pg_stats
const MOCK_STATS = {
  n_live_tup: 500000,
  n_tup_ins: 10000,
  n_tup_upd: 50000,
  n_tup_del: 5000,
  n_distinct: 100000,
  avg_col_width: 16
};

async function estimate_write_penalty(table, client = monitor.pool) {
  if (!client) return getMockWritePenalty();

  try {
    const query = `
      SELECT n_tup_ins, n_tup_upd, n_tup_del, n_live_tup
      FROM pg_stat_user_tables
      WHERE relname = $1
    `;
    const res = await client.query(query, [table]);
    
    if (res.rows.length === 0) return getMockWritePenalty();
    
    const stats = res.rows[0];
    const totalWrites = parseInt(stats.n_tup_ins || 0) + parseInt(stats.n_tup_upd || 0) + parseInt(stats.n_tup_del || 0);
    const liveRows = parseInt(stats.n_live_tup || 0);
    
    if (liveRows === 0) return "LOW";

    const writeRatio = totalWrites / liveRows;
    
    if (writeRatio > 0.5) return "HIGH";
    if (writeRatio > 0.1) return "MEDIUM";
    return "LOW";
  } catch (error) {
    console.warn('Could not fetch write penalty stats. Using mock.', error.message);
    return getMockWritePenalty();
  }
}

async function calculate_selectivity(table, column, client = monitor.pool) {
  if (!client) return getMockSelectivity();

  try {
    const query = `
      SELECT n_distinct
      FROM pg_stats
      WHERE tablename = $1 AND attname = $2
    `;
    const res = await client.query(query, [table, column]);
    
    if (res.rows.length === 0) return getMockSelectivity();
    
    let n_distinct = parseFloat(res.rows[0].n_distinct || 0);
    
    // Postgres pg_stats represents n_distinct < 0 as a percentage of total rows
    if (n_distinct < 0) {
      n_distinct = Math.abs(n_distinct);
    } else {
      // Need live rows to calculate ratio
      const rowsRes = await client.query('SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = $1', [table]);
      const liveRows = rowsRes.rows.length > 0 ? parseFloat(rowsRes.rows[0].n_live_tup || 1) : MOCK_STATS.n_live_tup;
      if (liveRows === 0) return 1.0;
      n_distinct = n_distinct / liveRows;
    }
    
    return n_distinct;
  } catch (error) {
    console.warn('Could not fetch selectivity stats. Using mock.', error.message);
    return getMockSelectivity();
  }
}

async function estimate_index_size(table, column, client = monitor.pool) {
  // Rough estimation: (avg_col_width + 8 bytes for overhead) * rows
  if (!client) return "24 MB";

  try {
    const query = `
      SELECT s.avg_width, t.n_live_tup
      FROM pg_stats s
      JOIN pg_stat_user_tables t ON s.tablename = t.relname
      WHERE s.tablename = $1 AND s.attname = $2
    `;
    const res = await client.query(query, [table, column]);
    if (res.rows.length === 0) return "24 MB";

    const avgWidth = parseInt(res.rows[0].avg_width || 4);
    const liveRows = parseInt(res.rows[0].n_live_tup || 0);
    
    const estimatedBytes = (avgWidth + 8) * liveRows;
    const mb = estimatedBytes / (1024 * 1024);
    
    return mb.toFixed(2) + " MB";
  } catch (error) {
    console.warn('Could not fetch index size stats. Using mock.', error.message);
    return "24 MB";
  }
}

function getDecision(improvementFactor, wasteStr, selectivity) {
  const waste = parseFloat(wasteStr.replace('%', ''));
  
  if (improvementFactor > 5.0 && waste > 50.0 && selectivity > 0.05) {
    return "RECOMMENDED";
  } else if (improvementFactor > 1.5 && selectivity > 0.01) {
    return "CAUTION";
  } else {
    return "NOT ADVISED";
  }
}

function getIndexQuality(selectivity) {
  if (selectivity > 0.1) return "HIGH";
  if (selectivity > 0.01) return "MEDIUM";
  return "LOW";
}

async function analyzeRisk(table, column, estimatedImpact, metrics, client = monitor.pool) {
  const write_penalty = await estimate_write_penalty(table, client);
  const selectivity = await calculate_selectivity(table, column, client);
  const storage_estimate = await estimate_index_size(table, column, client);
  
  const index_quality = getIndexQuality(selectivity);
  
  const improvementFactor = estimatedImpact ? estimatedImpact.improvement_factor : 1.0;
  const waste = metrics ? metrics.waste : "0%";
  
  const decision = getDecision(improvementFactor, waste, selectivity);

  return {
    tradeoffs: {
      write_penalty,
      index_quality,
      storage_estimate
    },
    decision
  };
}

// Mocks
function getMockWritePenalty() { return "MEDIUM"; }
function getMockSelectivity() { return 0.2; }

module.exports = {
  analyzeRisk
};
