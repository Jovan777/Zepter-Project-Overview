// Begin waking the API while the browser downloads and parses React. This single
// public GET contains no access key, cookie, user data or business operation.
window.__zepterWakeAt=Date.now();
window.__zepterWake=fetch('/api/ready',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(90000)})
 .then(async response=>response.ok&&(await response.json()).ok===true).catch(()=>false);
