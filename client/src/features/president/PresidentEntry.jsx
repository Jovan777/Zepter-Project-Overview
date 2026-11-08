import React from 'react';
export default function PresidentEntry({busy,error,canRetry,onRetry}){
 return <div className="president-entry"><h1>ZEPTER</h1><h2>{busy?'Otvaramo vaš pregled…':'Predsednički pregled'}</h2>{busy?<p role="status">Proveravamo lični pristup.</p>:<><p role={error?'alert':undefined}>{error||'Otvorite svoj lični link da biste pristupili pregledu kompanije.'}</p>{canRetry&&<button className="employee-save-button" onClick={onRetry}>Pokušaj ponovo</button>}{!canRetry&&<p>Za novi ili zamenjen link obratite se administratoru.</p>}</>}</div>;
}
