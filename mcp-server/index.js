const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const axios = require("axios");

// Configure API base URL
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";

const server = new Server({
  name: "query-doctor-mcp",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// Calculate confidence score based on simulation metrics
function calculateConfidence(estimatedImpact, metrics) {
  if (!estimatedImpact || !metrics) return "LOW";

  const improvement = estimatedImpact.improvement_factor || 0;
  const wasteStr = metrics.waste || "0%";
  const waste = parseFloat(wasteStr.replace("%", ""));

  if (improvement >= 10.0 && waste >= 50.0) {
    return "HIGH";
  } else if (improvement >= 2.0 && waste >= 20.0) {
    return "MEDIUM";
  }
  return "LOW";
}

// Tool Registration
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_slow_queries",
        description: "Fetch the top slow queries currently executing in the PostgreSQL database based on mean execution time.",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "analyze_query",
        description: "Analyze a specific PostgreSQL query for missing indexes, simulate the impact, and generate a recommended safe fix.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The pure SELECT SQL query to analyze."
            },
            schema: {
              type: "string",
              description: "Optional SQL schema (CREATE TABLE statements only) to temporarily mount inside a transaction for analysis."
            }
          },
          required: ["query"]
        }
      }
    ]
  };
});

// Tool Execution Handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_slow_queries") {
      const response = await axios.get(\`\${API_BASE_URL}/queries/slow\`);
      
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
      };
    }

    if (name === "analyze_query") {
      const { query, schema } = args;

      // 1. Strict Safety Validation
      const upperQuery = query.toUpperCase();
      const forbiddenKeywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER'];
      const hasForbidden = forbiddenKeywords.some(keyword => upperQuery.includes(keyword));

      if (hasForbidden) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({ 
              success: false, 
              error: "SAFETY VIOLATION: Query contains destructive keywords (INSERT, UPDATE, DELETE, DROP, ALTER). Only SELECT queries are permitted for analysis." 
            }, null, 2) 
          }],
          isError: true
        };
      }

      // 2. Call QueryDoctor Backend
      const response = await axios.post(`${API_BASE_URL}/analyze`, { query, schema });
      const resultData = response.data.data;

      if (!resultData) {
        return {
          content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }]
        };
      }

      // 3. Inject Confidence Scoring
      const confidence = calculateConfidence(resultData.estimated_impact, resultData.metrics);
      
      const enrichedResult = {
        issue: resultData.issue,
        reason: resultData.reason,
        suggestion: resultData.suggestion,
        metrics: resultData.metrics,
        estimated_impact: resultData.estimated_impact,
        tradeoffs: resultData.tradeoffs,
        decision: resultData.decision,
        confidence: confidence
      };

      return {
        content: [{ type: "text", text: JSON.stringify(enrichedResult, null, 2) }]
      };
    }

    throw new Error(\`Unknown tool: \${name}\`);

  } catch (error) {
    console.error("MCP Tool Execution Error:", error.message);
    return {
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          success: false, 
          error: error.response?.data?.error || error.message 
        }, null, 2) 
      }],
      isError: true
    };
  }
});

// Startup logic
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QueryDoctor MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Fatal Error:", error);
  process.exit(1);
});
