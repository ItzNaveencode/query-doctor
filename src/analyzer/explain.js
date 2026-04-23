/**
 * Analyzes the JSON execution plan from Postgres.
 * Recursively searches for problematic nodes like "Seq Scan" with filters.
 */
function detectIssues(planNode) {
  // Base case check for Sequential Scan on a filtered column
  if (planNode['Node Type'] === 'Seq Scan' && planNode['Filter']) {
    
    // Attempt to extract actual or estimated rows
    const rowsReturned = planNode['Actual Rows'] || planNode['Plan Rows'] || 0;
    // Without EXPLAIN ANALYZE, 'Rows Removed by Filter' is missing, so we use a fallback heuristic for MVP if needed
    const rowsRemoved = planNode['Rows Removed by Filter'] || (planNode['Plan Rows'] * 9); 
    const rowsScanned = rowsReturned + rowsRemoved;
    
    let waste = 0;
    if (rowsScanned > 0) {
      waste = Number(((rowsRemoved / rowsScanned) * 100).toFixed(2));
    }

    return {
      type: 'Sequential Scan',
      tableName: planNode['Relation Name'],
      column: extractColumnFromFilter(planNode['Filter']),
      metrics: {
        rowsScanned,
        rowsReturned,
        waste: waste + '%'
      }
    };
  }

  // Recursive check for child nodes
  if (planNode.Plans) {
    for (let child of planNode.Plans) {
      const issue = detectIssues(child);
      if (issue) return issue;
    }
  }

  return null;
}

function extractColumnFromFilter(filterString) {
  // A naive parser for MVP. E.g., Extracts "last_login" from "(last_login < '...')"
  const match = filterString.match(/\(?([a-zA-Z0-9_]+)\s*[=<>&|]/);
  return match ? match[1] : 'unknown_column';
}

module.exports = { detectIssues };
