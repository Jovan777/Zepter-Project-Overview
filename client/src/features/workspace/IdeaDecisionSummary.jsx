import React from 'react';
import {Badge} from '../employee/EmployeeComponents.jsx';
import './idea-decision.css';
export default function IdeaDecisionSummary({idea}){
 if(!['approved','rejected'].includes(idea.status))return null;
 return <section className="idea-final-decision" aria-label="Predsednikova odluka"><h2>Predsednikova odluka</h2><Badge tone={idea.status==='approved'?'success':'warning'}>{idea.status==='approved'?'Ideja je odobrena':'Ideja je odbijena'}</Badge>{idea.decision?.note&&<div><h3>{idea.status==='approved'?'Naredni koraci':'Komentar predsednika'}</h3><p>{idea.decision.note}</p></div>}{idea.status==='rejected'&&<p>Tok ovog predloga je završen.</p>}</section>;
}
