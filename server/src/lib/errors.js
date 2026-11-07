import {ZodError} from 'zod';
export class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
export const fail=(status,message)=>{throw new HttpError(status,message);};
export function errorHandler(err,req,res,next){
 if(res.headersSent)return next(err);
 if(err instanceof ZodError)return res.status(422).json({error:'Neispravan unos.',details:err.issues.map(x=>({path:x.path.join('.'),message:x.message}))});
 if(err.code===11000)return res.status(409).json({error:'Podatak već postoji.'});
 if(err.name==='ValidationError'||err.name==='CastError')return res.status(422).json({error:'Neispravan format podataka.'});
 if(err.code==='LIMIT_FILE_SIZE')return res.status(413).json({error:'Prilog je prevelik.'});
 if(err.status)return res.status(err.status).json({error:err.message});
 console.error('[SERVER ERROR]',err);
 return res.status(500).json({error:'Došlo je do greške na serveru.'});
}
