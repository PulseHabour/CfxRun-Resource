# CFX Run

A resource that allows you to execute code via CEF DevTools.

Not reccommended for production use, but useful for debugging and development.


## Integration with VSCode Extensions

This resource is designed to be used with the VSCode extension `pulsehabour.cfxrun` that can communicate with the FiveM client through the CEF bridge, which utilizes GitHub Copilot chat tools.

## Usage

This resource is designed to be used with CEF DevTools while developing and debugging. It doesn't provide a visual interface but instead exposes a function that can be used from the DevTools console.


## Security Considerations

This resource allows execution of any native function, which is powerful but potentially dangerous. Only use it in development environments or restrict access in production environments.

## License

MIT License
