import React, { useState } from 'react';
import { PopUp } from '../lib/popup';
import { useClosePopUp } from '../lib/popup';
import StyledButton from './StyledButton';

// Theme configuration interface
interface ThemeConfig {
  name: string;
  cssClass: string;
}

interface SettingsPopupProps {
  themes: ThemeConfig[];
  currentTheme: string;
  onThemeChange: (themeName: string) => void;
}

export function SettingsPopup({ themes, currentTheme, onThemeChange }: SettingsPopupProps) {
  const closePopup = useClosePopUp();
  const [selectedTheme, setSelectedTheme] = useState<string>(currentTheme);

  const handleThemeChange = (themeName: string) => {
    setSelectedTheme(themeName);
    onThemeChange(themeName);
  };

  return (
    <PopUp title="Settings">
      <div style={{ padding: '10px 0', width: '100%' }}>
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ 
            margin: '0 0 10px 0', 
            color: 'var(--color-text)',
            fontFamily: 'monospace'
          }}>
            Theme
          </h3>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {themes.map((theme) => (
              <div 
                key={theme.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => handleThemeChange(theme.name)}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '1px solid var(--color-border)',
                  marginRight: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {selectedTheme === theme.name && (
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: 'var(--color-text)',
                    }} />
                  )}
                </div>
                <span style={{ color: 'var(--color-text)' }}>
                  {theme.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end',
          marginTop: '20px'
        }}>
          <StyledButton onClick={closePopup}>
            Close
          </StyledButton>
        </div>
      </div>
    </PopUp>
  );
}

export default SettingsPopup; 