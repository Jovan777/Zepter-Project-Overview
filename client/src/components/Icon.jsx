import React from 'react';

const shapes = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></>,
  folder: <><path d="M3 7V5a2 2 0 0 1 2-2h5l3 3h6a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 9h18"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/></>,
  message: <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>,
  bulb: <><path d="M9 18h6m-6 3h6m-6-6c0-2-4-3-4-7a7 7 0 0 1 14 0c0 4-4 5-4 7v1H9Z"/></>,
  search: <><circle cx="10.8" cy="10.8" r="7.8"/><path d="m17 17 5 5"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-12 9h12m-8 4h4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v3Z"/></>,
  profile: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="8.5" r="3.2"/><path d="M5 19a7 7 0 0 1 14 0"/></>,
  users: <><circle cx="9" cy="7" r="3.5"/><path d="M2 21v-3a6 6 0 0 1 12 0v3m2-17a3.5 3.5 0 0 1 0 7m2 3a6 6 0 0 1 4 5v2"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  arrow: <path d="M3 12h18m-7-7 7 7-7 7"/>,
  back: <path d="M21 12H3m7-7-7 7 7 7"/>,
  more: <><circle cx="4" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="20" cy="12" r="1"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/></>,
  monitor: <><rect x="2" y="3" width="20" height="14" rx="1.5"/><path d="M8 17v4m8-4v4M1 21h22"/></>,
  activity: <><path d="M2 5h20M2 12h20M2 19h20M7 2v6m10 1v6M9 16v6"/></>,
  close: <path d="m5 5 14 14M19 5 5 19"/>,
  logout: <><path d="M9 3H4v18h5m5-14 5 5-5 5M8 12h13"/></>,
  file: <><path d="M14 2H5v20h14V7Z"/><path d="M14 2v6h5M8 12h8M8 16h8"/></>,
  clip: <path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2a4 4 0 0 1 6 6L8 19a2 2 0 0 1-3-3L15 6"/>,
  send: <><path d="m22 2-7 20-4-9L2 9Z"/><path d="m11 13 11-11"/></>,
  flag: <><path d="M4 22V3m0 1c5-5 10 5 16 0v11c-6 5-11-5-16 0"/></>,
  info: <><circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10h.01"/></>,
  download: <><path d="M12 2v13m-5-5 5 5 5-5M3 17v5h18v-5"/></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
  chart: <><path d="M3 21V11h4v10Zm7 0V6h4v15Zm7 0V2h4v19Z"/></>,
  check: <path d="m4 12 5 5L20 6"/>
};

export default function Icon({name, size = 24, className = ''}) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name] || shapes.folder}</svg>;
}
