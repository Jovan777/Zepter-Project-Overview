import React from 'react';
import {createRoot} from 'react-dom/client';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import {registerSW} from 'virtual:pwa-register';
import App from './App.jsx';
import {capturePresidentEntry} from './features/president/presidentEntry.js';
import './styles.css';
import './features/workspace/responsive.css';
const presidentEntry=capturePresidentEntry(window.location,window.history);
// A bookmark opened on the same entry page is a fragment navigation, not a document load.
// Reload so every use of the personal link goes through the same capture and authentication.
window.addEventListener('hashchange',()=>{
 if(['/predsednik','/president'].includes(window.location.pathname)&&window.location.hash)window.location.reload();
});
registerSW({immediate:true});
const router=createBrowserRouter([{path:'*',element:<App presidentEntry={presidentEntry}/>}],{basename:presidentEntry?.basename||'/'});
createRoot(document.getElementById('root')).render(<RouterProvider router={router}/>);
