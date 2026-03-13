
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

window.addEventListener('unhandledrejection', (event) => {
  if (
    event.reason && 
    (
      (typeof event.reason === 'string' && event.reason.includes('MetaMask')) ||
      (event.reason.message && event.reason.message.includes('MetaMask'))
    )
  ) {
    event.preventDefault();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
