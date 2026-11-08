import {notificationDestination} from '../employee/notifications.js';
export const managerNotificationTabs=[['all','Sva'],['president','Komentari predsednika'],['employees','Odgovori zaposlenih'],['projects','Projekti'],['ideas','Ideje']];
export const managerNotificationIcon=item=>item.actor?.role==='president'&&['comment','instruction'].includes(item.type)?'crown':item.type.includes('late')||item.type.includes('overdue')?'warning':item.type==='comment'?'message':item.link?.startsWith('/ideas/')?'bulb':item.link?.startsWith('/projects/')?'chart':item.type==='instruction'?'flag':'bell';
export const managerNotificationDestination=notificationDestination;
