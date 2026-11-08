export const canReviewIdea=idea=>['submitted','in_review'].includes(idea.status);
export function reviewRequest(idea,action,note){
 if(!canReviewIdea(idea))throw Error('Ideja nije dostupna za ovu odluku.');
 if(!['forward','request_revision'].includes(action))throw Error('Nepoznata odluka.');
 if(action==='request_revision'&&!note.trim())throw Error('Objasnite zaposlenom šta treba dopuniti.');
 return {method:'POST',body:{action,note:note.trim()},headers:idea.updatedAt?{'If-Match':`"${idea.updatedAt}"`}:{}};
}
