// Utility functions
const sendResponse = (response, status, data) => {
  response.send(JSON.stringify({ status, ...data }));
};

const sendError = (response, message) => {
  sendResponse(response, "error", { message });
};

const sendSuccess = (response, result, extra = {}) => {
  sendResponse(response, "success", { result, ...extra });
};

const parseRequestBody = async (request) => {
  if (!request.setDataHandler) return "";

  return new Promise((resolve) => {
    request.setDataHandler((data) => resolve(data));
  });
};

const paths = {
  "/execute": handleExecuteCode,
  "/clientExecute": handleClientExecuteCode,
};

SetHttpHandler(async (request, response) => {
  try {
    if (request.method !== "POST") {
      return sendError(response, "Request must use POST method");
    }

    const handler = paths[request.path || "/"];
    if (handler) {
      await handler(request, response);
    } else {
      sendError(response, `Unknown endpoint: ${request.path}`, {
        availableEndpoints: Object.keys(paths),
      });
    }
  } catch (error) {
    sendError(response, `Server error: ${error.message}`);
  }
});

async function handleExecuteCode(request, response) {
  try {
    const body = await parseRequestBody(request);
    const requestData = JSON.parse(body);

    if (!requestData.code) {
      return sendError(response, "Missing code to execute");
    }

    const code = requestData.code.includes("return")
      ? `(function() { ${requestData.code} })()`
      : requestData.code;

    const result = await eval(code);
    sendSuccess(response, result);
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      return sendError(response, "Invalid JSON in request body");
    }
    sendError(response, `Error executing code: ${parseError.message}`);
  }
}

// Client execution management
const pendingClientRequests = new Map();
let requestIdCounter = 0;

const validateClientRequest = (requestData) => {
  if (!requestData.code) {
    return "Missing code to execute";
  }
  if (!requestData.playerId && requestData.playerId !== 0) {
    return "Missing playerId (source ID) for client execution";
  }

  const timeoutMs = requestData.timeout ? parseInt(requestData.timeout) : 30000;
  if (timeoutMs < 1000 || timeoutMs > 300000) {
    return "Timeout must be between 1000ms (1 second) and 300000ms (5 minutes)";
  }

  const playerId = parseInt(requestData.playerId);
  if (!GetPlayerName(playerId)) {
    return `Player with ID ${playerId} not found or not connected`;
  }

  return null; // No error
};

async function handleClientExecuteCode(request, response) {
  try {
    const body = await parseRequestBody(request);
    const requestData = JSON.parse(body);

    const validationError = validateClientRequest(requestData);
    if (validationError) {
      return sendError(response, validationError);
    }

    const playerId = parseInt(requestData.playerId);
    const timeoutMs = requestData.timeout
      ? parseInt(requestData.timeout)
      : 30000;
    const requestId = `req_${++requestIdCounter}_${Date.now()}`;

    const result = await executeClientCode(
      requestId,
      playerId,
      requestData.code,
      timeoutMs
    );
    sendSuccess(response, result, { playerId, timeoutMs });
  } catch (parseError) {
    if (parseError instanceof SyntaxError) {
      return sendError(response, "Invalid JSON in request body");
    }
    sendError(response, `Error executing client code: ${parseError.message}`);
  }
}

const executeClientCode = (requestId, playerId, code, timeoutMs) => {
  return new Promise((resolve, reject) => {
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

    emitNet("cfxrun:executeClientCode", playerId, { requestId, code });
  });
};

// Event handlers
onNet("cfxrun:clientExecutionResponse", (data) => {
  const { requestId, success, result, error } = data;
  const request = pendingClientRequests.get(requestId);

  if (request) {
    success
      ? request.resolve(result)
      : request.reject(new Error(error || "Unknown client execution error"));
  }
});

on("onClientResourceStart", (resourceName) => {
  if (GetCurrentResourceName() === resourceName) {
    const name = GetCurrentResourceName();
    console.log(name !== "cfxrun" ? `${name} - CfxRun` : "CfxRun");
  }
});
