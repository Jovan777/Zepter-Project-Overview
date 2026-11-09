// Server-side binding only. Never put the API origin or private access keys in
// analytics or request logs. Cookies remain first-party on the Pages hostname.
export async function proxyBackend({request,env},fetcher=fetch){
 let backend;
 try{backend=new URL(env.BACKEND_ORIGIN);if(backend.protocol!=='https:'||backend.username||backend.password||backend.pathname!=='/'||backend.search||backend.hash||!backend.hostname.endsWith('.onrender.com'))throw Error();}
 catch{return Response.json({error:'API veza nije podešena.'},{status:503,headers:{'Cache-Control':'no-store'}});}
 const incoming=new URL(request.url);
 if(!incoming.pathname.startsWith('/api/')&&!incoming.pathname.startsWith('/socket.io/'))return new Response('Not found',{status:404});
 const destination=new URL(incoming.pathname+incoming.search,backend.origin),headers=new Headers(request.headers);
 headers.delete('host');headers.delete('forwarded');headers.delete('x-forwarded-host');headers.delete('x-forwarded-for');
 const ip=request.headers.get('cf-connecting-ip');if(ip)headers.set('x-forwarded-for',ip);
 try{
  const response=await fetcher(new Request(destination,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual',...(['GET','HEAD'].includes(request.method)?{}:{duplex:'half'})}));
  // Passing the original upgrade response preserves its WebSocket connection.
  if(response.status===101)return response;
  const result=new Response(response.body,response);result.headers.set('Cache-Control','no-store');result.headers.set('Referrer-Policy','no-referrer');return result;
 }catch{return Response.json({error:'Server se pokreće ili trenutno nije dostupan. Pokušajte ponovo.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
