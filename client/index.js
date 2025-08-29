import { config } from "dotenv";
import readline from "readline/promises";
import { GoogleGenAI } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

config();
let tools = [];
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const mcpClient = new Client({
  name: "example-client",
  version: "1.0.0",
});

const chatHistory = [];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Keep your original connection logic - it was working!
mcpClient
  .connect(new SSEClientTransport(new URL("http://localhost:3001/sse")))
  .then(async () => {
    console.log("Connected to mcp server");

    tools = (await mcpClient.listTools()).tools.map((tool) => {
      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: tool.inputSchema.type,
          properties: tool.inputSchema.properties,
          required: tool.inputSchema.required,
        },
      };
    });

    console.log("Available tools:", tools.map((t) => t.name).join(", "));
    console.log(
      "\n🎉 Now you can create tweets, polls, image posts, auto-image posts, and question posts!"
    );
    console.log(
      "💡 Try: 'Create a poll asking what's the best programming language'"
    );
    console.log("💡 Or: 'Post a tweet about AI'");
    console.log(
      "💡 Or: 'Post a tweet about coding with an image from https://example.com/image.jpg'"
    );
    console.log("💡 Or: 'Post a tweet about coffee with a relevant image'");
    console.log("💡 Or: 'Ask a question about favorite movies with an image'");

    chatLoop();
  });

// Keep your original chatLoop - it was working perfectly!
async function chatLoop(toolCall) {
  if (toolCall) {
    console.log("calling tool ", toolCall.name);

    chatHistory.push({
      role: "model",
      parts: [
        {
          text: `calling tool ${toolCall.name}`,
          type: "text",
        },
      ],
    });

    const toolResult = await mcpClient.callTool({
      name: toolCall.name,
      arguments: toolCall.args,
    });

    chatHistory.push({
      role: "user",
      parts: [
        {
          text: "Tool result : " + toolResult.content[0].text,
          type: "text",
        },
      ],
    });
  } else {
    const question = await rl.question("You: ");
    chatHistory.push({
      role: "user",
      parts: [
        {
          text: question,
          type: "text",
        },
      ],
    });
  }

  // Enhanced system message to help AI understand all posting options
  const systemMessage = {
    role: "user",
    parts: [
      {
        text:
          "You are a helpful assistant that can create tweets, polls, and image posts on Twitter/X. " +
          "When users want to create polls, use the createPoll tool with a question and 2-4 options. " +
          "When they want regular tweets, use createPost. " +
          "When they want to post with a specific image URL, use createPostWithImage. " +
          "When they want to post with a relevant image but don't provide a URL, use createPostWithAutoImage and extract keywords from their request for the search. " +
          "When they want to ask a question with an image (like a poll but with image), use createQuestionWithImage. " +
          "Remember: Twitter doesn't support polls with images, so use createQuestionWithImage as an alternative. " +
          "Be helpful and creative!",
        type: "text",
      },
    ],
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [systemMessage, ...chatHistory],
    config: {
      tools: [
        {
          functionDeclarations: tools,
        },
      ],
    },
  });

  const functionCall = response.candidates[0].content.parts[0].functionCall;
  const responseText = response.candidates[0].content.parts[0].text;

  if (functionCall) {
    return chatLoop(functionCall);
  }

  chatHistory.push({
    role: "model",
    parts: [
      {
        text: responseText,
        type: "text",
      },
    ],
  });

  console.log(`AI: ${responseText}`);

  chatLoop();
}
