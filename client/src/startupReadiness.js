// Only a public readiness GET can be retried. Authentication and writes run once.
export async function waitForBackend({fetcher=fetch,timeoutMs=90000,requestTimeoutMs=15000,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now,signal}={}){
 const deadline=now()+timeoutMs;
 while(now()<deadline){
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(),Math.min(requestTimeoutMs,deadline-now()));
  try{const response=await fetcher('/api/ready',{cache:'no-store',credentials:'omit',signal:controller.signal});if(response.ok&&(await response.json()).ok===true)return true;}
  catch{/* An idle hosting service may return HTML or a gateway error while waking. */}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  if(now()<deadline)await pause(Math.min(1500,deadline-now()));
 }
 throw Error('Server trenutno nije dostupan. Pokušajte ponovo za nekoliko trenutaka.');
}
