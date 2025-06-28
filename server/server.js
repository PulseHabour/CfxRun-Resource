// HTTP endpoint for executing server-side code
SetHttpHandler(async (request, response) => {
  try {
    // Set CORS headers
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });

    // Handle preflight OPTIONS request
    if (request.method === "OPTIONS") {
      response.send("");
      return;
    }

    // Route based on path
    const path = request.path || "/";

    switch (path) {
      case "/execute":
        await handleExecuteCode(request, response);
        break;
      case "/clientExecute":
        await handleClientExecuteCode(request, response);
        break;
      default:
        response.send(
          JSON.stringify({
            status: "error",
            message: `Unknown endpoint: ${path}`,
            availableEndpoints: ["/execute", "/clientExecute"],
          })
        );
        break;
    }
  } catch (error) {
    response.send(
      JSON.stringify({
        status: "error",
        message: `Server error: ${error.message}`,
      })
    );
  }
});

// Handle code execution requests
async function handleExecuteCode(request, response) {
  // Only handle POST requests for code execution
  if (request.method !== "POST") {
    response.send(
      JSON.stringify({
        status: "error",
        message: "Code execution requires POST method",
      })
    );
    return;
  }

  // Parse request body
  const body = request.setDataHandler
    ? await new Promise((resolve) => {
        let data = "";
        request.setDataHandler((chunk) => {
          data += chunk;
        });
        request.setDataHandler(() => {
          resolve(data);
        }, "end");
      })
    : "";

  let requestData;
  try {
    requestData = JSON.parse(body);
  } catch (parseError) {
    response.send(
      JSON.stringify({
        status: "error",
        message: "Invalid JSON in request body",
      })
    );
    return;
  }

  if (!requestData.code) {
    response.send(
      JSON.stringify({
        status: "error",
        message: "Missing code to execute",
      })
    );
    return;
  }

  try {
    let result;
    if (requestData.code.includes("return")) {
      const wrappedCode = `(function() { ${requestData.code} })()`;
      result = await eval(wrappedCode);
    } else {
      result = await eval(requestData.code);
    }

    response.send(
      JSON.stringify({
        status: "success",
        result: result,
      })
    );
  } catch (error) {
    response.send(
      JSON.stringify({
        status: "error",
        message: `Error executing code: ${error.message}`,
      })
    );
  }
}

// Store pending client execution requests
const pendingClientRequests = new Map();
let requestIdCounter = 0;

// Handle client code execution requests
async function handleClientExecuteCode(request, response) {
  // Only handle POST requests for code execution
  if (request.method !== "POST") {
    response.send(
      JSON.stringify({
        status: "error",
        message: "Client code execution requires POST method",
      })
    );
    return;
  }

  // Parse request body
  const body = request.setDataHandler
    ? await new Promise((resolve) => {
        let data = "";
        request.setDataHandler((chunk) => {
          data += chunk;
        });
        request.setDataHandler(() => {
          resolve(data);
        }, "end");
      })
    : "";

  let requestData;
  try {
    requestData = JSON.parse(body);
  } catch (parseError) {
    response.send(
      JSON.stringify({
        status: "error",
        message: "Invalid JSON in request body",
      })
    );
    return;
  }

  if (!requestData.code) {
    response.send(
      JSON.stringify({
        status: "error",
        message: "Missing code to execute",
      })
    );
    return;
  }

  if (!requestData.playerId && requestData.playerId !== 0) {
    response.send(
      JSON.stringify({
        status: "error",
        message: "Missing playerId (source ID) for client execution",
      })
    );
    return;
  }

  const playerId = parseInt(requestData.playerId);
  const timeoutMs = requestData.timeout ? parseInt(requestData.timeout) : 30000; // Default 30 seconds

  // Validate timeout is reasonable (between 1 second and 5 minutes)
  if (timeoutMs < 1000 || timeoutMs > 300000) {
    response.send(
      JSON.stringify({
        status: "error",
        message:
          "Timeout must be between 1000ms (1 second) and 300000ms (5 minutes)",
      })
    );
    return;
  }

  // Validate player exists
  if (!GetPlayerName(playerId)) {
    response.send(
      JSON.stringify({
        status: "error",
        message: `Player with ID ${playerId} not found or not connected`,
      })
    );
    return;
  }

  try {
    // Generate unique request ID
    const requestId = `req_${++requestIdCounter}_${Date.now()}`;

    // Create promise for the response
    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingClientRequests.delete(requestId);
        reject(new Error(`Client execution timeout (${timeoutMs}ms)`));
      }, timeoutMs);

      pendingClientRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timeout);
          pendingClientRequests.delete(requestId);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          pendingClientRequests.delete(requestId);
          reject(error);
        },
      });
    });

    // Send event to client
    emitNet("cfxrun:executeClientCode", playerId, {
      requestId: requestId,
      code: requestData.code,
    });

    // Wait for client response
    const result = await responsePromise;

    response.send(
      JSON.stringify({
        status: "success",
        result: result,
        playerId: playerId,
        timeoutMs: timeoutMs,
      })
    );
  } catch (error) {
    response.send(
      JSON.stringify({
        status: "error",
        message: `Error executing client code: ${error.message}`,
        playerId: playerId,
        timeoutMs: timeoutMs,
      })
    );
  }
}

// Handle client execution responses
onNet("cfxrun:clientExecutionResponse", (data) => {
  const { requestId, success, result, error } = data;

  if (pendingClientRequests.has(requestId)) {
    const { resolve, reject } = pendingClientRequests.get(requestId);

    if (success) {
      resolve(result);
    } else {
      reject(new Error(error || "Unknown client execution error"));
    }
  }
});

on("onClientResourceStart", (resourceName) => {
  if (GetCurrentResourceName() === resourceName) {
    console.log(
      GetCurrentResourceName() != "cfxrun"
        ? `${GetCurrentResourceName()} - CfxRun`
        : "CfxRun"
    );
  }
});
