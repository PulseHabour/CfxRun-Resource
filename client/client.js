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

on("onClientResourceStart", (resourceName) => {
	if (GetCurrentResourceName() === resourceName) {
		console.log(GetCurrentResourceName() != "cfxrun" ? `${GetCurrentResourceName()} - CfxRun` : "CfxRun");
	}
});
