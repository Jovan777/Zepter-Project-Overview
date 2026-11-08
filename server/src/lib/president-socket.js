import jwt from 'jsonwebtoken';
import {User} from '../models/index.js';
import {validPresidentLink} from './auth.js';

// Called only after verifyAccess has authenticated the handshake. No bearer is stored in socket data.
export function bindPresidentSocket(socket,verifiedToken){
 const claims=jwt.decode(verifiedToken);
 if(claims?.pl)socket.data.presidentAccess={id:claims.pl,generation:claims.plg,userId:claims.sub,sessionVersion:claims.sv,expiresAt:claims.exp*1000};
}
export async function presidentSocketAllowed(socket){
 const binding=socket.data?.presidentAccess;if(!binding)return true;
 if(binding.expiresAt<=Date.now())return false;
 try{
  const user=await User.findById(binding.userId);
  return (user?.sessionVersion||0)===(binding.sessionVersion||0)&&await validPresidentLink(binding.id,binding.generation,user);
 }catch{return false;}
}
export async function emitAuthorized(io,room,event,payload){
 if(!io)return;
 try{
  const sockets=await io.in(room).fetchSockets();
  await Promise.all(sockets.map(async socket=>{
   if(await presidentSocketAllowed(socket))socket.emit(event,payload);
   else socket.disconnect(true);
  }));
 }catch{console.warn('Socket obaveštenje trenutno nije isporučeno. Podaci ostaju dostupni kroz API.');}
}
