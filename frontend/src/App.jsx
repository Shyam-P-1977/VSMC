import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './app/context/ThemeContext';
import { AuthProvider } from './app/context/AuthContext';
import { AppRouter } from './app/router';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRouter />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#04403F',
                color: '#FFFFFF',
                borderRadius: '16px',
                padding: '12px 18px',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 10px 25px -5px rgba(4, 64, 63, 0.3)',
                border: '1px solid rgba(255, 214, 10, 0.2)',
              },
              success: {
                iconTheme: {
                  primary: '#FFD60A',
                  secondary: '#04403F',
                },
              },
              error: {
                style: {
                  background: '#881337',
                  color: '#FFFFFF',
                  border: '1px solid #F43F5E',
                },
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
