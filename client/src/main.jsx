import React from 'react';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import {registerSW} from 'virtual:pwa-register';
import App from './App.jsx';
import './styles.css';
import './features/workspace/responsive.css';
export function mountApp(presidentEntry,root){
registerSW({immediate:false});
const router=createBrowserRouter([{path:'*',element:<App presidentEntry={presidentEntry}/>}],{basename:presidentEntry?.basename||'/'});
root.render(<RouterProvider router={router}/>);
}
