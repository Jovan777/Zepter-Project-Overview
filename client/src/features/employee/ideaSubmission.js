// Keep the created ID and successful uploads across retries within this form.
// A failed attachment must never trigger a second POST /ideas.
import {uncertainWrite} from '../workspace/mutations.js';
export async function sendIdea(session, {request, draft, files, onCreated = () => {}, onFile = () => {}}) {
  if(session.uncertain)throw Error('Proverite priloge poslate ideje pre novog dodavanja.');
  if (!session.ideaId) {
    const {idea} = await request('/ideas', {method: 'POST', body: {
      title: draft.title.trim(), description: draft.description.trim(), benefit: draft.benefit.trim()
    }});
    session.ideaId = idea._id;
    onCreated(idea._id);
  }
  const failures = [];
  for (const item of files) {
    if (session.uploaded.has(item.id)) continue;
    onFile(item.id, {status: 'uploading'});
    try {
      const body = new FormData(); body.append('file', item.file);
      await request(`/attachments?targetType=idea&targetId=${session.ideaId}`, {method: 'POST', body, isForm: true});
      session.uploaded.add(item.id);
      onFile(item.id, {status: 'done'});
    } catch (error) {
      failures.push(item.id);
      onFile(item.id, {status: 'error', error: error.message});
      if(uncertainWrite(error)){session.uncertain=true;break;}
    }
  }
  return {ideaId: session.ideaId, failures, uncertain:!!session.uncertain};
}
