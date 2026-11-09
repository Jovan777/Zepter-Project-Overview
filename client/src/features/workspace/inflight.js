// Share only overlapping reads. No resolved data, token or response cache is kept.
export function createInflightReads(){
 const requests=new Map();let generation=0;
 return {clear(){generation++;requests.clear();},read(key,load,signal){
  if(signal?.aborted)return Promise.reject(new DOMException('Aborted','AbortError'));
  const identity=generation+':'+key;let entry=requests.get(identity);
  if(!entry){
   const controller=new AbortController();entry={controller,subscribers:0};requests.set(identity,entry);
   let pending;try{pending=Promise.resolve(load(controller.signal));}catch(error){pending=Promise.reject(error);}
   entry.promise=pending.finally(()=>{if(requests.get(identity)===entry)requests.delete(identity);});
  }
  entry.subscribers++;
  return new Promise((resolve,reject)=>{
   let finished=false;
   const done=(fn,value)=>{if(finished)return;finished=true;signal?.removeEventListener('abort',abort);entry.subscribers--;if(!entry.subscribers&&requests.get(identity)===entry){requests.delete(identity);entry.controller.abort();}fn(value);};
   const abort=()=>done(reject,new DOMException('Aborted','AbortError'));signal?.addEventListener('abort',abort,{once:true});
   entry.promise.then(value=>done(resolve,value),error=>done(reject,error));
  });
 }};
}
