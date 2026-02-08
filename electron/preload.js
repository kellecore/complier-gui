const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("promptCompiler", {
  compile: (payload) => ipcRenderer.invoke("compile:run", payload),
  cancel: (requestId) => ipcRenderer.invoke("compile:cancel", requestId),
  validate: (payload) => ipcRenderer.invoke("prompt:validate", payload),
  fix: (payload) => ipcRenderer.invoke("prompt:fix", payload),
  onStream: (handler) => {
    const wrapped = (_event, data) => handler(data);
    ipcRenderer.on("compile:stream", wrapped);
    return () => ipcRenderer.removeListener("compile:stream", wrapped);
  },
  onDone: (handler) => {
    const wrapped = (_event, data) => handler(data);
    ipcRenderer.on("compile:done", wrapped);
    return () => ipcRenderer.removeListener("compile:done", wrapped);
  },
  onError: (handler) => {
    const wrapped = (_event, data) => handler(data);
    ipcRenderer.on("compile:error", wrapped);
    return () => ipcRenderer.removeListener("compile:error", wrapped);
  }
});
