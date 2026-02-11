import{createClient as Gt}from"https://esm.sh/@supabase/supabase-js@2";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const n of s)if(n.type==="childList")for(const i of n.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&o(i)}).observe(document,{childList:!0,subtree:!0});function a(s){const n={};return s.integrity&&(n.integrity=s.integrity),s.referrerPolicy&&(n.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?n.credentials="include":s.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function o(s){if(s.ep)return;s.ep=!0;const n=a(s);fetch(s.href,n)}})();const Jt="https://whtckerxapozhuwjqkxb.supabase.co",Xt="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodGNrZXJ4YXBvemh1d2pxa3hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODQwMjQsImV4cCI6MjA4NjE2MDAyNH0.I2QEkVSl8qbfDVP47SVTa9ipCOs0pCCMJmahNkvp4ao",Zt=Gt(Jt,Xt);async function Qt(){const{data:t,error:e}=await Zt.from("trips").select("*").order("timestamp_start",{ascending:!0});if(e)throw e;return t}function Kt(t){(!t||!Array.isArray(t))&&(t=[]);const e={total_earnings:0,total_tips:0,total_distance:0,total_trips:t.length,total_days:0},a=new Map;t.forEach(s=>{try{e.total_earnings+=parseFloat(s.net_earnings||0),e.total_tips+=parseFloat(s.tips||0),e.total_distance+=parseFloat(s.distance||0);const n=s.timestamp_start.split("T")[0];a.has(n)||a.set(n,{date:n,trips:[]});const i=new Date(s.timestamp_start),d=new Date(s.timestamp_end),l=d-i,p=Math.round(l/6e4),g=m=>{let h=m.getHours();const x=m.getMinutes(),w=h>=12?"PM":"AM";return h=h%12||12,`${String(h).padStart(2,"0")}:${String(x).padStart(2,"0")} ${w}`};a.get(n).trips.push({restaurant:s.restaurant||"Unknown",pickup_address:s.pickup_address||"",dropoff_address:s.dropoff_address||"",request_time:g(i),dropoff_time:g(d),duration:`${p} min`,distance:parseFloat(s.distance||0),service_type:s.service_type||"",product_type:s.product_type||"",trip_uuid:s.external_trip_id||s.trip_id||"",pickup_coords:s.pickup_lng&&s.pickup_lat?[parseFloat(s.pickup_lng),parseFloat(s.pickup_lat)]:null,dropoff_coords:s.dropoff_lng&&s.dropoff_lat?[parseFloat(s.dropoff_lng),parseFloat(s.dropoff_lat)]:null,total_pay:parseFloat(s.net_earnings||0),base_fare:parseFloat(s.base_fare||0),tip:parseFloat(s.tips||0),incentive:parseFloat(s.bonuses||0),quest:0,order_refund:parseFloat(s.fees||0)})}catch(n){console.error("Error processing trip:",s,n)}}),e.total_days=a.size;const o=Array.from(a.values()).map(s=>{const n={total_earnings:0,total_tips:0,total_distance:0,trip_count:s.trips.length};return s.trips.forEach(i=>{n.total_earnings+=i.total_pay||0,n.total_tips+=i.tip||0,n.total_distance+=i.distance||0}),{...s,stats:n}});return{generated:new Date().toISOString(),stats:e,days:o}}const Yt="pk.eyJ1IjoibXBieDE1IiwiYSI6ImNta2Y1a3dxZzAzZ3AzZ29qNXQ1bmpiaGsifQ.tCkudl7SJNzzHCARPEzC9w";let r=null,S=-1,B=null,Y=[],j=null,ct="home",A=null,Q=!1;const te=!1;function at(t){return!t||te?t:t.replace(/^\d+\s+/,"").replace(/,?\s*(apt|unit|#|suite)\s*\S*/gi,"")}function nt(t,e){if(!t)return t;let a=t;const o=a.match(/^[^,]+\([^)]+\),\s*/);return o&&(a=a.substring(o[0].length)),e&&a.toLowerCase().startsWith(e.toLowerCase())&&(a=a.substring(e.length).replace(/^[\s,]+/,"")),a=a.replace(/\s+/g," ").trim(),a=a.replace(/^(\d+\s+)?([a-z])/i,(s,n,i)=>(n||"")+i.toUpperCase()),a}function lt(t){if(t==null)return"";const e=document.createElement("div");return e.textContent=t,e.innerHTML}function ee(t,e=null){try{const a=localStorage.getItem(t);return a?JSON.parse(a):e}catch(a){return console.warn(`Failed to parse localStorage key ${t}:`,a),e}}async function Tt(){try{const t=await Qt();r=Kt(t),Ne(),ae()}catch(t){console.error("Failed to load data:",t),document.body.innerHTML='<div style="padding:100px 40px;text-align:center;color:#fff;"><h2>Failed to load route data</h2><p style="color:#888;margin-top:12px;">Error: '+t.message+"</p></div>"}}function ae(){ne(),se(),Bt(),fe(),Rt(ct)}function ne(){if(!r||!r.stats||!r.days)return;const t=r.stats,e=r.days,a=document.getElementById("heroTrips"),o=document.getElementById("heroMiles"),s=document.getElementById("heroEarnings");a&&(a.textContent=(t.total_trips||847).toLocaleString()),o&&(o.textContent=Math.round(t.total_distance||2340).toLocaleString()),s&&(s.textContent="$"+Math.round(t.total_earnings||12450).toLocaleString());const n=new Date,i=n.toISOString().split("T")[0],d=e.find(_=>_.date===i),l=document.getElementById("previewToday");if(l){const _=d?d.stats.total_earnings:127.45;l.textContent="$"+_.toFixed(2)}const p=new Date(n);p.setDate(n.getDate()-n.getDay()),p.setHours(0,0,0,0);const g=e.filter(_=>new Date(_.date+"T12:00:00")>=p).reduce((_,T)=>_+T.stats.total_earnings,0),m=document.getElementById("previewWeek");m&&(m.textContent="$"+(g||412.8).toFixed(2));const h=document.getElementById("previewChart");if(h){const _=e.slice(-7),T=_.length>0?_.map(M=>M.stats.total_earnings):[85,142,98,167,124,156,112],k=Math.max(...T,1);h.innerHTML=T.map(M=>{const R=M/k*100;return`<div class="preview-bar" style="height: ${Math.max(R,5)}%"></div>`}).join("")}const x=[...e].sort((_,T)=>T.stats.total_earnings-_.stats.total_earnings)[0],w=t.total_trips>0?t.total_earnings/t.total_trips:14.68,y=t.total_earnings>0?t.total_tips/t.total_earnings*100:32,D=document.getElementById("quickBestDay"),b=document.getElementById("quickAvgTrip"),E=document.getElementById("quickTotalDays"),I=document.getElementById("quickTipRate");D&&(D.textContent="$"+(x?x.stats.total_earnings.toFixed(2):"186.42")),b&&(b.textContent="$"+w.toFixed(2)),E&&(E.textContent=t.total_days||58),I&&(I.textContent=y.toFixed(0)+"%");const C=e.slice(-5).reverse(),P=document.getElementById("recentDays");P&&(P.innerHTML=C.map((_,T)=>{const M=new Date(_.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});return`
                <div class="recent-day-card" onclick="openDay(${e.length-1-T})">
                    <div class="recent-day-info">
                        <h4>${M}</h4>
                        <span>${_.stats.trip_count} trips - ${_.stats.total_distance.toFixed(1)} mi</span>
                    </div>
                    <div class="recent-day-earnings">$${_.stats.total_earnings.toFixed(2)}</div>
                </div>
            `}).join(""))}function se(){St()}function St(){const t=document.getElementById("daysGrid");if(!r||!r.days||!t)return;const e=r.days,a=Math.max(...e.map(n=>{var i;return((i=n.stats)==null?void 0:i.total_earnings)||0}));let o="",s="";e.slice().reverse().forEach((n,i)=>{const d=new Date(n.date+"T12:00:00"),l=d.toLocaleDateString("en-US",{month:"long",year:"numeric"}),p=d.toLocaleDateString("en-US",{month:"long"}).toLowerCase(),g=d.toLocaleDateString("en-US",{weekday:"long"}).toLowerCase();l!==o&&(o=l,s+=`<div class="month-header" data-month="${p}">${l}</div>`);const m=d.toLocaleDateString("en-US",{weekday:"short"}),h=d.getDate(),x=n.stats.total_earnings/a*100,w=e.length-1-i,y=n.trips.map(b=>{const E=[b.restaurant||""];if(b.pickup_address){const I=b.pickup_address.match(/,\s*([^,]+),\s*TX/i);I&&E.push(I[1])}if(b.dropoff_address){const I=b.dropoff_address.match(/,\s*([^,]+),\s*TX/i);I&&E.push(I[1]);const C=b.dropoff_address.match(/^([^,]+)/);C&&E.push(C[1])}return E.join(" ")}).join(" "),D=[n.date,p,m.toLowerCase(),g,n.stats.total_earnings.toFixed(2),n.stats.trip_count+" trips",n.stats.total_distance.toFixed(1)+" miles",y].join(" ").toLowerCase();s+=`
            <div class="day-card" onclick="openDay(${w})" data-search="${D}" data-month="${p}" data-earnings="${n.stats.total_earnings}" data-date="${n.date}">
                <div class="day-date">
                    ${l.split(" ")[0]} ${h}
                    <div class="weekday">${m}</div>
                </div>
                <div class="day-bar">
                    <div class="day-bar-fill" style="width: ${x}%"></div>
                </div>
                <div class="day-stat trips">${n.stats.trip_count} trips</div>
                <div class="day-stat miles">${n.stats.total_distance.toFixed(1)} mi</div>
                <div class="day-stat earnings">$${n.stats.total_earnings.toFixed(2)}</div>
                <div class="day-stat tips">$${n.stats.total_tips.toFixed(2)}</div>
            </div>
        `}),t.innerHTML=s}function Bt(){if(!r||!r.stats||!r.days)return;const t=r.stats,e=r.days;if(document.getElementById("reportEarnings").textContent="$"+(t.total_earnings||0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2}),document.getElementById("reportTrips").textContent=(t.total_trips||0).toLocaleString(),document.getElementById("reportMiles").textContent=Math.round(t.total_distance).toLocaleString(),document.getElementById("reportTips").textContent="$"+t.total_tips.toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2}),document.getElementById("reportDays").textContent=t.total_days,e.length>0){const a=new Date(e[0].date+"T12:00:00"),o=new Date(e[e.length-1].date+"T12:00:00"),s=a.toLocaleDateString("en-US",{month:"short",year:"numeric"})+" - "+o.toLocaleDateString("en-US",{month:"short",year:"numeric"});document.getElementById("reportDateRange").textContent=s}oe(),ie(),re(),wt()}function oe(){const t={};r.days.forEach(o=>{const n=new Date(o.date+"T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"});t[n]||(t[n]={earnings:0,trips:0,days:0}),t[n].earnings+=o.stats.total_earnings,t[n].trips+=o.stats.trip_count,t[n].days+=1});const e=document.getElementById("monthlyTable"),a=Object.entries(t).reverse();e.innerHTML=a.map(([o,s])=>{const n=s.trips>0?s.earnings/s.trips:0;return`
            <div class="monthly-row">
                <div class="monthly-month">${o}</div>
                <div class="monthly-trips">${s.trips} trips</div>
                <div class="monthly-earnings">$${s.earnings.toFixed(2)}</div>
                <div class="monthly-avg">$${n.toFixed(2)}/trip</div>
            </div>
        `}).join("")}function ie(){const t=r.days.map((a,o)=>({...a,idx:o})).sort((a,o)=>o.stats.total_earnings-a.stats.total_earnings).slice(0,10),e=document.getElementById("topDays");e.innerHTML=t.map((a,o)=>{const n=new Date(a.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});return`
            <div class="top-day-row" onclick="openDay(${a.idx})">
                <div class="top-day-info">
                    <div class="top-day-rank">${o+1}</div>
                    <span class="top-day-date">${n}</span>
                    <span class="top-day-trips">${a.stats.trip_count} trips</span>
                </div>
                <div class="top-day-earnings">$${a.stats.total_earnings.toFixed(2)}</div>
            </div>
        `}).join("")}function re(){const t={Sun:{earnings:0,trips:0},Mon:{earnings:0,trips:0},Tue:{earnings:0,trips:0},Wed:{earnings:0,trips:0},Thu:{earnings:0,trips:0},Fri:{earnings:0,trips:0},Sat:{earnings:0,trips:0}};r.days.forEach(o=>{const n=new Date(o.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"});t[n].earnings+=o.stats.total_earnings,t[n].trips+=o.stats.trip_count});const e=Math.max(...Object.values(t).map(o=>o.earnings)),a=document.getElementById("weekdayChart");a.innerHTML=`
        <div class="weekday-totals-chart">
            ${Object.entries(t).map(([o,s])=>{const n=e>0?s.earnings/e*100:0;return`
                    <div class="weekday-bar ${s.trips===0?"no-data":""}">
                        <div class="weekday-value">$${Math.round(s.earnings)}</div>
                        <div class="weekday-bar-container">
                            <div class="weekday-bar-fill" style="height: ${n}%"></div>
                        </div>
                        <div class="weekday-label">${o}</div>
                        <div class="weekday-trips">${s.trips}</div>
                    </div>
                `}).join("")}
        </div>
    `}function de(){const t={Sun:{earnings:0,tips:0,trips:0,distance:0,daysWorked:0},Mon:{earnings:0,tips:0,trips:0,distance:0,daysWorked:0},Tue:{earnings:0,tips:0,trips:0,distance:0,daysWorked:0},Wed:{earnings:0,tips:0,trips:0,distance:0,daysWorked:0},Thu:{earnings:0,tips:0,trips:0,distance:0,daysWorked:0},Fri:{earnings:0,tips:0,trips:0,distance:0,daysWorked:0},Sat:{earnings:0,tips:0,trips:0,distance:0,daysWorked:0}};r.days.forEach(s=>{const i=new Date(s.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"short"});t[i].earnings+=s.stats.total_earnings,t[i].tips+=s.stats.total_tips,t[i].trips+=s.stats.trip_count,t[i].distance+=s.stats.total_distance,t[i].daysWorked+=1});const e=Object.entries(t).map(([s,n])=>({day:s,trips:n.trips,daysWorked:n.daysWorked,avgPerTrip:n.trips>0?n.earnings/n.trips:0,avgTipPerTrip:n.trips>0?n.tips/n.trips:0,tipRate:n.earnings>0?n.tips/n.earnings*100:0,avgPerMile:n.distance>0?n.earnings/n.distance:0,avgTripsPerDay:n.daysWorked>0?n.trips/n.daysWorked:0,totalEarnings:n.earnings})),a=Math.max(...e.map(s=>s.avgPerTrip)),o=document.getElementById("statsWeekdayChart");o&&(o.innerHTML=`
        <div class="weekday-analysis">
            <div class="weekday-chart-bars">
                ${e.map(s=>{const n=a>0?s.avgPerTrip/a*100:0;return`
                        <div class="weekday-bar ${s.avgPerTrip===a&&s.trips>0?"top-day":""} ${s.trips===0?"no-data":""}">
                            <div class="weekday-value">$${s.avgPerTrip.toFixed(2)}</div>
                            <div class="weekday-bar-container">
                                <div class="weekday-bar-fill" style="height: ${n}%"></div>
                            </div>
                            <div class="weekday-label">${s.day}</div>
                            <div class="weekday-trips">${s.trips} trips</div>
                        </div>
                    `}).join("")}
            </div>
            <div class="weekday-metrics-table">
                <div class="weekday-metrics-header">
                    <span>Day</span>
                    <span>$/Trip</span>
                    <span>Tip/Trip</span>
                    <span>Tip %</span>
                    <span>$/Mile</span>
                    <span>Trips/Day</span>
                </div>
                ${e.map(s=>`
                    <div class="weekday-metrics-row ${s.trips===0?"no-data":""}">
                        <span class="weekday-metrics-day">${s.day}</span>
                        <span class="metric-value earnings">$${s.avgPerTrip.toFixed(2)}</span>
                        <span class="metric-value tip">$${s.avgTipPerTrip.toFixed(2)}</span>
                        <span class="metric-value">${s.tipRate.toFixed(0)}%</span>
                        <span class="metric-value">$${s.avgPerMile.toFixed(2)}</span>
                        <span class="metric-value">${s.avgTripsPerDay.toFixed(1)}</span>
                    </div>
                `).join("")}
            </div>
            <div class="weekday-insight">
                <span class="insight-label">Best earning day per trip:</span>
                <span class="insight-value">${e.reduce((s,n)=>n.avgPerTrip>s.avgPerTrip?n:s,e[0]).day}</span>
            </div>
        </div>
    `)}function le(t){if(!t)return 0;const e=t.match(/(\d+)h\s*(\d+)?m?/);if(e){const o=parseInt(e[1])||0,s=parseInt(e[2])||0;return o*60+s}const a=t.match(/(\d+)\s*min/);return a&&parseInt(a[1])||0}let Lt="all";function Ct(){const t=[];r.days.forEach(y=>{y.trips.forEach((D,b)=>{const E=le(D.duration),I=D.total_pay||D.earnings||0,C=D.distance||0,P=E>0?I/E*60:0,_=C>0?I/C:0;let T="other",k=!1,M=!1,R=E>0&&E<15,V=E>25,z=I<8;E>=15&&E<=25&&I>=15?(T="optimal",k=!0):I>=8?(T="acceptable",M=!0):R?T="short":V?T="long":T="low-pay",t.push({date:y.date,dayIndex:r.days.indexOf(y),tripIndex:b,restaurant:D.restaurant||"Unknown",duration:E,durationStr:D.duration,pay:I,distance:C,perHour:P,perMile:_,category:T,isOptimal:k,isAcceptable:M,isShort:R,isLong:V,isLowPay:z})})});const e=t.filter(y=>y.category==="optimal").length,a=t.filter(y=>y.category==="acceptable").length,o=t.filter(y=>y.isShort&&y.category!=="optimal"&&y.category!=="acceptable").length,s=t.filter(y=>y.isLong&&y.category!=="optimal"&&y.category!=="acceptable").length,n=t.filter(y=>y.isLowPay).length,i=t.filter(y=>y.duration>0),d=i.length>0?i.reduce((y,D)=>y+D.duration,0)/i.length:0,l=i.length>0?i.reduce((y,D)=>y+D.perHour,0)/i.length:0,p=t.filter(y=>y.distance>0),g=p.length>0?p.reduce((y,D)=>y+D.perMile,0)/p.length:0,m=t.length>0?(e+a)/t.length*100:0;document.getElementById("effOptimalCount").textContent=e,document.getElementById("effAcceptableCount").textContent=a,document.getElementById("effShortCount").textContent=o,document.getElementById("effLongCount").textContent=s,document.getElementById("effLowPayCount").textContent=n;const h=document.getElementById("effAvgPerHour");h.textContent="$"+l.toFixed(2),h.className="efficiency-metric-value "+(l>=30?"good":l>=20?"warning":"bad");const x=document.getElementById("effAvgPerMile");x.textContent="$"+g.toFixed(2),x.className="efficiency-metric-value "+(g>=2?"good":g>=1.5?"warning":"bad"),document.getElementById("effAvgDuration").textContent=d.toFixed(0)+" min";const w=document.getElementById("effScore");w.textContent=m.toFixed(0)+"%",w.className="efficiency-metric-value "+(m>=50?"good":m>=30?"warning":"bad"),ce(t,Lt)}function ce(t,e){const a=document.getElementById("tripEfficiencyList");let o=t;e==="optimal"?o=t.filter(n=>n.category==="optimal"):e==="acceptable"?o=t.filter(n=>n.category==="acceptable"):e==="short"?o=t.filter(n=>n.isShort&&n.category!=="optimal"&&n.category!=="acceptable"):e==="long"?o=t.filter(n=>n.isLong&&n.category!=="optimal"&&n.category!=="acceptable"):e==="low-pay"&&(o=t.filter(n=>n.isLowPay)),o.sort((n,i)=>{const d=new Date(i.date)-new Date(n.date);return d!==0?d:i.perHour-n.perHour});const s=o.slice(0,50);a.innerHTML=`
        <div class="efficiency-list-header">
            <h3>${e==="all"?"Recent Trips":e.charAt(0).toUpperCase()+e.slice(1).replace("-"," ")+" Trips"} (${o.length})</h3>
            <div class="efficiency-list-tabs">
                <button class="efficiency-tab ${e==="all"?"active":""}" onclick="filterEfficiencyTrips('all')">All</button>
                <button class="efficiency-tab ${e==="optimal"?"active":""}" onclick="filterEfficiencyTrips('optimal')">Optimal</button>
                <button class="efficiency-tab ${e==="acceptable"?"active":""}" onclick="filterEfficiencyTrips('acceptable')">OK</button>
                <button class="efficiency-tab ${e==="short"?"active":""}" onclick="filterEfficiencyTrips('short')">Short</button>
                <button class="efficiency-tab ${e==="long"?"active":""}" onclick="filterEfficiencyTrips('long')">Long</button>
                <button class="efficiency-tab ${e==="low-pay"?"active":""}" onclick="filterEfficiencyTrips('low-pay')">Low $</button>
            </div>
        </div>
        ${s.length>0?s.map(n=>{const d=new Date(n.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric"});let l="";n.duration>=15&&n.duration<=25?l="optimal":n.duration<15&&n.duration>0?l="short":n.duration>25&&(l="long");let p="";n.pay>=15?p="good":n.pay>=8?p="acceptable":p="low";const g=n.perHour>=30?"good":"bad",m=n.perMile>=2?"good":"bad";return`
                <div class="efficiency-trip-row" onclick="openDay(${n.dayIndex})">
                    <div class="efficiency-trip-date">${d}</div>
                    <div class="efficiency-trip-restaurant">${n.restaurant}</div>
                    <div class="efficiency-trip-duration ${l}">${n.durationStr||"-"}</div>
                    <div class="efficiency-trip-pay ${p}">$${n.pay.toFixed(2)}</div>
                    <div class="efficiency-trip-per-hour ${g}">$${n.perHour.toFixed(0)}/hr</div>
                    <div class="efficiency-trip-per-mile ${m}">$${n.perMile.toFixed(2)}/mi</div>
                </div>
            `}).join(""):'<div class="refunds-empty">No trips match this filter</div>'}
    `}function ue(t){Lt=t,Ct()}function pe(){if(!r||!r.stats||!r.days)return;const t=r.stats,e=r.days,a=t.total_trips*.25,o=t.total_trips>0?t.total_earnings/t.total_trips:0,s=a>0?t.total_earnings/a:0,n=t.total_distance>0?t.total_earnings/t.total_distance:0,i=t.total_days>0?t.total_earnings/t.total_days:0,d=t.total_earnings>0?t.total_tips/t.total_earnings*100:0;document.getElementById("statsAvgTrip").textContent="$"+o.toFixed(2),document.getElementById("statsAvgHour").textContent="$"+s.toFixed(2),document.getElementById("statsAvgMile").textContent="$"+n.toFixed(2),document.getElementById("statsAvgDay").textContent="$"+i.toFixed(2),document.getElementById("statsTips").textContent="$"+t.total_tips.toFixed(2),document.getElementById("statsTipRate").textContent=d.toFixed(0)+"%";const l=e.length>0?new Date(e[e.length-1].date+"T12:00:00"):new Date,p=X(l),g=tt(p),m=e.filter(c=>{const u=new Date(c.date+"T12:00:00");return u>=p&&u<=g}),h=m.reduce((c,u)=>c+u.stats.total_earnings,0),x=m.reduce((c,u)=>c+u.stats.trip_count,0),w=m.reduce((c,u)=>c+u.stats.total_distance,0),y=x*.25,b=Math.min(h/500*100,100),E=y>0?h/y:0,I=p.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" - "+g.toLocaleDateString("en-US",{month:"short",day:"numeric"});document.getElementById("statsWeekRange").textContent=I,document.getElementById("statsWeekEarnings").textContent="$"+h.toFixed(2),document.getElementById("statsWeekTrips").textContent=x,document.getElementById("statsWeekMiles").textContent=w.toFixed(1),document.getElementById("statsWeekPerHour").textContent="$"+E.toFixed(2),document.getElementById("statsWeekGoalFill").style.width=b+"%",document.getElementById("statsWeekGoalPercent").textContent=Math.round(b)+"%";const C=[...e].sort((c,u)=>u.stats.total_earnings-c.stats.total_earnings)[0];if(C){const c=new Date(C.date+"T12:00:00");document.getElementById("statsBestDay").textContent=c.toLocaleDateString("en-US",{month:"short",day:"numeric"}),document.getElementById("statsBestDayDetail").textContent="$"+C.stats.total_earnings.toFixed(2)}const P={};e.forEach(c=>{c.trips.forEach(u=>{const v=u.restaurant||"Unknown";P[v]=(P[v]||0)+1})});const _=Object.entries(P).sort((c,u)=>u[1]-c[1])[0];_&&(document.getElementById("statsTopRestaurant").textContent=_[0].substring(0,18)+(_[0].length>18?"...":""),document.getElementById("statsTopRestaurantDetail").textContent=_[1]+" pickups");const T={};e.forEach(c=>{c.trips.forEach(u=>{if(u.request_time){let v;const U=u.request_time;if(U.includes("AM")||U.includes("PM")){const q=U.match(/(\d+):(\d+)\s*(AM|PM)/i);if(q){v=parseInt(q[1]);const H=q[3].toUpperCase()==="PM";H&&v!==12&&(v+=12),!H&&v===12&&(v=0)}}else v=parseInt(U.split(":")[0]);v!==void 0&&!isNaN(v)&&(T[v]||(T[v]={trips:0,earnings:0}),T[v].trips+=1,T[v].earnings+=u.total_pay||u.earnings||0)}})});const k=Object.entries(T).map(([c,u])=>({hour:parseInt(c),trips:u.trips,earnings:u.earnings,avgPay:u.trips>0?u.earnings/u.trips:0}));if(k.length>0){const c=Math.max(...k.map($=>$.trips)),u=Math.max(...k.map($=>$.avgPay));k.forEach($=>{$.score=$.trips/c*.5+$.avgPay/u*.5});const v=k.sort(($,N)=>N.score-$.score).slice(0,4).map($=>$.hour).sort(($,N)=>$-N),U=[];let q=v[0],H=v[0];for(let $=1;$<v.length;$++)v[$]===H+1||(U.push({start:q,end:H}),q=v[$]),H=v[$];U.push({start:q,end:H});const dt=$=>{const N=$>=12?"p":"a";return($%12||12)+N},Vt=U.map($=>$.start===$.end?dt($.start):dt($.start)+"-"+dt($.end+1)).join(", "),zt=k.slice(0,4).reduce(($,N)=>$+N.avgPay,0)/Math.min(4,k.length);document.getElementById("statsBestHour").textContent=Vt,document.getElementById("statsBestHourDetail").textContent="$"+zt.toFixed(2)+"/trip avg"}const M={};e.forEach(c=>{const v=new Date(c.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long"});M[v]=(M[v]||0)+c.stats.total_earnings});const R=Object.entries(M).sort((c,u)=>u[1]-c[1])[0];R&&(document.getElementById("statsBestWeekday").textContent=R[0],document.getElementById("statsBestWeekdayDetail").textContent="$"+R[1].toFixed(0)+" total");const V=t.total_distance*.67,z=Math.max(t.total_earnings-V,0);document.getElementById("statsTaxDeduction").textContent="$"+V.toFixed(2),document.getElementById("statsTaxable").textContent="$"+z.toFixed(2);const F={};e.forEach(c=>{c.trips.forEach(u=>{const v=u.restaurant||"Unknown";F[v]||(F[v]={trips:0,totalTips:0,totalPay:0,tippedTrips:0}),F[v].trips+=1,F[v].totalTips+=u.tip||0,F[v].totalPay+=u.total_pay||u.earnings||0,u.tip>0&&(F[v].tippedTrips+=1)})});const G=Object.entries(F).map(([c,u])=>({name:c,trips:u.trips,totalTips:u.totalTips,totalPay:u.totalPay,avgTip:u.trips>0?u.totalTips/u.trips:0,avgPay:u.trips>0?u.totalPay/u.trips:0,tipRate:u.trips>0?u.tippedTrips/u.trips*100:0})),O=G.filter(c=>c.trips>=10&&c.totalTips>0).sort((c,u)=>u.avgTip-c.avgTip).slice(0,5),bt=document.getElementById("statsRestaurantTippers");O.length>0?bt.innerHTML=O.map((c,u)=>`
            <div class="restaurant-row clickable" onclick="searchRestaurant('${c.name.replace(/'/g,"\\'")}')">
                <span class="restaurant-rank">${u+1}</span>
                <div class="restaurant-info">
                    <span class="restaurant-name">${c.name.substring(0,22)}${c.name.length>22?"...":""}</span>
                    <span class="restaurant-meta">${c.trips} trips | ${c.tipRate.toFixed(0)}% tip rate</span>
                </div>
                <span class="restaurant-stat">$${c.avgTip.toFixed(2)}</span>
            </div>
        `).join(""):bt.innerHTML='<div class="restaurant-list-empty">Need 10+ trips to analyze</div>';const _t=G.filter(c=>c.trips>=10).sort((c,u)=>u.trips-c.trips).slice(0,5),xt=document.getElementById("statsRestaurantFrequent");_t.length>0?xt.innerHTML=_t.map((c,u)=>`
            <div class="restaurant-row clickable" onclick="searchRestaurant('${c.name.replace(/'/g,"\\'")}')">
                <span class="restaurant-rank">${u+1}</span>
                <div class="restaurant-info">
                    <span class="restaurant-name">${c.name.substring(0,22)}${c.name.length>22?"...":""}</span>
                    <span class="restaurant-meta">$${c.totalPay.toFixed(0)} total earned</span>
                </div>
                <span class="restaurant-stat">${c.trips}x</span>
            </div>
        `).join(""):xt.innerHTML='<div class="restaurant-list-empty">Need 10+ trips to analyze</div>';const Et=G.filter(c=>c.trips>=10).sort((c,u)=>u.avgPay-c.avgPay).slice(0,5),Dt=document.getElementById("statsRestaurantValue");Et.length>0?Dt.innerHTML=Et.map((c,u)=>`
            <div class="restaurant-row clickable" onclick="searchRestaurant('${c.name.replace(/'/g,"\\'")}')">
                <span class="restaurant-rank">${u+1}</span>
                <div class="restaurant-info">
                    <span class="restaurant-name">${c.name.substring(0,22)}${c.name.length>22?"...":""}</span>
                    <span class="restaurant-meta">${c.trips} trips | $${c.totalTips.toFixed(0)} tips</span>
                </div>
                <span class="restaurant-stat">$${c.avgPay.toFixed(2)}</span>
            </div>
        `).join(""):Dt.innerHTML='<div class="restaurant-list-empty">Need 10+ trips to analyze</div>',de(),Ct()}function Mt(t){Z("routes"),document.getElementById("globalSearch").value=t,ut(t)}function me(t){switch(t){case"bestDay":const a=r.days.reduce((n,i,d,l)=>i.stats.total_earnings>l[n].stats.total_earnings?d:n,0);ot(a);break;case"topRestaurant":const o=document.getElementById("statsTopRestaurant");o&&o.textContent!=="-"&&Mt(o.textContent.replace("...",""));break;case"bestHours":Z("weeks");break;case"bestWeekday":const s=document.getElementById("statsBestWeekday");s&&s.textContent!=="-"&&(Z("routes"),document.getElementById("globalSearch").value=s.textContent.toLowerCase(),ut(s.textContent.toLowerCase()));break}}function ge(t){const e=t.trim();e&&ct!=="routes"&&Z("routes"),ut(e)}function ut(t){const e=t.toLowerCase().trim();if(document.querySelectorAll(".search-tag, .filter-tag").forEach(w=>{w.classList.toggle("active",w.dataset.filter==="all"&&!e)}),!e){document.querySelectorAll(".day-card, .month-header").forEach(w=>{w.style.display=""}),It(null);return}let a=0,o=1/0,s=0,n=e;const i=e.match(/(?:over|above|>|more\s*than)\s*\$?(\d+)|\$?(\d+)\+/i);i&&(a=parseFloat(i[1]||i[2]),n=e.replace(i[0],"").trim());const d=e.match(/(?:under|below|<|less\s*than)\s*\$?(\d+)/i);d&&(o=parseFloat(d[1]),n=e.replace(d[0],"").trim());const l=e.match(/\$?(\d+)\s*[-to]+\s*\$?(\d+)/i);l&&(a=parseFloat(l[1]),o=parseFloat(l[2]),n=e.replace(l[0],"").trim());const p=e.match(/(\d+)\+?\s*trips?|trips?\s*[>:]\s*(\d+)/i);p&&(s=parseInt(p[1]||p[2]),n=e.replace(p[0],"").trim());const g=n.split(/\s+/).filter(w=>w.length>1);let m=new Set,h=0,x=0;document.querySelectorAll(".day-card").forEach(w=>{var T;const y=w.dataset.search||"",D=parseFloat(w.dataset.earnings)||0,b=w.dataset.month,E=parseInt(((T=y.match(/(\d+)\s*trips/))==null?void 0:T[1])||0),I=g.length===0||g.every(k=>{if(y.includes(k))return!0;const R={mon:"monday",tue:"tuesday",wed:"wednesday",thu:"thursday",fri:"friday",sat:"saturday",sun:"sunday",jan:"january",feb:"february",mar:"march",apr:"april",jun:"june",jul:"july",aug:"august",sep:"september",oct:"october",nov:"november",dec:"december",mcdonalds:"mcdonald's",mcd:"mcdonald's",chilis:"chili's",wendys:"wendy's",arbys:"arby's",popeyes:"popeye's",churchs:"church's"}[k];return R&&y.includes(R)?!0:k.length>=4?y.split(/\s+/).some(F=>{if(F.startsWith(k)||k.startsWith(F.substring(0,3)))return!0;if(Math.abs(F.length-k.length)<=1){let G=0;for(let O=0;O<Math.min(F.length,k.length);O++)F[O]!==k[O]&&G++;return G<=1}return!1}):y.split(/\s+/).some(z=>z.startsWith(k))}),C=D>=a&&D<=o,P=E>=s,_=I&&C&&P;w.style.display=_?"":"none",_&&(h++,x+=D,b&&m.add(b))}),document.querySelectorAll(".month-header").forEach(w=>{const y=w.dataset.month;w.style.display=m.has(y)?"":"none"}),It(h,x)}function It(t,e){let a=document.getElementById("searchResultsIndicator");if(t===null){a&&a.remove();return}if(!a){a=document.createElement("div"),a.id="searchResultsIndicator",a.className="search-results-indicator";const o=document.querySelector(".routes-list");o&&o.parentNode.insertBefore(a,o)}t===0?a.innerHTML='<span class="no-results">No matching days found</span>':a.innerHTML=`<span class="results-count">${t} day${t!==1?"s":""} found</span><span class="results-earnings">$${e.toFixed(2)} total</span>`}function ye(t){document.querySelectorAll(".search-tag, .filter-tag").forEach(o=>{o.classList.toggle("active",o.dataset.filter===t)});const e=document.getElementById("routeSearch"),a=document.getElementById("globalSearch");if(e&&(e.value=""),a&&(a.value=""),Q=!1,Ft(),t==="all"){document.querySelectorAll(".day-card, .month-header").forEach(o=>{o.style.display=""});return}document.querySelectorAll(".day-card").forEach(o=>{o.style.display=o.dataset.month===t?"":"none"}),document.querySelectorAll(".month-header").forEach(o=>{o.style.display=o.dataset.month===t?"":"none"})}function X(t){const e=new Date(t),a=e.getDay();return e.setDate(e.getDate()-a),e.setHours(0,0,0,0),e}function tt(t){const e=new Date(t);return e.setDate(e.getDate()+6),e}function fe(){A=X(new Date),Ft()}function Ft(){const t=document.getElementById("weekNavDates"),e=document.getElementById("weekSummary");A||(A=X(new Date));const a=tt(A),o=A.toLocaleDateString("en-US",{month:"short",day:"numeric"}),s=a.toLocaleDateString("en-US",{month:"short",day:"numeric"});t&&(t.textContent=`${o} - ${s}`),e&&(e.style.display=Q?"flex":"none"),document.querySelectorAll(".week-btn-text").forEach(i=>{const d=i.textContent.trim()==="Today",l=i.textContent.trim()==="All";d&&i.classList.toggle("active",Q&&he()),l&&i.classList.toggle("active",!Q)}),Q&&ve()}function he(){const t=X(new Date);return A&&A.getTime()===t.getTime()}function ve(){if(!A||!r)return;const t=tt(A);let e=0,a=0,o=0,s=0;r.days.forEach(n=>{const i=new Date(n.date+"T12:00:00");i>=A&&i<=t&&(e+=n.stats.total_earnings,a+=n.stats.trip_count,o+=n.stats.total_distance,s++)}),document.getElementById("weekSummaryEarnings").textContent="$"+e.toFixed(2),document.getElementById("weekSummaryTrips").textContent=a,document.getElementById("weekSummaryMiles").textContent=o.toFixed(1),document.getElementById("weekSummaryDays").textContent=s}let L=null;function pt(){if(r&&r.days&&r.days.length>0){const t=new Date(r.days[r.days.length-1].date+"T12:00:00");return X(t)}return X(new Date)}function $e(){L||(L=pt()),mt(),gt()}function we(t){L||(L=pt()),L=new Date(L),L.setDate(L.getDate()+t*7),mt(),gt()}function be(){L=pt(),mt(),gt()}function mt(){if(!L||!r)return;const t=tt(L),e=L.toLocaleDateString("en-US",{month:"short"}),a=L.getDate(),o=t.toLocaleDateString("en-US",{month:"short"}),s=t.getDate(),n=t.getFullYear();let i;e===o?i=`${e} ${a} - ${s}, ${n}`:i=`${e} ${a} - ${o} ${s}, ${n}`,document.getElementById("weekPageDates").textContent=i;let d=0,l=0,p=0,g=0;r.days.forEach(h=>{const x=new Date(h.date+"T12:00:00");x>=L&&x<=t&&(d+=h.stats.total_earnings,l+=h.stats.trip_count,p+=h.stats.total_distance,g++)});const m=l>0?d/l:0;document.getElementById("weekPageEarnings").textContent="$"+d.toFixed(2),document.getElementById("weekPageTrips").textContent=l,document.getElementById("weekPageMiles").textContent=p.toFixed(1),document.getElementById("weekPageDays").textContent=g,document.getElementById("weekPageAvg").textContent="$"+m.toFixed(2)}function gt(){if(!L||!r)return;const t=document.getElementById("weekDaysGrid"),e=tt(L),a=[],o=new Date(L);for(;o<=e;){const i=o.toISOString().split("T")[0],d=r.days.find(l=>l.date===i);a.push({date:new Date(o),dateStr:i,data:d}),o.setDate(o.getDate()+1)}const s=Math.max(...a.filter(i=>i.data).map(i=>i.data.stats.total_earnings),1);let n="";a.forEach((i,d)=>{const l=i.date.toLocaleDateString("en-US",{weekday:"long"}),p=i.date.toLocaleDateString("en-US",{month:"short",day:"numeric"}),g=i.dateStr===new Date().toISOString().split("T")[0];if(i.data){const m=i.data.stats.total_earnings/s*100,h=r.days.findIndex(x=>x.date===i.dateStr);n+=`
                <div class="week-day-card${g?" today":""}" onclick="openDay(${h})">
                    <div class="week-day-header">
                        <span class="week-day-name">${l}</span>
                        <span class="week-day-date">${p}</span>
                    </div>
                    <div class="week-day-stats">
                        <div class="week-day-earnings">$${i.data.stats.total_earnings.toFixed(2)}</div>
                        <div class="week-day-bar">
                            <div class="week-day-bar-fill" style="width: ${m}%"></div>
                        </div>
                        <div class="week-day-details">
                            <span>${i.data.stats.trip_count} trips</span>
                            <span>${i.data.stats.total_distance.toFixed(1)} mi</span>
                            <span>$${i.data.stats.total_tips.toFixed(2)} tips</span>
                        </div>
                    </div>
                </div>
            `}else n+=`
                <div class="week-day-card empty${g?" today":""}">
                    <div class="week-day-header">
                        <span class="week-day-name">${l}</span>
                        <span class="week-day-date">${p}</span>
                    </div>
                    <div class="week-day-empty">
                        <span>No trips recorded</span>
                    </div>
                </div>
            `}),t.innerHTML=n}function Z(t){ct=t,document.querySelectorAll(".page").forEach(a=>a.classList.remove("active")),document.getElementById("mapView").classList.remove("active"),t==="home"?document.getElementById("pageHome").classList.add("active"):t==="weeks"?(document.getElementById("pageWeeks").classList.add("active"),$e()):t==="routes"?document.getElementById("pageRoutes").classList.add("active"):t==="reports"?document.getElementById("pageReports").classList.add("active"):t==="stats"?(document.getElementById("pageStats").classList.add("active"),pe()):t==="feature-maps"?document.getElementById("pageFeatureMaps").classList.add("active"):t==="feature-earnings"?document.getElementById("pageFeatureEarnings").classList.add("active"):t==="feature-reports"&&document.getElementById("pageFeatureReports").classList.add("active"),document.querySelectorAll(".nav-link").forEach(a=>a.classList.remove("active"));const e=document.getElementById("nav"+t.charAt(0).toUpperCase()+t.slice(1));e&&e.classList.add("active"),Rt(t),B&&(B.remove(),B=null),Y=[],j=null}function Rt(t){const e=document.getElementById("navAuth"),a=document.getElementById("navSearch");t==="home"?(e&&(e.style.display="flex"),a&&(a.style.display="none"),document.body.classList.add("on-home")):(e&&(e.style.display="none"),a&&(a.style.display="flex"),document.body.classList.remove("on-home"))}function _e(){Pt()}function xe(){Pt()}let J=1,st=null;function Pt(){document.getElementById("onboardingModal").classList.add("active"),J=1,ft()}function At(){document.getElementById("onboardingModal").classList.remove("active"),J=1,st=null,ft()}function yt(t){J=t,ft()}function ft(){document.querySelectorAll(".progress-step").forEach((t,e)=>{const a=e+1;t.classList.remove("active","completed"),a===J?t.classList.add("active"):a<J&&t.classList.add("completed")}),document.querySelectorAll(".onboarding-step").forEach((t,e)=>{t.classList.toggle("active",e+1===J)})}function Ee(t){if(t==="doordash"||t==="instacart"){W("Coming soon! Uber is currently the only supported platform.");return}st=t,t==="uber"&&(W("Connecting to Uber..."),setTimeout(()=>{De()},1500))}function De(){const t={name:"Demo Driver",email:"driver@example.com",platform:"Uber Eats",trips:"1,045",since:"Aug 2025",rating:"4.95"};document.getElementById("verifyName").textContent=t.name,document.getElementById("verifyEmail").textContent=t.email,document.getElementById("verifyPlatform").textContent=t.platform,document.getElementById("verifyTrips").textContent=t.trips,document.getElementById("verifySince").textContent=t.since,document.getElementById("verifyRating").textContent=t.rating,yt(2),W("Connected to Uber successfully!")}function Te(){st=null,document.getElementById("verifyName").textContent="Guest Driver",document.getElementById("verifyEmail").textContent="Manual entry mode",document.getElementById("verifyPlatform").textContent="Manual",document.getElementById("verifyTrips").textContent="-",document.getElementById("verifySince").textContent="-",document.getElementById("verifyRating").textContent="-",yt(3)}function Ie(){const t=document.getElementById("setupGoal").value||500,e=document.getElementById("setupMileage").value||.67,a=document.getElementById("setupDarkMode").checked;localStorage.setItem("lml_weeklyGoal",t),localStorage.setItem("lml_mileageRate",e),localStorage.setItem("lml_darkMode",a),localStorage.setItem("lml_onboarded","true"),localStorage.setItem("lml_platform",st||"manual"),At(),Z("routes"),W("Welcome to LastMile Ledger! 🎉")}function ot(t){S=t;const e=r.days[t];document.querySelectorAll(".page").forEach(a=>a.classList.remove("active")),document.getElementById("mapView").classList.add("active"),document.querySelectorAll(".nav-link").forEach(a=>a.classList.remove("active")),document.getElementById("navRoutes").classList.add("active"),Wt(e)}function ke(t){const e=S+t;e>=0&&e<r.days.length&&(B&&(B.remove(),B=null),Y=[],j=null,ot(e))}function Wt(t){const a=new Date(t.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});document.getElementById("mapDate").textContent=a,document.getElementById("prevBtn").disabled=S<=0,document.getElementById("nextBtn").disabled=S>=r.days.length-1,document.getElementById("dayEarnings").textContent="$"+t.stats.total_earnings.toFixed(2),document.getElementById("dayTrips").textContent=t.stats.trip_count,document.getElementById("dayMiles").textContent=t.stats.total_distance.toFixed(1)+" mi",document.getElementById("dayTips").textContent="$"+t.stats.total_tips.toFixed(2);const o=t.trips;o.length>0&&(document.getElementById("dayStart").textContent=o[0].request_time,document.getElementById("dayEnd").textContent=o[o.length-1].dropoff_time),Se(o),Le(o)}function Se(t){const e=document.getElementById("tripList");e.innerHTML=t.map((a,o)=>`
        <div class="trip-card" data-trip-id="${o}" data-search="${(a.restaurant||"").toLowerCase()} ${(a.pickup_address||"").toLowerCase()} ${(a.dropoff_address||"").toLowerCase()}" onclick="selectTrip(${o})">
            <div class="trip-header">
                <div class="trip-number">${o+1}</div>
                <div class="trip-restaurant">${a.restaurant}</div>
                <div class="trip-earnings">${a.total_pay>0?"$"+a.total_pay.toFixed(2):"-"}</div>
            </div>
            <div class="trip-meta">
                <div class="trip-meta-item"><span class="icon">T</span> ${a.request_time}</div>
                <div class="trip-meta-item"><span class="icon">D</span> ${a.duration}</div>
                <div class="trip-meta-item"><span class="icon">M</span> ${a.distance.toFixed(1)} mi</div>
            </div>
            <div class="trip-pay-breakdown">
                ${a.base_fare>0?`<span class="pay-item base">Base: $${a.base_fare.toFixed(2)}</span>`:""}
                ${a.tip>0?`<span class="pay-item tip">Tip: $${a.tip.toFixed(2)}</span>`:""}
                ${a.incentive>0?`<span class="pay-item promo">+$${a.incentive.toFixed(2)}</span>`:""}
                ${a.order_refund>0?`<span class="pay-item refund">Refund: $${a.order_refund.toFixed(2)}</span>`:""}
            </div>
            <div class="trip-addresses">
                <div class="trip-addr">
                    <div class="trip-addr-icon pickup">P</div>
                    <span>${nt(a.pickup_address,a.restaurant).substring(0,45)}${nt(a.pickup_address,a.restaurant).length>45?"...":""}</span>
                </div>
                <div class="trip-addr">
                    <div class="trip-addr-icon dropoff">D</div>
                    <span>${at(a.dropoff_address).substring(0,45)}${at(a.dropoff_address).length>45?"...":""}</span>
                </div>
            </div>
        </div>
    `).join("")}function Be(t){const e=t.dataset.fullAddress,a=t.dataset.restaurant,o=t.classList.toggle("showing-address");t.textContent=o?nt(e,a):a}function Le(t){mapboxgl.accessToken=Yt;const e=[];if(t.forEach(s=>{s.pickup_coords&&e.push(s.pickup_coords),s.dropoff_coords&&e.push(s.dropoff_coords)}),e.length===0)return;const a=e.reduce((s,n)=>s+n[0],0)/e.length,o=e.reduce((s,n)=>s+n[1],0)/e.length;B=new mapboxgl.Map({container:"map",style:"mapbox://styles/mapbox/dark-v11",center:[a,o],zoom:11,preserveDrawingBuffer:!0}),B.addControl(new mapboxgl.NavigationControl,"bottom-right"),B.on("load",()=>{const s=[];t.forEach(d=>{d.pickup_coords&&s.push(d.pickup_coords),d.dropoff_coords&&s.push(d.dropoff_coords)}),B.addSource("route",{type:"geojson",data:{type:"Feature",geometry:{type:"LineString",coordinates:s}}}),B.addLayer({id:"route-line",type:"line",source:"route",paint:{"line-color":"#4a9eff","line-width":3,"line-opacity":.6}});let n=0;t.forEach((d,l)=>{d.pickup_coords&&(n++,kt(d.pickup_coords,"pickup",n,l)),d.dropoff_coords&&(n++,kt(d.dropoff_coords,"dropoff",n,l))});const i=new mapboxgl.LngLatBounds;e.forEach(d=>i.extend(d)),B.fitBounds(i,{padding:60})})}function kt(t,e,a,o){const s=document.createElement("div");s.className=`marker ${e}`,s.textContent=a,s.onclick=i=>{i.stopPropagation(),Ut(o)};const n=new mapboxgl.Marker(s).setLngLat(t).addTo(B);Y.push({marker:n,element:s,tripId:o})}function Ut(t){j=t;const e=r.days[S].trips[t];document.querySelectorAll(".trip-card").forEach(n=>{n.classList.toggle("active",parseInt(n.dataset.tripId)===t)}),Y.forEach(n=>{n.element.classList.toggle("highlight",n.tripId===t)}),document.getElementById("detailNumber").textContent=t+1,document.getElementById("detailEarnings").textContent=e.total_pay>0?"$"+e.total_pay.toFixed(2):"-",document.getElementById("detailDistance").textContent=e.distance.toFixed(1)+" mi",document.getElementById("detailDuration").textContent=e.duration,document.getElementById("detailBase").textContent=e.base_fare>0?"$"+e.base_fare.toFixed(2):"-",document.getElementById("detailTip").textContent=e.tip>0?"$"+e.tip.toFixed(2):"-",document.getElementById("detailIncentive").textContent=e.incentive+e.quest>0?"$"+(e.incentive+e.quest).toFixed(2):"-",document.getElementById("detailRefund").textContent=e.order_refund>0?"$"+e.order_refund.toFixed(2):"-",document.getElementById("detailTime").textContent=e.request_time+" - "+e.dropoff_time;const a=document.getElementById("detailPickup"),o=nt(e.pickup_address,e.restaurant);a.innerHTML=`<span class="pickup-toggle-detail" onclick="toggleDetailPickup(this)" data-full-address="${lt(e.pickup_address)}" data-restaurant="${lt(e.restaurant)}">${lt(e.restaurant)}</span> <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o)}" target="_blank" rel="noopener" class="map-link" title="Open in Maps">&#x1F5FA;</a>`,document.getElementById("detailDropoff").textContent=at(e.dropoff_address);const s=document.getElementById("detailUuidSection");if(document.getElementById("detailUuidLink"),s.style.display="none",document.getElementById("tripDetail").classList.add("show"),e.pickup_coords&&e.dropoff_coords){const n=new mapboxgl.LngLatBounds().extend(e.pickup_coords).extend(e.dropoff_coords);B.fitBounds(n,{padding:100,maxZoom:14})}else e.pickup_coords&&B.flyTo({center:e.pickup_coords,zoom:14})}function Ce(){document.getElementById("tripDetail").classList.remove("show"),j=null,document.querySelectorAll(".trip-card").forEach(t=>t.classList.remove("active")),Y.forEach(t=>t.element.classList.remove("highlight"))}function ht(t){const e=document.getElementById("printArea");e.innerHTML=t,setTimeout(()=>{window.print(),setTimeout(()=>{e.innerHTML=""},1e3)},100)}function f(t){return"$"+t.toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}function et(){return new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}function Me(t){const e=r.stats;let a="";t==="summary"?a=Fe(e):t==="monthly"?a=Re():t==="trips"&&(a=Pe()),ht(a)}function Fe(t){const e=t.total_trips>0?t.total_earnings/t.total_trips:0,a=t.total_days>0?t.total_earnings/t.total_days:0,o=t.total_distance>0?t.total_earnings/t.total_distance:0,s=t.total_earnings>0?t.total_tips/t.total_earnings*100:0,n=t.total_distance*.67,i=Math.max(t.total_earnings-n,0),d=r.days.map(g=>new Date(g.date+"T12:00:00")).sort((g,m)=>g-m),l=d.length>0?d[0].toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):"-",p=d.length>0?d[d.length-1].toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):"-";return`
        <div class="print-document print-latex">
            <div class="latex-header">
                <h1 class="latex-title">Delivery Earnings Report</h1>
                <p class="latex-subtitle">LastMile Ledger — Comprehensive Summary</p>
                <p class="latex-meta">${l} through ${p}</p>
            </div>
            
            <div class="latex-abstract">
                <strong>Abstract.</strong> This report summarizes ${t.total_trips.toLocaleString()} deliveries 
                completed over ${t.total_days} active days, covering ${Math.round(t.total_distance).toLocaleString()} miles 
                with total earnings of ${f(t.total_earnings)}.
            </div>
            
            <div class="latex-section">
                <h2>Executive Summary</h2>
                <table class="latex-table latex-summary-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Earnings</td>
                            <td class="number">${f(t.total_earnings)}</td>
                            <td>Total Deliveries</td>
                            <td class="number">${t.total_trips.toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Base Fares</td>
                            <td class="number">${f(t.total_earnings-t.total_tips)}</td>
                            <td>Total Miles</td>
                            <td class="number">${Math.round(t.total_distance).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td>Tips Received</td>
                            <td class="number">${f(t.total_tips)}</td>
                            <td>Active Days</td>
                            <td class="number">${t.total_days}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="latex-section">
                <h2>Performance Analysis</h2>
                <p>Table 2 presents key performance indicators derived from the delivery data.</p>
                <table class="latex-table">
                    <thead>
                        <tr>
                            <th>Performance Metric</th>
                            <th>Value</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Earnings per Delivery</td>
                            <td class="number">${f(e)}</td>
                            <td>Average revenue per completed delivery</td>
                        </tr>
                        <tr>
                            <td>Earnings per Day</td>
                            <td class="number">${f(a)}</td>
                            <td>Average daily revenue on active days</td>
                        </tr>
                        <tr>
                            <td>Earnings per Mile</td>
                            <td class="number">${f(o)}</td>
                            <td>Revenue efficiency per mile driven</td>
                        </tr>
                        <tr>
                            <td>Deliveries per Day</td>
                            <td class="number">${(t.total_trips/t.total_days).toFixed(1)}</td>
                            <td>Average delivery volume per active day</td>
                        </tr>
                        <tr>
                            <td>Tip Percentage</td>
                            <td class="number">${s.toFixed(1)}%</td>
                            <td>Tips as percentage of total earnings</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="latex-section">
                <h2>Tax Considerations</h2>
                <p>The following estimates are based on the 2024 IRS standard mileage rate of $0.67 per mile for business use of a vehicle.</p>
                <table class="latex-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Gross Earnings</td>
                            <td class="number">${f(t.total_earnings)}</td>
                        </tr>
                        <tr>
                            <td>Mileage Deduction (${Math.round(t.total_distance).toLocaleString()} mi × $0.67)</td>
                            <td class="number">(${f(n)})</td>
                        </tr>
                        <tr class="latex-total">
                            <td><em>Estimated Taxable Income</em></td>
                            <td class="number"><em>${f(i)}</em></td>
                        </tr>
                    </tbody>
                </table>
                <p class="latex-note"><em>Note:</em> This estimate is for informational purposes only. Consult a qualified tax professional for actual filing requirements and additional deductions.</p>
            </div>
            
            <div class="latex-footer">
                <p>Generated by LastMile Ledger on ${et()}</p>
            </div>
        </div>
    `}function Re(){const t={};r.days.forEach(g=>{const h=new Date(g.date+"T12:00:00").toLocaleDateString("en-US",{month:"long",year:"numeric"});t[h]||(t[h]={earnings:0,trips:0,tips:0,distance:0,days:0}),t[h].earnings+=g.stats.total_earnings,t[h].trips+=g.stats.trip_count,t[h].tips+=g.stats.total_tips,t[h].distance+=g.stats.total_distance,t[h].days+=1});const e=Object.entries(t).reverse();let a=0,o=0,s=0,n=0,i=e.map(([g,m])=>{a+=m.earnings,o+=m.trips,s+=m.tips,n+=m.distance;const h=m.trips>0?m.earnings/m.trips:0;return`
            <tr>
                <td>${g}</td>
                <td class="number">${m.days}</td>
                <td class="number">${m.trips}</td>
                <td class="number">${Math.round(m.distance)}</td>
                <td class="number">${f(m.tips)}</td>
                <td class="number">${f(m.earnings)}</td>
                <td class="number">${f(h)}</td>
            </tr>
        `}).join("");const d=o>0?a/o:0,l=r.stats.total_days>0?a/r.stats.total_days:0,p=n>0?a/n:0;return`
        <div class="print-document print-latex">
            <div class="latex-header">
                <h1 class="latex-title">Monthly Performance Report</h1>
                <p class="latex-subtitle">LastMile Ledger — Period Analysis</p>
                <p class="latex-meta">${e.length} Month${e.length!==1?"s":""} of Activity</p>
            </div>
            
            <div class="latex-abstract">
                <strong>Abstract.</strong> This report provides a month-by-month breakdown of delivery activity, 
                summarizing ${o.toLocaleString()} total deliveries across ${r.stats.total_days} active days 
                with cumulative earnings of ${f(a)}.
            </div>
            
            <div class="latex-section">
                <h2>Summary Statistics</h2>
                <table class="latex-table latex-summary-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Earnings</td>
                            <td class="number">${f(a)}</td>
                            <td>Avg. per Trip</td>
                            <td class="number">${f(d)}</td>
                        </tr>
                        <tr>
                            <td>Total Distance</td>
                            <td class="number">${Math.round(n).toLocaleString()} mi</td>
                            <td>Avg. per Day</td>
                            <td class="number">${f(l)}</td>
                        </tr>
                        <tr>
                            <td>Total Tips</td>
                            <td class="number">${f(s)}</td>
                            <td>Avg. per Mile</td>
                            <td class="number">${f(p)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="latex-section">
                <h2>Monthly Breakdown</h2>
                <p>Table 2 presents detailed monthly statistics for the reporting period.</p>
                <table class="latex-table">
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th class="number">Days</th>
                            <th class="number">Deliveries</th>
                            <th class="number">Miles</th>
                            <th class="number">Tips</th>
                            <th class="number">Earnings</th>
                            <th class="number">$/Trip</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${i}
                    </tbody>
                    <tfoot>
                        <tr class="latex-total">
                            <td><em>Total</em></td>
                            <td class="number"><em>${r.stats.total_days}</em></td>
                            <td class="number"><em>${o.toLocaleString()}</em></td>
                            <td class="number"><em>${Math.round(n).toLocaleString()}</em></td>
                            <td class="number"><em>${f(s)}</em></td>
                            <td class="number"><em>${f(a)}</em></td>
                            <td class="number"><em>${f(d)}</em></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="latex-footer">
                <p>Generated by LastMile Ledger on ${et()}</p>
            </div>
        </div>
    `}function Pe(){let t="",e=0;r.days.slice().reverse().forEach(n=>{const d=new Date(n.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});n.trips.forEach(l=>{e++,t+=`
                <tr class="no-break">
                    <td>${e}</td>
                    <td>${d}</td>
                    <td>${l.request_time}</td>
                    <td>${l.restaurant.substring(0,25)}${l.restaurant.length>25?"...":""}</td>
                    <td class="number">${l.distance.toFixed(1)}</td>
                    <td class="number">${f(l.base_fare)}</td>
                    <td class="number">${f(l.tip)}</td>
                    <td class="number">${f(l.total_pay)}</td>
                </tr>
            `})});const a=r.days.map(n=>new Date(n.date+"T12:00:00")).sort((n,i)=>n-i),o=a.length>0?a[0].toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):"-",s=a.length>0?a[a.length-1].toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}):"-";return`
        <div class="print-document print-latex print-latex-compact">
            <div class="latex-header latex-header-compact">
                <h1 class="latex-title">Complete Delivery Log</h1>
                <p class="latex-meta">${o} — ${s} · ${r.stats.total_trips.toLocaleString()} Deliveries · LastMile Ledger</p>
            </div>
            
            <div class="latex-section">
                <table class="latex-table latex-trips-table">
                    <thead>
                        <tr>
                            <th class="number">#</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Restaurant</th>
                            <th class="number">Mi</th>
                            <th class="number">Fare</th>
                            <th class="number">Tip</th>
                            <th class="number">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${t}
                    </tbody>
                    <tfoot>
                        <tr class="latex-total">
                            <td colspan="4"><em>Totals</em></td>
                            <td class="number"><em>${Math.round(r.stats.total_distance).toLocaleString()}</em></td>
                            <td class="number"><em>${f(r.stats.total_earnings-r.stats.total_tips)}</em></td>
                            <td class="number"><em>${f(r.stats.total_tips)}</em></td>
                            <td class="number"><em>${f(r.stats.total_earnings)}</em></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="latex-footer">
                <p>Generated by LastMile Ledger on ${et()}</p>
            </div>
        </div>
    `}function Ae(){if(S<0||!r||!r.days[S]){console.error("Cannot print: no day selected",{currentDayIndex:S,appData:r}),alert("Please select a day first");return}const t=r.days[S],a=new Date(t.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});let o="";if(B)try{o=B.getCanvas().toDataURL("image/png")}catch(l){console.warn("Could not capture map image:",l)}let s=t.trips.map((l,p)=>`
        <tr class="no-break">
            <td>${p+1}</td>
            <td>${l.request_time||"-"}</td>
            <td>${(l.restaurant||"Unknown").substring(0,30)}${(l.restaurant||"").length>30?"...":""}</td>
            <td class="number">${(l.distance||0).toFixed(1)}</td>
            <td class="number">${f(l.base_fare||0)}</td>
            <td class="number">${f(l.tip||0)}</td>
            <td class="number">${f(l.total_pay||0)}</td>
        </tr>
    `).join("");const n=t.stats.trip_count>0?t.stats.total_earnings/t.stats.trip_count:0;t.stats.total_earnings>0&&t.stats.total_tips/t.stats.total_earnings*100;const i=t.stats.total_distance>0?t.stats.total_earnings/t.stats.total_distance:0,d=`
        <div class="print-document print-latex">
            <div class="latex-header">
                <h1 class="latex-title">Daily Route Report</h1>
                <p class="latex-subtitle">LastMile Ledger</p>
                <p class="latex-meta">${a}</p>
            </div>
            
            <div class="latex-section">
                <h2>Day Summary</h2>
                <table class="latex-table latex-summary-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Metric</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Earnings</td>
                            <td class="number">${f(t.stats.total_earnings)}</td>
                            <td>Deliveries</td>
                            <td class="number">${t.stats.trip_count}</td>
                        </tr>
                        <tr>
                            <td>Tips</td>
                            <td class="number">${f(t.stats.total_tips)}</td>
                            <td>Distance</td>
                            <td class="number">${t.stats.total_distance.toFixed(1)} mi</td>
                        </tr>
                        <tr>
                            <td>Avg. per Trip</td>
                            <td class="number">${f(n)}</td>
                            <td>Avg. per Mile</td>
                            <td class="number">${f(i)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            ${o?`
            <div class="latex-section">
                <h2>Route Visualization</h2>
                <div class="latex-figure">
                    <img src="${o}" alt="Route Map">
                    <p class="latex-caption">Figure 1: Delivery route for ${a}</p>
                </div>
            </div>
            `:""}
            
            <div class="latex-section">
                <h2>Trip Details</h2>
                <p>All deliveries completed on this date.</p>
                <table class="latex-table">
                    <thead>
                        <tr>
                            <th class="number">#</th>
                            <th>Time</th>
                            <th>Restaurant</th>
                            <th class="number">Miles</th>
                            <th class="number">Fare</th>
                            <th class="number">Tip</th>
                            <th class="number">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${s}
                    </tbody>
                    <tfoot>
                        <tr class="latex-total">
                            <td colspan="3"><em>Totals</em></td>
                            <td class="number"><em>${t.stats.total_distance.toFixed(1)}</em></td>
                            <td class="number"><em>${f(t.stats.total_earnings-t.stats.total_tips)}</em></td>
                            <td class="number"><em>${f(t.stats.total_tips)}</em></td>
                            <td class="number"><em>${f(t.stats.total_earnings)}</em></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="latex-footer">
                <p>Generated by LastMile Ledger on ${et()}</p>
            </div>
        </div>
    `;ht(d)}function We(){if(j===null||S<0)return;const t=r.days[S].trips[j],e=r.days[S],o=new Date(e.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}),s=`
        <div class="print-document print-latex print-latex-receipt print-receipt-compact">
            <div class="latex-header latex-header-compact">
                <h1 class="latex-title">Delivery Receipt</h1>
                <p class="latex-meta">Trip #${j+1} — ${o}</p>
            </div>
            
            <div class="latex-section">
                <h2>Trip Details</h2>
                <table class="latex-table latex-table-compact">
                    <tbody>
                        <tr>
                            <td><strong>Restaurant</strong></td>
                            <td>${t.restaurant}</td>
                        </tr>
                        <tr>
                            <td><strong>Time</strong></td>
                            <td>${t.request_time} — ${t.dropoff_time} (${t.duration})</td>
                        </tr>
                        <tr>
                            <td><strong>Distance</strong></td>
                            <td>${t.distance.toFixed(1)} miles</td>
                        </tr>
                        <tr>
                            <td><strong>Pickup</strong></td>
                            <td>${t.pickup_address}</td>
                        </tr>
                        <tr>
                            <td><strong>Dropoff</strong></td>
                            <td>${at(t.dropoff_address)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            
            <div class="latex-section">
                <h2>Earnings</h2>
                <table class="latex-table latex-table-compact">
                    <tbody>
                        <tr>
                            <td>Base Fare</td>
                            <td class="number">${f(t.base_fare)}</td>
                        </tr>
                        ${t.tip>0?`
                        <tr>
                            <td>Tip</td>
                            <td class="number">${f(t.tip)}</td>
                        </tr>
                        `:""}
                        ${t.incentive>0?`
                        <tr>
                            <td>Incentive</td>
                            <td class="number">${f(t.incentive)}</td>
                        </tr>
                        `:""}
                        ${t.order_refund>0?`
                        <tr>
                            <td>Refund</td>
                            <td class="number">${f(t.order_refund)}</td>
                        </tr>
                        `:""}
                    </tbody>
                    <tfoot>
                        <tr class="latex-total">
                            <td><strong>Total</strong></td>
                            <td class="number"><strong>${f(t.total_pay)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="latex-footer">
                <p>LastMile Ledger — ${et()}</p>
            </div>
        </div>
    `;ht(s)}document.addEventListener("keydown",t=>{t.key==="Escape"&&vt()});function Ue(){document.getElementById("tripEntryModal").classList.add("active"),document.getElementById("entryDate").valueAsDate=new Date}function He(){document.getElementById("tripEntryModal").classList.add("active"),S>=0&&r.days[S]?document.getElementById("entryDate").value=r.days[S].date:document.getElementById("entryDate").valueAsDate=new Date}function vt(){document.getElementById("tripEntryModal").classList.remove("active"),document.getElementById("tripEntryForm").reset()}function Oe(t){var D;t.preventDefault();const e=document.getElementById("entryDate").value,a=document.getElementById("entryTime").value,o=document.getElementById("entryRestaurant").value,s=document.getElementById("entryPickup").value||"Not specified",n=document.getElementById("entryDropoff").value||"Not specified",i=parseFloat(document.getElementById("entryDistance").value)||0,d=parseInt(document.getElementById("entryDuration").value)||0,l=parseFloat(document.getElementById("entryBase").value)||0,p=parseFloat(document.getElementById("entryTip").value)||0,g=parseFloat(document.getElementById("entryIncentive").value)||0,m=document.getElementById("entryPlatform").value,h=document.getElementById("entryNotes").value||"",x=l+p+g,w={restaurant:o,request_time:a,dropoff_time:a,duration:d>0?`${d} min`:"N/A",distance:i,pickup_address:s,dropoff_address:n,base_fare:l,tip:p,incentive:g,order_refund:0,total_pay:x,platform:m,notes:h,manual_entry:!0};let y=r.days.findIndex(b=>b.date===e);if(y===-1){const b={date:e,trips:[w],stats:{trip_count:1,total_earnings:x,total_tips:p,total_distance:i,start_time:a,end_time:a}};let E=r.days.findIndex(I=>I.date<e);E===-1?r.days.push(b):r.days.splice(E,0,b)}else{r.days[y].trips.push(w);const b=r.days[y];b.stats.trip_count++,b.stats.total_earnings+=x,b.stats.total_tips+=p,b.stats.total_distance+=i}if(r.stats.total_trips++,r.stats.total_earnings+=x,r.stats.total_tips+=p,r.stats.total_distance+=i,qe(),je(),St(),S!==-1)if(((D=r.days[S])==null?void 0:D.date)===e)Wt(r.days[S]);else{const E=r.days.findIndex(I=>I.date===e);E!==-1&&document.getElementById("mapView").classList.contains("active")&&ot(E)}vt(),W(`Trip added: ${o} - ${f(x)}`)}function qe(){const t=[];r.days.forEach(e=>{e.trips.forEach(a=>{a.manual_entry&&t.push({date:e.date,...a})})}),localStorage.setItem("courierRoutes_offlineTrips",JSON.stringify(t))}function Ne(){const t=localStorage.getItem("courierRoutes_offlineTrips");if(!t)return;JSON.parse(t).forEach(a=>{const{date:o,...s}=a;let n=r.days.findIndex(i=>i.date===o);if(!(n!==-1&&r.days[n].trips.some(d=>d.manual_entry&&d.request_time===s.request_time&&d.restaurant===s.restaurant))){if(n===-1){const i={date:o,trips:[s],stats:{trip_count:1,total_earnings:s.total_pay,total_tips:s.tip,total_distance:s.distance,start_time:s.request_time,end_time:s.request_time}};let d=r.days.findIndex(l=>l.date<o);d===-1?r.days.push(i):r.days.splice(d,0,i),r.stats.total_days++}else{r.days[n].trips.push(s);const i=r.days[n];i.stats.trip_count++,i.stats.total_earnings+=s.total_pay,i.stats.total_tips+=s.tip,i.stats.total_distance+=s.distance}r.stats.total_trips++,r.stats.total_earnings+=s.total_pay,r.stats.total_tips+=s.tip,r.stats.total_distance+=s.distance}})}function W(t){let e=document.getElementById("toast");e||(e=document.createElement("div"),e.id="toast",e.className="toast",document.body.appendChild(e)),e.textContent=t,e.classList.add("show"),setTimeout(()=>{e.classList.remove("show")},3e3)}function je(){const t=document.getElementById("homeEarnings"),e=document.getElementById("homeTrips"),a=document.getElementById("homeDays");t&&(t.textContent=f(r.stats.total_earnings)),e&&(e.textContent=r.stats.total_trips),a&&(a.textContent=r.stats.total_days||r.days.length),Bt()}let $t=[];function Ve(){document.getElementById("batchUploadModal").style.display="flex",$t=[],document.getElementById("batchPreview").style.display="none",document.getElementById("importBtn").disabled=!0}function Ht(){document.getElementById("batchUploadModal").style.display="none",$t=[]}function ze(){let t=0;$t.forEach(e=>{const a={id:`offline_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,date:e.date,time:e.time,restaurant:e.restaurant,pickup:e.pickup,dropoff:e.dropoff,distance:e.distance,duration:e.duration,baseFare:e.baseFare,tip:e.tip,incentive:e.incentive,platform:e.platform,notes:e.notes,total:e.total,isOffline:!0};let o=JSON.parse(localStorage.getItem("offlineTrips")||"[]");o.push(a),localStorage.setItem("offlineTrips",JSON.stringify(o)),t++}),Ht(),W(`Successfully imported ${t} trips!`),typeof loadAllData=="function"&&loadAllData()}let K=null,it=null;function rt(){return ee("courierRoutes_refunds")||[]}function Ot(t){localStorage.setItem("courierRoutes_refunds",JSON.stringify(t))}function Ge(){const t=[];return r.days.forEach(e=>{e.trips.forEach((a,o)=>{a.order_refund&&a.order_refund>0&&t.push({id:`trip_${e.date}_${o}`,date:e.date,platform:"Uber Eats",amount:a.order_refund,reason:"Order refund",notes:a.restaurant,status:"resolved",receipt:null,fromTrip:!0,tripData:{restaurant:a.restaurant,time:a.request_time,total_pay:a.total_pay,service_type:a.service_type}})})}),t}function qt(){const t=Ge(),e=rt();return[...t,...e]}function wt(){const t=qt();rt();const e=t.length,a=t.reduce((d,l)=>d+(l.amount||0),0),o=t.filter(d=>d.status==="pending").length,s=t.filter(d=>d.status==="resolved").length;document.getElementById("totalRefundsCount").textContent=e,document.getElementById("totalRefundsValue").textContent="$"+a.toFixed(2),document.getElementById("pendingRefundsCount").textContent=o,document.getElementById("resolvedRefundsCount").textContent=s;const n=document.getElementById("refundsList");if(t.length===0){n.innerHTML='<div class="refunds-empty">No refunds recorded yet. Click "+ Add Refund" to track one.</div>';return}const i=[...t].sort((d,l)=>new Date(l.date)-new Date(d.date));n.innerHTML=i.map(d=>{const p=new Date(d.date+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),g=!!d.receipt,m=!!d.fromTrip;return`
            <div class="refund-row ${m?"from-trip":""}" onclick="viewRefund('${d.id}')">
                <div class="refund-date">${p}</div>
                <div class="refund-info">
                    <span class="refund-platform">${d.platform}${m?' <span class="refund-source-badge">Trip</span>':""}</span>
                    <span class="refund-reason">${m?d.notes:d.reason}</span>
                </div>
                <div class="refund-amount">-$${d.amount.toFixed(2)}</div>
                <span class="refund-status ${d.status}">${d.status}</span>
                <span class="refund-receipt-indicator ${g?"has-receipt":""}" title="${g?"Has receipt":"No receipt"}">
                    ${g?"IMG":"-"}
                </span>
            </div>
        `}).join("")}function Je(){document.getElementById("addRefundModal").classList.add("active");const e=new Date().toISOString().split("T")[0];document.getElementById("refundDate").value=e,document.getElementById("addRefundForm").reset(),document.getElementById("refundDate").value=e,it=null,document.getElementById("receiptPlaceholder").style.display="flex",document.getElementById("receiptPreview").style.display="none",document.getElementById("receiptPreview").innerHTML=""}function Nt(){document.getElementById("addRefundModal").classList.remove("active"),it=null}function Xe(t){t.stopPropagation(),it=null,document.getElementById("refundReceipt").value="",document.getElementById("receiptPlaceholder").style.display="flex",document.getElementById("receiptPreview").style.display="none",document.getElementById("receiptPreview").innerHTML=""}function Ze(t){t.preventDefault();const e={id:`refund_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,date:document.getElementById("refundDate").value,platform:document.getElementById("refundPlatform").value,amount:parseFloat(document.getElementById("refundAmount").value)||0,reason:document.getElementById("refundReason").value,notes:document.getElementById("refundNotes").value.trim(),status:document.getElementById("refundStatus").value,receipt:it,createdAt:new Date().toISOString()},a=rt();a.push(e),Ot(a),Nt(),wt(),W("Refund recorded successfully!")}function Qe(t){const a=qt().find(m=>m.id===t);if(!a)return;K=t;const o=a.fromTrip||!1,s=document.getElementById("viewRefundModal"),n=document.getElementById("viewRefundBody"),i=document.getElementById("deleteRefundBtn");i&&(i.style.display=o?"none":"block");const l=new Date(a.date+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});let p="";a.receipt&&(a.receipt.type&&a.receipt.type.startsWith("image/")?p=`
                <div class="refund-receipt-view">
                    <div class="refund-detail-label">Receipt</div>
                    <img src="${a.receipt.data}" alt="Receipt">
                </div>
            `:p=`
                <div class="refund-receipt-view">
                    <div class="refund-detail-label">Receipt</div>
                    <a href="${a.receipt.data}" download="${a.receipt.name}">${a.receipt.name} (Download)</a>
                </div>
            `);let g="";o&&a.tripData&&(g=`
            <div class="refund-detail-item full-width">
                <span class="refund-detail-label">Trip Details</span>
                <span class="refund-detail-value">${a.tripData.restaurant} at ${a.tripData.time} - Total pay: $${a.tripData.total_pay.toFixed(2)}</span>
            </div>
        `),n.innerHTML=`
        <div class="refund-detail-grid">
            <div class="refund-detail-item">
                <span class="refund-detail-label">Date</span>
                <span class="refund-detail-value">${l}</span>
            </div>
            <div class="refund-detail-item">
                <span class="refund-detail-label">Amount</span>
                <span class="refund-detail-value amount">-$${a.amount.toFixed(2)}</span>
            </div>
            <div class="refund-detail-item">
                <span class="refund-detail-label">Platform</span>
                <span class="refund-detail-value">${a.platform}${o?' <span class="refund-source-badge">From Trip Data</span>':""}</span>
            </div>
            <div class="refund-detail-item">
                <span class="refund-detail-label">Status</span>
                <span class="refund-status ${a.status}">${a.status}</span>
            </div>
            <div class="refund-detail-item full-width">
                <span class="refund-detail-label">${o?"Restaurant":"Reason"}</span>
                <span class="refund-detail-value">${o?a.notes:a.reason}</span>
            </div>
            ${g}
            ${!o&&a.notes?`
            <div class="refund-detail-item full-width">
                <span class="refund-detail-label">Notes</span>
                <span class="refund-detail-value">${a.notes}</span>
            </div>
            `:""}
        </div>
        ${p}
    `,s.classList.add("active")}function jt(){document.getElementById("viewRefundModal").classList.remove("active"),K=null}function Ke(){if(!K)return;if(K.startsWith("trip_")){W("Cannot delete trip-based refunds");return}if(!confirm("Are you sure you want to delete this refund record?"))return;const e=rt().filter(a=>a.id!==K);Ot(e),jt(),wt(),W("Refund deleted")}window.showPage=Z;window.showLogin=_e;window.showSignup=xe;window.openTripEntry=Ue;window.closeTripEntry=vt;window.openTripEntryForDay=He;window.navigateWeekPage=we;window.goToCurrentWeekPage=be;window.filterByMonth=ye;window.showInsightDetail=me;window.navigateDay=ke;window.closeDetail=Ce;window.printTripTicket=We;window.printDayReport=Ae;window.printReport=Me;window.closeOnboarding=At;window.goToStep=yt;window.completeOnboarding=Ie;window.skipToManual=Te;window.connectPlatform=Ee;window.openBatchUpload=Ve;window.closeBatchUpload=Ht;window.importBatchTrips=ze;window.showAddRefundModal=Je;window.closeAddRefundModal=Nt;window.closeViewRefundModal=jt;window.deleteCurrentRefund=Ke;window.openDay=ot;window.filterEfficiencyTrips=ue;window.searchRestaurant=Mt;window.selectTrip=Ut;window.toggleDetailPickup=Be;window.viewRefund=Qe;window.removeReceipt=Xe;window.globalSearchHandler=ge;window.submitRefund=Ze;window.saveTripEntry=Oe;document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Tt):Tt();
