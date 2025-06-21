// src/components/Icons/icons.tsx
import React from 'react';

export const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    <line x1="11" y1="8" x2="11" y2="14"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

export const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    <line x1="8" y1="11" x2="14" y2="11"></line>
  </svg>
);

// --- NEW --- Save Icon
export const SaveIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
        <polyline points="17 21 17 13 7 13 7 21"></polyline>
        <polyline points="7 3 7 8 15 8"></polyline>
    </svg>
);

// --- NEW --- Eye Icon for showing preview
export const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

// --- NEW --- Minimize Icon
export const MinimizeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

// --- NEW --- Pop-out Icon
export const PopOutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
);

// --- NEW --- Mana Icons
export const WhiteManaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="48" fill="#F8F7F4" stroke="#000" strokeWidth="4"/>
        <path d="M65.5,29c-5.3,0-10.4,2.7-10.4,8.6c0,4.2,3,7.1,5.2,8.6c2.4,1.6,4.7,3,4.7,5.5c0,2.4-2.2,3.9-4.7,3.9c-2.9,0-5-1.6-6.1-3.1 l-7.9,5.7c2.6,3.9,7.3,6.3,13.2,6.3c8.1,0,13.6-4.5,13.6-11.1c0-5-3.3-8.3-5.9-10.1c-2.2-1.5-4.5-2.8-4.5-5.2c0-2,1.6-3.4,4.1-3.4 c2.3,0,4.1,1.1,5.2,2.6l7.8-5.9C74.6,30.8,70.6,29,65.5,29z"/>
    </svg>
);

export const BlueManaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="48" fill="#0E68AB" stroke="#000" strokeWidth="4"/>
        <path d="M50,29c-8.9,0-16.1,7.2-16.1,16.1c0,8.9,7.2,16.1,16.1,16.1s16.1-7.2,16.1-16.1C66.1,36.2,58.9,29,50,29z M50,55.4 c-5.2,0-9.4-4.2-9.4-9.4s4.2-9.4,9.4-9.4s9.4,4.2,9.4,9.4S55.2,55.4,50,55.4z M50,65.5c-5.8,0-10.9-2.3-14.6-6.1l-3.3-3.3l-5,5 c4.9,4.9,11.5,7.9,18.9,7.9s14-3,18.9-7.9l-5-5l-3.3,3.3C60.9,63.2,55.8,65.5,50,65.5z" fill="#fff"/>
    </svg>
);

export const BlackManaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="48" fill="#150807" stroke="#000" strokeWidth="4"/>
        <path d="M50,29.2c-11.4,0-20.8,9.3-20.8,20.8S38.6,70.8,50,70.8s20.8-9.3,20.8-20.8S61.4,29.2,50,29.2z M50,63.5 c-7.4,0-13.5-6-13.5-13.5s6-13.5,13.5-13.5s13.5,6,13.5,13.5S57.4,63.5,50,63.5z" fill="#fff"/>
        <path d="M50,34c-5.4,0-9.8,4.4-9.8,9.8s4.4,9.8,9.8,9.8s9.8-4.4,9.8-9.8S55.4,34,50,34z M50,48.2c-2.4,0-4.4-2-4.4-4.4 s2-4.4,4.4-4.4s4.4,2,4.4,4.4S52.4,48.2,50,48.2z" fill="#fff"/>
    </svg>
);

export const RedManaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="48" fill="#D3202A" stroke="#000" strokeWidth="4"/>
        <path d="M50,29.2c-10.8,0-19.6,8.8-19.6,19.6c0,6.2,2.9,11.8,7.4,15.3l-9.1,9.1l5.7,5.7l9.1-9.1c3.5,4.5,9.1,7.4,15.3,7.4 c10.8,0,19.6-8.8,19.6-19.6S60.8,29.2,50,29.2z M50,62.8c-7,0-12.8-5.7-12.8-12.8s5.7-12.8,12.8-12.8s12.8,5.7,12.8,12.8 S57,62.8,50,62.8z" fill="#fff"/>
    </svg>
);

export const GreenManaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="48" fill="#00733E" stroke="#000" strokeWidth="4"/>
        <path d="M50,29c-11.6,0-21,9.4-21,21s9.4,21,21,21s21-9.4,21-21S61.6,29,50,29z M50,65.2c-8.4,0-15.2-6.8-15.2-15.2 S41.6,34.8,50,34.8s15.2,6.8,15.2,15.2S58.4,65.2,50,65.2z M50,38.5c-6.3,0-11.5,5.2-11.5,11.5s5.2,11.5,11.5,11.5 s11.5-5.2,11.5-11.5S56.3,38.5,50,38.5z" fill="#fff"/>
    </svg>
);

export const ColorlessManaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="50" cy="50" r="48" fill="#CBC5C3" stroke="#000" strokeWidth="4"/>
        <path d="M50,29.2L29.2,50L50,70.8L70.8,50L50,29.2z M50,62.5L37.5,50L50,37.5L62.5,50L50,62.5z"/>
    </svg>
);

