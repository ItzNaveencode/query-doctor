/**
 * Generates actionable, safe CREATE INDEX suggestions.
 */
function generateRecommendation(issue) {
  if (issue.type === 'Sequential Scan' && issue.column !== 'unknown_column') {
    const indexName = "idx_" + issue.tableName + "_" + issue.column;
    
    return {
      sql: "CREATE INDEX CONCURRENTLY " + indexName + " ON " + issue.tableName + " (" + issue.column + ");",
      reason: "Sequential scan detected on table '" + issue.tableName + "'. Creating an index on '" + issue.column + "' allows Postgres to perform a B-Tree Index Scan, which significantly reduces row traversal time."
    };
  }

  return {
    sql: null,
    reason: "Could not generate a specific index recommendation for this issue type."
  };
}

module.exports = { generateRecommendation };
