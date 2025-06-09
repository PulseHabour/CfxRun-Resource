window.executeCode = async function (code) {
	const response = await fetch(
		`https://${GetParentResourceName()}/executeCode`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json; charset=UTF-8",
			},
			body: JSON.stringify({
				code: code,
			}),
		}
	);
	const data = await response.json();
	if (data.status === "success") {
		return data.result;
	} else {
		console.error(`[${getResourceName()}] Error executing code:`, data.message);
		return Promise.reject(data.message);
	}
};

console.log(`[${getResourceName()}] Native execution bridge ready.`);

function getResourceName(){
	return GetParentResourceName() != "cfxrun" ? `${GetParentResourceName()} - CfxRun` : "CfxRun";
}