import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { installBackButton } from './navigation/backHandler';

installBackButton();

// No StrictMode: its double-invoked effects would fire duplicate logins and polling,
// which the React Native app never did.
createRoot(document.getElementById('root')!).render(<App />);
