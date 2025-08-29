// test-connection.js
import { config } from "dotenv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

config();

console.log("🔧 Testing MCP Connection...");

// Test basic HTTP connectivity first
async function testHTTPConnection() {
  try {
    console.log("📡 Testing HTTP connectivity to localhost:3001...");
    const response = await fetch("http://localhost:3001/sse");
    console.log("✅ HTTP connection successful");
    console.log("📊 Response status:", response.status);
    console.log(
      "📋 Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    // Don't read the body since it's SSE stream
    response.body?.cancel();
    return true;
  } catch (error) {
    console.log("❌ HTTP connection failed:", error.message);
    return false;
  }
}

// Test MCP connection
async function testMCPConnection() {
  try {
    console.log("🔌 Testing MCP SSE connection...");

    const mcpClient = new Client({
      name: "test-client",
      version: "1.0.0",
    });

    await mcpClient.connect(
      new SSEClientTransport(new URL("http://localhost:3001/sse"))
    );
    console.log("✅ MCP connection successful");

    // Test listing tools
    const tools = await mcpClient.listTools();
    console.log(
      "🛠️  Available tools:",
      tools.tools.map((t) => t.name).join(", ")
    );

    await mcpClient.close();
    console.log("✅ Connection closed successfully");

    return true;
  } catch (error) {
    console.log("❌ MCP connection failed:", error.message);
    console.log("📋 Error details:", error);
    return false;
  }
}

async function runTests() {
  console.log("=" * 50);
  console.log("🧪 Starting Connection Tests");
  console.log("=" * 50);

  // Test 1: Basic HTTP
  const httpOk = await testHTTPConnection();
  if (!httpOk) {
    console.log("\n❌ HTTP test failed. Is the server running?");
    console.log("💡 Try: node index.js (in the server directory)");
    process.exit(1);
  }

  console.log("\n⏳ Waiting 2 seconds before MCP test...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 2: MCP Connection
  const mcpOk = await testMCPConnection();
  if (!mcpOk) {
    console.log("\n❌ MCP test failed.");
    console.log("💡 Check server logs for errors");
    process.exit(1);
  }

  console.log("\n🎉 All tests passed! Your setup is working correctly.");
  console.log("💡 You can now run the main client: node index.js");
  process.exit(0);
}

runTests();
