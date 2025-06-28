// NUI callback for direct client execution via CEF
RegisterNuiCallbackType("executeCode");
on("__cfx_nui:executeCode", async (data, cb) => {
  try {
    if (!data.code) {
      cb({ status: "error", message: "Missing code to execute" });
      return;
    }

    let result;
    if (data.code.includes("return")) {
      const wrappedCode = `(function() { ${data.code} })()`;
      result = await eval(wrappedCode);
    } else {
      result = await eval(data.code);
    }

    cb({ status: "success", result: result });
  } catch (error) {
    cb({
      status: "error",
      message: `Error executing code: ${error.message}`,
    });
  }
});

// Handle client code execution requests from server
onNet("cfxrun:executeClientCode", async (data) => {
  const { requestId, code } = data;

  try {
    if (!code) {
      emitNet("cfxrun:clientExecutionResponse", {
        requestId: requestId,
        success: false,
        error: "Missing code to execute",
      });
      return;
    }

    let result;
    if (code.includes("return")) {
      const wrappedCode = `(function() { ${code} })()`;
      result = await eval(wrappedCode);
    } else {
      result = await eval(code);
    }

    emitNet("cfxrun:clientExecutionResponse", {
      requestId: requestId,
      success: true,
      result: result,
    });
  } catch (error) {
    emitNet("cfxrun:clientExecutionResponse", {
      requestId: requestId,
      success: false,
      error: error.message,
    });
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
