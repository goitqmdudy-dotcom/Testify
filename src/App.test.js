import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FirebaseProvider } from './context/FirebaseContext';
import App from './App';

test('renders app without crashing', () => {
  render(
    <BrowserRouter>
      <FirebaseProvider>
        <App />
      </FirebaseProvider>
    </BrowserRouter>
  );
});
