import { useEffect } from "react";
import { App } from "./App";
import { CurrentPopUp } from "./lib/popup";

export default function BaseApp() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        window.electron.ipcRenderer.send('blur-window');
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []);

  return <>
    <App/>
    <CurrentPopUp/>
  </>
}