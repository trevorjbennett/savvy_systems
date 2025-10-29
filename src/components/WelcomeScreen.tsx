import { ReactNode } from 'react';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  children: ReactNode;
}

export function WelcomeScreen({ children }: WelcomeScreenProps) {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-header">
          <h1 className="welcome-brand">SAVVY</h1>
          <div className="welcome-line"></div>
          <p className="welcome-tagline">Windows Package Manager</p>
        </div>

        <div className="welcome-search">
          {children}
        </div>

        <div className="welcome-meta">
          <span>Chocolatey</span>
          <span className="meta-separator">×</span>
          <span>Winget</span>
        </div>
      </div>
    </div>
  );
}
