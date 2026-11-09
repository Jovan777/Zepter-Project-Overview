let timer;
export function scheduleDataEvent(name='zepter:data-changed'){
 if(name!=='zepter:data-changed'){window.dispatchEvent(new Event(name));return;}
 clearTimeout(timer);timer=setTimeout(()=>{timer=null;window.dispatchEvent(new Event(name));},120);
}
