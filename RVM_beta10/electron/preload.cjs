const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("rimworldModMaker", {
  saveZip: async (bytes, defaultName) => {
    const serializableBytes = bytes instanceof Uint8Array ? Array.from(bytes) : bytes;
    return ipcRenderer.invoke("dialog:saveZip", {
      bytes: serializableBytes,
      defaultName
    });
  }
});
