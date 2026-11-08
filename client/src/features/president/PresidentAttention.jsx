import React from 'react';
import {useSearchParams} from 'react-router-dom';
import useEmployeeResource from '../employee/useEmployeeResource.js';
import {EmptyState,ResourceState,Pagination} from '../employee/EmployeeComponents.jsx';
import {AttentionCard} from './PresidentComponents.jsx';
export default function PresidentAttention(){
 const [search,setSearch]=useSearchParams(),resource=useEmployeeResource('/dashboard/president/attention?'+new URLSearchParams({page:search.get('page')||'1',limit:8,...(search.get('sectorId')?{sectorId:search.get('sectorId')}:{})}));
 return <div className="president-attention-page"><div className="president-greeting"><h1>Potrebna vaša pažnja</h1><p>{search.get('sectorId')?'Pitanja i ugroženi rokovi izabranog sektora':'Pitanja i ugroženi rokovi cele kompanije'}</p></div><ResourceState {...resource} onRetry={resource.reload}/>{resource.data?.items.map(item=><AttentionCard key={item.key} item={item}/>)}{resource.data&&!resource.data.total&&<EmptyState icon="check" title="Nema pitanja koja čekaju reakciju"/>}{resource.data&&<Pagination {...resource.data} label="Stranice važnih pitanja" onPage={page=>{const next=new URLSearchParams(search);next.set('page',page);setSearch(next);}}/>}</div>;
}
