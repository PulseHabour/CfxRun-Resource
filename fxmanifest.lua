fx_version 'cerulean'

author 'PulseHabour'
description 'A resource for executing code via CEF DevTools. Intended for CfxRun via CoPilot chat tools.'
version '1.0.0'
lua54 'yes'
games { 'gta5', 'rdr3' }

client_script 'client/client.js'

server_script 'server/server.js'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/script.js'
}

rdr3_warning 'I acknowledge that this is a prerelease build of RedM, and I am aware my resources *will* become incompatible once RedM ships.'