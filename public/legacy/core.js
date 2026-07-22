
// ============================================================
// GLOBAL DATA-PAGE CLICK DISPATCHER
// ============================================================
document.addEventListener('click', function(e) {
const el = e.target.closest('[data-page]');
if (!el) return;
if (el.closest('#modal-overlay') || el.closest('#wan-popup')) return;
const page = el.getAttribute('data-page');
const param = el.getAttribute('data-param') || null;
if (page) showPage(page, param);
});

document.addEventListener('click', function(e) {
const p = document.getElementById('wan-popup');
if (p && p.style.display !== 'none' && !p.contains(e.target) && !e.target.classList.contains('wan-badge')) {
p.style.display = 'none';
var m=document.getElementById('main-content');if(m){m.style.overflow='';m.style.touchAction='';if(m._wanWheelHandler)m.removeEventListener('wheel',m._wanWheelHandler);}
}
});
let toastTimer = null;

function showToast(
    message,
    type = 'info'
) {

    const el =
        document.getElementById(
            'toast'
        );


    if (
        !el
    ) {

        console.log(
            `[${type.toUpperCase()}]`,
            message
        );

        return;

    }


    const validTypes = [

        'success',

        'error',

        'warning',

        'info'

    ];


    if (
        !validTypes.includes(
            type
        )
    ) {

        type =
            'info';

    }


    const icons = {

        success:
            '✓',

        error:
            '✕',

        warning:
            '⚠',

        info:
            'ⓘ'

    };


    /*
    ==========================================
    CLEAR PREVIOUS TOAST TIMER
    ==========================================
    */

    if (
        toastTimer
    ) {

        clearTimeout(
            toastTimer
        );

        toastTimer =
            null;

    }


    /*
    ==========================================
    HIDE CURRENT TOAST FIRST
    ==========================================
    */

    el.classList.remove(
        'show'
    );


    /*
    ==========================================
    SET CONTENT AFTER SMALL DELAY
    ==========================================
    */

    setTimeout(
        () => {

            el.innerHTML = `

                <div class="toast-icon">
                    ${icons[type]}
                </div>

                <div
                    class="toast-message"
                    title="${escHtml(
                        String(message)
                    )}"
                >
                    ${escHtml(
                        String(message)
                    )}
                </div>

                <button
                    type="button"
                    class="toast-close"
                    onclick="hideToast()"
                    aria-label="Close notification"
                >
                    ×
                </button>

            `;


            /*
            ==================================
            RESET TYPE CLASS
            ==================================
            */

            el.className =
                'toast toast-' +
                type;


            /*
            ==================================
            SHOW
            ==================================
            */

            requestAnimationFrame(
                () => {

                    el.classList.add(
                        'show'
                    );

                }
            );


            /*
            ==================================
            AUTO HIDE
            ==================================
            */

            toastTimer =
                setTimeout(
                    () => {

                        hideToast();

                    },

                    3000

                );

        },

        100

    );

}





function hideToast() {

    const el =
        document.getElementById('toast');

    if (!el) {
        return;
    }

    el.classList.remove(
        'show'
    );

    if (toastTimer) {

        clearTimeout(
            toastTimer
        );

        toastTimer = null;

    }

}
// ============================================================
// STATE
// ============================================================
let API_URL = localStorage.getItem('eb_api_url') || '';
let session = null;
let db = {
subnets: {}, internalSubnets: {}, wan: [], tunnels: [], vpn: [], vlans: [], vlanCdnList: [], vlanReservedRanges: [],
dspList: []
};
let REAL_SUBNETS = [];
const BLOCK_SIZES  = [1,4,8,16,32,64,128,256];
const VPN_TYPES    = ['PPTP','OVPN','SSTP','L2TP','IPSEC','WIREGUARD'];
let currentSubnet = null;
let currentInternalSubnet = null;
let currentPage =
sessionStorage.getItem("EB_CURRENT_PAGE");
let currentFilter = 'all', currentClientFilter = 'all', currentSearch = '';
let currentColFilters = {};
let currentPageNum = 1;
const PAGE_SIZE = 50;
let currentVlanPage = 1;
const VLAN_PAGE_SIZE = 15;
let currentWanPage = 1;
const WAN_PAGE_SIZE = 15;
let currentTunnelPage = 1;
const TUNNEL_PAGE_SIZE = 15;
let currentCredPage = 1;
const CRED_PAGE_SIZE = 10;
let currentVpnPage = 1;
const VPN_PAGE_SIZE = 15;
let currentSearchPage = 1;
const SEARCH_PAGE_SIZE = 25;

// ============================================================
// IP MATH
// ============================================================
function ipToNum(ip) { return ip.split('.').reduce((a,o)=>(a<<8)+parseInt(o),0)>>>0; }
function numToIp(n) { return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.'); }
function sizeToPrefix(s) { return s===1 ? 32 : 32-Math.round(Math.log2(s)); }
function prefixToSize(p) { return p===32 ? 1 : Math.pow(2,32-p); }

function calcBlock(startIp, size) {
const base = ipToNum(startIp);
const prefix = sizeToPrefix(size);
const ips = [];
for (let i=0;i<size;i++) ips.push(numToIp(base+i));
return { prefix, ips, network:numToIp(base), broadcast:size>1?numToIp(base+size-1):null, hostMin:numToIp(size===1?base:base+1), hostMax:numToIp(size<=1?base:base+size-2) };
}

function mkBlockSizeOpts(selected) {
return BLOCK_SIZES.map(s => {
const pfx = sizeToPrefix(s);
const hosts = s===1?1:s-2;
return '<option value="'+s+'"'+(selected===s?' selected':'')+'>/'+pfx+' — '+s+' IP'+(s>1?'s':'')+' ('+hosts+' host'+(hosts!==1?'s':'')+')</option>';
}).join('');
}

// ============================================================
// IP / SUBNET VALIDATION
// ============================================================
function isValidIP(ip) {
if (!ip) return false;
const parts = ip.split('.');
if (parts.length !== 4) return false;
return parts.every(p => {
const n = parseInt(p, 10);
return p !== '' && !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
});
}
function validateIPInput(el) {
const val = el.value.trim();
if (!val) { el.classList.remove('ip-invalid','ip-valid'); return; }
if (isValidIP(val)) { el.classList.remove('ip-invalid'); el.classList.add('ip-valid'); }
else { el.classList.remove('ip-valid'); el.classList.add('ip-invalid'); }
}
function isValidSubnet(val) {
if (!val) return false;
const m = val.match(/^(\d+\.\d+\.\d+\.\d+)(?:\/(\d+))?$/);
if (!m) return false;
const parts = m[1].split('.');
if (!parts.every(p=>parseInt(p,10)>=0&&parseInt(p,10)<=255)) return false;
if (m[2]!==undefined){const pfx=parseInt(m[2],10);if(pfx<0||pfx>32)return false;}
return true;
}
function validateSubnetInput(el) {
const val = el.value.trim();
if (!val) { el.classList.remove('ip-invalid','ip-valid'); return; }
if (isValidSubnet(val)) { el.classList.remove('ip-invalid'); el.classList.add('ip-valid'); }
else { el.classList.remove('ip-valid'); el.classList.add('ip-invalid'); }
}

// ============================================================
// BLOCK GROUPING
// ============================================================
function groupBlocks(filtered, allData, ipKey) {
const blocks = [], seen = new Set();
filtered.forEach(r => {
const idx = allData.indexOf(r);
if (seen.has(idx)) return;
const bid = r.block_id;
if (bid && bid !== r[ipKey]+'/32') {
const brows = allData.map((rr,ii)=>({r:rr,idx:ii})).filter(x=>x.r.block_id===bid&&filtered.includes(x.r));
brows.forEach(x=>seen.add(x.idx));
blocks.push({type:'block',block_id:bid,rows:brows,lead:r,leadIdx:idx});
} else {
seen.add(idx);
blocks.push({type:'single',r,idx});
}
});
return blocks;
}

// ============================================================
// ESCAPE HELPERS
// ============================================================
function escAttr(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ============================================================
// API
// ============================================================
async function api(action, payload={}) {
setSyncing(true);
try {
const res = await fetch(API_URL,{method:'POST',body:JSON.stringify({action,user:session?.username,password:session?.password,payload})});
const data = await res.json();
setSyncing(false); return data;
} catch(e) { setSyncing(false,true); return {ok:false,error:e.message}; }
}
async function bgSync(action, payload, onFail) {
const res = await api(action, payload);
if (!res.ok) { showToast('⚠️ Sheets sync failed: '+res.error,'error'); if(onFail)onFail(); }
}
function setSyncing(on,err=false) {
const dot=document.getElementById('sync-dot'), lbl=document.getElementById('sync-label');
if(!dot)return;
dot.className='sync-dot'+(err?' error':on?' syncing':'');
if(lbl)lbl.textContent=err?'Error':on?'Syncing…':'Live';
// Freeze UI while syncing — skip if initial loading overlay is active
const overlay=document.getElementById('sync-freeze-overlay');
const loadingOverlay=document.getElementById('loading-overlay');
const isInitialLoad=loadingOverlay&&loadingOverlay.classList.contains('show');
if(overlay&&!isInitialLoad){
  if(on){
    overlay.classList.add('active');
    const lbl2=document.getElementById('sync-freeze-label');
    if(lbl2)lbl2.textContent='Syncing…';
  } else {
    overlay.classList.remove('active');
  }
}
}

// ============================================================
// SETUP & AUTH
// ============================================================
function forceShowSetup(){localStorage.removeItem('eb_api_url');API_URL='';document.getElementById('setup-banner').classList.add('show');const i=document.getElementById('api-url-input');if(i){i.value='';i.focus();}}
function checkSetup(){if(!API_URL)document.getElementById('setup-banner').classList.add('show');else document.getElementById('setup-banner').classList.remove('show');}
function saveApiUrl(){
const val=document.getElementById('api-url-input').value.trim();
if(!val.startsWith('https://script.google.com/')){showToast('URL must be a Google Apps Script URL (https://script.google.com/…)','error');return;}
API_URL=val;localStorage.setItem('eb_api_url',val);
document.getElementById('setup-banner').classList.remove('show');showToast('API URL saved ✓','success');
}

async function doLogin() {
const username=document.getElementById('login-user').value.trim();
const password=document.getElementById('login-pass').value;
const errEl=document.getElementById('login-error');
const btn=document.getElementById('login-btn');
if(!API_URL){errEl.textContent='Configure API URL first';errEl.classList.add('show');return;}
if(!username||!password){errEl.textContent='Enter username and password';errEl.classList.add('show');return;}
btn.disabled=true;btn.textContent='Signing in…';showLoading(true);
try {
const res=await fetch(API_URL,{method:'POST',body:JSON.stringify({action:'login',user:username,password})});
const data=await res.json();
if(data.ok){session={username,password,role:data.role,perms:data.perms||{}};errEl.classList.remove('show');await loadAllData();showApp();}
else{errEl.textContent=data.error||'Login failed';errEl.classList.add('show');}
} catch(e){errEl.textContent='Cannot connect. Check API URL.';errEl.classList.add('show');}
btn.disabled=false;btn.textContent='Sign In →';showLoading(false);
}

function logout(){doLogout();}
function doLogout(){session=null;
window._usersPageSelected=null;
var _na=document.getElementById('no-access-screen');
if(_na)_na.style.display='none';
document.getElementById('login-screen').classList.remove('hidden');document.getElementById('topbar').style.display='none';document.getElementById('app-layout').style.display='none';document.getElementById('login-user').value='';document.getElementById('login-pass').value='';checkSetup();}

function showApp() {

    // Clear previous active menu
    document.querySelectorAll(
        '.nav-item, .sidebar-item, .menu-link, .sidebar-btn, .menu-item'
    ).forEach(el => {
        el.classList.remove('active');
    });

     const token = sessionStorage.getItem("authToken");

    if(!token){

        // user is logged out
        const loginScreen =
            document.getElementById('login-screen');

        const topbar =
            document.getElementById('topbar');

        const appLayout =
            document.getElementById('app-layout');


        loginScreen?.classList.remove('hidden');


        if(topbar){
            topbar.style.display='none';
        }


        if(appLayout){
            appLayout.style.display='none';
        }


        return;
    }

    const loginScreen =
        document.getElementById('login-screen');

    const topbar =
        document.getElementById('topbar');

    const appLayout =
        document.getElementById('app-layout');

    const userLabel =
        document.getElementById('user-label');

    const roleDot =
        document.getElementById('role-dot');

    const noAccessScreen =
        document.getElementById('no-access-screen');


    // Hide login screen
    loginScreen?.classList.add('hidden');


    // Show application
    if (topbar) {
        topbar.style.display = 'flex';
    }

    if (appLayout) {
        appLayout.style.display = 'flex';
    }


    // User information
    if (userLabel) {
        userLabel.textContent =
            session?.username || '';
    }

    if (roleDot) {
        roleDot.className =
            'role-dot ' +
            (session?.role || '');
    }


    // Users navigation
    const usersWrap =
        document.getElementById('nav-users-wrap');

    if (usersWrap) {

        usersWrap.style.display =
            (
                can('manageUsers') ||
                canSee('seeUsers')
            )
                ? 'block'
                : 'none';

    }


    // Build subnet navigation
    if (window.REAL_SUBNETS) {
        buildSidebarNav();
    }


    const PAGE_ORDER = [

        'dashboard',
        'subnet',
        'internal',
        'wan',
        'vlan',
        'tunnels',
        'vpn',
        'dsp',
        'search',
        'credentials',
        'users'

    ];


    const PAGE_PERM = {

        dashboard: 'seeDashboard',
        subnet: 'seeRealIP',
        internal: 'seeFakeIP',
        wan: 'seeWan',
        vlan: 'seeVlan',
        tunnels: 'seeTunnels',
        vpn: 'seeVpn',
        dsp: 'seeDsp',
        search: 'seeSearch',
        credentials: 'seeCredentials',
        users: 'seeUsers'

    };


    let firstPage = null;


    for (const page of PAGE_ORDER) {

        if (canSee(PAGE_PERM[page])) {

            firstPage = page;

            break;

        }

    }


   const savedPage =
    sessionStorage.getItem(
        "EB_CURRENT_PAGE"
    );


if(savedPage && savedPage !== "navbar") {

    showPage(savedPage);

}
else {

    return;

}
    // If subnet is the first available page,
    // select the first subnet directly
    if (
        firstPage === 'subnet' &&
        window.REAL_SUBNETS &&
        REAL_SUBNETS.length > 0
    ) {

        showPage(
            'subnet',
            REAL_SUBNETS[0]
        );

    } else {

        showPage(firstPage);

    }

}
function isAdmin(){return session?.role==='admin';}
function isEditor(){return session?.role==='editor';}
const DEFAULT_PERMISSIONS = {

admin: {
assignReal:true,
editReal:true,
deleteRealSubnet:true,

assignFake:true,
editFake:true,
deleteFake:true,

addFakeSubnet:true,
deleteFakeSubnet:true,

addRealSubnet:true,

deleteRealSubnet:true,


addWan:true,
editWan:true,
deleteWan:true,
addTunnel:true,
editTunnel:true,
deleteTunnel:true,
addVpn:true,
editVpn:true,
deleteVpn:true,
addDsp:true,
editDsp:true,
deleteDsp:true,
addVlan:true,
editVlan:true,
deleteVlan:true,
manageUsers:true,
exportExcel:true
},

editor: {

    // Real IP
    assignReal:true,
    editReal:true,
    deleteRealSubnet:false,
    addRealSubnet:true,
  editRealIpSubnet:true,

    // Fake IP
    assignFake:true,
    editFake:true,
    deleteFake:false,
    addFakeSubnet:false,
    deleteFakeSubnet:false,

    // WAN
    addWan:true,
    editWan:true,
    deleteWan:false,

    // Tunnels
    addTunnel:true,
    editTunnel:true,
    deleteTunnel:false,

    // VPN
    addVpn:true,
    editVpn:true,
    deleteVpn:false,

    // DSP
    addDsp:false,
    editDsp:false,
    deleteDsp:false,

    // VLAN
    addVlan:true,
    editVlan:true,
    deleteVlan:false,

    // Credentials
    addCredentials:false,
    editCredentials:false,
    deleteCredentials:false,

    manageUsers:false,
    exportExcel:false,


    // Visibility
    seeDashboard:true,
    seeRealIP:true,
    seeFakeIP:true,
    seeWan:true,
    seeVlan:true,
    seeTunnels:true,
    seeVpn:true,
    seeDsp:true,
    seeSearch:true,
    seeCredentials:false,
    seeUsers:false
},


viewer: {

    // Real IP
    assignReal:false,
    editReal:false,
    deleteRealSubnet:false,
    addRealSubnet:true,
  

    // Fake IP
    assignFake:false,
    editFake:false,
    deleteFake:false,
    addFakeSubnet:false,
    deleteFakeSubnet:false,

    // WAN
    addWan:false,
    editWan:false,
    deleteWan:false,

    // Tunnels
    addTunnel:false,
    editTunnel:false,
    deleteTunnel:false,

    // VPN
    addVpn:false,
    editVpn:false,
    deleteVpn:false,

    // DSP
    addDsp:false,
    editDsp:false,
    deleteDsp:false,

    // VLAN
    addVlan:false,
    editVlan:false,
    deleteVlan:false,

    // Credentials
    addCredentials:false,
    editCredentials:false,
    deleteCredentials:false,

    manageUsers:false,
    exportExcel:false,


    // Visibility
    seeDashboard:true,
    seeRealIP:true,
    seeFakeIP:true,
    seeWan:true,
    seeVlan:true,
    seeTunnels:true,
    seeVpn:true,
    seeDsp:true,
    seeSearch:true,
    seeCredentials:false,
    seeUsers:false
}

};
function can(action){
if(!session)return false;
if(session.role==='admin')return true;
const p=session.perms||{};
if(p[action]!==undefined)return !!p[action];
return !!(DEFAULT_PERMISSIONS[session.role||'viewer']||DEFAULT_PERMISSIONS.viewer)[action];
}
function roleBadge(r){const m={admin:'badge-admin',editor:'badge-editor',viewer:'badge-viewer'};return '<span class="badge '+(m[r]||'badge-gray')+'">'+(r||'viewer').toUpperCase()+'</span>';}

// ============================================================
// DATA
// ============================================================
function normalizeSubnet(ip, prefix) {
    const p = ip.split('.').map(Number);
    
    // Handle invalid IP inputs gracefully
    if (p.length !== 4 || p.some(isNaN)) {
        return ip + "/" + prefix;
    }

    // Convert IP to a 32-bit unsigned integer
    const ipInt = (p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3];

    // Calculate subnet mask from prefix length (e.g., prefix 32 -> 0xFFFFFFFF)
    // Using >>> 0 ensures it treats the result as an unsigned 32-bit integer
    const maskInt = prefix === 0 ? 0 : (~((1 << (32 - prefix)) - 1)) >>> 0;

    // Apply bitwise AND to get the true network address integer
    const netInt = (ipInt & maskInt) >>> 0;

    // Convert 32-bit integer back to dotted-decimal notation
    const networkIp = [
        (netInt >>> 24) & 255,
        (netInt >>> 16) & 255,
        (netInt >>> 8) & 255,
        netInt & 255
    ].join('.');

    return networkIp + "/" + prefix;
}
async function loadAllData(){

    showLoading(true);

    const [permsRes, dataRes] = await Promise.all([
        api('login'),
        api('getAll')
    ]);

    showLoading(false);


    if(permsRes.ok){

        session.role  = permsRes.role;
        session.perms = permsRes.perms || {};

        const rd = document.getElementById('role-dot');
        if(rd) rd.className = 'role-dot ' + session.role;

        const uw = document.getElementById('nav-users-wrap');
        if(uw){
            uw.style.display =
                (can('manageUsers') || canSee('seeUsers'))
                ? 'block'
                : 'none';
        }
    }


    if(dataRes.ok){


        if(
            dataRes.data.tunnels === undefined ||
            dataRes.data.vpn === undefined ||
            dataRes.data.vlans === undefined
        ){

            setTimeout(()=>alert(
                '⚠️ WARNING: Your Google Apps Script is still V9!'
            ),1000);

        }



        /*
        ============================
        LOAD DATA FROM API FIRST
        ============================
        */

        db.subnets = dataRes.data.subnets || {};

        db.internalSubnets =
            dataRes.data.internalSubnets || {};



        /*
        ============================
        LOAD LOCAL STORAGE OVERRIDES
        ============================
        */


     /*
============================
LOAD REAL SUBNETS FROM API
============================
*/

/*
============================
LOAD REAL SUBNETS FROM API
============================
*/

const realSubnets = await fetchRealIpSubnets();


console.log(
    "REAL SUBNETS API RESPONSE:",
    realSubnets
);


/*
============================
GROUP REAL IP ROWS
============================
*/
const clientsRes = await fetch(
    "http://10.249.2.9/api/ip-manager/clients",
    {
        headers:{
            Authorization:`Bearer ${sessionStorage.getItem("authToken")}`
        }
    }
);

const clientsData = await clientsRes.json();

db.clients = clientsData.data || [];
// Attach client names to subnet records
const clientMap = {};

db.clients.forEach(c=>{
    clientMap[c.id] = c.client_name;
});


Object.keys(db.subnets).forEach(subnet=>{

    db.subnets[subnet] = db.subnets[subnet].map(row=>{

        return {

            ...row,

            client_name:
                row.client_name ||
                clientMap[row.client_id] ||
                null,

            dsp:
                row.dsp ||
                clientMap[row.dsp_id] ||
                null

        };

    });

});
db.subnets = {};

realSubnets.forEach(item => {
    if(!item.real_ip_block) return;

    const [ip, prefix] = item.real_ip_block.split('/');
    const subnetKey = normalizeSubnet(ip, Number(prefix));

    if(!db.subnets[subnetKey]){
        db.subnets[subnetKey] = [];
    }

    // CHECK IF THIS EXACT RECORD ID ALREADY EXISTS IN THE ARRAY
    const exists = db.subnets[subnetKey].some(existing => existing.id === item.id);

    if(!exists) {
        db.subnets[subnetKey].push(item);
    }
});



console.log(
    "GROUPED SUBNETS",
    db.subnets
);


console.log(
    "REAL SUBNETS DB:",
    db.subnets
);


console.log(
    "REAL SUBNETS DB:",
    db.subnets
);


      // INTERNAL FAKE SUBNETS
const savedInternal =
    localStorage.getItem("internalSubnetData");


if(savedInternal){

    const localInternal = JSON.parse(savedInternal);

    db.internalSubnets = {
        ...db.internalSubnets,
        ...localInternal
    };

}





        /*
        ============================
        OTHER DATA
        ============================
        */

        db.wan =
            dataRes.data.wan || [];

        db.tunnels =
            dataRes.data.tunnels || [];

        db.vpn =
            dataRes.data.vpn || [];
            db.clients =
    dataRes.data.clients || [];

        db.vlans =
            (dataRes.data.vlans || [])
            .slice()
            .sort(
                (a,b)=>
                parseInt(a.vlan_id,10)
                -
                parseInt(b.vlan_id,10)
            );


        db.vlanCdnList =
            dataRes.data.vlanCdnList ||
            [
                'AKAMAI',
                'CLOUDFLARE',
                'LIMELIGHT',
                'FASTLY',
                'AWS CLOUDFRONT'
            ];


        db.vlanReservedRanges =
            dataRes.data.vlanReservedRanges || [];


     await fetchDSPs();


        /*
        ============================
        UPDATE LOCAL STORAGE
        KEEP DATA SAFE
        ============================
        */


       
localStorage.setItem(
    "internalSubnetData",
    JSON.stringify(db.internalSubnets)
);

       



    }
    else{

        showToast(
            'Failed to load: '+dataRes.error,
            'error'
        );

    }



    // rebuild subnet lists
    REAL_SUBNETS = Object.keys(db.subnets);


    buildSidebarNav();

    updateTopStats();

}
async function refreshData(){await loadAllData();buildSidebarNav();render();showToast('Refreshed ✓','success');}
function genSubnet(base, size = 256) {

    const p = base.split('.').map(Number);

    const prefixMap = {
        256:24,
        128:25,
        64:26,
        32:27,
        16:28,
        8:29,
        4:30
    };

    const records = Array.from(
        {length:size},
        (_,i)=>({
            real_ip:`${p[0]}.${p[1]}.${p[2]}.${i}`,
            client_id:'',
            client_name:'',
            fake_ip:'',
            vlan_id:'',
            dsp:'',
            block_id:''
        })
    );

    records.prefix = prefixMap[size];

    return records;   // <-- MUST EXIST
}
function genInternalSubnet(base,count=256){const p=base.split('.');return Array.from({length:count},(_,i)=>({internal_ip:`${p[0]}.${p[1]}.${p[2]}.${i}`,client_id:'',client_name:'',block_id:''}));}

// ============================================================
// SIDEBAR
// ============================================================

function selectSubnet(sub){

    currentSubnet=sub;
    currentInternalSubnet=null;

    // remove subnet active
    document.querySelectorAll('.nav-sub')
    .forEach(el=>el.classList.remove('active'));


    const item=document.querySelector(
        `[data-param="${CSS.escape(sub)}"]`
    );

    if(item)
        item.classList.add('active');


    showPage('subnet',sub);

}
function selectInternalSubnet(sub){

    currentInternalSubnet=sub;
    currentSubnet=null;


    document.querySelectorAll('.nav-sub')
    .forEach(el=>el.classList.remove('active'));


    const item=document.querySelector(
        `[data-param="${CSS.escape(sub)}"]`
    );

    if(item)
        item.classList.add('active');


    showPage('internal',sub);

}
function buildSidebarNav(){

console.log("BUILD SIDEBAR CALLED");


// ============================
// ACTIVE NAV HANDLER
// ============================

document.querySelectorAll('.nav-item')
.forEach(function(el){

    el.classList.remove('active');

});


const activeIdMap = {

    dashboard:'nav-dashboard',
    vlan:'nav-vlan',
    tunnels:'nav-tunnels',
    vpn:'nav-vpn',
    search:'nav-search',
    dsp:'nav-dsp',
    credentials:'nav-credentials',
    clients:'nav-clients',
    wan:'nav-wan'

};


if(activeIdMap[currentPage]){

    const activeEl =
        document.getElementById(
            activeIdMap[currentPage]
        );

    if(activeEl)
        activeEl.classList.add('active');

}



// ============================
// REAL SUBNETS
// ============================

const sni=document.getElementById('subnet-nav-items');

console.log("Subnet nav element:",sni);


if(sni){


const subnets=Object.keys(db.subnets || {});


sni.innerHTML =
subnets.map(s=>{


const d =
Array.isArray(db.subnets[s])
?
db.subnets[s]
:
[db.subnets[s]];


const assigned =
d.filter(
r=>r && r.client_id
).length;


const sid =
s
.replace(/\./g,'-')
.replace('/','-');


const prefix =
s.includes("/")
?
s.split("/")[1]
:
24;


const total =
Math.pow(
2,
32-parseInt(prefix,10)
);



return `

<div

class="nav-item nav-sub ${currentPage==='subnet' && currentSubnet===s?'active':''}"

data-page="subnet"

data-param="${escAttr(s)}"

id="nav-subnet-${sid}"

onclick="selectSubnet('${escAttr(s)}')"

>


<span class="nav-icon">
🌐
</span>


${escHtml(s)}


<span class="nav-badge">
${assigned}/${total}
</span>


</div>

`;


}).join('');



if (can('addRealSubnet')) {

    sni.innerHTML += `
    <div
        class="nav-item nav-sub"
        onclick="addRealSubnet()"
        style="
            color:var(--green);
            font-size:12px;
            cursor:pointer;
        "
    >
        <span class="nav-icon">＋</span>
        Add Subnet
    </div>`;
}


}



// ============================
// INTERNAL SUBNETS
// ============================


const ini=document.getElementById('internal-nav-items');


if(ini){


const keys=
Object.keys(
db.internalSubnets || {}
);



if(!keys.length){


ini.innerHTML =

`

<div class="nav-item nav-sub"
style="
color:var(--text3);
font-size:12px;
font-style:italic;
cursor:default;
">

<span class="nav-icon">
—
</span>

None configured

</div>

`;


if(can('addFakeSubnet')){


ini.innerHTML += `

<div

class="nav-item nav-sub"

onclick="addInternalSubnet()"

style="
color:var(--green);
font-size:12px;
"

>

<span class="nav-icon">
＋
</span>

Add Subnet

</div>

`;

}



}else{


ini.innerHTML =

keys.map(s=>{


const d =
db.internalSubnets[s] || [];


const assigned =
d.filter(
r=>r.client_id
).length;


const sid =
s.replace(/\./g,'-');



return `


<div

class="nav-item nav-sub ${currentPage==='internal' && currentInternalSubnet===s?'active':''}"

data-page="internal"

data-param="${escAttr(s)}"

id="nav-internal-${sid}"

onclick="selectInternalSubnet('${escAttr(s)}')"

>


<span class="nav-icon">
🔒
</span>


${escHtml(s)}


<span class="nav-badge">
${assigned}/${d.length}
</span>


</div>


`;


}).join('');



if(can('addFakeSubnet')){


ini.innerHTML += `

<div

class="nav-item nav-sub"

onclick="addInternalSubnet()"

style="
color:var(--green);
font-size:12px;
"

>

<span class="nav-icon">
＋
</span>

Add Subnet

</div>

`;

}


}


}



// ============================
// BADGES
// ============================


const badges={

'badge-vlan':db.vlans?.length || 0,

'badge-wan':db.wan?.length || 0,

'badge-tunnels':db.tunnels?.length || 0,

'badge-vpn':db.vpn?.length || 0,

'badge-dsp':db.dspList?.length || 0,

'badge-credentials':db.credentials?.length || 0,

'badge-clients':db.clients?.length || 0

};


Object.keys(badges)
.forEach(id=>{

const el=document.getElementById(id);

if(el)
el.textContent=badges[id];

});


}



async function confirmAddInternalSubnet() {
    const base = document.getElementById('f_base').value.trim();
    const size = Number(document.getElementById('f_size').value);

    const prefixMap = {
        256: 24,
        128: 25,
        64: 26,
        32: 27,
        16: 28,
        8: 29,
        4: 30
    };

    const prefix = prefixMap[size];

    if (!prefix) {
        showToast("Invalid subnet size", "error");
        return;
    }

    if (!isValidIP(base)) {
        showToast("Invalid IP", "error");
        return;
    }

    const token = sessionStorage.getItem("authToken");

    const payload = {
        internal_ip_block: `${base}/${prefix}`
    };

    console.log("CREATE INTERNAL SUBNET PAYLOAD:", payload);

    try {
        const response = await fetch(
            "http://10.249.2.9/api/ip-manager/internal-ip-subnets",
            {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            }
        );

        const text = await response.text();

        console.log("SERVER:", response.status, text);

        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            throw new Error("Invalid server response");
        }

        if (!response.ok || result.ok === false) {
            throw new Error(result.error || "Create failed");
        }

        await loadAllData();
        closeModal();

        showPage("internal", base);
        render();

        showToast("Subnet created successfully", "success");

    } catch (err) {
        console.error("CREATE ERROR:", err);
        showToast(err.message, "error");
    }
}
function generateSubnetIPs(base, prefix){

    const parts = base.split('.').map(Number);

    const start =
        ((parts[0] << 24) >>> 0) +
        (parts[1] << 16) +
        (parts[2] << 8) +
        parts[3];


    const total =
        Math.pow(2, 32 - prefix);


    const ips = [];


    for(let i = 0; i < total; i++){

        const ip = start + i;


        ips.push([
            (ip >>> 24) & 255,
            (ip >>> 16) & 255,
            (ip >>> 8) & 255,
            ip & 255
        ].join('.'));

    }


    return ips;
}

async function updateRealIpSubnet(req,res){

    try {

        const id = req.params.id;


        const {
            client_id,
            client_name,
            fake_ip,
            vlan_id,
            dsp_id,
            wan
        } = req.body;



        await db.query(
            `
            UPDATE real_ip_subnets
            SET
                client_id = ?,
                client_name = ?,
                fake_ip = ?,
                vlan_id = ?,
                dsp_id = ?,
                wan = ?
            WHERE id = ?
            `,
            [
                client_id,
                client_name,
                fake_ip,
                vlan_id,
                dsp_id,
                wan,
                id
            ]
        );



        res.json({
            ok:true
        });


    }
    catch(err){

        console.error(
            "UPDATE REAL IP ERROR:",
            err
        );


        res.status(500).json({
            ok:false,
            error:err.message
        });

    }

}

async function confirmAddRealSubnet(){

    const base =
        document.getElementById('r_base')
        .value
        .trim();


    const size =
        Number(document.getElementById('r_size').value);



    const prefixMap = {
        256:24,
        128:25,
        64:26,
        32:27,
        16:28,
        8:29,
        4:30
    };


    const prefix =
        prefixMap[size];


    if(!prefix){
        showToast(
            "Invalid subnet size",
            "error"
        );
        return;
    }


    if(!isValidIP(base)){
        showToast(
            "Invalid IP",
            "error"
        );
        return;
    }



    const token =
        sessionStorage.getItem("authToken");


    const clientId =
        v('r_client_id') || null;


    const clientName =
        v('r_client_name') || null;


    const fakeIp =
        v('r_fake_ip') || null;


    const vlanId =
        v('r_vlan_id') || null;


    const dsp =
        Number(sel('r_dsp')) || null;



    const payload = {

        real_ip_block:
            `${base}/${prefix}`,


        client_id:
            clientId,


        client_name:
            clientName,


        fake_ip:
            fakeIp,


        vlan_id:
            vlanId
            ? Number(vlanId)
            : null,


        dsp_id:
            dsp,


        wan:
            null

    };



    console.log(
        "CREATE SUBNET PAYLOAD:",
        payload
    );



    try{


        const response =
            await fetch(
            "http://10.249.2.9/api/ip-manager/real-ip-subnets",
            {

                method:"POST",

                headers:{
                    "Accept":"application/json",
                    "Content-Type":"application/json",
                    "Authorization":
                        `Bearer ${token}`
                },

                body:
                    JSON.stringify(payload)

            });



        const text =
            await response.text();



        console.log(
            "SERVER:",
            response.status,
            text
        );



        let result;

        try{

            result =
                JSON.parse(text);

        }
        catch(e){

            throw new Error(
                "Invalid server response"
            );

        }



        if(!response.ok || result.ok === false){

            throw new Error(
                result.error ||
                "Create failed"
            );

        }



        await loadAllData();


        closeModal();


        showToast(
            "Subnet created successfully",
            "success"
        );


    }
    catch(err){

        console.error(
            "CREATE ERROR:",
            err
        );


        showToast(
            err.message,
            "error"
        );

    }

}
function addRealSubnet(){

    openModal(
        'Add Real IP Subnet',

        '<div class="form-row">'+
        '<label>Base Network Address <span style="color:var(--red)">*</span></label>'+
        '<input type="text" id="r_base" placeholder="e.g. 5.100.244.0" oninput="validateIPInput(this)">'+
        '<div class="hint">Enter the real IP subnet network address</div>'+
        '</div>'+

        '<div class="form-row">'+
        '<label>Subnet Size</label>'+
        '<select id="r_size">'+
        '<option value="256">/24 — 256 IPs</option>'+
        '<option value="128">/25 — 128 IPs</option>'+
        '<option value="64">/26 — 64 IPs</option>'+
        '<option value="32">/27 — 32 IPs</option>'+
        '<option value="16">/28 — 16 IPs</option>'+
        '<option value="8">/29 — 8 IPs</option>'+
        '<option value="4">/30 — 4 IPs</option>'+
        '</select>'+
        '</div>',

        '<button class="btn" onclick="closeModal()">Cancel</button>'+
        '<button class="btn btn-primary" onclick="confirmAddRealSubnet()">➕ Create Subnet</button>'
    );

}
// ============================================================
// ROUTING
// ============================================================

function showPage(page,param){
    
    document.querySelectorAll('.nav-sub')
    .forEach(el=>{
        el.classList.remove('active');
    });


    if(page!=='subnet'){
        currentSubnet=null;
    }

    if(page!=='internal'){
        currentInternalSubnet=null;
    }


    if(page==='wan'){
        currentWanPage=1;
        window._wanExpandedGroups={};
    }

    if(page==='vlan'){
        currentVlanPage=1;
        window._vlanExpandedGroups={};
    }

    if(page==='search'){
        currentSearchPage=1;
    }

    if(page==='tunnels'){
        currentTunnelPage=1;
    }

    if(page==='vpn'){
        currentVpnPage=1;
    }

    if(page==='users'){
        window._usersPageSelected=null;
    }


    if(page==='credentials'){

        currentCredPage=1;

        currentColFilters.crSubnet='';
        currentColFilters.crGateway='';
        currentColFilters.crVlan='';
        currentColFilters.crNetDesc='';
        currentColFilters.crIP='';
        currentColFilters.crNode='';
        currentColFilters.crDevDesc='';
        currentColFilters.crUsername='';
        currentColFilters.crUrl='';

    }



    currentPage=page;

    currentSub=null;
    currentInternalSub=null;



    // ==========================
    // ACTIVE SIDEBAR FIX
    // ==========================


    document
    .querySelectorAll('.nav-item')
    .forEach(el=>{
        el.classList.remove('active');
    });



    let activeItem=null;



    // subnet child
    if(page==='subnet'){

        activeItem=document.getElementById(
            'nav-subnet-' +
            (param || '').replace(/\./g,'-')
        );

    }


    // internal child
    else if(page==='internal'){

        activeItem=document.getElementById(
            'nav-internal-' +
            (param || '').replace(/\./g,'-')
        );

    }


    // normal pages
    else{

        activeItem=document.querySelector(
            `.nav-item[data-page="${page}"]`
        );


        // fallback for clients / react pages
        if(!activeItem){

            activeItem=document.getElementById(
                'nav-'+page
            );

        }

    }



    if(activeItem){

        activeItem.classList.add('active');

    }





    // ==========================
    // DASHBOARD
    // ==========================


    if(page==='dashboard'){


        const app =
        document.getElementById('app-layout');


        currentPageNum=1;
        currentFilter='all';
        currentSearch='';
        currentColFilters={};


        currentPage='dashboard';


        render();



        if(app){

            app.classList.add(
                'dashboard-loading-blur'
            );

        }



        showDashboardLoader(true);



        Promise.all([

            loadAllData(),

            new Promise(resolve=>
                setTimeout(resolve,1500)
            )

        ])

        .then(()=>{


            render();


            showDashboardLoader(false);



            if(app){

                app.classList.remove(
                    'dashboard-loading-blur'
                );

            }


        })


        .catch(err=>{


            console.error(err);


            showDashboardLoader(false);



            if(app){

                app.classList.remove(
                    'dashboard-loading-blur'
                );

            }


        });



        return;

    }




    if(page==='subnet'){

        currentSub=param;

    }


    if(page==='internal'){

        currentInternalSub=param;

    }



    currentPageNum=1;

    currentFilter='all';

    currentClientFilter='all';

    currentSearch='';

    currentColFilters={};



    render();



    let mc=document.getElementById(
        'main-content'
    );


    if(mc){

        mc.scrollTop=0;


        requestAnimationFrame(()=>{

            mc.scrollTop=0;

        });

    }

}

function renderClients(){

return `
<div class="page-header">
    <h2>Clients</h2>

    <button 
      class="btn btn-primary"
      onclick="addClient()">
      ＋ Add Client
    </button>
</div>


<div class="table-wrap">

<table>

<thead>
<tr>
<th>ID</th>
<th>Client Name</th>
<th>Actions</th>
</tr>
</thead>


<tbody>

${
(db.clients || []).map(c=>`

<tr>

<td>
${escHtml(String(c.id || ''))}
</td>


<td>
${escHtml(c.client_name || '')}
</td>


<td>

<button 
class="btn"
onclick="editClient('${c.id}')">
Edit
</button>


<button
class="btn"
onclick="deleteClient('${c.id}')">
Delete
</button>

</td>

</tr>

`).join('')
}


</tbody>

</table>

</div>

`;

}
function render(){

    const c = document.getElementById('main-content');

    if(!c) return;


    // Save current page before rendering
    sessionStorage.setItem(
        "EB_CURRENT_PAGE",
        currentPage
    );


    const _tw = c.querySelector('.table-wrap');
    const _sl = _tw ? _tw.scrollLeft : 0;
    const _st = c.scrollTop;



    if(currentPage === 'dashboard'){
        c.innerHTML = renderDashboard();
    }

    else if(currentPage === 'subnet'){
        c.innerHTML = renderSubnet(currentSub);
    }

    else if(currentPage === 'internal'){
        c.innerHTML = renderInternal(currentInternalSub);
    }

    else if(currentPage === 'wan'){
        c.innerHTML = renderWan();
    }

    else if(currentPage === 'tunnels'){
        c.innerHTML = renderTunnels();
    }

    else if(currentPage === 'vpn'){
        c.innerHTML = renderVPN();
    }

    else if(currentPage === 'search'){
        c.innerHTML = renderSearch();
    }

    else if(currentPage === 'dsp'){
        c.innerHTML = renderDSP();
    }

 else if(currentPage === 'vlan'){

    c.innerHTML = window.renderVlan();


    if(!db.vlans || db.vlans.length===0){

        fetchVlans();

    }

}
    

    else if(currentPage === 'clients'){

        c.innerHTML = renderClients();

    }


    else if(currentPage === 'users'){

        const renderAfterLoad = function(){

            const cc =
            document.getElementById('main-content');


            if(cc){
                cc.innerHTML =
                window.renderUsers();
            }


            updateTopStats();

        };


        if(can('manageUsers')){
            loadUsers()
            .then(renderAfterLoad);
        }

        else{
            renderAfterLoad();
        }


        return;

    }



    updateTopStats();



    requestAnimationFrame(function(){

        const _tw2 =
        c.querySelector('.table-wrap');


        if(_tw2 && _sl > 0){
            _tw2.scrollLeft = _sl;
        }


        if(_st > 0){
            c.scrollTop = _st;
        }

    });

}

function updateTopStats(){

    let assigned=0,free=0;
    const clientIds=new Set();


    Object.keys(db.subnets).forEach(s=>{
        (db.subnets[s]||[]).forEach(r=>{
            if(r.client_id){
                assigned++;
                clientIds.add(r.client_id);
            }else{
                free++;
            }
        });
    });



    // REAL SUBNET BADGES
    Object.keys(db.subnets).forEach(s=>{

        const el=document.getElementById(
            'badge-'+s.replace(/\./g,'-')
        );

        const d=db.subnets[s] || [];

        const used=d.filter(
            r=>r.client_id
        ).length;

        const total=d.length;


        if(el)
            el.textContent=`${used}/${total}`;

    });



    // INTERNAL FAKE SUBNET BADGES
    Object.keys(db.internalSubnets).forEach(s=>{

        const el=document.getElementById(
            'badge-int-'+s.replace(/\./g,'-')
        );

        const d=db.internalSubnets[s] || [];

        const used=d.filter(
            r=>r.client_id
        ).length;

        const total=d.length;


        if(el)
            el.textContent=`${used}/${total}`;

    });



    const bv=document.getElementById('badge-vlan');
    if(bv)bv.textContent=db.vlans.length;


    const wb=document.getElementById('badge-wan');
    if(wb)wb.textContent=db.wan.length;


    const tb=document.getElementById('badge-tunnels');
    if(tb)tb.textContent=db.tunnels.length;


    const vb=document.getElementById('badge-vpn');
    if(vb)vb.textContent=db.vpn.length;


    const db2=document.getElementById('badge-dsp');
    if(db2)db2.textContent=db.dspList.length;


    const cb=document.getElementById('badge-credentials');
    if(cb)
        cb.textContent=db.credentials ? db.credentials.length : 0;
}

function showDashboardLoader(show=true){

    let loader=document.getElementById(
        "dashboard-loader"
    );


    if(show){

        if(loader) return;


        loader=document.createElement("div");

        loader.id="dashboard-loader";

        loader.className="dashboard-loader";

loader.innerHTML=`

<div class="dashboard-loader">
    <div class="loader-box">

        <div class="loader-grid"></div>

        <div class="loader-chart">
            <svg viewBox="0 0 300 120">

                <defs>
                    <linearGradient id="gradient">
                        <stop offset="0%" stop-color="#00eaff"/>
                        <stop offset="100%" stop-color="#0055ff"/>
                    </linearGradient>
                </defs>

                <path class="chart-fill"
                d="M0 90 L40 70 L80 95 L120 35 L160 65 L200 20 L240 75 L300 40 V120 H0Z"/>

                <path class="chart-line"
                d="M0 90 L40 70 L80 95 L120 35 L160 65 L200 20 L240 75 L300 40"/>

                <circle class="loader-dot" cx="200" cy="20" r="5"/>

            </svg>
        </div>

        <div class="loader-pulse"></div>

    </div>
</div>

`;
        document.body.appendChild(loader);

    }
    else{

        if(loader)
            loader.remove();

    }

}
function renderAndFocus(id){
render();
requestAnimationFrame(()=>{requestAnimationFrame(()=>{const el=document.getElementById(id);if(el){el.focus();const l=el.value.length;el.setSelectionRange(l,l);}});});
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard(){
    loadAllData();
let totalA=0,totalF=0;const dspC={},clients={};
Object.keys(db.subnets).forEach(s=>{(db.subnets[s]||[]).forEach(r=>{if(r.client_id){totalA++;clients[r.client_id]=r.client_name;if(r.dsp)dspC[r.dsp]=(dspC[r.dsp]||0)+1;}else totalF++;});});
let intTotal=0,intA=0;Object.values(db.internalSubnets).forEach(d=>{intTotal+=d.length;intA+=d.filter(r=>r.client_id).length;});

const dspRows = (db.dspList || [])
    .map(dsp => {

        return `
        <tr>
            <td class="name-cell">
                ${escHtml(
                    dsp.name ||
                    dsp.dsp_name ||
                    dsp.provider ||
                    "Unknown"
                )}
            </td>

            <td>
                <span class="badge badge-blue">
                    1
                </span>
            </td>
        </tr>
        `;

    })
    .join("")
    ||
    `
    <tr>
        <td colspan="2"
            style="color:var(--text3);text-align:center;padding:20px">
            No data yet
        </td>
    </tr>
    `;



const subCards = Object.keys(db.subnets).map(s => {

const d = db.subnets[s] || [];

console.log("Dashboard subnet:", s, d.length, d);


const prefixMap = {
    256: 24,
    128: 25,
    64: 26,
    32: 27,
    16: 28,
    8: 29,
    4: 30
};

const prefix = prefixMap[d.length] || 24;

const a = d.filter(r => r.client_id).length;
const total = d.length;
    const pct = total ? ((a / total) * 100).toFixed(1) : 0;

    return '<div class="stat-card" data-page="subnet" data-param="'+s+'">'+
       '<div class="stat-label">🌐 '+escHtml(s)+'/'+prefix+'</div>'+
        '<div class="stat-value" style="color:var(--accent);font-size:20px">'+
            a+
            '<span style="font-size:12px;color:var(--text3)">/'+total+'</span>'+
        '</div>'+
        '<div class="progress-bar">'+
            '<div class="progress-fill" style="width:'+pct+'%"></div>'+
        '</div>'+
        '<div class="stat-sub">'+pct+'% used</div>'+
    '</div>';

}).join('');

const intCards=Object.keys(db.internalSubnets).map(s=>{
const d=db.internalSubnets[s]||[],a=d.filter(r=>r.client_id).length,pct=d.length?((a/d.length)*100).toFixed(1):0;
return '<div class="stat-card" data-page="internal" data-param="'+s+'">'+
'<div class="stat-label">🔒 '+escHtml(s)+'</div>'+
'<div class="stat-value" style="color:var(--orange);font-size:20px">'+a+'<span style="font-size:12px;color:var(--text3)">/'+d.length+'</span></div>'+
'<div class="progress-bar"><div class="progress-fill" style="width:'+pct+'%;background:var(--orange)"></div></div>'+
'<div class="stat-sub">'+pct+'% used</div></div>';
}).join('');

const intSec=intCards?'<div class="stats-row">'+intCards+'</div>':(can('addFakeSubnet')?'<div style="color:var(--text3);font-size:13px;padding:12px 0"><span style="cursor:pointer;color:var(--green)" data-page="internal">＋ Create your first internal subnet</span></div>':'<div style="color:var(--text3);font-size:13px;padding:12px 0">No internal subnets configured</div>');

return `
<div class="page-header"><div><div class="page-title">Dashboard</div><div class="page-subtitle">Welcome, ${sessionStorage.getItem("username")} — <span class="badge ${isAdmin()?'badge-admin':isEditor()?'badge-editor':'badge-viewer'}">${escHtml(session.role.toUpperCase())}</span></div></div><div class="header-actions"></div></div>
<div class="stats-row">
<div class="stat-card" style="cursor:pointer"><div class="stat-label">🌐 Real IP Clients</div><div class="stat-value" style="color:var(--green)">${Object.keys(clients).length}</div><div class="stat-sub">unique client IDs</div></div>
<div class="stat-card"><div class="stat-label">✅ Assigned IPs</div><div class="stat-value" style="color:var(--accent)">${totalA}</div><div class="stat-sub">real IPs used</div></div>
<div class="stat-card"><div class="stat-label">⬜ Free IPs</div><div class="stat-value" style="color:var(--text2)">${totalF}</div><div class="stat-sub">available</div></div>
<div class="stat-card"><div class="stat-label">🔒 Fake IPs</div><div class="stat-value" style="color:var(--orange)">${intA}</div><div class="stat-sub">of ${intTotal} assigned</div></div>
${canSee('seeWan')?`<div class="stat-card" data-page="wan"><div class="stat-label">🔗 WAN Links</div><div class="stat-value" style="color:var(--purple)">${db.wan.length}</div><div class="stat-sub">configured</div></div>`:''}
${canSee('seeTunnels')?`<div class="stat-card" data-page="tunnels"><div class="stat-label">🔁 IP Tunnels</div><div class="stat-value" style="color:var(--teal)">${db.tunnels.length}</div><div class="stat-sub">configured</div></div>`:''}
${canSee('seeVpn')?`<div class="stat-card" data-page="vpn"><div class="stat-label">🔐 VPN</div><div class="stat-value" style="color:var(--red)">${db.vpn.length}</div><div class="stat-sub">configured</div></div>`:''}
${canSee('seeVlan')?`<div class="stat-card" data-page="vlan"><div class="stat-label">🏷️ VLAN Tracking</div><div class="stat-value" style="color:var(--accent)">${db.vlans.length}</div><div class="stat-sub">VLANs tracked</div></div>`:''}
${canSee('seeSearch')?`<div class="stat-card" data-page="search" style="justify-content:center;align-items:center;display:flex;flex-direction:column;gap:6px;min-height:80px"><div style="font-size:22px">🔎</div><div style="font-size:13px;font-weight:700;color:var(--accent);text-align:center">Client Search</div></div>`:''}
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div><div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase">Real Subnet Utilization</div><div class="stats-row" style="grid-template-columns:1fr 1fr">${subCards}</div></div>
<div><div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase">DSP Breakdown</div><div class="table-wrap"><table><thead><tr><th><span class="th-label">DSP Provider</span></th><th><span class="th-label">Clients</span></th></tr></thead><tbody>${dspRows}</tbody></table></div></div>
</div>
<div>
<div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:8px;text-transform:uppercase">Internal (Fake IP) Subnets</div>${intSec}</div>`;
}

// ============================================================
// REAL SUBNET PAGE
// ============================================================
async function fetchInternalIpSubnets(){

    const token =
        sessionStorage.getItem("authToken");

    console.log(
        "INTERNAL SUBNET TOKEN:",
        token
    );

    if(!token){
        console.error("No auth token found");
        return [];
    }

    const response = await fetch(
        "http://10.249.2.9/api/ip-manager/internal-ip-subnets",
        {
            method:"GET",
            headers:{
                "Accept":"application/json",
                "Authorization": `Bearer ${token}`
            }
        }
    );

    console.log(
        "INTERNAL SUBNET HTTP:",
        response
    );

    const text = await response.text();

    let result;

    try {
        result = JSON.parse(text);
    }
    catch(e){
        console.error(
            "SERVER HTML ERROR:",
            text
        );

        throw new Error(
            "Backend returned HTML error"
        );
    }

    console.log(
        "INTERNAL SUBNET RESULT:",
        result
    );

    if(!response.ok){
        console.error(
            "INTERNAL SUBNET API FAILED",
            result
        );

        return [];
    }

    return result.data || [];

} 

async function loadAllData(){

    showLoading(true);

    const [permsRes, dataRes] = await Promise.all([
        api('login'),
        api('getAll')
    ]);

    showLoading(false);


    if(permsRes.ok){

        session.role  = permsRes.role;
        session.perms = permsRes.perms || {};

        const rd = document.getElementById('role-dot');
        if(rd) rd.className = 'role-dot ' + session.role;

        const uw = document.getElementById('nav-users-wrap');
        if(uw){
            uw.style.display =
                (can('manageUsers') || canSee('seeUsers'))
                ? 'block'
                : 'none';
        }
    }


    if(dataRes.ok){


        if(
            dataRes.data.tunnels === undefined ||
            dataRes.data.vpn === undefined ||
            dataRes.data.vlans === undefined
        ){

            setTimeout(()=>alert(
                '⚠️ WARNING: Your Google Apps Script is still V9!'
            ),1000);

        }



        /*
        ============================
        LOAD DATA FROM API FIRST
        ============================
        */

        db.subnets = dataRes.data.subnets || {};
        db.internalSubnets = {};



        /*
        ============================
        LOAD REAL SUBNETS FROM API
        ============================
        */

        const realSubnets = await fetchRealIpSubnets();


        console.log(
            "REAL SUBNETS API RESPONSE:",
            realSubnets
        );


        /*
        ============================
        GROUP REAL IP ROWS
        ============================
        */

        db.subnets = {};

        realSubnets.forEach(item => {
            if(!item.real_ip_block) return;

            const [ip, prefix] = item.real_ip_block.split('/');
            const subnetKey = normalizeSubnet(ip, Number(prefix));

            if(!db.subnets[subnetKey]){
                db.subnets[subnetKey] = [];
            }

            const exists = db.subnets[subnetKey].some(existing => existing.id === item.id);

            if(!exists) {
                db.subnets[subnetKey].push(item);
            }
        });



        console.log(
            "GROUPED SUBNETS",
            db.subnets
        );


        /*
        ============================
        LOAD INTERNAL SUBNETS FROM API
        ============================
        */

        const internalSubnetsList = await fetchInternalIpSubnets();

        console.log(
            "INTERNAL SUBNETS API RESPONSE:",
            internalSubnetsList
        );

        db.internalSubnets = {};

        internalSubnetsList.forEach(item => {
            if(!item.internal_ip_block) return;

            const [ip, prefix] = item.internal_ip_block.split('/');
            const subnetKey = normalizeSubnet(ip, Number(prefix));

            if(!db.internalSubnets[subnetKey]){
                db.internalSubnets[subnetKey] = [];
            }

            const exists = db.internalSubnets[subnetKey].some(existing => existing.id === item.id);

            if(!exists) {
                db.internalSubnets[subnetKey].push(item);
            }
        });

        console.log(
            "GROUPED INTERNAL SUBNETS",
            db.internalSubnets
        );


        /*
        ============================
        OTHER DATA
        ============================
        */

        db.wan =
            dataRes.data.wan || [];

        db.tunnels =
            dataRes.data.tunnels || [];

        db.vpn =
            dataRes.data.vpn || [];

        db.vlans =
            (dataRes.data.vlans || [])
            .slice()
            .sort(
                (a,b)=>
                parseInt(a.vlan_id,10)
                -
                parseInt(b.vlan_id,10)
            );


        db.vlanCdnList =
            dataRes.data.vlanCdnList ||
            [
                'AKAMAI',
                'CLOUDFLARE',
                'LIMELIGHT',
                'FASTLY',
                'AWS CLOUDFRONT'
            ];


        db.vlanReservedRanges =
            dataRes.data.vlanReservedRanges || [];


        await fetchDSPs();
        // await fetchClients();
    }
    else{

        showToast(
            'Failed to load: '+dataRes.error,
            'error'
        );

    }



    // rebuild subnet lists
    REAL_SUBNETS = Object.keys(db.subnets);


    buildSidebarNav();

    updateTopStats();

}
async function fetchRealIpSubnets(){

    const token =
        sessionStorage.getItem("authToken");


    console.log(
        "REAL SUBNET TOKEN:",
        token
    );


    if(!token){
        console.error("No auth token found");
        return [];
    }


    const response = await fetch(
        "http://10.249.2.9/api/ip-manager/real-ip-subnets",
        {
            method:"GET",
            headers:{
                "Accept":"application/json",
                "Authorization": `Bearer ${token}`
            }
        }
    );


    console.log(
        "REAL SUBNET HTTP:",
        response
    );


    const text = await response.text();

let result;

try {
    result = JSON.parse(text);
}
catch(e){

    console.error(
        "SERVER HTML ERROR:",
        text
    );

    throw new Error(
        "Backend returned HTML error"
    );
}


    console.log(
        "REAL SUBNET RESULT:",
        result
    );


    if(!response.ok){

        console.error(
            "REAL SUBNET API FAILED",
            result
        );

        return [];

    }


    return result.data || [];

}
function getDspName(dspId){

    if(!dspId)
        return null;


    const dsp = (db.dspList || []).find(
        d => String(typeof d === "object" ? d.id : d) === String(dspId)
    );


    if(!dsp)
        return dspId;


    return typeof dsp === "object"
        ? (
            dsp.code_name ||
            dsp.name ||
            dsp.provider ||
            dsp.id
          )
        :
            dsp;

}
function renderSubnet(sub){
   
let data = db.subnets[sub] || [];


// CREATE IP ROWS IF API ONLY STORED BLOCK
// CREATE IP ROWS IF API ONLY STORED BLOCK
if(data.length && !data[0].real_ip){

    const first = data[0];

    const match =
        first.real_ip_block.match(
            /^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/
        );


    if(match){

        const base = match[1];
        const prefix = Number(match[2]);


        const ips =
            generateSubnetIPs(
                base,
                prefix
            );

data = ips.map(ip => {

    return {

        id: null,

        real_ip_block:
            first.real_ip_block,

        real_ip:
            ip,

        client_id:
            first.client_id || null,

        client_name:
            first.client_name || null,

        fake_ip:
            first.fake_ip || null,

        vlan_id:
            first.vlan_id || null,

        dsp_id:
            first.dsp_id || null,

        dsp:
            first.dsp ||
            getDspName(first.dsp_id) ||
            null,

        wan:
            first.wan || null
    };

});



        db.subnets[sub] = data;

    }

}
const wBC={};db.wan.forEach(w=>{if(!w.client_id)return;if(!wBC[w.client_id])wBC[w.client_id]=[];wBC[w.client_id].push(w);});
const adminBtns =
(can('assignReal') ?
'<button class="btn btn-primary" onclick="openAssignModal(\''+escAttr(sub)+'\',null,\'real\')">＋ Assign</button>'
:'')
+
(can('deleteRealSubnet') ?
'<button class="btn btn-danger" onclick="confirmDeleteRealSubnet(\''+escAttr(sub)+'\')">🗑️ Remove Subnet</button>'
:'');
const cfIP=currentColFilters.ip||'';
const cfCID=currentColFilters.cid||'';
const cfName=currentColFilters.name||'';
const cfFake=currentColFilters.fake||'';
const cfVlan=currentColFilters.vlan||'';
const cfDsp=currentColFilters.dsp||'';

let f=data;
if(currentFilter==='assigned')f=f.filter(r=>r.client_id);
if(currentFilter==='free')f=f.filter(r=>!r.client_id);
if(currentFilter==='wan')f=f.filter(r=>r.client_id&&wBC[r.client_id]);

if(currentSearch){
const q=currentSearch.toLowerCase();
f=f.filter(r=>
String(r.real_ip||'').toLowerCase().includes(q)||
String(r.client_id||'').toLowerCase().includes(q)||
String(r.client_name||'').toLowerCase().includes(q)||
String(r.fake_ip||'').toLowerCase().includes(q)||
String(r.vlan_id||'').toLowerCase().includes(q)||
String(r.dsp||'').toLowerCase().includes(q)||
String(r.block_id||'').toLowerCase().includes(q)
);
}

if(cfIP) f=f.filter(r=>String(r.real_ip||'').toLowerCase().includes(cfIP.toLowerCase()));
if(cfCID) f=f.filter(r=>String(r.client_id||'').toLowerCase().includes(cfCID.toLowerCase()));
if(cfName) f=f.filter(r=>String(r.client_name||'').toLowerCase().includes(cfName.toLowerCase()));
if(cfFake) f=f.filter(r=>String(r.fake_ip||'').toLowerCase().includes(cfFake.toLowerCase()));
if(cfVlan) f=f.filter(r=>String(r.vlan_id||'').toLowerCase().includes(cfVlan.toLowerCase()));
if(cfDsp) f=f.filter(r=>String(r.dsp||'').toLowerCase().includes(cfDsp.toLowerCase()));

const allBlocks=groupBlocks(f,data,'real_ip');
const totalPages=Math.ceil(allBlocks.length/PAGE_SIZE);
const start=(currentPageNum-1)*PAGE_SIZE;
const pageBlocks=allBlocks.slice(start,start+PAGE_SIZE);
const assigned=data.filter(r=>r.client_id).length;
const wanCount=data.filter(r=>r.client_id&&wBC[r.client_id]).length;

function mkBlockSubRows(brows,uid,bid,ipColor){
return brows.map(({r:rr},bi)=>{
const role=bi===0?'N/W':bi===brows.length-1&&brows.length>2?'B/C':'host';
const rc=role==='N/W'?'var(--yellow)':role==='B/C'?'var(--red)':ipColor;
return '<tr class="block-sub-row" data-block="'+uid+'" style="display:none;background:rgba(0,0,0,0.2)"><td style="padding:5px 10px 5px 26px;font-family:IBM Plex Mono,monospace;font-size:11px;color:var(--text3)">↳ '+escHtml(rr.real_ip)+' <span style="font-size:9px;color:'+rc+';padding:1px 5px;background:rgba(255,255,255,0.05);border-radius:3px">'+role+'</span></td><td colspan="7" style="padding:5px 10px;font-size:11px;color:var(--text3)">Reserved — '+escHtml(bid)+'</td></tr>';
}).join('');
}

const rows=pageBlocks.map(bl=>{
if(bl.type==='single'){
const r=bl.r,idx=bl.idx,isA=!!r.client_id;
const cw=wBC[r.client_id]||[];
const wb=cw.length>0?'<span class="wan-badge" onclick="showWanPopup(event,\''+escAttr(r.client_id)+'\')">🔗 WAN×'+cw.length+'</span>':'';
const act=(can('assignReal')?'<button class="action-btn edit" onclick="openAssignModal(\''+escAttr(sub)+'\','+idx+',\'real\')">✏️</button>':'')+(isA&&can('deleteRealSubnet')?'<button class="action-btn del" onclick="clearSubnetRow(\''+escAttr(sub)+'\','+idx+')">✕</button>':'');
return '<tr class="'+(isA?'assigned':'')+'"><td><span class="ip-chip">'+escHtml(r.real_ip)+'</span></td><td>'+(r.client_id?'<span style="color:var(--accent);font-weight:600;font-size:11px">'+escHtml(r.client_id)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td><td class="name-cell">'+(r.client_name?escHtml(r.client_name):'<span style="color:var(--text3)">—</span>')+'</td><td>'+(r.fake_ip?'<span class="ip-chip fake">'+escHtml(r.fake_ip)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td><td>'+(r.vlan_id?'<span class="badge badge-yellow">VLAN '+escHtml(String(r.vlan_id))+'</span>':'<span style="color:var(--text3)">—</span>')+'</td><td>'+(r.dsp?'<span class="badge '+dspBadge(r.dsp)+'">'+escHtml(r.dsp)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td><td>'+wb+'</td><td style="white-space:nowrap">'+act+'</td></tr>';
} else {
const r=bl.lead,idx=bl.leadIdx,bid=bl.block_id,brows=bl.rows;
const uid='bl-'+bid.replace(/[^a-z0-9]/gi,'_');
const cw=wBC[r.client_id]||[];
const wb=cw.length>0?'<span class="wan-badge" onclick="showWanPopup(event,\''+escAttr(r.client_id)+'\')">🔗 WAN×'+cw.length+'</span>':'';
const act=(can('assignReal')?'<button class="action-btn edit" onclick="openAssignModal(\''+escAttr(sub)+'\','+idx+',\'real\')">✏️</button>':'')+(can('deleteRealSubnet')?'<button class="action-btn del" onclick="clearBlockRows(\''+escAttr(sub)+'\',\''+escAttr(bid)+'\',\'real\')">✕</button>':'');
const pfx=bid.split('/')[1]||'32';
return '<tr class="assigned" style="background:rgba(0,180,216,0.06)"><td style="cursor:pointer" onclick="toggleBlock(\''+uid+'\')"><span id="ico-'+uid+'" style="font-size:10px;margin-right:4px;color:var(--text3)">▶</span><span class="ip-chip">'+escHtml(bid)+'</span><div style="font-size:10px;color:var(--text3);margin-top:2px">'+brows.length+' IPs · /'+pfx+'</div></td><td><span style="color:var(--accent);font-weight:600;font-size:11px">'+escHtml(r.client_id)+'</span></td><td class="name-cell">'+escHtml(r.client_name)+'</td><td>'+(r.fake_ip?'<span class="ip-chip fake">'+escHtml(r.fake_ip)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td><td>'+(r.vlan_id?'<span class="badge badge-yellow">VLAN '+escHtml(String(r.vlan_id))+'</span>':'<span style="color:var(--text3)">—</span>')+'</td><td>'+(r.dsp?'<span class="badge '+dspBadge(r.dsp)+'">'+escHtml(r.dsp)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td><td>'+wb+'</td><td style="white-space:nowrap">'+act+'</td></tr>'+mkBlockSubRows(brows,uid,bid,'var(--accent)');
}
}).join('')||'<tr><td colspan="8"><div class="empty-state"><div class="icon">🔍</div><p>No records match</p></div></td></tr>';

const addBtn=can('assignReal')?'<button class="btn btn-primary" onclick="openAssignModal(\''+escAttr(sub)+'\',null,\'real\')">＋ Assign</button>':'<span class="badge badge-viewer">👁 View Only</span>';

return `
<div class="page-header">
<div>
<div class="page-subtitle">
Real IP allocation — ${data.length} addresses
</div>

</div>
<div class="header-actions">${adminBtns}</div>
</div>
<div class="toolbar">
<div class="search-box"><input type="text" id="gs" placeholder="Search anything… (live)" value="${escAttr(currentSearch)}"
oninput="currentSearch=this.value;currentPageNum=1;renderAndFocus('gs');"></div>
<div class="filter-row">
<span class="filter-chip ${currentFilter==='all'?'active':''}" onclick="currentFilter='all';currentPageNum=1;render()">All (${data.length})</span>
<span class="filter-chip ${currentFilter==='assigned'?'active':''}" onclick="currentFilter='assigned';currentPageNum=1;render()">Assigned (${assigned})</span>
<span class="filter-chip ${currentFilter==='free'?'active':''}" onclick="currentFilter='free';currentPageNum=1;render()">Free (${data.length-assigned})</span>
${wanCount>0?'<span class="filter-chip '+(currentFilter==='wan'?'active':'')+'" onclick="currentFilter=\'wan\';currentPageNum=1;render()">🔗 Has WAN ('+wanCount+')</span>':''}
</div>
</div>
<div class="table-wrap">
<div class="table-info"><span>Showing ${Math.min(start+1,Math.max(1,allBlocks.length))}–${Math.min(start+PAGE_SIZE,allBlocks.length)} of ${allBlocks.length}</span><span style="color:var(--accent)">
${escHtml(sub)} (${data.length})
</span></div>
<table><thead><tr>
<th style="min-width:140px"><span class="th-label">Real IP / Block</span>
<input class="col-filter" id="cf-ip" placeholder="filter IP…" value="${escAttr(cfIP)}"
oninput="currentColFilters.ip=this.value;currentPageNum=1;renderAndFocus('cf-ip');"></th>
<th style="min-width:100px"><span class="th-label">Client ID</span>
<input class="col-filter" id="cf-cid" placeholder="filter ID…" value="${escAttr(cfCID)}"
oninput="currentColFilters.cid=this.value;currentPageNum=1;renderAndFocus('cf-cid');"></th>
<th style="min-width:140px"><span class="th-label">Client Name</span>
<input class="col-filter" id="cf-name" placeholder="filter name…" value="${escAttr(cfName)}"
oninput="currentColFilters.name=this.value;currentPageNum=1;renderAndFocus('cf-name');"></th>
<th style="min-width:110px"><span class="th-label">Fake IP</span>
<input class="col-filter" id="cf-fake" placeholder="filter IP…" value="${escAttr(cfFake)}"
oninput="currentColFilters.fake=this.value;currentPageNum=1;renderAndFocus('cf-fake');"></th>
<th style="min-width:80px"><span class="th-label">VLAN</span>
<input class="col-filter" id="cf-vlan" placeholder="filter…" value="${escAttr(cfVlan)}"
oninput="currentColFilters.vlan=this.value;currentPageNum=1;renderAndFocus('cf-vlan');"></th>
<th style="min-width:90px"><span class="th-label">DSP</span>
<input class="col-filter" id="cf-dsp" placeholder="filter…" value="${escAttr(cfDsp)}"
oninput="currentColFilters.dsp=this.value;currentPageNum=1;renderAndFocus('cf-dsp');"></th>
<th><span class="th-label">WAN</span></th>
<th></th>
</tr></thead><tbody>${rows}</tbody></table>
</div>
${renderPager(totalPages)}`;
  loadAllData();
}

// ============================================================
// INTERNAL PAGE
// ============================================================
function renderInternal(sub){
  loadAllData();
const keys=Object.keys(db.internalSubnets);
if(!sub||!db.internalSubnets[sub]){
if(keys.length>0){showPage('internal',keys[0]);return'';}
return '<div class="page-header"><div><div class="page-title">Internal (Fake IP) Subnets</div><div class="page-subtitle">No subnets created yet</div></div>'+(can('addFakeSubnet')?'<button class="btn btn-primary" onclick="addInternalSubnet()">＋ Add Subnet</button>':'')+' </div><div class="empty-state" style="margin-top:40px"><div class="icon">🔒</div><p style="font-size:15px;font-weight:600;margin-bottom:8px">No internal subnets yet</p>'+(can('addFakeSubnet')?'<button class="btn btn-primary" onclick="addInternalSubnet()">＋ Add First Subnet</button>':'')+' </div>';
}
const data=db.internalSubnets[sub]||[];
const clientMap={};Object.values(db.internalSubnets).forEach(arr=>arr.forEach(r=>{if(r.client_id)clientMap[r.client_id]=r.client_name;}));
const cFIPs={};Object.entries(db.internalSubnets).forEach(([sn,arr])=>arr.forEach(r=>{if(r.client_id){if(!cFIPs[r.client_id])cFIPs[r.client_id]=[];if(!cFIPs[r.client_id].includes(r.internal_ip))cFIPs[r.client_id].push(r.internal_ip);}}));
const cfIP=currentColFilters.ip||'',cfCID=currentColFilters.cid||'',cfName=currentColFilters.name||'';

let f=data;
if(currentFilter==='assigned')f=f.filter(r=>r.client_id);
if(currentFilter==='free')f=f.filter(r=>!r.client_id);
if(currentClientFilter!=='all')f=f.filter(r=>r.client_id===currentClientFilter);

if(currentSearch){
const q=currentSearch.toLowerCase();
f=f.filter(r=>
String(r.internal_ip||'').toLowerCase().includes(q)||
String(r.client_id||'').toLowerCase().includes(q)||
String(r.client_name||'').toLowerCase().includes(q)||
String(r.block_id||'').toLowerCase().includes(q)
);
}
if(cfIP) f=f.filter(r=>String(r.internal_ip||'').toLowerCase().includes(cfIP.toLowerCase()));
if(cfCID) f=f.filter(r=>String(r.client_id||'').toLowerCase().includes(cfCID.toLowerCase()));
if(cfName) f=f.filter(r=>String(r.client_name||'').toLowerCase().includes(cfName.toLowerCase()));

const allBlocks=groupBlocks(f,data,'internal_ip');
const totalPages=Math.ceil(allBlocks.length/PAGE_SIZE);
const start=(currentPageNum-1)*PAGE_SIZE;
const pageBlocks=allBlocks.slice(start,start+PAGE_SIZE);
const clientOptions=Object.entries(clientMap).map(([id,name])=>'<option value="'+escAttr(id)+'"'+(currentClientFilter===id?' selected':'')+'>'+escHtml(id)+' — '+escHtml(name)+'</option>').join('');

function mkIntSubRows(brows,uid,bid){
return brows.map(({r:rr},bi)=>{
const role=bi===0?'N/W':bi===brows.length-1&&brows.length>2?'B/C':'host';
const rc=role==='N/W'?'var(--yellow)':role==='B/C'?'var(--red)':'var(--orange)';
return '<tr class="block-sub-row" data-block="'+uid+'" style="display:none;background:rgba(0,0,0,0.2)"><td style="padding:5px 10px 5px 26px;font-family:IBM Plex Mono,monospace;font-size:11px;color:var(--text3)">↳ '+escHtml(rr.internal_ip)+' <span style="font-size:9px;color:'+rc+';padding:1px 5px;background:rgba(255,255,255,0.05);border-radius:3px">'+role+'</span></td><td colspan="4" style="padding:5px 10px;font-size:11px;color:var(--text3)">Reserved — '+escHtml(bid)+'</td></tr>';
}).join('');
}

const rows=pageBlocks.map(bl=>{
if(bl.type==='single'){
const r=bl.r,idx=bl.idx;
const other=(cFIPs[r.client_id]||[]).filter(ip=>ip!==r.internal_ip);
const act=(can('assignFake')?'<button class="action-btn edit" onclick="openAssignModal(\''+escAttr(sub)+'\','+idx+',\'internal\')">✏️</button>':'')+(r.client_id&&can('deleteFake')?'<button class="action-btn del" onclick="clearInternalRow(\''+escAttr(sub)+'\','+idx+')">✕</button>':'');
return '<tr class="'+(r.client_id?'assigned':'')+'"><td><span class="ip-chip internal">'+escHtml(r.internal_ip)+'</span></td><td>'+(r.client_id?'<span style="color:var(--accent);font-weight:600;font-size:11px">'+escHtml(r.client_id)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td><td class="name-cell">'+(r.client_name?escHtml(r.client_name):'<span style="color:var(--text3)">—</span>')+'</td><td>'+(other.length>0?'<div class="multi-fake">'+other.map(ip=>'<span class="ip-chip fake">'+escHtml(ip)+'</span>').join('')+'</div>':(r.client_id?'<span style="color:var(--text3);font-size:11px">Only this one</span>':''))+'</td><td style="white-space:nowrap">'+act+'</td></tr>';
} else {
const r=bl.lead,idx=bl.leadIdx,bid=bl.block_id,brows=bl.rows;
const uid='ibl-'+bid.replace(/[^a-z0-9]/gi,'_');
const blockIps=brows.map(x=>x.r.internal_ip);
const other=(cFIPs[r.client_id]||[]).filter(ip=>!blockIps.includes(ip));
const act=(can('assignFake')?'<button class="action-btn edit" onclick="openAssignModal(\''+escAttr(sub)+'\','+idx+',\'internal\')">✏️</button>':'')+(can('deleteFake')?'<button class="action-btn del" onclick="clearBlockRows(\''+escAttr(sub)+'\',\''+escAttr(bid)+'\',\'internal\')">✕</button>':'');
const pfx=bid.split('/')[1]||'32';
return '<tr class="assigned" style="background:rgba(255,166,87,0.06)"><td style="cursor:pointer" onclick="toggleBlock(\''+uid+'\')"><span id="ico-'+uid+'" style="font-size:10px;margin-right:4px;color:var(--text3)">▶</span><span class="ip-chip internal">'+escHtml(bid)+'</span><div style="font-size:10px;color:var(--text3);margin-top:2px">'+brows.length+' IPs · /'+pfx+'</div></td><td><span style="color:var(--accent);font-weight:600;font-size:11px">'+escHtml(r.client_id)+'</span></td><td class="name-cell">'+escHtml(r.client_name)+'</td><td>'+(other.length>0?'<div class="multi-fake">'+other.map(ip=>'<span class="ip-chip fake">'+escHtml(ip)+'</span>').join('')+'</div>':'<span style="color:var(--text3);font-size:11px">Only this block</span>')+'</td><td style="white-space:nowrap">'+act+'</td></tr>'+mkIntSubRows(brows,uid,bid);
}
}).join('')||'<tr><td colspan="5"><div class="empty-state"><div class="icon">🔍</div><p>No records match</p></div></td></tr>';

const usagePct=data.length
?((data.filter(r=>r.client_id).length/data.length)*100).toFixed(1)
:0;


const adminBtns =
(can('assignFake') ?
'<button class="btn btn-primary" onclick="openAssignModal(\''+escAttr(sub)+'\',null,\'internal\')">＋ Assign</button>'
:'')
+
(can('deleteFakeSubnet') ?
'<button class="btn btn-danger" onclick="confirmDeleteSubnet(\''+escAttr(sub)+'\')">🗑️ Remove Subnet</button>'
:'')
+
((!can('assignFake') && !can('deleteFakeSubnet')) ?
'<span class="badge badge-viewer">👁️ View Only</span>'
:'');
const cFiltSel=Object.keys(clientMap).length?'<select class="filter-select" onchange="currentClientFilter=this.value;currentPageNum=1;render()"><option value="all">All Clients</option>'+clientOptions+'</select>':'';

const filterBanner=(currentClientFilter!=='all')?(()=>{
const cname=clientMap[currentClientFilter]||'';
const ips=cFIPs[currentClientFilter]||[];
return '<div style="background:rgba(188,140,255,0.08);border:1px solid rgba(188,140,255,0.3);border-radius:8px;padding:10px 16px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:4px">'
+'<span style="font-size:12px;color:var(--purple)">🔍 Filtered: </span>'
+'<span style="font-size:12px;font-weight:700;color:var(--accent)">'+escHtml(currentClientFilter)+'</span>'
+'<span style="color:var(--text3);font-size:12px">—</span>'
+'<span style="font-size:12px;color:var(--text2)">'+escHtml(cname)+'</span>'
+'<span style="color:var(--text3);font-size:12px">—</span>'
+'<span style="font-size:12px;color:var(--text3)">'+ips.length+' fake IP(s):</span>'
+ips.map(ip=>'<span class="ip-chip internal" style="font-size:11px">'+escHtml(ip)+'</span>').join('')
+'<button onclick="currentClientFilter=\'all\';currentPageNum=1;render()" style="margin-left:auto;background:none;border:1px solid var(--border);border-radius:4px;color:var(--text2);padding:2px 10px;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px">✕ Clear</button>'
+'</div>';
})():'';

return `
<div class="page-header"><div><div class="page-title">Internal Subnet: ${escHtml(sub)}</div><div class="page-subtitle">${data.length} IPs · ${data.filter(r=>r.client_id).length} assigned · ${usagePct}% used</div></div><div class="header-actions">${adminBtns}</div></div>
<div class="toolbar">
<div class="search-box"><input type="text" id="gs" placeholder="Search anything… (live)" value="${escAttr(currentSearch)}"
oninput="currentSearch=this.value;currentClientFilter='all';currentPageNum=1;renderAndFocus('gs');"></div>
<div class="filter-row">
<span class="filter-chip ${currentFilter==='all'&&currentClientFilter==='all'?'active':''}" onclick="currentFilter='all';currentClientFilter='all';currentPageNum=1;render()">All (${data.length})</span>
<span class="filter-chip ${currentFilter==='assigned'?'active':''}" onclick="currentFilter='assigned';currentClientFilter='all';currentPageNum=1;render()">Assigned (${data.filter(r=>r.client_id).length})</span>
<span class="filter-chip ${currentFilter==='free'?'active':''}" onclick="currentFilter='free';currentClientFilter='all';currentPageNum=1;render()">Free (${data.filter(r=>!r.client_id).length})</span>
${cFiltSel}
</div>
</div>
${filterBanner}
<div class="table-wrap">
<div class="table-info"><span>Showing ${Math.min(start+1,Math.max(1,allBlocks.length))}–${Math.min(start+PAGE_SIZE,allBlocks.length)} of ${allBlocks.length}</span><span style="color:var(--orange)">${escHtml(sub)}</span></div>
<table><thead><tr>
<th style="min-width:130px"><span class="th-label">Internal IP / Block</span>
<input class="col-filter" id="cf-ip" placeholder="filter IP…" value="${escAttr(cfIP)}"
oninput="currentColFilters.ip=this.value;currentPageNum=1;renderAndFocus('cf-ip');"></th>
<th style="min-width:100px"><span class="th-label">Client ID</span>
<input class="col-filter" id="cf-cid" placeholder="filter ID…" value="${escAttr(cfCID)}"
oninput="currentColFilters.cid=this.value;currentPageNum=1;renderAndFocus('cf-cid');"></th>
<th style="min-width:140px"><span class="th-label">Client Name</span>
<input class="col-filter" id="cf-name" placeholder="filter name…" value="${escAttr(cfName)}"
oninput="currentColFilters.name=this.value;currentPageNum=1;renderAndFocus('cf-name');"></th>
<th><span class="th-label">Other IPs (same client)</span></th>
<th></th>
</tr></thead><tbody>${rows}</tbody></table>
</div>
${renderPager(totalPages)}`;
}

// ============================================================
// ASSIGN MODAL  (Real & Internal)
// ============================================================
function openAssignModal(sub,idx,type){
    selectedRealIpRow = db.subnets[sub][idx];

    console.log(
        "SELECTED ROW:",
        selectedRealIpRow
    );
const r=idx!==null?(type==='real'?db.subnets[sub][idx]:db.internalSubnets[sub][idx]):null;
const isReal=type==='real';
async function doSaveVlan(editIdx){

    const token = sessionStorage.getItem("authToken");


    const getValue = (id) => {

        const el = document.getElementById(id);

        return el ? el.value.trim() : "";

    };



    const payload = {

        id:
            Number(
                getValue("fv_vid")
            ),


        status:
            getValue("fv_status")
            .toLowerCase(),


        type:
            getValue("fv_type")
            .toLowerCase(),


        service:
            getValue("fv_svc")
            .toLowerCase(),


        zone:
            getValue("fv_zone")
            .toLowerCase(),


        client_id:
            getValue("fv_cid")
            .toUpperCase()
            ||
            "-",


        real_ip:
            (
                getValue("fv_rip") === "" ||
                getValue("fv_rip") === "-"
            )
            ?
            null
            :
            getValue("fv_rip"),


        fake_ip:
            (
                getValue("fv_fip") === "" ||
                getValue("fv_fip") === "-"
            )
            ?
            null
            :
            getValue("fv_fip"),


        // SEND DSP ID
        dsp_id:
            getValue("fv_dsp")
            ?
            Number(getValue("fv_dsp"))
            :
            null

    };



    console.log(
        "========== VLAN POST =========="
    );


    console.log(
        JSON.stringify(payload,null,2)
    );



    if(!payload.id){

        showToast(
            "VLAN ID is required",
            "error"
        );

        return;

    }



    try{


        const res = await fetch(

            "http://10.249.2.9/api/ip-manager/vlans-v2",

            {

                method:"POST",


                headers:{

                    "Content-Type":
                    "application/json",


                    "Accept":
                    "application/json",


                    "Authorization":
                    `Bearer ${token}`

                },


                body:
                JSON.stringify(payload)

            }

        );



        const responseText =
            await res.text();



        let result;


        try{

            result =
            JSON.parse(responseText);

        }
        catch(e){

            result = {
                raw:responseText
            };

        }



        console.log(
            "POST STATUS:",
            res.status
        );


        console.log(
            "POST RESPONSE:",
            result
        );



        if(!res.ok){

            throw new Error(
                result.error ||
                result.message ||
                "Failed adding VLAN"
            );

        }



        showToast(
            "VLAN added successfully",
            "success"
        );


        closeModal();


        await fetchVlans();



    }
    catch(err){


        console.error(
            "SAVE VLAN ERROR:",
            err
        );


        showToast(
            err.message,
            "error"
        );

    }

}

const dspOpts =
'<option value="">— None —</option>' +
(db.dspList || []).map(d => {

    const value = typeof d === "object"
        ? d.code_name
        : d;

    const name = typeof d === "object"
        ? d.code_name
        : d;


    return `
        <option value="${escAttr(String(value))}"
            ${String(r?.dsp_id) === String(value) ? "selected" : ""}>
            ${escHtml(String(name))}
        </option>
    `;

}).join('');const fakeIPField=isReal?'<div class="form-row"><label>Fake IP (optional)</label><input type="text" id="f_fake_ip" value="'+(r?.fake_ip||'')+'" placeholder="e.g. 10.10.11.5" oninput="validateIPInput(this)"><div class="hint">Leave blank if no NAT translation</div></div>':'';
const vlanField=isReal?'<div class="form-row"><label>VLAN ID (optional)</label><input type="text" id="f_vlan_id" value="'+(r?.vlan_id||'')+'" placeholder="e.g. 200 (1–4094)" oninput="validateVlanIdInput(this);this.value=this.value.replace(/[^0-9]/g,\'\')" maxlength="4"></div>':'';
const dspField=isReal?'<div class="form-row"><label>DSP Provider</label><select id="f_dsp">'+dspOpts+'</select></div>':'';
openModal((idx===null?'Assign':'Edit')+' — '+(isReal?'Real IP':'Fake IP')+' Block',
'<div class="form-grid">'
+'<div class="form-row"><label>Start IP <span style="color:var(--red)">*</span></label><input type="text" id="f_start_ip" value="'+(r?.[isReal?'real_ip':'internal_ip']||'')+'" placeholder="'+(isReal?'e.g. 5.100.240.15':'e.g. 10.10.15.5')+'" oninput="this.value=this.value.trim();livePreview(\''+escAttr(sub)+'\',\''+type+'\')" style="text-transform:lowercase"></div>'
+'<div class="form-row"><label>Block Size</label><select id="f_block_size" onchange="livePreview(\''+escAttr(sub)+'\',\''+type+'\')">'+mkBlockSizeOpts(1)+'</select></div></div>'
+'<div class="form-row"><label>Client ID <span style="color:var(--red)">*</span></label><input type="text" id="f_client_id" value="'+(r?.client_id||'')+'" placeholder="e.g. EB001" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>'
+'<div class="form-row"><label>Client Name <span style="color:var(--red)">*</span></label><input type="text" id="f_client_name" value="'+(r?.client_name||'')+'" placeholder="e.g. ENERGY MAIN OFFICE" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>'
+fakeIPField+vlanField+'</div>'+dspField
+'<div id="assign-preview" class="block-preview'+(isReal?'':' int')+'"></div>',
'<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAssign(\''+escAttr(sub)+'\',\''+type+'\','+idx+')">💾 Assign</button>');
setTimeout(()=>{
livePreview(sub,type);
const fakeEl=document.getElementById('f_fake_ip');
if(fakeEl&&fakeEl.value) validateIPInput(fakeEl);
},50);
}

function isIpInSubnet(ip, subnet){

    const [network, prefix] =
        subnet.split('/');


    const ipNum =
        ipToNumber(ip);


    const netNum =
        ipToNumber(network);


    const mask =
        prefix === "0"
        ? 0
        : (0xffffffff << (32 - Number(prefix))) >>> 0;


    return (
        (ipNum & mask) ===
        (netNum & mask)
    );

}


function ipToNumber(ip){

    return ip
        .split('.')
        .reduce(
            (acc,oct)=>(
                acc * 256 +
                Number(oct)
            ),
            0
        );

}

function livePreview(sub,type){
const startIp=v('f_start_ip'),size=parseInt(document.getElementById('f_block_size')?.value||1);
const pv=document.getElementById('assign-preview');
const startEl=document.getElementById('f_start_ip');
if(!pv){return;}
if(startEl){startEl.classList.remove('ip-invalid','ip-valid');}
if(!startIp.match(/^\d+\.\d+\.\d+\.\d+$/)){pv.style.display='none';return;}
if(!isIpInSubnet(startIp,sub,type)){
if(startEl){startEl.classList.add('ip-invalid');}
const data=type==='real'?(db.subnets[sub]||[]):(db.internalSubnets[sub]||[]);
const ipKey=type==='real'?'real_ip':'internal_ip';
const first=data[0]?.[ipKey]||sub;
const last=data[data.length-1]?.[ipKey]||sub;
const ac=type==='real'?'var(--accent)':'var(--orange)';
pv.style.display='block';
pv.className='block-preview'+(type==='real'?'':' int');
pv.innerHTML='<div style="color:var(--red);font-size:12px;font-weight:600;margin-bottom:6px">⛔ IP not in this subnet</div>'
+'<div style="font-size:11px;color:var(--text3);line-height:1.6">'
+'Subnet: <span style="color:'+ac+';font-family:IBM Plex Mono,monospace">'+escHtml(sub)+'</span><br>'
+'Valid range: <span style="font-family:IBM Plex Mono,monospace;color:var(--text)">'+escHtml(first)+' → '+escHtml(last)+'</span><br>'
+'You entered: <span style="color:var(--red);font-family:IBM Plex Mono,monospace">'+escHtml(startIp)+'</span>'
+'</div>';
return;
}
if(startEl){startEl.classList.add('ip-valid');}
const b=calcBlock(startIp,size);
const data=type==='real'?(db.subnets[sub]||[]):(db.internalSubnets[sub]||[]);
const ipKey=type==='real'?'real_ip':'internal_ip';
const cid=v('f_client_id');
const conflicts=b.ips.filter(ip=>{const r=data.find(rr=>rr[ipKey]===ip);return r&&r.client_id&&r.client_id!==cid;});
const ac=type==='real'?'var(--accent)':'var(--orange)';
pv.style.display='block';
pv.className='block-preview'+(type==='real'?'':' int');
pv.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px 16px;margin-bottom:8px">'
+'<span style="color:var(--text3)">Block:</span><span style="color:'+ac+';font-weight:600">'+escHtml(startIp)+'/'+b.prefix+'</span>'
+(size>1?'<span style="color:var(--text3)">Network:</span><span>'+escHtml(b.network)+'</span><span style="color:var(--text3)">Broadcast:</span><span>'+(b.broadcast?escHtml(b.broadcast):'—')+'</span>':'')
+'<span style="color:var(--text3)">Hosts:</span><span style="color:var(--green)">'+(size===1?escHtml(b.hostMin):escHtml(b.hostMin)+' → '+escHtml(b.hostMax))+'</span>'
+'<span style="color:var(--text3)">Total IPs:</span><span>'+size+'</span></div>'
+'<div style="display:flex;flex-wrap:wrap;gap:4px">'+b.ips.map((ip,i)=>{
const role=size===1?'host':i===0?'N/W':i===size-1?'B/C':'host';
const conflict=conflicts.includes(ip);
const col=conflict?'var(--red)':role==='host'?ac:'var(--yellow)';
return '<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:rgba(0,0,0,0.3);color:'+col+'">'+escHtml(ip)+' <span style="opacity:0.7">'+(conflict?'⚠️USED':role)+'</span></span>';
}).join('')+'</div>'
+(conflicts.length?'<div style="color:var(--red);margin-top:8px;font-size:11px">⚠️ '+conflicts.length+' IP(s) already taken by another client!</div>':'<div style="color:var(--green);margin-top:8px;font-size:11px">✓ All IPs available</div>');
}
const DSP_MAP = {
    "TRISAT":1,
    "PESCO":2,
    "GDS":3,
    "CONNECT/MADA":4,
    "CABLE ONE":5,
    "CEDARCOM":6,
    "DSL":7,
    "FIBER OGERO":8,
    "DIRECTLY CONNECTED":9
};
async function fetchDspProviders(){

    try{

        const token=sessionStorage.getItem("authToken");

        const res=await fetch(
            "http://10.249.2.9/api/ip-manager/dsp-v2",
            {
                method:"GET",
                headers:{
                    "Accept":"application/json",
                    "Authorization":`Bearer ${token}`
                }
            }
        );


        const result=await res.json();


        console.log(
            "DSP API RESPONSE:",
            result
        );


        if(!res.ok){
            throw new Error(
                result.message || "Failed loading DSP providers"
            );
        }


        /*
          Adjust this if your API returns another key.
          Examples:
          result.data
          result.dsps
          result.providers
        */

        db.dspList = result.data || [];


        console.log(
            "DSP LIST:",
            db.dspList
        );


        return db.dspList;


    }catch(err){

        console.error(
            "FETCH DSP ERROR:",
            err
        );


        db.dspList=[];

        showToast(
            err.message,
            "error"
        );

        return [];

    }

}
async function fetchDSPs(){

    console.log("Loading DSPs...");

    const token =
        sessionStorage.getItem("authToken");


    console.log(
        "DSP TOKEN:",
        token
    );


    if(!token){

        console.error(
            "No auth token found"
        );

        return [];

    }


    const response = await fetch(
        "http://10.249.2.9/api/ip-manager/dsp-v2",
        {
            method:"GET",

            headers:{
                "Accept":"application/json",
                "Authorization":
                    `Bearer ${token}`
            }
        }
    );


    const result =
        await response.json();


    console.log(
        "DSP API RESPONSE:",
        result
    );


    if(!response.ok){

        console.error(
            "DSP FAILED",
            result
        );

        return [];

    }


    db.dspList =
        result.data || [];


    return db.dspList;

}
async function fetchClients(){

    const token=sessionStorage.getItem("authToken");

    try{

        const res=await fetch(
            "http://10.249.2.9/api/ip-manager/clients",
            {
                headers:{
                    "Accept":"application/json",
                    "Authorization":`Bearer ${token}`
                }
            }
        );


        const data=await res.json();


        console.log("CLIENTS:",data);


        db.clients = data;


    }
    catch(err){

        console.error(
            "CLIENT LOAD ERROR",
            err
        );

        db.clients=[];

    }

}
// async function fetchClients(){

//     const token=sessionStorage.getItem("authToken");

//     const response=await fetch(
//         "http://10.249.2.9/api/ip-manager/clients",
//         {
//             headers:{
//                 Authorization:`Bearer ${token}`,
//                 Accept:"application/json"
//             }
//         }
//     );


//     const result=await response.json();


//     if(!response.ok){
//         console.error("Client API error", result);
//         db.clients=[];
//         return [];
//     }


//     db.clients=result.data || [];


//     return db.clients;
// }
async function patchRealIpSubnet(req,res){

    try {

        const id = req.params.id;

        console.log("PATCH ID:", id);


        const {
            client_id,
            client_name,
            fake_ip,
            vlan_id,
            dsp_id,
            wan
        } = req.body;



        const [checkBefore] =
            await db.query(
                "SELECT id,real_ip,client_id FROM real_ip_subnets WHERE id=?",
                [id]
            );


        console.log(
            "BEFORE UPDATE:",
            checkBefore
        );



        const [result] =
            await db.query(
            `
            UPDATE real_ip_subnets
            SET
                client_id=?,
                client_name=?,
                fake_ip=?,
                vlan_id=?,
                dsp_id=?,
                wan=?
            WHERE id=?
            `,
            [
                client_id,
                client_name,
                fake_ip,
                vlan_id,
                dsp_id,
                wan,
                id
            ]);



        const [checkAfter] =
            await db.query(
                "SELECT id,real_ip,client_id FROM real_ip_subnets WHERE id=?",
                [id]
            );


        console.log(
            "AFTER UPDATE:",
            checkAfter
        );



        res.json({
            ok:true,
            affectedRows:result.affectedRows
        });


    }
    catch(err){

        console.error(err);

        res.status(500).json({
            ok:false,
            error:err.message
        });

    }

}
async function doAssign(sub, type, idx = null) {

    console.log("doAssign:", {
        sub,
        type,
        idx
    });


    const startIp = v("f_start_ip").trim();
    const clientId = v("f_client_id").trim();
    const clientName = v("f_client_name").trim();


    if (!startIp || !clientId || !clientName) {
        showToast(
            "Start IP, Client ID and Name required",
            "error"
        );
        return;
    }


    if (!isValidIP(startIp)) {
        showToast(
            "Invalid IP address",
            "error"
        );
        return;
    }


    if (!isIpInSubnet(startIp, sub)) {
        showToast(
            `${startIp} does not belong to ${sub}`,
            "error"
        );
        return;
    }



    const fakeIp =
        type === "real"
        ? (v("f_fake_ip").trim() || null)
        : null;



    const vlanId =
        type === "real"
        ? (v("f_vlan_id").trim() || null)
        : null;



    const dspId =
        type === "real"
        ? (Number(sel("f_dsp")) || null)
        : null;



    const token =
        sessionStorage.getItem("authToken");



    try {


        /*
          Find subnet backend row
        */

        const backendRows =
            await fetchRealIpSubnets();



        const subnetRow =
            backendRows.find(r =>
                normalizeSubnet(
                    r.real_ip_block.split("/")[0],
                    Number(r.real_ip_block.split("/")[1])
                )
                ===
                normalizeSubnet(
                    sub.split("/")[0],
                    Number(sub.split("/")[1])
                )
            );



        if (!subnetRow) {

            console.error(
                "Subnet backend row missing",
                sub,
                backendRows
            );

            showToast(
                "Subnet record not found",
                "error"
            );

            return;
        }



        console.log(
            "PATCH SUBNET ROW",
            subnetRow
        );



        const payload = {

            real_ip_block:
                subnetRow.real_ip_block,


            real_ip:
                startIp,


            client_id:
                clientId,


            client_name:
                clientName,


            fake_ip:
                fakeIp,


            vlan_id:
                vlanId
                ?
                Number(vlanId)
                :
                null,


            dsp_id:
                dspId,


            wan:
                subnetRow.wan || null

        };



        console.log(
            "PATCH ID:",
            subnetRow.id
        );


        console.log(
            "PATCH BODY:",
            payload
        );



        const response =
            await fetch(

                `http://10.249.2.9/api/ip-manager/real-ip-subnets/${subnetRow.id}`,

                {
                    method:"PATCH",

                    headers:{

                        "Authorization":
                        `Bearer ${token}`,

                        "Accept":
                        "application/json",

                        "Content-Type":
                        "application/json"

                    },

                    body:
                    JSON.stringify(payload)
                }

            );



        const text =
            await response.text();



        let result = {};

        try {

            result =
                text
                ?
                JSON.parse(text)
                :
                {};

        }
        catch {

            throw new Error(
                text || "Invalid response"
            );

        }



        if(!response.ok || result.ok === false){

            throw new Error(
                result.error ||
                result.message ||
                "Patch failed"
            );

        }



        /*
          Reload
        */

        const realSubnets =
            await fetchRealIpSubnets();



        db.subnets = {};



        realSubnets.forEach(item=>{

            if(!item.real_ip_block)
                return;


            const [
                ip,
                prefix
            ] =
            item.real_ip_block.split("/");


            const key =
                normalizeSubnet(
                    ip,
                    Number(prefix)
                );


            if(!db.subnets[key]){
                db.subnets[key] = [];
            }


            db.subnets[key].push(item);

        });



        REAL_SUBNETS =
            Object.keys(db.subnets);



        buildSidebarNav();

        render();

        updateTopStats();

        closeModal();



        showToast(
            "IP updated successfully ✓",
            "success"
        );


    }
    catch(err){

        console.error(
            "ASSIGN ERROR:",
            err
        );


        showToast(
            err.message,
            "error"
        );

    }

}

// ============================================================
// CLEAR
// ============================================================
async function clearSubnetRow(sub,idx){
confirmDelete('Clear this IP assignment?',function(){
const r=db.subnets[sub][idx];
r.client_id='';r.client_name='';r.fake_ip='';r.vlan_id='';r.dsp='';r.block_id='';
render();showToast('Cleared ✓','success');
bgSync('clearRows',{subnet:sub,indexes:[idx]});
});
}
async function clearBlockRows(sub,blockId,type){
confirmDelete('Clear entire block <b>'+escHtml(blockId)+'</b>?',function(){doClearBlock(sub,blockId,type);});return;}
function doClearBlock(sub,blockId,type){
const data=type==='real'?db.subnets[sub]:db.internalSubnets[sub];
const indexes=[],batchRows=[];
data.forEach((r,idx)=>{
if(r.block_id!==blockId)return;
if(type==='real'){r.client_id='';r.client_name='';r.fake_ip='';r.vlan_id='';r.dsp='';r.block_id='';indexes.push(idx);}
else{r.client_id='';r.client_name='';r.block_id='';batchRows.push({index:idx,client_id:'',client_name:'',block_id:''});}
});
render();showToast('Block '+blockId+' cleared ✓','success');
if(type==='real'){bgSync('clearRows',{subnet:sub,indexes});}
else{bgSync('saveInternalRows',{subnet:sub,rows:batchRows});}
}
async function clearInternalRow(sub,idx){
confirmDelete('Clear this assignment?',function(){doClearInternal(sub,idx);});return;}
async function doClearInternal(sub,idx){
const r=db.internalSubnets[sub][idx];
r.client_id='';r.client_name='';r.block_id='';
render();showToast('Cleared ✓','success');
bgSync('saveInternalRows',{subnet:sub,rows:[{index:idx,client_id:'',client_name:'',block_id:''}]});
}
function toggleBlock(uid){
const rows=document.querySelectorAll('.block-sub-row[data-block="'+uid+'"]');
const ico=document.getElementById('ico-'+uid);
const isOpen=rows.length>0&&rows[0].style.display!=='none';
rows.forEach(r=>r.style.display=isOpen?'none':'table-row');
if(ico)ico.textContent=isOpen?'▶':'▼';
}

// ============================================================
// INTERNAL SUBNET MANAGEMENT
// ============================================================
function addInternalSubnet(){
openModal('Add Internal (Fake IP) Subnet',
'<div class="form-row"><label>Base Network Address <span style="color:var(--red)">*</span></label><input type="text" id="f_base" placeholder="e.g. 10.10.11.0" oninput="validateIPInput(this)"><div class="hint">Choose size below</div></div>'
+'<div class="form-row"><label>Subnet Size</label><select id="f_size"><option value="256">/24 — 256 IPs</option><option value="128">/25 — 128 IPs</option><option value="64">/26 — 64 IPs</option><option value="32">/27 — 32 IPs</option><option value="16">/28 — 16 IPs</option><option value="8">/29 — 8 IPs</option><option value="4">/30 — 4 IPs</option></select></div>',
'<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="confirmAddInternalSubnet()">➕ Create Subnet</button>');
}
async function confirmAddInternalSubnet(){

    const base = document.getElementById('f_base').value.trim();
    const size = Number(document.getElementById('f_size').value);

    const prefixMap = {
        256: 24,
        128: 25,
        64: 26,
        32: 27,
        16: 28,
        8: 29,
        4: 30
    };

    const prefix = prefixMap[size];

    if(!prefix){
        showToast(
            'Invalid subnet size',
            'error'
        );
        return;
    }

    if(!isValidIP(base)){
        showToast(
            'Invalid IP format',
            'error'
        );
        return;
    }

    const token = sessionStorage.getItem("authToken");

    const payload = {
        internal_ip_block: `${base}/${prefix}`
    };

    console.log(
        "CREATE INTERNAL SUBNET PAYLOAD:",
        payload
    );

    try{

        const response = await fetch(
            "http://10.249.2.9/api/ip-manager/internal-ip-subnets",
            {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            }
        );

        const text = await response.text();

        console.log(
            "SERVER:",
            response.status,
            text
        );

        let result;

        try {
            result = JSON.parse(text);
        }
        catch(e){
            throw new Error(
                "Invalid server response"
            );
        }

        if(!response.ok || result.ok === false){
            throw new Error(
                result.error ||
                "Create failed"
            );
        }

        await loadAllData();

        closeModal();

        showPage(
            "internal",
            normalizeSubnet(base, prefix)
        );

        render();

        showToast(
            'Subnet '+base+' created successfully',
            'success'
        );

    }
    catch(err){

        console.error(
            "CREATE ERROR:",
            err
        );

        showToast(
            err.message,
            'error'
        );

    }

}
async function deleteRowsFast(rows, token){

await deleteRowsFast(
    rows,
    token
);


    const responses = await Promise.all(requests);


    for(const response of responses){

        if(!response.ok){

            const text = await response.text();

            throw new Error(
                text || "Delete failed"
            );

        }

    }

}
console.log(db.subnets["5.100.244.0/24"]);
async function confirmDeleteRealSubnet(sub){

    const rows = [
        ...new Map(
            (db.subnets[sub] || [])
            .map(row => [row.id,row])
        ).values()
    ];


    if(!rows.length){
        showToast("Subnet not found","error");
        return;
    }


    if(!confirm(
        `Delete ${sub} (${rows.length} IPs)?`
    )){
        return;
    }


    const token =
        sessionStorage.getItem("authToken");


    try{


        const results =
            await Promise.allSettled(

                rows.map(row =>

                    fetch(
                        `http://10.249.2.9/api/ip-manager/real-ip-subnets/${row.id}`,
                        {
                            method:"DELETE",
                            headers:{
                                "Accept":"application/json",
                                "Authorization":
                                    `Bearer ${token}`
                            }
                        }
                    )

                )

            );



        const failed =
            results.filter(
                r => r.status === "rejected"
            );


        if(failed.length){

            throw new Error(
                failed.length+
                " records failed deleting"
            );

        }



        delete db.subnets[sub];


        await loadAllData();


        buildSidebarNav();


        render();



        showToast(
            `${sub} removed ✓`,
            "success"
        );


    }
    catch(err){

        console.error(
            "DELETE ERROR",
            err
        );

        showToast(
            err.message,
            "error"
        );

    }

}
async function confirmDeleteSubnet(sub){

    const rows =
        db.subnets[sub] || [];


    if(!rows.length){

        showToast(
            "Subnet not found",
            "error"
        );

        return;
    }


    const assigned =
        rows.filter(
            r => r.client_id
        ).length;



    if(
        assigned > 0 &&
        !confirm(
            `⚠️ This subnet has ${assigned} assigned IPs. Delete anyway?`
        )
    ){
        return;
    }


    if(
        assigned === 0 &&
        !confirm(
            `Delete subnet ${sub}?`
        )
    ){
        return;
    }



    try{


        const token =
            sessionStorage.getItem("authToken");



        /*
        Delete every IP row
        */

        for(const row of rows){


            const response =
                await fetch(
                    `http://10.249.2.9/api/ip-manager/internal-ip-subnets/${row.id}`,
                    {
                        method:"DELETE",

                        headers:{
                            "Accept":"application/json",
                            "Authorization":
                                `Bearer ${token}`
                        }
                    }
                );



            const text =
                await response.text();


            let result;


            try{

                result =
                    JSON.parse(text);

            }
            catch(e){

                console.error(
                    "DELETE RESPONSE:",
                    text
                );

                throw new Error(
                    "Invalid server response"
                );

            }



            if(
                !response.ok ||
                result.ok === false
            ){

                throw new Error(
                    result.error ||
                    `Failed deleting ${row.real_ip}`
                );

            }


            console.log(
                "Deleted:",
                row.real_ip
            );

        }



        /*
        Reload database from API
        */

        const realSubnets =
            await fetchRealIpSubnets();



        db.subnets = {};


        realSubnets.forEach(item=>{

            if(!db.subnets[item.real_ip_block]){

             const [ip,prefix] =
    item.real_ip_block.split('/');

const key =
    normalizeSubnet(
        ip,
        Number(prefix)
    );

if(!db.subnets[key]){
    db.subnets[key]=[];
}

db.subnets[key].push(item);

            }


            db.subnets[item.real_ip_block]
            .push(item);

        });



        REAL_SUBNETS =
            Object.keys(db.subnets);



        buildSidebarNav();



        if(REAL_SUBNETS.length){

            showPage(
                'subnet',
                REAL_SUBNETS[0]
            );

        }
        else{

            showPage(
                'dashboard'
            );

        }



        showToast(
            `Subnet ${sub} removed ✓`,
            "success"
        );


    }
    catch(err){

        console.error(
            "DELETE SUBNET ERROR:",
            err
        );


        showToast(
            err.message,
            "error"
        );

    }

}

// ============================================================
// WAN PAGE
// ============================================================
function renderUpdown(val){
if(!val)return'<span style="color:var(--text3)">—</span>';
const up=String(val).toUpperCase().trim();
const isStatus=(up==='UP'||up==='DOWN'||up==='ACTIVE'||up==='INACTIVE');
if(isStatus)return'<span class="badge '+(up==='UP'||up==='ACTIVE'?'badge-green':'badge-gray')+'">'+escHtml(up)+'</span>';
if(up.includes('/')){
const parts=up.split('/'),dl=parts[0].trim(),ul=parts[1].trim();
return'<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(0,180,216,0.1);border:1px solid rgba(0,180,216,0.25);border-radius:4px;padding:2px 8px;font-size:11px;font-family:IBM Plex Mono,monospace;color:var(--accent)"><span style="color:var(--green)">↑</span>'+escHtml(dl)+'<span style="color:var(--text3);padding:0 2px">/</span><span style="color:var(--orange)">↓</span>'+escHtml(ul)+'</span>';
}
return'<span style="background:rgba(188,140,255,0.12);border:1px solid rgba(188,140,255,0.3);border-radius:4px;padding:2px 8px;font-size:11px;font-family:IBM Plex Mono,monospace;color:var(--purple)">'+escHtml(up)+'</span>';
}

function renderWan(){
const cfCID=currentColFilters.wanCid||'';
const cfCode=currentColFilters.wanCode||'';
const cfName=currentColFilters.wanName||'';
const cfVlan=currentColFilters.wanVlan||'';
const cfDsp=currentColFilters.wanDsp||'';
const cfUpdown=currentColFilters.wanUpdown||'';
const cfSubnet=currentColFilters.wanSubnet||'';

let f=db.wan;
if(currentSearch){const q=currentSearch.toLowerCase();f=f.filter(r=>String(r.client_id||'').toLowerCase().includes(q)||String(r.branch_name||'').toLowerCase().includes(q)||String(r.branch_code||'').toLowerCase().includes(q)||String(r.dsp||'').toLowerCase().includes(q)||String(r.vlan_id||'').toLowerCase().includes(q)||String(r.updown||'').toLowerCase().includes(q)||String(r.vlan_subnet||'').toLowerCase().includes(q));}
if(cfCID) f=f.filter(r=>String(r.client_id||'').toLowerCase().includes(cfCID.toLowerCase()));
if(cfCode) f=f.filter(r=>String(r.branch_code||'').toLowerCase().includes(cfCode.toLowerCase()));
if(cfName) f=f.filter(r=>String(r.branch_name||'').toLowerCase().includes(cfName.toLowerCase()));
if(cfVlan) f=f.filter(r=>String(r.vlan_id||'').toLowerCase().includes(cfVlan.toLowerCase()));
if(cfDsp) f=f.filter(r=>String(r.dsp||'').toLowerCase().includes(cfDsp.toLowerCase()));
if(cfUpdown) f=f.filter(r=>String(r.updown||'').toLowerCase().includes(cfUpdown.toLowerCase()));
if(cfSubnet) f=f.filter(r=>String(r.vlan_subnet||'').toLowerCase().includes(cfSubnet.toLowerCase()));

const rows=f.map(r=>{
const idx=db.wan.indexOf(r);
const act=(can('editWan')?'<button class="action-btn edit" onclick="editWanRow('+idx+')">✏️</button>':'')+(can('deleteWan')?'<button class="action-btn del" onclick="deleteWanRow('+idx+')">🗑️</button>':'');
const nameCell='<td style="max-width:180px"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:IBM Plex Sans,sans-serif;font-size:13px;font-weight:500" title="'+escAttr(r.branch_name||'')+'">'+escHtml(r.branch_name||'—')+'</div></td>';
let subnetCell;
if(!r.vlan_subnet){subnetCell='<span style="color:var(--text3)">—</span>';}
else if(isValidSubnet(r.vlan_subnet)){subnetCell='<span class="ip-chip">'+escHtml(r.vlan_subnet)+'</span>';}
else{subnetCell='<span style="color:var(--red);font-size:11px;font-family:IBM Plex Mono,monospace">'+escHtml(r.vlan_subnet)+'</span>';}
return '<tr>'
+'<td style="color:var(--accent);font-weight:600;font-size:11px">'+escHtml(r.client_id||'—')+'</td>'
+'<td style="font-size:11px;white-space:nowrap">'+(r.branch_code?'<span style="color:var(--text2)">'+escHtml(r.branch_code)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td>'
+nameCell
+'<td>'+(r.vlan_id?'<span class="badge badge-yellow">VLAN '+escHtml(String(r.vlan_id))+'</span>':'<span style="color:var(--text3)">—</span>')+'</td>'
+'<td>'+(r.dsp?'<span class="badge '+dspBadge(r.dsp)+'">'+escHtml(r.dsp)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td>'
+'<td style="white-space:nowrap">'+renderUpdown(r.updown)+'</td>'
+'<td style="white-space:nowrap">'+subnetCell+'</td>'
+'<td style="white-space:nowrap">'+act+'</td>'
+'</tr>';
}).join('')||'<tr><td colspan="8"><div class="empty-state"><div class="icon">🔗</div><p>No WAN solutions yet</p></div></td></tr>';

const addBtn=can('addWan')?'<button class="btn btn-primary" onclick="addWanRow()">＋ Add WAN Link</button>':'<span class="badge badge-viewer">👁 View Only</span>';

return '<div class="page-header"><div><div class="page-title">WAN Solutions</div><div class="page-subtitle">Branch / HO configuration — '+db.wan.length+' total</div></div><div class="header-actions">'+addBtn+'</div></div>'
+'<div class="toolbar"><div class="search-box"><input type="text" id="gs" placeholder="Search anything… (live)" value="'+escAttr(currentSearch)+'" oninput="currentSearch=this.value;renderAndFocus(\'gs\');"></div></div>'
+'<div class="table-wrap">'
+'<div class="table-info"><span>Showing '+f.length+' of '+db.wan.length+' WAN link(s)</span></div>'
+'<table style="table-layout:fixed;width:100%"><thead><tr>'
+'<th style="width:100px"><span class="th-label">Client ID/HO</span><input class="col-filter" id="cf-wan-cid" placeholder="filter…" value="'+escAttr(cfCID)+'" oninput="currentColFilters.wanCid=this.value;renderAndFocus(\'cf-wan-cid\');"></th>'
+'<th style="width:90px"><span class="th-label">Branch Code</span><input class="col-filter" id="cf-wan-code" placeholder="filter…" value="'+escAttr(cfCode)+'" oninput="currentColFilters.wanCode=this.value;renderAndFocus(\'cf-wan-code\');"></th>'
+'<th style="width:180px"><span class="th-label">Branch Name</span><input class="col-filter" id="cf-wan-name" placeholder="filter…" value="'+escAttr(cfName)+'" oninput="currentColFilters.wanName=this.value;renderAndFocus(\'cf-wan-name\');"></th>'
+'<th style="width:80px"><span class="th-label">VLAN</span><input class="col-filter" id="cf-wan-vlan" placeholder="filter…" value="'+escAttr(cfVlan)+'" oninput="currentColFilters.wanVlan=this.value;renderAndFocus(\'cf-wan-vlan\');"></th>'
+'<th style="width:100px"><span class="th-label">DSP</span><input class="col-filter" id="cf-wan-dsp" placeholder="filter…" value="'+escAttr(cfDsp)+'" oninput="currentColFilters.wanDsp=this.value;renderAndFocus(\'cf-wan-dsp\');"></th>'
+'<th style="width:100px"><span class="th-label">UP/DOWN</span><input class="col-filter" id="cf-wan-updown" placeholder="filter…" value="'+escAttr(cfUpdown)+'" oninput="currentColFilters.wanUpdown=this.value;renderAndFocus(\'cf-wan-updown\');"></th>'
+'<th style="width:140px"><span class="th-label">Subnet HO→BR</span><input class="col-filter" id="cf-wan-subnet" placeholder="filter…" value="'+escAttr(cfSubnet)+'" oninput="currentColFilters.wanSubnet=this.value;renderAndFocus(\'cf-wan-subnet\');"></th>'
+'<th style="width:60px"></th>'
+'</tr></thead><tbody>'+rows+'</tbody></table>'
+'</div>';
}

function wanForm(r={}){
const dspOpts =
'<option value="">— None —</option>' +

db.dspList.map(d => {

    const dspId =
        d.id ??
        d.dsp_id;


    const codeName =
        d.code_name ??
        d.name ??
        d.dsp ??
        d.provider ??
        "";


    return `
    <option 
        value="${escAttr(String(dspId))}"
        ${String(v.dsp_id) === String(dspId) ? "selected" : ""}
    >
        ${escHtml(codeName)}
    </option>`;

}).join('');
return '<div class="form-grid-3">'
+'<div class="form-row"><label>Client ID / HO <span style="color:var(--red)">*</span></label><input type="text" id="f_client_id" value="'+escAttr(r.client_id||'')+'" placeholder="HO ID" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>'
+'<div class="form-row"><label>Branch Code</label><input type="text" id="f_branch_code" value="'+escAttr(r.branch_code||'')+'" placeholder="BR code" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>'
+'<div class="form-row"><label>Branch Name</label><input type="text" id="f_branch_name" value="'+escAttr(r.branch_name||'')+'" placeholder="Branch name" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>'
+'<div class="form-row"><label>VLAN ID</label><input type="text" id="f_vlan_id" value="'+escAttr(r.vlan_id||'')+'" placeholder="e.g. 200 (1–4094)" oninput="validateVlanIdInput(this);this.value=this.value.replace(/[^0-9]/g,\'\')" maxlength="4"></div>'
+'<div class="form-row"><label>DSP Provider</label><select id="f_dsp">'+dspOpts+'</select></div>'
+'<div class="form-row"><label>UP / DOWN</label><input type="text" id="f_updown" value="'+escAttr(r.updown||'')+'" placeholder="e.g. 5M/5M or 500K/500K" oninput="validateUpDownInput(this);this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>'
+'</div>'
+'<div class="form-row"><label>VLAN Subnet HO→BR</label><input type="text" id="f_vlan_subnet" value="'+escAttr(r.vlan_subnet||'')+'" placeholder="e.g. 192.168.10.0/30" oninput="validateSubnetInput(this)"'+(r.vlan_subnet?(isValidSubnet(r.vlan_subnet)?' class="ip-valid"':' class="ip-invalid"'):'')+'>  <div class="hint">Leave blank to show — in table</div></div>';
}
function getWanData(){return{client_id:v('f_client_id'),branch_code:v('f_branch_code'),branch_name:v('f_branch_name'),vlan_id:v('f_vlan_id'),dsp:sel('f_dsp'),updown:v('f_updown'),vlan_subnet:v('f_vlan_subnet')};}
function addWanRow(){openModal('Add WAN Solution',wanForm(),'<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAddWan()">💾 Add</button>');}
function editWanRow(idx){openModal('Edit WAN Solution',wanForm(db.wan[idx]),'<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doEditWan('+idx+')">💾 Save</button>');}
function isValidVlanId(val){
  if(!val||val.trim()==='')return true;
  var n=parseInt(val.trim(),10);
  return /^\d+$/.test(val.trim())&&n>=1&&n<=4094;
}
function validateVlanIdInput(el){
  var val=el.value.trim();
  if(!val){el.classList.remove('ip-invalid','ip-valid');return;}
  if(isValidVlanId(val)){el.classList.remove('ip-invalid');el.classList.add('ip-valid');}
  else{el.classList.remove('ip-valid');el.classList.add('ip-invalid');}
}
function isValidUpDown(val){
  if(!val)return true;
  // Accept: number+unit/number+unit  e.g. 5M/5M, 500K/500K, 100Mbps/50Mbps
  var pat=/^\d+(\.\d+)?\s*(K|M|G|KB|MB|GB|Kbps|Mbps|Gbps)\s*\/\s*\d+(\.\d+)?\s*(K|M|G|KB|MB|GB|Kbps|Mbps|Gbps)$/i;
  return pat.test(val.trim());
}
function validateUpDownInput(el){
  var val=el.value.trim();
  if(!val){el.classList.remove('ip-invalid','ip-valid');return;}
  if(isValidUpDown(val)){el.classList.remove('ip-invalid');el.classList.add('ip-valid');}
  else{el.classList.remove('ip-valid');el.classList.add('ip-invalid');}
}
async function doAddWan(){
const d=getWanData();
if(!d.client_id){showToast('❌ Client ID is required','error');const el=document.getElementById('f_client_id');if(el){el.style.borderColor='var(--red)';el.focus();}return;}
if(d.updown&&!isValidUpDown(d.updown)){showToast('❌ UP/DOWN format must be e.g. 5M/5M or 500K/500K','error');const el=document.getElementById('f_updown');if(el){el.classList.add('ip-invalid');el.focus();}return;}
if(d.vlan_id&&!isValidVlanId(d.vlan_id)){showToast('❌ VLAN ID must be a number between 1 and 4094','error');const el=document.getElementById('f_vlan_id');if(el){el.classList.add('ip-invalid');el.focus();}return;}
if(d.vlan_subnet&&!isValidSubnet(d.vlan_subnet)){showToast('❌ Subnet is not a valid IPv4/CIDR','error');const el=document.getElementById('f_vlan_subnet');if(el){el.classList.add('ip-invalid');el.focus();}return;}
db.wan.unshift(d);currentWanPage=1;window._wanExpandedGroups={};closeModal();render();showToast('WAN link added ✓','success');bgSync('addWan',d);
}
async function doEditWan(idx){
const d=getWanData();
if(!d.client_id){showToast('❌ Client ID is required','error');const el=document.getElementById('f_client_id');if(el){el.style.borderColor='var(--red)';el.focus();}return;}
if(d.updown&&!isValidUpDown(d.updown)){showToast('❌ UP/DOWN format must be e.g. 5M/5M or 500K/500K','error');const el=document.getElementById('f_updown');if(el){el.classList.add('ip-invalid');el.focus();}return;}
if(d.vlan_id&&!isValidVlanId(d.vlan_id)){showToast('❌ VLAN ID must be a number between 1 and 4094','error');const el=document.getElementById('f_vlan_id');if(el){el.classList.add('ip-invalid');el.focus();}return;}
if(d.vlan_subnet&&!isValidSubnet(d.vlan_subnet)){showToast('❌ Subnet is not a valid IPv4/CIDR','error');const el=document.getElementById('f_vlan_subnet');if(el){el.classList.add('ip-invalid');el.focus();}return;}
db.wan[idx]=d;closeModal();render();showToast('Updated ✓','success');bgSync('editWan',{...d,index:idx});
}
async function deleteWanRow(idx){confirmDelete('Delete this WAN link?',function(){doDeleteWan(idx);});return;}
async function doDeleteWan(idx){db.wan.splice(idx,1);render();showToast('Deleted ✓','success');bgSync('deleteWan',{index:idx});}

// ============================================================
// IP TUNNELS PAGE
// ============================================================
function vpnTypeBadgeClass(t){
const m={PPTP:'vpn-pptp',OVPN:'vpn-ovpn',SSTP:'vpn-sstp',L2TP:'vpn-l2tp',IPSEC:'vpn-ipsec',WIREGUARD:'vpn-wireguard'};
return 'badge '+(m[String(t||'').toUpperCase()]||'badge-gray');
}

function renderTunnels(){
const cfCID=currentColFilters.tunCid||'';
const cfName=currentColFilters.tunName||'';
const cfLocal=currentColFilters.tunLocal||'';
const cfRemote=currentColFilters.tunRemote||'';
const cfIface=currentColFilters.tunIface||'';

let f=db.tunnels;
if(currentSearch){const q=currentSearch.toLowerCase();f=f.filter(r=>String(r.client_id||'').toLowerCase().includes(q)||String(r.client_name||'').toLowerCase().includes(q)||String(r.tunnel_local_ip||'').toLowerCase().includes(q)||String(r.tunnel_remote_ip||'').toLowerCase().includes(q)||String(r.tunnel_interface||'').toLowerCase().includes(q)||String(r.description||'').toLowerCase().includes(q));}
if(cfCID)    f=f.filter(r=>String(r.client_id||'').toLowerCase().includes(cfCID.toLowerCase()));
if(cfName)   f=f.filter(r=>String(r.client_name||'').toLowerCase().includes(cfName.toLowerCase()));
if(cfLocal)  f=f.filter(r=>String(r.tunnel_local_ip||'').toLowerCase().includes(cfLocal.toLowerCase()));
if(cfRemote) f=f.filter(r=>String(r.tunnel_remote_ip||'').toLowerCase().includes(cfRemote.toLowerCase()));
if(cfIface)  f=f.filter(r=>String(r.tunnel_interface||'').toLowerCase().includes(cfIface.toLowerCase()));

const rows=f.map(r=>{
const idx=db.tunnels.indexOf(r);
const act=(can('editTunnel')?'<button class="action-btn edit" onclick="editTunnelRow('+idx+')">✏️</button>':'')+(can('deleteTunnel')?'<button class="action-btn del" onclick="deleteTunnelRow('+idx+')">🗑️</button>':'');
return '<tr>'
+'<td style="color:var(--accent);font-weight:600;font-size:11px">'+escHtml(r.client_id||'—')+'</td>'
+'<td class="name-cell">'+escHtml(r.client_name||'—')+'</td>'
+'<td>'+(r.tunnel_local_ip?'<span class="ip-chip tunnel">'+escHtml(r.tunnel_local_ip)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td>'
+'<td>'+(r.tunnel_remote_ip?'<span class="ip-chip tunnel">'+escHtml(r.tunnel_remote_ip)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td>'
+'<td>'+(r.tunnel_interface?'<span class="badge badge-teal">'+escHtml(r.tunnel_interface)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td>'
+'<td style="color:var(--text2);font-family:IBM Plex Sans,sans-serif;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escAttr(r.description||'')+'">'+escHtml(r.description||'—')+'</td>'
+'<td style="white-space:nowrap">'+act+'</td>'
+'</tr>';
}).join('')||'<tr><td colspan="7"><div class="empty-state"><div class="icon">🔁</div><p>No IP tunnels yet</p></div></td></tr>';

const addBtn=can('addTunnel')?'<button class="btn btn-primary" onclick="addTunnelRow()">＋ Add Tunnel</button>':'<span class="badge badge-viewer">👁 View Only</span>';

return '<div class="page-header"><div><div class="page-title">IP Tunnels</div><div class="page-subtitle">Client tunnel endpoints — '+db.tunnels.length+' total</div></div><div class="header-actions">'+addBtn+'</div></div>'
+'<div class="toolbar"><div class="search-box"><input type="text" id="gs" placeholder="Search client, IP, interface… (live)" value="'+escAttr(currentSearch)+'" oninput="currentSearch=this.value;renderAndFocus(\'gs\');"></div></div>'
+'<div class="table-wrap">'
+'<div class="table-info"><span>Showing '+f.length+' of '+db.tunnels.length+' tunnel(s)</span></div>'
+'<table><thead><tr>'
+'<th style="min-width:100px"><span class="th-label">Client ID</span><input class="col-filter" id="cf-tun-cid" placeholder="filter…" value="'+escAttr(cfCID)+'" oninput="currentColFilters.tunCid=this.value;renderAndFocus(\'cf-tun-cid\');"></th>'
+'<th style="min-width:140px"><span class="th-label">Client Name</span><input class="col-filter" id="cf-tun-name" placeholder="filter…" value="'+escAttr(cfName)+'" oninput="currentColFilters.tunName=this.value;renderAndFocus(\'cf-tun-name\');"></th>'
+'<th style="min-width:130px"><span class="th-label">Local IP</span><input class="col-filter" id="cf-tun-local" placeholder="filter…" value="'+escAttr(cfLocal)+'" oninput="currentColFilters.tunLocal=this.value;renderAndFocus(\'cf-tun-local\');"></th>'
+'<th style="min-width:130px"><span class="th-label">Remote IP</span><input class="col-filter" id="cf-tun-remote" placeholder="filter…" value="'+escAttr(cfRemote)+'" oninput="currentColFilters.tunRemote=this.value;renderAndFocus(\'cf-tun-remote\');"></th>'
+'<th style="min-width:100px"><span class="th-label">Interface</span><input class="col-filter" id="cf-tun-iface" placeholder="filter…" value="'+escAttr(cfIface)+'" oninput="currentColFilters.tunIface=this.value;renderAndFocus(\'cf-tun-iface\');"></th>'
+'<th><span class="th-label">Description</span></th>'
+'<th></th>'
+'</tr></thead><tbody>'+rows+'</tbody></table>'
+'</div>';
}

function tunnelForm(r={}){
return '<div class="form-grid">'
+'<div class="form-row"><label>Client ID <span style="color:var(--red)">*</span></label><input type="text" id="f_client_id" value="'+escAttr(r.client_id||'')+'" placeholder="e.g. EB001" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>'
+'<div class="form-row"><label>Client Name <span style="color:var(--red)">*</span></label><input type="text" id="f_client_name" value="'+escAttr(r.client_name||'')+'" placeholder="e.g. ENERGY HQ" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>'
+'<div class="form-row"><label>Local IP (our side) <span style="color:var(--red)">*</span></label><input type="text" id="f_tunnel_local_ip" value="'+escAttr(r.tunnel_local_ip||'')+'" placeholder="e.g. 5.100.240.10" oninput="validateIPInput(this)"><div class="hint">IP address on our network side of the tunnel</div></div>'
+'<div class="form-row"><label>Remote IP (client side)</label><input type="text" id="f_tunnel_remote_ip" value="'+escAttr(r.tunnel_remote_ip||'')+'" placeholder="e.g. 192.168.1.1" oninput="validateIPInput(this)"><div class="hint">IP address on the client side of the tunnel</div></div>'
+'</div>'
+'<div class="form-row"><label>Interface / Tunnel Name</label><input type="text" id="f_tunnel_interface" value="'+escAttr(r.tunnel_interface||'')+'" placeholder="e.g. tun0, gre1, ipip0" oninput="this.value=this.value.toLowerCase()"><div class="hint">Interface identifier on your router (GRE, IPIP, SIT, etc.)</div></div>'
+'<div class="form-row"><label>Description / Notes</label><textarea id="f_description" placeholder="Optional notes about this tunnel…">'+escHtml(r.description||'')+'</textarea></div>';
}
function getTunnelData(){return{client_id:v('f_client_id'),client_name:v('f_client_name'),tunnel_local_ip:v('f_tunnel_local_ip'),tunnel_remote_ip:v('f_tunnel_remote_ip'),tunnel_interface:v('f_tunnel_interface'),description:document.getElementById('f_description')?.value?.trim()||''};}
function addTunnelRow(){openModal('Add IP Tunnel',tunnelForm(),'<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAddTunnel()">💾 Add</button>');}
function editTunnelRow(idx){openModal('Edit IP Tunnel',tunnelForm(db.tunnels[idx]),'<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doEditTunnel('+idx+')">💾 Save</button>');}
async function doAddTunnel(){
const d=getTunnelData();
if(!d.client_id||!d.client_name){showToast('❌ Client ID and Name are required','error');return;}
if(!d.tunnel_local_ip||!isValidIP(d.tunnel_local_ip)){showToast('❌ Local IP is required and must be valid','error');return;}
if(d.tunnel_remote_ip&&!isValidIP(d.tunnel_remote_ip)){showToast('❌ Remote IP must be a valid IPv4 address','error');return;}
db.tunnels.unshift(d);closeModal();render();updateTopStats();showToast('Tunnel added ✓','success');
const res=await api('addTunnel',d);
if(!res.ok){db.tunnels.shift();render();alert('❌ Tunnel NOT saved.\nServer: '+(res.error||JSON.stringify(res))+'\n\nFix: Paste App_Script-V10.js, run initialize(), deploy new version.');}
}
async function doEditTunnel(idx){
const d=getTunnelData();
if(!d.client_id||!d.client_name){showToast('❌ Client ID and Name are required','error');return;}
if(!d.tunnel_local_ip||!isValidIP(d.tunnel_local_ip)){showToast('❌ Local IP is required and must be valid','error');return;}
if(d.tunnel_remote_ip&&!isValidIP(d.tunnel_remote_ip)){showToast('❌ Remote IP must be a valid IPv4 address','error');return;}
db.tunnels[idx]=d;closeModal();render();showToast('Tunnel updated ✓','success');
const res=await api('editTunnel',{...d,index:idx});if(!res.ok)showToast('⚠️ Sheets sync failed: '+res.error,'error');
}
async function deleteTunnelRow(idx){
confirmDelete('Delete this tunnel?',function(){doDeleteTunnel(idx);});return;}
async function doDeleteTunnel(idx){
db.tunnels.splice(idx,1);render();updateTopStats();showToast('Tunnel deleted ✓','success');
const res=await api('deleteTunnel',{index:idx});if(!res.ok)showToast('⚠️ Sheets sync failed: '+res.error,'error');
}

// ============================================================
// VPN PAGE
// ============================================================
function renderVPN(){
const cfCID=currentColFilters.vpnCid||'';
const cfName=currentColFilters.vpnName||'';
const cfType=currentColFilters.vpnType||'';
const cfIP=currentColFilters.vpnIP||'';
const cfUser=currentColFilters.vpnUser||'';

let f=db.vpn;
if(currentFilter!=='all') f=f.filter(r=>String(r.vpn_type||'').toUpperCase()===String(currentFilter).toUpperCase());
if(currentSearch){const q=currentSearch.toLowerCase();f=f.filter(r=>String(r.client_id||'').toLowerCase().includes(q)||String(r.client_name||'').toLowerCase().includes(q)||String(r.vpn_type||'').toLowerCase().includes(q)||String(r.vpn_ip||'').toLowerCase().includes(q)||String(r.vpn_username||'').toLowerCase().includes(q)||String(r.description||'').toLowerCase().includes(q));}
if(cfCID)  f=f.filter(r=>String(r.client_id||'').toLowerCase().includes(cfCID.toLowerCase()));
if(cfName) f=f.filter(r=>String(r.client_name||'').toLowerCase().includes(cfName.toLowerCase()));
if(cfType) f=f.filter(r=>String(r.vpn_type||'').toLowerCase().includes(cfType.toLowerCase()));
if(cfIP)   f=f.filter(r=>String(r.vpn_ip||'').toLowerCase().includes(cfIP.toLowerCase()));
if(cfUser) f=f.filter(r=>String(r.vpn_username||'').toLowerCase().includes(cfUser.toLowerCase()));

const rows=f.map(r=>{
const idx=db.vpn.indexOf(r);
const act=(can('editVpn')?'<button class="action-btn edit" onclick="editVpnRow('+idx+')">✏️</button>':'')+(can('deleteVpn')?'<button class="action-btn del" onclick="deleteVpnRow('+idx+')">🗑️</button>':'');
return '<tr>'
+'<td style="color:var(--accent);font-weight:600;font-size:11px">'+escHtml(r.client_id||'—')+'</td>'
+'<td class="name-cell">'+escHtml(r.client_name||'—')+'</td>'
+'<td>'+(r.vpn_type?'<span class="'+vpnTypeBadgeClass(r.vpn_type)+'">'+escHtml(r.vpn_type.toUpperCase())+'</span>':'<span style="color:var(--text3)">—</span>')+'</td>'
+'<td>'+(r.vpn_ip?'<span class="ip-chip">'+escHtml(r.vpn_ip)+'</span>':'<span style="color:var(--text3)">—</span>')+'</td>'
+'<td style="font-size:11px;color:var(--text2)">'+escHtml(r.vpn_username||'—')+'</td>'
+'<td style="font-size:11px;color:var(--text3);font-family:IBM Plex Mono,monospace">'+(r.vpn_password?'<span title="'+escAttr(r.vpn_password)+'" style="cursor:help;letter-spacing:2px">••••••</span>':'<span style="color:var(--text3)">—</span>')+'</td>'
+'<td style="color:var(--text2);font-family:IBM Plex Sans,sans-serif;font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escAttr(r.description||'')+'">'+escHtml(r.description||'—')+'</td>'
+'<td style="white-space:nowrap">'+act+'</td>'
+'</tr>';
}).join('')||'<tr><td colspan="8"><div class="empty-state"><div class="icon">🔐</div><p>No VPN entries yet</p></div></td></tr>';

const addBtn=can('addVpn')?'<button class="btn btn-primary" onclick="addVpnRow()">＋ Add VPN</button>':'<span class="badge badge-viewer">👁 View Only</span>';
const allTypes=[...new Set(db.vpn.map(r=>r.vpn_type).filter(Boolean))];
const typeChips=allTypes.map(t=>{
const cnt=db.vpn.filter(r=>String(r.vpn_type||'').toUpperCase()===t.toUpperCase()).length;
return '<span class="filter-chip '+(currentFilter===t?'active':'')+'" onclick="currentFilter=\''+escAttr(t)+'\';currentPageNum=1;render()">'+escHtml(t)+' ('+cnt+')</span>';
}).join('');

return '<div class="page-header"><div><div class="page-title">VPN</div><div class="page-subtitle">Client VPN configurations — '+db.vpn.length+' total</div></div><div class="header-actions">'+addBtn+'</div></div>'
+'<div class="toolbar"><div class="search-box"><input type="text" id="gs" placeholder="Search client, IP, type, username… (live)" value="'+escAttr(currentSearch)+'" oninput="currentSearch=this.value;currentFilter=\'all\';renderAndFocus(\'gs\');"></div>'
+(typeChips?'<div class="filter-row"><span class="filter-chip '+(currentFilter==='all'?'active':'')+'" onclick="currentFilter=\'all\';currentPageNum=1;render()">All ('+db.vpn.length+')</span>'+typeChips+'</div>':'')
+'</div>'
+'<div class="table-wrap">'
+'<div class="table-info"><span>Showing '+f.length+' of '+db.vpn.length+' VPN entry(ies)</span></div>'
+'<table><thead><tr>'
+'<th style="min-width:100px"><span class="th-label">Client ID</span><input class="col-filter" id="cf-vpn-cid" placeholder="filter…" value="'+escAttr(cfCID)+'" oninput="currentColFilters.vpnCid=this.value;renderAndFocus(\'cf-vpn-cid\');"></th>'
+'<th style="min-width:140px"><span class="th-label">Client Name</span><input class="col-filter" id="cf-vpn-name" placeholder="filter…" value="'+escAttr(cfName)+'" oninput="currentColFilters.vpnName=this.value;renderAndFocus(\'cf-vpn-name\');"></th>'
+'<th style="min-width:100px"><span class="th-label">VPN Type</span><input class="col-filter" id="cf-vpn-type" placeholder="filter…" value="'+escAttr(cfType)+'" oninput="currentColFilters.vpnType=this.value;renderAndFocus(\'cf-vpn-type\');"></th>'
+'<th style="min-width:130px"><span class="th-label">VPN IP</span><input class="col-filter" id="cf-vpn-ip" placeholder="filter…" value="'+escAttr(cfIP)+'" oninput="currentColFilters.vpnIP=this.value;renderAndFocus(\'cf-vpn-ip\');"></th>'
+'<th style="min-width:120px"><span class="th-label">Username</span><input class="col-filter" id="cf-vpn-user" placeholder="filter…" value="'+escAttr(cfUser)+'" oninput="currentColFilters.vpnUser=this.value;renderAndFocus(\'cf-vpn-user\');"></th>'
+'<th style="min-width:100px"><span class="th-label">Password</span></th>'
+'<th><span class="th-label">Description</span></th>'
+'<th></th>'
+'</tr></thead><tbody>'+rows+'</tbody></table>'
+'</div>';
}

function vpnForm(r={}){
const typeOpts=VPN_TYPES.map(t=>'<option value="'+t+'"'+(r.vpn_type===t?' selected':'')+'>'+t+'</option>').join('');
return '<div class="form-grid">'
+'<div class="form-row"><label>Client ID <span style="color:var(--red)">*</span></label><input type="text" id="f_client_id" value="'+escAttr(r.client_id||'')+'" placeholder="e.g. EB001" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>'
+'<div class="form-row"><label>Client Name <span style="color:var(--red)">*</span></label><input type="text" id="f_client_name" value="'+escAttr(r.client_name||'')+'" placeholder="e.g. ENERGY HQ" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>'
+'<div class="form-row"><label>VPN Type <span style="color:var(--red)">*</span></label><select id="f_vpn_type"><option value="">— Select type —</option>'+typeOpts+'</select></div>'
+'<div class="form-row"><label>VPN IP / Endpoint</label><input type="text" id="f_vpn_ip" value="'+escAttr(r.vpn_ip||'')+'" placeholder="e.g. 5.100.240.10 or 10.10.25.8/30" oninput="validateVlanIPInput(this)"><div class="hint">Server IP or tunnel endpoint (e.g. 5.100.240.10 or 10.10.25.8/30)</div></div>'
+'</div>'
+'<div class="form-row"><label>VPN Username</label><input type="text" id="f_vpn_username" value="'+escAttr(r.vpn_username||'')+'" placeholder="e.g. eb001-vpn"></div>'
+'<div class="form-row"><label>VPN Password</label><input type="text" id="f_vpn_password" value="'+escAttr(r.vpn_password||'')+'" placeholder="VPN password"><div class="hint">Stored as plain text in Google Sheets</div></div>'
+'<div class="form-row"><label>Description / Notes</label><textarea id="f_description" placeholder="Optional notes (e.g. shared key location, contact person)…">'+escHtml(r.description||'')+'</textarea></div>';
}
function getVpnData(){return{client_id:v('f_client_id'),client_name:v('f_client_name'),vpn_type:sel('f_vpn_type'),vpn_ip:v('f_vpn_ip'),vpn_username:v('f_vpn_username'),vpn_password:v('f_vpn_password'),description:document.getElementById('f_description')?.value?.trim()||''};}
function addVpnRow(){openModal('Add VPN',vpnForm(),'<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doAddVpn()">💾 Add</button>');}
function editVpnRow(idx){openModal('Edit VPN',vpnForm(db.vpn[idx]),'<button class="btn" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="doEditVpn('+idx+')">💾 Save</button>');}
async function doAddVpn(){
const d=getVpnData();
if(!d.client_id||!d.client_name){showToast('❌ Client ID and Name are required','error');return;}
if(!d.vpn_type){showToast('❌ VPN Type is required','error');return;}
if(d.vpn_ip&&!isValidIPorCIDR(d.vpn_ip)){showToast('❌ VPN IP must be a valid IP or subnet (e.g. 5.100.240.10 or 10.10.25.8/30)','error');return;}
db.vpn.unshift(d);closeModal();render();updateTopStats();showToast('VPN added ✓','success');
const res=await api('addVpn',d);
if(!res.ok){db.vpn.shift();render();alert('❌ VPN NOT saved.\nServer: '+(res.error||JSON.stringify(res))+'\n\nFix: Paste App_Script-V10.js, run initialize(), deploy new version.');}
}
async function doEditVpn(idx){
const d=getVpnData();
if(!d.client_id||!d.client_name){showToast('❌ Client ID and Name are required','error');return;}
if(!d.vpn_type){showToast('❌ VPN Type is required','error');return;}
if(d.vpn_ip&&!isValidIPorCIDR(d.vpn_ip)){showToast('❌ VPN IP must be a valid IP or subnet (e.g. 5.100.240.10 or 10.10.25.8/30)','error');return;}
db.vpn[idx]=d;closeModal();render();showToast('VPN updated ✓','success');
const res=await api('editVpn',{...d,index:idx});if(!res.ok)showToast('⚠️ Sheets sync failed: '+res.error,'error');
}
async function deleteVpnRow(idx){
confirmDelete('Delete this VPN entry?',function(){doDeleteVpn(idx);});return;}
async function doDeleteVpn(idx){
db.vpn.splice(idx,1);render();updateTopStats();showToast('VPN deleted ✓','success');
const res=await api('deleteVpn',{index:idx});if(!res.ok)showToast('⚠️ Sheets sync failed: '+res.error,'error');
}

// ============================================================
// CLIENT SEARCH PAGE
// ============================================================
function renderSearch(){
const D='<span style="color:var(--text3);font-family:\'IBM Plex Mono\',monospace">—</span>';

const searchBar='<div class="page-header"><div><div class="page-title">Client Search</div>'
+'<div class="page-subtitle">Search across all subnets, fake IPs, WAN, tunnels and VPN</div></div></div>'
+'<div class="toolbar"><div class="search-box" style="max-width:540px">'
+'<input type="text" id="gs" placeholder="Client ID, name, any IP, VPN type, tunnel, DSP…" value="'+escAttr(currentSearch)+'"'
+' oninput="currentSearch=this.value;renderAndFocus(\'gs\');"></div></div>';

if(currentSearch.length<1){
return searchBar+'<div class="empty-state"><div class="icon">🔎</div>'
+'<p style="font-size:15px;font-weight:600;margin-bottom:6px">Search anything</p>'
+'<p style="font-size:13px;color:var(--text3)">Client ID · IP address · Name · VPN · Tunnel · DSP · Branch</p></div>';
}

const q=currentSearch.toLowerCase();
let rows=[];

if(canSee('seeRealIP'))Object.keys(db.subnets).forEach(s=>{
(db.subnets[s]||[]).filter(r=>r.client_id).forEach(r=>{
if([r.client_id,r.client_name,r.real_ip,r.fake_ip,r.vlan_id,r.dsp,r.block_id]
.some(v=>String(v||'').toLowerCase().includes(q)))
rows.push({t:'real',cid:r.client_id,name:r.client_name,
real_ip:r.real_ip,fake_ip:r.fake_ip,vlan_id:r.vlan_id,dsp:r.dsp,src:s});
});
});

if(canSee('seeFakeIP'))Object.entries(db.internalSubnets).forEach(([sn,arr])=>{
arr.filter(r=>r.client_id).forEach(r=>{
if([r.client_id,r.client_name,r.internal_ip]
.some(v=>String(v||'').toLowerCase().includes(q)))
rows.push({t:'internal',cid:r.client_id,name:r.client_name,
internal_ip:r.internal_ip,src:sn});
});
});

if(canSee('seeWan'))db.wan.forEach(r=>{
if([r.client_id,r.branch_name,r.branch_code,r.dsp,r.vlan_id,r.vlan_subnet,r.updown]
.some(v=>String(v||'').toLowerCase().includes(q)))
rows.push({t:'wan',cid:r.client_id,
branch_code:r.branch_code,branch_name:r.branch_name,
vlan_id:r.vlan_id,vlan_subnet:r.vlan_subnet,
updown:r.updown,dsp:r.dsp,src:'WAN'});
});

if(canSee('seeVlan'))db.vlans.forEach(vv=>{
if([vv.vlan_id,vv.client_id,vv.client_name,vv.real_ip,vv.fake_ip,
    vv.assignment_type,vv.status,vv.service_category,vv.bng_card,vv.cdn,
    vv.zone,vv.source,vv.primary_path,vv.backup_path,vv.other_path,vv.dsp,vv.notes]
.some(val=>String(val||'').toLowerCase().includes(q)))
rows.push({t:'vlan',cid:escHtml(vv.client_id||'—'),name:escHtml(vv.client_name||'—'),
rip:vv.real_ip&&vv.real_ip!=='-'?'<span class="ip-chip">'+escHtml(vv.real_ip)+'</span>':'<span style="color:var(--text3)">—</span>',
fip:vv.fake_ip&&vv.fake_ip!=='-'?'<span class="ip-chip fake">'+escHtml(vv.fake_ip)+'</span>':'<span style="color:var(--text3)">—</span>',
vlan:'<span class="badge badge-yellow">'+escHtml(String(vv.vlan_id||'—'))+'</span>',
vlan_id:vv.vlan_id||'',
dsp:vv.dsp||'',
src:'VLAN',
extra:'<span class="badge badge-orange">'+escHtml(vv.assignment_type||'VLAN')+'</span>'+
'<span class="badge '+(vv.status==='Active'?'badge-green':vv.status==='Disabled'?'badge-red':'badge-yellow')+'" style="margin-left:4px">'+escHtml(vv.status||'')+'</span>'+
(vv.zone?'<span style="font-size:10px;color:var(--yellow);margin-left:4px">📍'+escHtml(vv.zone)+'</span>':'')+
(vv.bng_card?'<span style="font-size:10px;color:var(--teal);margin-left:4px">'+escHtml(vv.bng_card)+'</span>':'')+
(vv.primary_path?'<div style="font-size:10px;color:var(--text3);margin-top:2px">▶ '+escHtml(vv.primary_path)+'</div>':'')});
});

if(canSee('seeTunnels'))db.tunnels.forEach(r=>{
if([r.client_id,r.client_name,r.tunnel_local_ip,r.tunnel_remote_ip,r.tunnel_interface,r.description]
.some(v=>String(v||'').toLowerCase().includes(q)))
rows.push({t:'tunnel',cid:r.client_id,name:r.client_name,
tun_remote:r.tunnel_remote_ip,src:'Tunnel'});
});

if(canSee('seeVpn'))db.vpn.forEach(r=>{
if([r.client_id,r.client_name,r.vpn_type,r.vpn_ip,r.vpn_username]
.some(v=>String(v||'').toLowerCase().includes(q)))
rows.push({t:'vpn',cid:r.client_id,name:r.client_name,
vpn_type:r.vpn_type,vpn_ip:r.vpn_ip,
vpn_user:r.vpn_username,vpn_pass:r.vpn_password,src:'VPN'});
});

if(!rows.length){
return searchBar+'<div class="empty-state"><div class="icon">🔍</div>'
+'<p>No results for <b>'+escHtml(currentSearch)+'</b></p></div>';
}

function tb(t){
const cfg={
real:    'background:rgba(0,180,216,0.15);color:var(--accent);border:1px solid rgba(0,180,216,0.3)',
internal:'background:rgba(255,166,87,0.15);color:var(--orange);border:1px solid rgba(255,166,87,0.3)',
wan:     'background:rgba(188,140,255,0.15);color:var(--purple);border:1px solid rgba(188,140,255,0.3)',
tunnel:  'background:rgba(45,212,191,0.15);color:var(--teal);border:1px solid rgba(45,212,191,0.3)',
vpn:     'background:rgba(248,81,73,0.15);color:var(--red);border:1px solid rgba(248,81,73,0.3)',
};
const lbl={real:'REAL',internal:'FAKE IP',wan:'WAN',tunnel:'TUNNEL',vpn:'VPN'};
const s=cfg[t]||'background:var(--bg3);color:var(--text2)';
return '<span style="'+s+';display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:\'IBM Plex Mono\',monospace">'+(lbl[t]||t.toUpperCase())+'</span>';
}

const stickyTd='position:sticky;background:var(--bg2);z-index:3';

// Paginate search results
const totalSearchRows=rows.length;
const totalSearchPages=Math.max(1,Math.ceil(totalSearchRows/SEARCH_PAGE_SIZE));
if(currentSearchPage>totalSearchPages)currentSearchPage=totalSearchPages;
const pagedRows=rows.slice((currentSearchPage-1)*SEARCH_PAGE_SIZE,currentSearchPage*SEARCH_PAGE_SIZE);
const tableRows=pagedRows.map(r=>{
const c1=tb(r.t);
const c2='<span style="color:var(--accent);font-weight:700;font-size:11px;font-family:\'IBM Plex Mono\',monospace">'+escHtml(r.cid||'—')+'</span>';
let c3='';
if(r.t==='wan'){
c3=(r.branch_code?'<div style="color:var(--text3);font-size:11px;font-family:\'IBM Plex Mono\',monospace">'+escHtml(r.branch_code)+'</div>':'')
+(r.branch_name?'<div style="color:var(--text);font-size:13px;font-weight:500">'+escHtml(r.branch_name)+'</div>':'');
if(!r.branch_code&&!r.branch_name) c3='<span style="color:var(--text3)">—</span>';
} else {
c3='<span style="color:var(--text);font-size:13px;font-weight:500">'+escHtml(r.name||'—')+'</span>';
}
const c4=r.t==='real'&&r.real_ip?'<span class="ip-chip">'+escHtml(r.real_ip)+'</span>':D;
const c5=r.t==='real'&&r.fake_ip?'<span class="ip-chip fake">'+escHtml(r.fake_ip)+'</span>':D;
const c6=r.t==='internal'&&r.internal_ip?'<span class="ip-chip internal">'+escHtml(r.internal_ip)+'</span>':D;
const vlanVal=(r.t==='real'||r.t==='wan'||r.t==='vlan')?r.vlan_id:'';
const c7=vlanVal?'<span class="badge badge-yellow" style="font-size:10px">'+escHtml(String(vlanVal))+'</span>':D;
let c8=D;
if(r.t==='wan'){
const parts=[];
if(r.vlan_subnet) parts.push('<span class="ip-chip" style="font-size:10px">'+escHtml(r.vlan_subnet)+'</span>');
if(r.updown)      parts.push(renderUpdown(r.updown));
if(parts.length)  c8='<div style="display:flex;flex-direction:column;gap:4px">'+parts.join('')+'</div>';
}
const c9=r.t==='tunnel'&&r.tun_remote?'<span class="ip-chip tunnel">'+escHtml(r.tun_remote)+'</span>':D;
let c10=D;
if(r.t==='vpn'){
const parts=[];
if(r.vpn_type) parts.push('<span class="'+vpnTypeBadgeClass(r.vpn_type)+'">'+escHtml(r.vpn_type.toUpperCase())+'</span>');
if(r.vpn_ip)   parts.push('<span class="ip-chip" style="font-size:10px">'+escHtml(r.vpn_ip)+'</span>');
if(parts.length) c10='<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">'+parts.join('')+'</div>';
}
const c11=r.dsp?'<span class="badge '+dspBadge(r.dsp)+'" style="font-size:10px">'+escHtml(r.dsp)+'</span>':D;
const c12='<span style="color:var(--text3);font-size:11px;font-family:\'IBM Plex Mono\',monospace">'+escHtml(r.src||'—')+'</span>';

return '<tr style="vertical-align:middle">'
+'<td style="padding:8px 10px;white-space:nowrap;'+stickyTd+';left:0">'+c1+'</td>'
+'<td style="padding:8px 10px;white-space:nowrap;'+stickyTd+';left:75px">'+c2+'</td>'
+'<td style="padding:8px 10px;white-space:nowrap;'+stickyTd+';left:185px;border-right:1px solid var(--border)">'+c3+'</td>'
+'<td style="padding:8px 10px">'+c4+'</td>'
+'<td style="padding:8px 10px">'+c5+'</td>'
+'<td style="padding:8px 10px">'+c6+'</td>'
+'<td style="padding:8px 10px;white-space:nowrap">'+c7+'</td>'
+'<td style="padding:8px 10px">'+c8+'</td>'
+'<td style="padding:8px 10px">'+c9+'</td>'
+'<td style="padding:8px 10px">'+c10+'</td>'
+'<td style="padding:8px 10px;white-space:nowrap">'+c11+'</td>'
+'<td style="padding:8px 10px;white-space:nowrap">'+c12+'</td>'
+'</tr>';
}).join('');

const thBase='padding:8px 10px;text-align:left;background:var(--bg3);border-bottom:1px solid var(--border);font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--text2);white-space:nowrap;position:sticky;top:0;z-index:2';
const thS0=thBase+';left:0;z-index:5';
const thS1=thBase+';left:75px;z-index:5';
const thS2=thBase+';left:185px;z-index:5;border-right:1px solid var(--border)';

const thead='<thead><tr>'
+'<th style="min-width:75px;'+thS0+'">Type</th>'
+'<th style="min-width:110px;'+thS1+'">Client ID</th>'
+'<th style="min-width:180px;'+thS2+'">Name / Branch</th>'
+'<th style="min-width:120px;'+thBase+'">Real IP</th>'
+'<th style="min-width:120px;'+thBase+'">Fake IP</th>'
+'<th style="min-width:120px;'+thBase+'">Internal IP</th>'
+'<th style="min-width:70px;'+thBase+'">VLAN</th>'
+'<th style="min-width:170px;'+thBase+'">WAN Subnet / Speed</th>'
+'<th style="min-width:130px;'+thBase+'">Tunnel Remote</th>'
+'<th style="min-width:155px;'+thBase+'">VPN Type / IP</th>'
+'<th style="min-width:80px;'+thBase+'">DSP</th>'
+'<th style="min-width:90px;'+thBase+'">Source</th>'
+'</tr></thead>';

return searchBar
+'<div style="position:sticky;top:0;z-index:10;background:var(--bg2);border:1px solid var(--border);border-bottom:none;border-radius:8px 8px 0 0;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">'
+'<span style="font-size:11px;color:var(--text2);font-family:IBM Plex Mono,monospace">'+rows.length+' result(s) for <b style="color:var(--text)">'+escHtml(currentSearch)+'</b>'+(totalSearchPages>1?' &middot; Page '+currentSearchPage+'/'+totalSearchPages:'')+'</span>'
+'<span style="color:var(--text3);font-size:11px">Client ID &amp; Name are sticky · scroll → for more</span>'
+'</div>'
+'<div class="table-wrap" style="overflow-x:auto;border-radius:0 0 8px 8px">'
+'<table style="min-width:1180px;border-collapse:collapse">'
+thead+'<tbody>'+tableRows+'</tbody></table></div>'
+(totalSearchPages>1?(
'<div class="pagination" style="padding:12px 0">'
+(currentSearchPage>1?'<button class="page-btn" onclick="currentSearchPage='+(1)+';render()">1</button>':'')
+(currentSearchPage>3?'<span class="page-info">&hellip;</span>':'')
+(currentSearchPage>2?'<button class="page-btn" onclick="currentSearchPage='+(currentSearchPage-1)+';render()">'+(currentSearchPage-1)+'</button>':'')
+'<button class="page-btn active">'+currentSearchPage+'</button>'
+(currentSearchPage<totalSearchPages-1?'<button class="page-btn" onclick="currentSearchPage='+(currentSearchPage+1)+';render()">'+(currentSearchPage+1)+'</button>':'')
+(currentSearchPage<totalSearchPages-2?'<span class="page-info">&hellip;</span>':'')
+(currentSearchPage<totalSearchPages?'<button class="page-btn" onclick="currentSearchPage='+totalSearchPages+';render()">'+totalSearchPages+'</button>':'')
+'<button class="page-btn" onclick="currentSearchPage=Math.max(1,currentSearchPage-1);render()">&lsaquo;</button>'
+'<button class="page-btn" onclick="currentSearchPage=Math.min(totalSearchPages,currentSearchPage+1);render()">&rsaquo;</button>'
+'</div>'
):'');
}

// ============================================================

// ============================================================
// VLAN TRACKING PAGE — V13
// Features:
//   • Multi-VLAN entry: "123", "123,128,130", "123-130", "128,150-160"
//   • Grouped rows with collapse/expand (blue bar = active, purple = reserved+client, amber = reserved no client)
//   • Conflict banner ABOVE table (compact, expandable, dismissible)
//   • Reserved ranges bar ABOVE table (subtle amber)
//   • Real-IP conflict: diff client = red warning + jump link; same client = yellow info + jump; not found = gray standalone
//   • Fake-IP conflict: same logic vs Internal (Fake IP) section
//   • Client-ID auto-fills Client-Name from Real IP Subnets
//   • Status: Active / Disabled / Reserved / Free
//   • Last Modified auto-set on save
//   • Full Client Search integration
// ============================================================

const VLAN_TYPES    = ['PPPoE','Corporate','Reseller','Management','Reserved'];
const VLAN_SERVICES = ['HSI','Corporate','Management','CDN'];
const VLAN_STATUSES = ['Active','Disabled','Reserved','Free'];
const BNG_CARDS     = Array.from({length:14},(_,i)=>'BNG-Card-'+(i+1));

// ── Parse VLAN input string into array of IDs ─────────────────
function parseVlanInput(raw){
  const ids=new Set();
  const parts=raw.split(',');
  parts.forEach(p=>{
    p=p.trim();
    if(!p)return;
    const range=p.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if(range){
      const a=parseInt(range[1],10),b=parseInt(range[2],10);
      const lo=Math.min(a,b),hi=Math.max(a,b);
      for(let i=lo;i<=hi&&ids.size<500;i++)ids.add(i);
    } else {
      const n=parseInt(p,10);
      if(!isNaN(n)&&n>=1&&n<=4094)ids.add(n);
    }
  });
  return [...ids].sort((a,b)=>a-b);
}

// ── Compress ID array into display string ─────────────────────
function compressVlanIds(ids){
  if(!ids||!ids.length)return'';
  const sorted=[...ids].map(Number).sort((a,b)=>a-b);
  const parts=[];let start=sorted[0],prev=sorted[0];
  for(let i=1;i<sorted.length;i++){
    if(sorted[i]===prev+1){prev=sorted[i];continue;}
    parts.push(prev===start?String(start):start+'–'+prev);
    start=sorted[i];prev=sorted[i];
  }
  parts.push(prev===start?String(start):start+'–'+prev);
  return parts.join(', ');
}

// ── Conflict helpers ──────────────────────────────────────────
function vlanRealIPConflict(realIp, ownClientId){
  if(!realIp||realIp==='-'||realIp==='')return null;
  const base=realIp.split('/')[0];
  for(const s of REAL_SUBNETS){
    const found=(db.subnets[s]||[]).find(r=>r.real_ip===base&&r.client_id);
    if(found){
      if(found.client_id===ownClientId) return{type:'same',clientId:found.client_id,clientName:found.client_name,subnet:s};
      return{type:'diff',clientId:found.client_id,clientName:found.client_name,subnet:s};
    }
  }
  return{type:'standalone'};
}

function vlanFakeIPConflict(fakeIp, ownClientId){
  if(!fakeIp||fakeIp==='-'||fakeIp==='')return null;
  for(const[s,arr] of Object.entries(db.internalSubnets)){
    const found=arr.find(r=>r.internal_ip===fakeIp&&r.client_id);
    if(found){
      if(found.client_id===ownClientId) return{type:'same',clientId:found.client_id,clientName:found.client_name,subnet:s};
      return{type:'diff',clientId:found.client_id,clientName:found.client_name,subnet:s};
    }
  }
  return{type:'standalone'};
}

function autoFillClientName(clientId){
  if(!clientId)return'';
  for(const s of REAL_SUBNETS){
    const found=(db.subnets[s]||[]).find(r=>r.client_id===clientId&&r.client_name);
    if(found)return found.client_name;
  }
  for(const arr of Object.values(db.internalSubnets)){
    const found=arr.find(r=>r.client_id===clientId&&r.client_name);
    if(found)return found.client_name;
  }
  return'';
}

// ── Group VLANs by group_id for display ───────────────────────
function buildVlanGroups(vlanList){
  // Each VLAN row has a group_id field (set when adding multi-VLAN)
  // If group_id empty OR group has only 1 member, treat as single
  const groups=[];const seen=new Set();
  vlanList.forEach((v,i)=>{
    if(seen.has(i))return;
    const gid=v.group_id||'';
    // Use db.vlans.indexOf(v) for TRUE index — not position in sorted/filtered list
    const trueIdx=db.vlans.indexOf(v);
    if(!gid){seen.add(i);groups.push({type:'single',row:v,idx:trueIdx});return;}
    const members=vlanList.map((vv,ii)=>({row:vv,idx:db.vlans.indexOf(vv)})).filter(x=>x.row.group_id===gid);
    // If only 1 member in the group, treat as single (handles orphaned group_ids)
    if(members.length<=1){
      members.forEach(m=>seen.add(m.idx));
      groups.push({type:'single',row:v,idx:i});
      return;
    }
    members.forEach(m=>seen.add(m.idx));
    groups.push({type:'group',gid,members,lead:v,leadIdx:i});
  });
  return groups;
}

// ── Render conflict cell for Real-IP ─────────────────────────
function renderRealIpCell(realIp,clientId){
  if(!realIp||realIp==='-'||realIp==='') return '<span style="color:var(--text3)">—</span>';
  const c=vlanRealIPConflict(realIp,clientId);
  let cell='<span class="ip-chip">'+escHtml(realIp)+'</span>';
  if(!c||c.type==='standalone') cell+=' <span class="vlan-gray-tag">○ standalone</span>';
  else if(c.type==='same') cell+=' <span class="vlan-link" onclick="showPage(\'subnet\',\''+escAttr(c.subnet)+'\')">🔗 '+escHtml(c.clientId)+'</span>';
  else cell+=' <span class="vlan-err" style="cursor:pointer" onclick="showPage(\'subnet\',\''+escAttr(c.subnet)+'\')">⚠ '+escHtml(c.clientId)+' ↗</span>';
  return cell;
}

// ── Render conflict cell for Fake-IP ─────────────────────────
function renderFakeIpCell(fakeIp,clientId){
  if(!fakeIp||fakeIp==='-'||fakeIp==='') return '<span style="color:var(--text3)">—</span>';
  const c=vlanFakeIPConflict(fakeIp,clientId);
  let cell='<span class="ip-chip fake">'+escHtml(fakeIp)+'</span>';
  if(!c||c.type==='standalone') cell+=' <span class="vlan-gray-tag">○ standalone</span>';
  else if(c.type==='same') cell+=' <span class="vlan-link" onclick="showPage(\'internal\',\''+escAttr(c.subnet)+'\')">🔗 '+escHtml(c.clientId)+'</span>';
  else cell+=' <span class="vlan-err" style="cursor:pointer" onclick="showPage(\'internal\',\''+escAttr(c.subnet)+'\')">⚠ '+escHtml(c.clientId)+' ↗</span>';
  return cell;
}

// ── Build conflicts summary ───────────────────────────────────
function buildVlanConflicts(){
  const items=[];
  // Duplicate VLAN IDs
  const idCount={};
  db.vlans.forEach(v=>{const id=String(v.vlan_id||'');if(id)idCount[id]=(idCount[id]||0)+1;});
  Object.entries(idCount).filter(([,c])=>c>1).forEach(([id,cnt])=>{
    const owners=db.vlans.filter(v=>String(v.vlan_id||'')===id).map(v=>v.client_id||'(no client)').join(', ');
    items.push('⚠ VLAN '+id+' — duplicate ID (×'+cnt+') — clients: '+owners);
  });
  // Real-IP conflicts (diff client)
  db.vlans.forEach(v=>{
    if(!v.real_ip||v.real_ip==='-')return;
    const c=vlanRealIPConflict(v.real_ip,v.client_id);
    if(c&&c.type==='diff') items.push('⚠ VLAN '+String(v.vlan_id||'?')+' — Real-IP '+v.real_ip+' owned by '+c.clientId+' in Real IP Subnets (different client)');
  });
  // Fake-IP conflicts (diff client)
  db.vlans.forEach(v=>{
    if(!v.fake_ip||v.fake_ip==='-')return;
    const c=vlanFakeIPConflict(v.fake_ip,v.client_id);
    if(c&&c.type==='diff') items.push('⚠ VLAN '+String(v.vlan_id||'?')+' — Fake-IP '+v.fake_ip+' owned by '+c.clientId+' in Internal Subnets (different client)');
  });
  return items;
}
async function fetchDspList(){

    try{

        const token=sessionStorage.getItem("authToken");

        const res=await fetch(
            "http://10.249.2.9/api/ip-manager/dsps",
            {
                headers:{
                    "Accept":"application/json",
                    "Authorization":`Bearer ${token}`
                }
            }
        );


        const result=await res.json();


        console.log("DSP LIST:",result);


        if(!res.ok){
            throw new Error(
                result.message || "Failed loading DSP"
            );
        }


        db.dspList=result.data || [];


        return db.dspList;


    }catch(err){

        console.error(
            "FETCH DSP ERROR",
            err
        );

        db.dspList=[];

        return [];

    }

}
async function fetchVlans(){

    try{

        const token = sessionStorage.getItem("authToken");


        const res = await fetch(
            "http://10.249.2.9/api/ip-manager/vlans-v2",
            {
                method:"GET",
                headers:{
                    "Accept":"application/json",
                    "Authorization":`Bearer ${token}`
                }
            }
        );


        const result = await res.json();


        console.log("STATUS:", res.status);

        console.log(
            "RAW VLAN API RESPONSE:",
            result
        );


        if(!res.ok){

            throw new Error(
                result.message || "Failed loading VLANs"
            );

        }


        const rows = result.data || [];


        console.log(
            "VLAN DATA:",
            rows
        );


        db.vlans = rows.map(v => ({


            // IDs
            id: v.id,

            vlan_id:
                v.vlan_id || v.id,


            // Status
            status:
                v.status
                ?
                (
                    v.status.toLowerCase()==="inactive"
                    ?
                    "Disabled"
                    :
                    v.status.charAt(0).toUpperCase()
                    + v.status.slice(1)
                )
                :
                "Active",



            // Type
            assignment_type:
                v.assignment_type
                ||
                v.type
                ?
                (
                    (v.assignment_type || v.type)
                    .charAt(0)
                    .toUpperCase()
                    +
                    (v.assignment_type || v.type)
                    .slice(1)
                )
                :
                "",



            // Service
            service_category:
                v.service_category
                ||
                v.service
                ?
                (
                    (v.service_category || v.service)
                    .charAt(0)
                    .toUpperCase()
                    +
                    (v.service_category || v.service)
                    .slice(1)
                )
                :
                "",



            zone:
                v.zone || "",



            client_id:
                v.client_id || "-",


            client_name:
                v.client_name
                ||
                "-",



            real_ip:
                v.real_ip || "-",



            fake_ip:
                v.fake_ip || "-",



       // DSP
dsp_id:
    v.dsp_id || null,


dsp:
    (()=>{

        if(!v.dsp_id)
            return "";


        const dspObj =
            db.dspList.find(
                d =>
                Number(d.id) === Number(v.dsp_id)
            );


        return dspObj
            ?
            dspObj.code_name
            :
            "";

    })(),



            bng_card:
                v.bng_card || "",


            cdn:
                v.cdn || "",



            primary_path:
                v.primary_path || "",


            backup_path:
                v.backup_path || "",


            other_path:
                v.other_path || "",



            source:
                v.source || "API",



            notes:
                v.notes || "",



            last_modified:
                v.last_modified || "",



            locked:
                v.locked === true ||
                v.locked === "true" ||
                v.locked === 1



        }));


        console.log(
            "FINAL DB VLAN:",
            db.vlans
        );


        // redraw table
        render();


        return db.vlans;


    }
    catch(error){


        console.error(
            "FETCH VLAN ERROR:",
            error
        );


        showToast(
            error.message,
            "error"
        );


        return [];

    }

}

async function doAddVlan(){


    const token = sessionStorage.getItem("authToken");


   const payload = {

    id:Number(
        document.getElementById("fv_vid").value
    ),


    status:
        document.getElementById("fv_status").value
        .trim()
        .toLowerCase(),


    type:
        document.getElementById("fv_type").value
        .trim()
        .toLowerCase(),


    service:
        document.getElementById("fv_svc").value
        .trim()
        .toLowerCase(),


    zone:
        document.getElementById("fv_zone").value
        .trim()
        .toLowerCase(),


    client_id:
        document.getElementById("fv_cid").value
        .trim()
        .toUpperCase(),


    real_ip:
        (
            document.getElementById("fv_rip").value &&
            document.getElementById("fv_rip").value !== "-"
        )
        ?
        document.getElementById("fv_rip").value
        :
        null,


    fake_ip:
        (
            document.getElementById("fv_fip").value &&
            document.getElementById("fv_fip").value !== "-"
        )
        ?
        document.getElementById("fv_fip").value
        :
        null,


    dsp_id:
        document.getElementById("fv_dsp").value || null

};


    console.log(
        "POST VLAN PAYLOAD:",
        payload
    );


    try{


        const res = await fetch(
            "http://10.249.2.9/api/ip-manager/vlans-v2",
            {

                method:"POST",

                headers:{

                    "Content-Type":"application/json",

                    "Accept":"application/json",

                    "Authorization":
                        `Bearer ${token}`

                },


                body:
                    JSON.stringify(payload)

            }
        );



        const result =
            await res.json();



        console.log(
            "POST RESPONSE:",
            result
        );



        if(!res.ok){

            throw new Error(
                result.message ||
                "Failed adding VLAN"
            );

        }



        showToast(
            "VLAN added successfully",
            "success"
        );



        closeModal();



        await fetchVlans();



    }
    catch(err){


        console.error(
            "ADD VLAN ERROR:",
            err
        );


        showToast(
            err.message,
            "error"
        );


    }


}
async function addVlan(payload){

    try{

        const token=sessionStorage.getItem("authToken");


        const res=await fetch(
            "http://10.249.2.9/api/ip-manager/vlans-v2",
            {
                method:"POST",

                headers:{
                    "Content-Type":"application/json",
                    "Accept":"application/json",
                    "Authorization":`Bearer ${token}`
                },


                body:JSON.stringify({

                    id:payload.vlan_id,

                    status:payload.status,

                    type:payload.assignment_type,

                    service:payload.service_category,

                    zone:payload.zone,

                    client_id:payload.client_id,

                    real_ip:payload.real_ip || null,

                    fake_ip:payload.fake_ip || null,

                    dsp_id:payload.dsp_id || null

                })

            }
        );


        const result=await res.json();


        console.log(
            "ADD VLAN RESPONSE",
            result
        );


        if(!res.ok){
            throw new Error(
                result.message || "Failed adding VLAN"
            );
        }


        await fetchVlans();


        showToast(
            "VLAN added successfully",
            "success"
        );


    }catch(err){

        console.error(
            "ADD VLAN ERROR",
            err
        );


        showToast(
            err.message,
            "error"
        );

    }

}
// ── Main render function ──────────────────────────────────────
function renderVlan(){
 
  const conflictItems=buildVlanConflicts();
  const cfBadge=document.getElementById('badge-vlan');
  if(cfBadge)cfBadge.textContent=db.vlans.length;

  // Filters
  const cfVid=currentColFilters.vVid||'';
  const cfCid=currentColFilters.vCid||'';
  const cfName=currentColFilters.vName||'';
  const cfStatus=currentColFilters.vStatus||'';
  const cfType=currentColFilters.vType||'';
  const cfSvc=currentColFilters.vSvc||'';
  const cfZone=currentColFilters.vZone||'';

  let f=db.vlans;
  if(currentFilter!=='all') f=f.filter(v=>v.status===currentFilter||v.assignment_type===currentFilter);
  if(currentSearch){
    const q=currentSearch.toLowerCase();
    f=f.filter(v=>[v.vlan_id,v.client_id,v.client_name,v.real_ip,v.fake_ip,
      v.assignment_type,v.status,v.service_category,v.bng_card,v.cdn,v.zone,v.source,
      v.primary_path,v.backup_path,v.other_path,v.notes,v.dsp].some(x=>String(x||'').toLowerCase().includes(q)));
  }
  if(cfVid)    f=f.filter(v=>String(v.vlan_id||'').includes(cfVid));
  if(cfCid)    f=f.filter(v=>String(v.client_id||'').toLowerCase().includes(cfCid.toLowerCase()));
  if(cfName)   f=f.filter(v=>String(v.client_name||'').toLowerCase().includes(cfName.toLowerCase()));
  if(cfStatus) f=f.filter(v=>String(v.status||'').toLowerCase().includes(cfStatus.toLowerCase()));
  if(cfType)   f=f.filter(v=>String(v.assignment_type||'').toLowerCase().includes(cfType.toLowerCase()));
  if(cfSvc)    f=f.filter(v=>String(v.service_category||'').toLowerCase().includes(cfSvc.toLowerCase()));
  if(cfZone)   f=f.filter(v=>String(v.zone||'').toLowerCase().includes(cfZone.toLowerCase()));

  // ── Conflict Banner ──
  let conflictBanner='';
  if(conflictItems.length){
    const cfRows=conflictItems.map(x=>'<div class="cf-item">'+escHtml(x)+'</div>').join('');
    // Refresh VLAN Tracking with loader

    conflictBanner=`<div class="cf-banner" id="vlan-cf-banner">
      <div class="cf-left">
        <div class="cf-title">
          ⚠ ${conflictItems.length} Conflict${conflictItems.length>1?'s':''} detected
          <span class="cf-toggle" onclick="
            var d=document.getElementById('cf-detail');
            var open=d.style.display!=='none';
            d.style.display=open?'none':'block';
            this.textContent=open?'▼ show details':'▲ hide details';
          ">▼ show details</span>
        </div>
        <div id="cf-detail" style="display:none;margin-top:4px">${cfRows}</div>
      </div>
      <button class="cf-dismiss" onclick="document.getElementById('vlan-cf-banner').style.display='none'">✕ Dismiss</button>
    </div>`;
  }

  // ── Reserved Ranges Bar ──
  let resBanner='';
  if(db.vlanReservedRanges&&db.vlanReservedRanges.length){
    const pills=db.vlanReservedRanges.map((rr,i)=>{
      const label=rr.type==='block'?'VLAN '+rr.from+'–'+rr.to:(rr.vlan_ids||'');
      const who=rr.client_id?(' → '+rr.client_id):'(no client)';
      return '<span class="res-pill">'+escHtml(label+who)+'</span>';
    }).join('');
    resBanner=`<div class="res-banner">
      <span style="font-size:11px;color:var(--yellow);font-weight:700;white-space:nowrap">🔒 Reserved ranges:</span>
      ${pills}
      <span style="font-size:11px;color:var(--yellow);cursor:pointer;opacity:.7;text-decoration:underline;margin-left:auto;white-space:nowrap" onclick="openReservedRangeModal()">manage →</span>
    </div>`;
  }

  // ── Build grouped rows for display ──
  const groups=buildVlanGroups(f);

  const typeColor={PPPoE:'badge-blue',Corporate:'badge-purple',Reseller:'badge-orange',Management:'badge-yellow',Reserved:'badge-yellow'};
  const svcColor={HSI:'badge-teal',Corporate:'badge-purple',Management:'badge-yellow',CDN:'badge-orange'};
  const statusColor={Active:'badge-green',Disabled:'badge-red',Reserved:'badge-yellow',Free:'badge-gray'};

  let tableRows='';
  groups.forEach(g=>{
    if(g.type==='single'){
      const v=g.row; const idx=g.idx;
      const isLocked=v.locked==='1'||v.locked==='true';
      const isDisabled=v.status==='Disabled';
      const isReserved=v.status==='Reserved';
      const idCount={};db.vlans.forEach(vv=>{const id=String(vv.vlan_id||'');if(id)idCount[id]=(idCount[id]||0)+1;});
      const isDup=(idCount[String(v.vlan_id||'')]||0)>1;

      let rowStyle='';
      if(isLocked)rowStyle='background:rgba(0,180,216,0.04);opacity:.8';
      else if(isDup||(vlanRealIPConflict(v.real_ip,v.client_id)||{}).type==='diff'||(vlanFakeIPConflict(v.fake_ip,v.client_id)||{}).type==='diff') rowStyle='background:rgba(248,81,73,0.04)';
      else if(isDisabled) rowStyle='opacity:.65';
      else if(isReserved&&v.client_id&&v.client_id!=='-') rowStyle='background:rgba(188,140,255,0.04)';
      else if(isReserved) rowStyle='background:rgba(210,153,34,0.03)';

      const cdnBadge=v.cdn?`<span style="background:rgba(255,166,87,.15);border:1px solid rgba(255,166,87,.35);border-radius:20px;padding:1px 7px;font-size:10px;color:var(--orange);font-family:'IBM Plex Mono',monospace">${escHtml(v.cdn)}</span>`:'<span style="color:var(--text3)">—</span>';

      const actCell = isLocked
    ? `
        <span style="font-size:10px;color:var(--text3)">🔒</span>
        ${
            can('addVlan')
            ? `
            <button 
                class="action-btn" 
                onclick="unlockVlan(${idx})" 
                title="Unlock VLAN">
                🔓
            </button>
            `
            : ''
        }
      `
    : `
        ${
            can('addVlan')
            ? `
            <button 
                class="action-btn edit"
                onclick="openVlanModal(${idx})"
                title="Edit VLAN">
                ✏️
            </button>
            `
            : ''
        }

        ${
            can('addVlan')
            ? `
            <button 
                class="action-btn"
                onclick="lockVlan(${idx})"
                title="Lock VLAN">
                🔒
            </button>
            `
            : ''
        }

        ${
            can('deleteVlan')
            ? `
            <button 
                class="action-btn del"
                onclick="deleteVlanRow(${idx})"
                title="Delete VLAN">
                🗑️
            </button>
            `
            : ''
        }
      `;

      let vidCell='<span style="font-family:\'IBM Plex Mono\',monospace;font-weight:700">'+escHtml(String(v.vlan_id||''))+'</span>';
      if(isDup) vidCell+=' <span class="vlan-warn">⚠ ×'+(idCount[String(v.vlan_id||'')]||0)+'</span>';
      if(isLocked) vidCell+=' <span class="badge badge-gray" style="font-size:9px">🔒</span>';

      tableRows+=`<tr style="${rowStyle}">
        <td class="vlan-sticky-left" style="position:sticky;left:0;z-index:2;border-right:1px solid var(--border)">${vidCell}</td>
        <td>${v.status?'<span class="badge '+(statusColor[v.status]||'badge-gray')+'">'+escHtml(v.status)+'</span>':'<span style="color:var(--text3)">—</span>'}</td>
        <td>${v.assignment_type?'<span class="badge '+(typeColor[v.assignment_type]||'badge-gray')+'">'+escHtml(v.assignment_type)+'</span>':'<span style="color:var(--text3)">—</span>'}</td>
        <td>${v.service_category?'<span class="badge '+(svcColor[v.service_category]||'badge-gray')+'">'+escHtml(v.service_category)+'</span>':'<span style="color:var(--text3)">—</span>'}</td>
        <td style="font-size:11px;color:var(--text2)">${escHtml(v.zone||'—')}</td>
        <td style="color:var(--accent);font-weight:600;font-size:11px">${escHtml(v.client_id||'—')}</td>
        <td class="name-cell">${escHtml(v.client_name||'—')}</td>
        <td>${renderRealIpCell(v.real_ip,v.client_id)}</td>
        <td>${renderFakeIpCell(v.fake_ip,v.client_id)}</td>
        <td>${v.dsp?'<span class="badge '+dspBadge(v.dsp)+'">'+escHtml(v.dsp)+'</span>':'<span style="color:var(--text3)">—</span>'}</td>
        <td style="font-size:11px;color:var(--teal)">${escHtml(v.bng_card||'—')}</td>
        <td>${cdnBadge}</td>
        <td style="font-size:11px;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis">${escHtml(v.primary_path||'—')}</td>
        <td style="font-size:11px;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis">${escHtml(v.backup_path||'—')}</td>
        <td style="font-size:11px;color:var(--text2);max-width:100px;overflow:hidden;text-overflow:ellipsis">${escHtml(v.other_path||'—')}</td>
        <td style="font-size:11px;color:var(--text2)">${escHtml(v.source||'—')}</td>
        <td style="font-size:11px;color:var(--text3);max-width:120px;overflow:hidden;text-overflow:ellipsis" title="${escAttr(v.notes||'')}">${escHtml(v.notes||'—')}</td>
        <td class="ts-cell">${escHtml(v.last_modified||'—')}</td>
        <td style="white-space:nowrap;position:sticky;right:0;background:var(--bg2);border-left:1px solid var(--border)">${actCell}</td>
      </tr>`;

    } else {
      // GROUP ROW
      const gid=g.gid; const members=g.members; const lead=g.lead;
      const safeGid=gid.replace(/[^a-z0-9]/gi,'_');
      const isReservedGrp=lead.status==='Reserved';
      const hasClient=lead.client_id&&lead.client_id!=='-';
      const allIds=members.map(m=>Number(m.row.vlan_id)).sort((a,b)=>a-b);
      const displayIds=compressVlanIds(allIds);
      const cnt=members.length;

      let grpBarColor=isReservedGrp?(hasClient?'var(--purple)':'var(--yellow)'):'var(--accent)';
      let grpBadgeStyle=isReservedGrp?(hasClient?'background:rgba(188,140,255,.12);border:1px solid rgba(188,140,255,.3);color:var(--purple)':'background:rgba(210,153,34,.12);border:1px solid rgba(210,153,34,.3);color:var(--yellow)'):'background:rgba(0,180,216,.12);border:1px solid rgba(0,180,216,.3);color:var(--accent)';
      let grpRowStyle=isReservedGrp?(hasClient?'background:rgba(188,140,255,.04)':'background:rgba(210,153,34,.03)'):'background:rgba(0,180,216,.03)';
      const statusBadge=lead.status?`<span class="badge ${statusColor[lead.status]||'badge-gray'}">${escHtml(lead.status)}</span>`:'<span style="color:var(--text3)">—</span>';
      const typeBadge=lead.assignment_type?`<span class="badge ${typeColor[lead.assignment_type]||'badge-gray'}">${escHtml(lead.assignment_type)}</span>`:'<span style="color:var(--text3)">—</span>';

      tableRows+=`<tr style="${grpRowStyle}" id="grphead-${safeGid}">
        <td class="vlan-sticky-left" style="position:sticky;left:0;z-index:2;border-right:1px solid var(--border)">
          <span style="display:inline-block;width:3px;height:14px;background:${grpBarColor};border-radius:2px;margin-right:5px;vertical-align:middle"></span>
          <span style="cursor:pointer;color:${grpBarColor};font-size:11px;font-weight:700" onclick="toggleVlanGroup('${safeGid}')">
            <span id="grpico-${safeGid}">▶</span> ${escHtml(displayIds)}
          </span>
          <span style="${grpBadgeStyle};display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-family:'IBM Plex Mono',monospace;margin-left:4px">${cnt} VLANs</span>
        </td>
        <td>${statusBadge}</td>
        <td>${typeBadge}</td>
        <td>${lead.service_category?`<span class="badge ${svcColor[lead.service_category]||'badge-gray'}">${escHtml(lead.service_category)}</span>`:'<span style="color:var(--text3)">—</span>'}</td>
        <td style="font-size:11px;color:var(--text2)">${escHtml(lead.zone||'—')}</td>
        <td style="color:${grpBarColor};font-weight:600;font-size:11px">${escHtml(lead.client_id||'—')}</td>
        <td class="name-cell">${escHtml(lead.client_name||'—')}</td>
        <td style="font-size:11px;color:var(--text3);font-style:italic">${isReservedGrp?'not assigned yet':'shared pool'}</td>
        <td style="font-size:11px;color:var(--text3);font-style:italic">${isReservedGrp?'not assigned yet':'multiple'}</td>
        <td>${lead.dsp?`<span class="badge ${dspBadge(lead.dsp)}">${escHtml(lead.dsp)}</span>`:'<span style="color:var(--text3)">—</span>'}</td>
        <td style="font-size:11px;color:var(--teal)">${escHtml(lead.bng_card||'—')}</td>
        <td style="color:var(--text3)">—</td>
        <td style="font-size:11px;color:var(--text2)">${escHtml(lead.primary_path||'—')}</td>
        <td style="font-size:11px;color:var(--text2)">${escHtml(lead.backup_path||'—')}</td>
        <td style="font-size:11px;color:var(--text2)">${escHtml(lead.other_path||'—')}</td>
        <td style="font-size:11px;color:var(--text2)">${escHtml(lead.source||'—')}</td>
        <td style="font-size:11px;color:var(--text3);font-style:italic">${escHtml(lead.notes||'—')}</td>
        <td class="ts-cell">${escHtml(lead.last_modified||'—')}</td>
        <td style="white-space:nowrap;position:sticky;right:0;background:var(--bg2);border-left:1px solid var(--border)">
          <button class="action-btn" style="font-size:10px;color:${grpBarColor}" onclick="toggleVlanGroup('${safeGid}')">expand ▼</button>
          ${can('addVlan')?`<button class="action-btn edit" onclick="openVlanGroupEditModal('${escAttr(gid)}')" title="Bulk edit all VLANs in group">✏️ all</button>`:''}
          ${can('deleteVlan')?`<button class="action-btn del" onclick="deleteVlanGroup('${escAttr(gid)}')">🗑️</button>`:''}
        </td>
      </tr>`;

      // Child rows (hidden by default)
      members.forEach(m=>{
        const v=m.row; const idx=m.idx;
        const isLocked=v.locked==='1'||v.locked==='true';
        const childStyle=isReservedGrp?(hasClient?'background:rgba(188,140,255,.02)':'background:rgba(210,153,34,.02)'):'background:rgba(0,180,216,.015)';
        const barChildStyle=`display:inline-block;width:3px;height:14px;background:${isReservedGrp?(hasClient?'rgba(188,140,255,.4)':'rgba(210,153,34,.4)'):'rgba(0,180,216,.35)'};border-radius:2px;margin-right:5px;vertical-align:middle`;
        const cdnBadge=v.cdn?`<span style="background:rgba(255,166,87,.15);border:1px solid rgba(255,166,87,.35);border-radius:20px;padding:1px 6px;font-size:9px;color:var(--orange);font-family:'IBM Plex Mono',monospace">${escHtml(v.cdn)}</span>`:'<span style="color:var(--text3)">—</span>';
        const actCell=isLocked
          ?`<span style="font-size:10px;color:var(--text3)">🔒</span>${can('addVlan')?`<button class="action-btn" onclick="unlockVlan(${idx})" title="Unlock">🔓</button>`:''}`
          :`${can('addVlan')?`<button class="action-btn edit" onclick="openVlanModal(${idx})">✏️</button>`:''}${can('deleteVlan')?`<button class="action-btn del" onclick="deleteVlanRow(${idx})">🗑️</button>`:''}`;

        tableRows+=`<tr class="vlan-grp-child-${safeGid}" style="display:none;${childStyle}">
          <td class="vlan-sticky-left" style="position:sticky;left:0;z-index:2;border-right:1px solid var(--border)"><span style="${barChildStyle}"></span><span style="font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:11px">${escHtml(String(v.vlan_id||''))}</span></td>
          <td>${v.status?`<span class="badge ${statusColor[v.status]||'badge-gray'}" style="font-size:9px">${escHtml(v.status)}</span>`:'—'}</td>
          <td>${v.assignment_type?`<span class="badge ${typeColor[v.assignment_type]||'badge-gray'}" style="font-size:9px">${escHtml(v.assignment_type)}</span>`:'—'}</td>
          <td>${v.service_category?`<span class="badge ${svcColor[v.service_category]||'badge-gray'}" style="font-size:9px">${escHtml(v.service_category)}</span>`:'—'}</td>
          <td style="font-size:10px;color:var(--text2)">${escHtml(v.zone||'—')}</td>
          <td style="color:var(--accent);font-size:11px">${escHtml(v.client_id||'—')}</td>
          <td style="font-size:12px;font-weight:500">${escHtml(v.client_name||'—')}</td>
          <td style="font-size:11px">${isReservedGrp?'<span style="color:var(--text3);font-style:italic">pending</span>':renderRealIpCell(v.real_ip,v.client_id)}</td>
          <td style="font-size:11px">${isReservedGrp?'<span style="color:var(--text3);font-style:italic">pending</span>':renderFakeIpCell(v.fake_ip,v.client_id)}</td>
          <td>${v.dsp?`<span class="badge ${dspBadge(v.dsp)}" style="font-size:9px">${escHtml(v.dsp)}</span>`:'—'}</td>
          <td style="font-size:10px;color:var(--teal)">${escHtml(v.bng_card||'—')}</td>
          <td>${cdnBadge}</td>
          <td style="font-size:10px;color:var(--text2)">${escHtml(v.primary_path||'—')}</td>
          <td style="font-size:10px;color:var(--text2)">${escHtml(v.backup_path||'—')}</td>
          <td style="font-size:10px;color:var(--text2)">${escHtml(v.other_path||'—')}</td>
          <td style="font-size:10px;color:var(--text2)">${escHtml(v.source||'—')}</td>
          <td style="font-size:10px;color:var(--text3)">${escHtml(v.notes||'—')}</td>
          <td class="ts-cell">${escHtml(v.last_modified||'—')}</td>
          <td style="white-space:nowrap;position:sticky;right:0;background:var(--bg2);border-left:1px solid var(--border)">${actCell}</td>
        </tr>`;
      });
    }
  });

  if(!tableRows) tableRows=`<tr><td colspan="18"><div class="empty-state"><div class="icon">🏷️</div><p>No VLANs yet — click ＋ Add VLAN to start</p></div></td></tr>`;

  const addBtn=can('addVlan')?`<button class="btn btn-primary" onclick="openVlanModal(null)">＋ Add VLAN</button><button class="btn" onclick="openCdnManagerModal()">📡 CDN List</button>`:`<span class="badge badge-viewer">👁 View Only</span>`;

  const typeChips=VLAN_TYPES.map(t=>{
    const cnt=db.vlans.filter(v=>v.assignment_type===t).length;
    return `<span class="filter-chip ${currentFilter===t?'active':''}" onclick="currentFilter='${t}';render()">${escHtml(t)} (${cnt})</span>`;
  }).join('');

  const statusChips=VLAN_STATUSES.map(s=>{
    const cnt=db.vlans.filter(v=>v.status===s).length;
    return `<span class="filter-chip ${currentFilter===s?'active':''}" onclick="currentFilter='${s}';render()">${escHtml(s)} (${cnt})</span>`;
  }).join('');

  return `
<div class="page-header">
  <div><div class="page-title">VLAN Tracking</div>
  <div class="page-subtitle">${db.vlans.length} VLANs tracked${conflictItems.length?' — <span style="color:var(--red)">⚠ '+conflictItems.length+' conflict'+( conflictItems.length>1?'s':'')+'</span>':''}</div></div>
<div class="header-actions">${adminBtns}</div>
</div>

<div class="toolbar">
  <div class="search-box"><input type="text" id="gs" placeholder="Search VLAN ID, client, IP, path, source…" value="${escAttr(currentSearch)}" oninput="currentSearch=this.value;renderAndFocus('gs');"></div>
  <select class="filter-select" onchange="currentFilter=this.value;render()">
    <option value="all"${currentFilter==='all'?' selected':''}>All Status</option>
    ${VLAN_STATUSES.map(s=>`<option value="${escAttr(s)}"${currentFilter===s?' selected':''}>${escHtml(s)}</option>`).join('')}
  </select>
  <select class="filter-select" onchange="currentFilter=this.value;render()">
    <option value="all"${currentFilter==='all'?' selected':''}>All Types</option>
    ${VLAN_TYPES.map(t=>`<option value="${escAttr(t)}"${currentFilter===t?' selected':''}>${escHtml(t)}</option>`).join('')}
  </select>
  <div class="filter-row">
    <span class="filter-chip ${currentFilter==='all'?'active':''}" onclick="currentFilter='all';render()">All (${db.vlans.length})</span>
    ${typeChips}
  </div>
</div>

${conflictBanner}

<div class="table-wrap" style="overflow-x:auto">
  <div class="table-info">
    <span>Showing ${groups.length} row(s) / ${f.length} VLANs of ${db.vlans.length} total</span>
    <span style="color:var(--text3);font-size:11px">▶ = grouped · click to expand · scroll → for all columns</span>
  </div>
  <table style="min-width:1820px;border-collapse:collapse">
    <thead><tr>
      <th style="min-width:140px;position:sticky;left:0;background:var(--bg3);z-index:6;border-right:1px solid var(--border)"><span class="th-label">VLAN-ID</span>
        <input class="col-filter" id="cf-vvid" placeholder="filter…" value="${escAttr(cfVid)}" oninput="currentColFilters.vVid=this.value;renderAndFocus('cf-vvid')"></th>
      <th style="min-width:85px"><span class="th-label">Status</span>
        <input class="col-filter" id="cf-vstatus" placeholder="filter…" value="${escAttr(cfStatus)}" oninput="currentColFilters.vStatus=this.value;renderAndFocus('cf-vstatus')"></th>
      <th style="min-width:95px"><span class="th-label">Type</span>
        <input class="col-filter" id="cf-vtype" placeholder="filter…" value="${escAttr(cfType)}" oninput="currentColFilters.vType=this.value;renderAndFocus('cf-vtype')"></th>
      <th style="min-width:90px"><span class="th-label">Service</span>
        <input class="col-filter" id="cf-vsvc" placeholder="filter…" value="${escAttr(cfSvc)}" oninput="currentColFilters.vSvc=this.value;renderAndFocus('cf-vsvc')"></th>
      <th style="min-width:90px"><span class="th-label">Zone</span>
        <input class="col-filter" id="cf-vzone" placeholder="filter…" value="${escAttr(cfZone)}" oninput="currentColFilters.vZone=this.value;renderAndFocus('cf-vzone')"></th>
      <th style="min-width:100px"><span class="th-label">Client-ID</span>
        <input class="col-filter" id="cf-vcid" placeholder="filter…" value="${escAttr(cfCid)}" oninput="currentColFilters.vCid=this.value;renderAndFocus('cf-vcid')"></th>
      <th style="min-width:140px"><span class="th-label">Client-Name</span>
        <input class="col-filter" id="cf-vname" placeholder="filter…" value="${escAttr(cfName)}" oninput="currentColFilters.vName=this.value;renderAndFocus('cf-vname')"></th>
      <th style="min-width:160px"><span class="th-label">Real-IP</span></th>
      <th style="min-width:160px"><span class="th-label">Fake-IP</span></th>
      <th style="min-width:90px"><span class="th-label">DSP</span></th>
      <th style="min-width:100px"><span class="th-label">BNG-Card</span></th>
      <th style="min-width:100px"><span class="th-label">CDN</span></th>
      <th style="min-width:120px"><span class="th-label">Primary-Path</span></th>
      <th style="min-width:120px"><span class="th-label">Backup-Path</span></th>
      <th style="min-width:100px"><span class="th-label">Other-Path</span></th>
      <th style="min-width:90px"><span class="th-label">Source</span></th>
      <th style="min-width:130px"><span class="th-label">Notes</span></th>
      <th style="min-width:120px"><span class="th-label">Modified</span></th>
      <th style="min-width:90px;position:sticky;right:0;background:var(--bg3);z-index:6;border-left:1px solid var(--border)"></th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</div>`;
}

// ── Group expand/collapse ─────────────────────────────────────
function toggleVlanGroup(safeGid){
  const rows=document.querySelectorAll('.vlan-grp-child-'+safeGid);
  const ico=document.getElementById('grpico-'+safeGid);
  const open=rows.length>0&&rows[0].style.display!=='none';
  rows.forEach(r=>r.style.display=open?'none':'table-row');
  if(ico)ico.textContent=open?'▶':'▼';
}
async function deleteVlanRow(index){

    const vlan=db.vlans[index];

    if(!vlan){
        showToast("VLAN not found","error");
        return;
    }

    const vlanKey = vlan.id ?? vlan.vlan_id;

    console.log("Deleting VLAN:", vlanKey, vlan);

    try{

        const token=sessionStorage.getItem("authToken");

        const res=await fetch(
            `http://10.249.2.9/api/ip-manager/vlans-v2/${vlanKey}`,
            {
                method:"DELETE",
                headers:{
                    "Accept":"application/json",
                    "Authorization":`Bearer ${token}`
                }
            }
        );

        const text=await res.text();

        console.log("DELETE STATUS:",res.status);
        console.log("DELETE RESPONSE:",text);


        if(!res.ok){
            let msg=text;

            try{
                const j=JSON.parse(text);
                msg=j.error||j.message||text;
            }
            catch(e){}

            throw new Error(msg);
        }


        db.vlans.splice(index,1);

        render();
        updateTopStats();

        showToast("VLAN deleted ✓","success");


    }catch(err){

        console.error("Delete VLAN error:",err);
        showToast(err.message,"error");

    }
}
// ── Delete entire group ───────────────────────────────────────
async function deleteVlanGroup(gid){
  const members=db.vlans.filter(v=>v.group_id===gid);
  if(!members.length){showToast('Group not found','error');return;}
  confirmDelete('Delete all <b>'+members.length+'</b> VLANs in this group?',function(){doDeleteVlanGroupConfirmed(gid);});return;}
async function doDeleteVlanGroupConfirmed(gid){
  const members=db.vlans.filter(v=>v.group_id===gid);
  const vlanIds=members.map(v=>String(v.vlan_id||''));
  const indexes=members.map(v=>db.vlans.indexOf(v)).sort((a,b)=>b-a);
  indexes.forEach(i=>db.vlans.splice(i,1));
  render();updateTopStats();showToast('Group deleted ✓','success');
  const res=await api('batchDeleteVlan',{vlanIds:vlanIds});
  if(!res.ok)showToast('⚠️ Sheets sync failed: '+(res.error||'unknown'),'error');
}
function getClientsArray(){

    if(Array.isArray(db.clients))
        return db.clients;

    if(Array.isArray(db.clients.data))
        return db.clients.data;

    if(Array.isArray(db.clients.clients))
        return db.clients.clients;

    return [];

}
// ── Bulk Edit Group ──────────────────────────────────────────
function openVlanGroupEditModal(gid){
  const members=db.vlans.filter(v=>v.group_id===gid);
  if(!members.length){showToast('Group not found','error');return;}
  const lead=members[0];
  const statusOpts=VLAN_STATUSES.map(s=>`<option value="${s}"${lead.status===s?' selected':''}>${s}</option>`).join('');
  const typeOpts=VLAN_TYPES.map(t=>`<option value="${t}"${lead.assignment_type===t?' selected':''}>${t}</option>`).join('');
  const svcOpts=VLAN_SERVICES.map(s=>`<option value="${s}"${lead.service_category===s?' selected':''}>${s}</option>`).join('');
  const bngOpts='<option value="">— None —</option>'+BNG_CARDS.map(b=>`<option value="${b}"${lead.bng_card===b?' selected':''}>${b}</option>`).join('');
  const cdnOpts='<option value="">— None —</option>'+db.vlanCdnList.map(c=>`<option value="${escAttr(c)}"${lead.cdn===c?' selected':''}>${escHtml(c)}</option>`).join('');
 const dspOpts =
'<option value="">— None —</option>' +
(db.dspList || []).map(d => {

    const value = typeof d === "object" ? d.id : d;
    const name  = typeof d === "object" ? (d.name || d.provider || d.id) : d;

    return `
    <option value="${escAttr(String(value))}"
        ${String(lead.dsp_id) === String(value) ? " selected" : ""}>
        ${escHtml(String(name))}
    </option>`;

}).join('');
  const clients = db.clients.data || [];



const clientOpts =

`
<option value="">
    — Select Client —
</option>

<option value="-"
${String(v.client_id)==="-" ? "selected" : ""}>
    — None —
</option>
`

+

clients.map(c => {

    return `

    <option
        value="${escAttr(c.id)}"
        ${String(v.client_id)===String(c.id) ? "selected" : ""}
    >

        ${escHtml(c.name || '')}

    </option>

    `;

}).join('');
  const allIds=members.map(m=>m.vlan_id).join(', ');
  const body=`
<div style="background:rgba(0,180,216,.06);border:1px solid rgba(0,180,216,.2);border-radius:6px;padding:10px 14px;margin-bottom:12px;font-size:12px">
  <b style="color:var(--accent)">Bulk editing ${members.length} VLANs:</b>
  <span style="color:var(--text2);font-family:'IBM Plex Mono',monospace;margin-left:6px">${escHtml(allIds)}</span>
  <div style="font-size:11px;color:var(--text3);margin-top:4px">All changes apply to every VLAN in this group. Client-ID and Client-Name are shared — edit below.</div>
</div>
<div style="background:rgba(188,140,255,.06);border:1px solid rgba(188,140,255,.2);border-radius:6px;padding:10px 14px;margin-bottom:12px">
  <div style="font-size:11px;font-weight:700;color:var(--purple);margin-bottom:6px">🔢 Renumber VLAN-IDs (optional)</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:center">
    <div class="form-row" style="margin:0">
      <label style="font-size:10px">New Start ID <span style="font-weight:400;color:var(--text3)">(leave blank to keep current)</span></label>
      <input type="number" id="fvg_new_start" placeholder="e.g. 700" min="1" max="4094" style="background:var(--bg3);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:6px 10px;font-size:12px;font-family:'IBM Plex Mono',monospace;width:100%">
    </div>
    <div style="font-size:11px;color:var(--text3);padding-top:16px">
      Current: ${allIds}<br>
      Will renumber sequentially from new start.
    </div>
  </div>
</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">
  <div class="form-row">
    <label>Status</label>
    <select id="fvg_status">${statusOpts}</select>
  </div>
  <div class="form-row">
    <label>Type</label>
    <select id="fvg_type">${typeOpts}</select>
  </div>
  <div class="form-row">
    <label>Service</label>
    <select id="fvg_svc">${svcOpts}</select>
  </div>
  <div class="form-row">
    <label>Zone</label>
    <input type="text" id="fvg_zone" value="${escAttr(lead.zone||'')}" placeholder="e.g. NORTH, SOUTH, HQ" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>
  <div class="form-row">
    <label>Client-ID</label>
    <input type="text" id="fvg_cid" value="${escAttr(lead.client_id||'')}" placeholder="e.g. TRI-009 or -" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>
  <div class="form-row">
    <label>Client-Name</label>
    <input type="text" id="fvg_cname" value="${escAttr(lead.client_name||'')}" placeholder="Client name" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>
  <div class="form-row">
    <label>DSP Provider</label>
    <select id="fvg_dsp">${dspOpts}</select>
  </div>
  <div class="form-row">
    <label>BNG-Card</label>
    <select id="fvg_bng">${bngOpts}</select>
  </div>
  <div class="form-row">
    <label>CDN Provider</label>
    <select id="fvg_cdn">${cdnOpts}</select>
  </div>
  <div class="form-row">
    <label>Source</label>
    <input type="text" id="fvg_src" value="${escAttr(lead.source||'')}" placeholder="e.g. N9K, DUDE, CRS-325" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>
  <div class="form-row" style="grid-column:span 2">
    <label>Primary Path</label>
    <input type="text" id="fvg_pp" value="${escAttr(lead.primary_path||'')}" placeholder="e.g. BEIRUT-SW1 → CORE" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>
  <div class="form-row" style="grid-column:span 2">
    <label>Backup Path</label>
    <input type="text" id="fvg_bp" value="${escAttr(lead.backup_path||'')}" placeholder="e.g. TRIPOLI-SW2 → CORE" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>
  <div class="form-row" style="grid-column:span 2">
    <label>Other Path</label>
    <input type="text" id="fvg_op" value="${escAttr(lead.other_path||'')}" placeholder="e.g. SIDON-SW3 → ACCESS" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>
  <div class="form-row" style="grid-column:span 2">
    <label>Notes</label>
    <textarea id="fvg_notes" placeholder="Notes for all VLANs in this group…">${escHtml(lead.notes||'')}</textarea>
  </div>
</div>`;

  openModal(`✏️ Bulk Edit — ${members.length} VLANs`,body,
    `<button class="btn" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="doSaveVlanGroup('${escAttr(gid)}')">💾 Save All ${members.length} VLANs</button>`);
}

async function doSaveVlanGroup(gid){

    const token = sessionStorage.getItem("authToken");


    const members = db.vlans.filter(
        v => v.group_id === gid
    );


    if(!members.length){

        showToast(
            "Group not found",
            "error"
        );

        return;
    }



    const getValue = (id)=>{

        const el = document.getElementById(id);

        return el ? el.value.trim() : "";

    };



    try{


        for(const vlan of members){


          const payload = {

    status:
        getValue("fvg_status").toLowerCase(),

    type:
        getValue("fvg_type").toLowerCase(),

    service:
        getValue("fvg_svc").toLowerCase(),

    zone:
        getValue("fvg_zone").toLowerCase(),

    client_id:
        getValue("fvg_cid").toUpperCase(),

    client_name:
        getValue("fvg_cname").toUpperCase(),

    dsp_id:
        getValue("fvg_dsp")
        ?
        Number(getValue("fvg_dsp"))
        :
        null

};



            console.log(
                "UPDATING VLAN:",
                vlan.id
            );


            console.log(
                JSON.stringify(payload,null,2)
            );



            const res = await fetch(

                `http://10.249.2.9/api/ip-manager/vlans-v2/${vlan.id}`,

                {

                    method:"PUT",


                    headers:{

                        "Content-Type":
                        "application/json",

                        "Accept":
                        "application/json",

                        "Authorization":
                        `Bearer ${token}`

                    },


                    body:
                    JSON.stringify(payload)

                }

            );



            const responseText =
                await res.text();



            let result;


            try{

                result =
                JSON.parse(responseText);

            }
            catch(e){

                result={
                    raw:responseText
                };

            }



            console.log(
                "UPDATE RESPONSE:",
                vlan.id,
                res.status,
                result
            );



            if(!res.ok){

                throw new Error(
                    result.error ||
                    result.message ||
                    `Failed updating VLAN ${vlan.id}`
                );

            }


        }



        showToast(
            `${members.length} VLANs updated successfully`,
            "success"
        );


        closeModal();


        await fetchVlans();



    }
    catch(err){


        console.error(
            "BULK UPDATE ERROR:",
            err
        );


        showToast(
            err.message,
            "error"
        );

    }

}

// ── Lock / Unlock ─────────────────────────────────────────────
function lockVlan(idx){
  db.vlans[idx].locked='1';
  db.vlans[idx].last_modified=(function(){var _d=new Date();return _d.getFullYear()+'-'+String(_d.getMonth()+1).padStart(2,'0')+'-'+String(_d.getDate()).padStart(2,'0')+' '+String(_d.getHours()).padStart(2,'0')+':'+String(_d.getMinutes()).padStart(2,'0');})();
  render();showToast('VLAN '+db.vlans[idx].vlan_id+' locked 🔒','success');
  api('editVlan',{...db.vlans[idx],index:idx});
}
function unlockVlan(idx){
  db.vlans[idx].locked='';
  db.vlans[idx].last_modified=(function(){var _d=new Date();return _d.getFullYear()+'-'+String(_d.getMonth()+1).padStart(2,'0')+'-'+String(_d.getDate()).padStart(2,'0')+' '+String(_d.getHours()).padStart(2,'0')+':'+String(_d.getMinutes()).padStart(2,'0');})();
  render();showToast('VLAN '+db.vlans[idx].vlan_id+' unlocked 🔓','success');
  api('editVlan',{...db.vlans[idx],index:idx});
}

// ── Delete single row ─────────────────────────────────────────


// ── VLAN Modal ────────────────────────────────────────────────
let _vlanEditIdx=-1;

async function openVlanModal(idx){
 if(!db.clients || db.clients.length===0){
    await fetchClients();
    console.log("CLIENT LIST:", db.clients);
}


if(!db.dspList || db.dspList.length===0){
    await fetchDspProviders();
}


_vlanEditIdx = (idx!==null && idx!==undefined) ? idx : -1;


const isEdit = _vlanEditIdx >= 0;


const v = isEdit ? db.vlans[_vlanEditIdx] : {};



const clientOpts =

`
<option value="">
    — Select Client —
</option>

<option value="-"
${String(v.client_id)==="-" ? "selected" : ""}>
    — None —
</option>
`

+

(db.clients?.data || []).map(c => {

    return `
    <option
        value="${escAttr(c.client_id || c.id || '')}"
        ${String(v.client_id)===String(c.client_id || c.id) ? "selected" : ""}
    >

        ${escHtml(c.client_id || c.id || '')}
        -
        ${escHtml(c.client_name || c.name || '')}

    </option>
    `;

}).join("");

  const statusOpts=VLAN_STATUSES.map(s=>`<option value="${s}"${(v.status||'Active')===s?' selected':''}>${s}</option>`).join('');
  const typeOpts=VLAN_TYPES.map(t=>`<option value="${t}"${v.assignment_type===t?' selected':''}>${t}</option>`).join('');
  const svcOpts=VLAN_SERVICES.map(s=>`<option value="${s}"${v.service_category===s?' selected':''}>${s}</option>`).join('');
  const bngOpts='<option value="">— None —</option>'+BNG_CARDS.map(b=>`<option value="${b}"${v.bng_card===b?' selected':''}>${b}</option>`).join('');
  const cdnOpts='<option value="">— None —</option>'+db.vlanCdnList.map(c=>`<option value="${escAttr(c)}"${v.cdn===c?' selected':''}>${escHtml(c)}</option>`).join('');
  const dspOpts =
'<option value="">— None —</option>' +

db.dspList.map(d => {

    return `
    <option 
        value="${d.id}"
    >
        ${escHtml(d.code_name)}
    </option>`;

}).join('');
  const body=`
<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">

  <div style="grid-column:span 2;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);padding-bottom:6px;border-bottom:1px solid var(--border);margin-bottom:4px">Identity</div>

  <div class="form-row" style="grid-column:span 2">
    <label>VLAN ID${isEdit?'':' <span style="color:var(--red)">*</span>'} ${isEdit?'':'<span style="font-size:10px;font-weight:400;color:var(--text3)">(single: 123 · list: 123,128,130 · range: 123-130 · mixed: 128,150-160)</span>'}</label>
    <input type="text" id="fv_vid" value="${escAttr(v.vlan_id||'')}" placeholder="e.g. 658 or 100-110 or 128,150-160"
      oninput="vlanPreviewIds(this.value)">
    ${isEdit?'<div class="hint" style="color:var(--yellow)">⚠ Editing VLAN-ID will update the ID only — all other data stays. For groups, edit each VLAN individually.</div>':''}
    <div id="fv_vid_preview" style="margin-top:4px;display:none">
      <div style="font-size:10px;color:var(--text3);margin-bottom:4px">↳ Expands to <span id="fv_vid_count">0</span> VLANs:</div>
      <div id="fv_vid_chips" style="display:flex;flex-wrap:wrap;gap:3px"></div>
    </div>
    <div id="fv_vid_err" style="font-size:11px;color:var(--red);margin-top:3px;display:none"></div>
  </div>

  <div class="form-row">
    <label>Status <span style="color:var(--red)">*</span></label>
    <select id="fv_status">${statusOpts}</select>
  </div>

  <div class="form-row">
    <label>Type <span style="color:var(--red)">*</span></label>
    <select id="fv_type">${typeOpts}</select>
  </div>

  <div class="form-row">
    <label>Service</label>
    <select id="fv_svc">${svcOpts}</select>
  </div>

  <div class="form-row">
    <label>Zone <span style="font-size:10px;font-weight:400;color:var(--text3)">(location / site)</span></label>
    <input type="text" id="fv_zone" value="${escAttr(v.zone||'')}" placeholder="e.g. NORTH, SOUTH, HQ, BEIRUT" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>

  <div class="form-row">
    <label>DSP Provider</label>
    <select id="fv_dsp">${dspOpts}</select>
  </div>

  <div style="grid-column:span 2;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);padding-bottom:6px;border-bottom:1px solid var(--border);margin:8px 0 4px">Client</div>

  <div class="form-row">
    <label>Client-ID <span style="font-size:10px;font-weight:400;color:var(--text3)">(use "-" if none)</span></label>
    <input type="text" id="fv_cid" value="${escAttr(v.client_id||'')}" placeholder="e.g. TRI-009 or -"
      oninput="this.value=this.value.toUpperCase();vlanAutoFill(this.value)" style="text-transform:uppercase">
    <div id="fv_cid_msg" style="font-size:10px;margin-top:3px"></div>
  </div>

 <div class="form-row">
    <label>Client Name</label>

    <select id="fv_client"
        onchange="document.getElementById('fv_cid').value=this.value">

        ${clientOpts}

    </select>

</div>

  <div style="grid-column:span 2;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);padding-bottom:6px;border-bottom:1px solid var(--border);margin:8px 0 4px">IP Assignment</div>

  <div class="form-row">
    <label>Real-IP / Subnet <span style="font-size:10px;font-weight:400;color:var(--text3)">(use "-" if none)</span></label>
    <input type="text" id="fv_rip" value="${escAttr((v.real_ip&&v.real_ip!=='')?v.real_ip:'-')}"
      oninput="validateVlanIPInput(this);vlanCheckRealIp(this.value)" placeholder="e.g. 5.100.240.1 or 5.100.240.0/30">
    <div id="fv_rip_msg" style="font-size:10px;margin-top:3px"></div>
  </div>

  <div class="form-row">
    <label>Fake-IP <span style="font-size:10px;font-weight:400;color:var(--text3)">(use "-" if none)</span></label>
    <input type="text" id="fv_fip" value="${escAttr((v.fake_ip&&v.fake_ip!=='')?v.fake_ip:'-')}"
      oninput="validateVlanIPInput(this);vlanCheckFakeIp(this.value)" placeholder="e.g. 10.10.10.5">
    <div id="fv_fip_msg" style="font-size:10px;margin-top:3px"></div>
  </div>

  <div style="grid-column:span 2;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);padding-bottom:6px;border-bottom:1px solid var(--border);margin:8px 0 4px">Network</div>

  <div class="form-row">
    <label>BNG-Card</label>
    <select id="fv_bng">${bngOpts}</select>
  </div>

  <div class="form-row">
    <label>CDN Provider</label>
    <select id="fv_cdn">${cdnOpts}</select>
  </div>

  <div style="grid-column:span 2;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text3);padding-bottom:6px;border-bottom:1px solid var(--border);margin:8px 0 4px">Routing Paths</div>

  <div class="form-row">
    <label>Primary Path</label>
    <input type="text" id="fv_pp" value="${escAttr(v.primary_path||'')}" placeholder="e.g. BEIRUT-SW1 → CORE → WAN" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>

  <div class="form-row">
    <label>Backup Path</label>
    <input type="text" id="fv_bp" value="${escAttr(v.backup_path||'')}" placeholder="e.g. TRIPOLI-SW2 → CORE → WAN" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>

  <div class="form-row" style="grid-column:span 2">
    <label>Other Path</label>
    <input type="text" id="fv_op" value="${escAttr(v.other_path||'')}" placeholder="e.g. SIDON-SW3 → ACCESS" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>

  <div class="form-row" style="grid-column:span 2">
    <label>Source</label>
    <input type="text" id="fv_src" value="${escAttr(v.source||'')}" placeholder="e.g. N9K, DUDE, CRS-325" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase">
  </div>

  <div class="form-row" style="grid-column:span 2">
    <label>Notes</label>
    <textarea id="fv_notes" placeholder="Any additional notes about this VLAN…">${escHtml(v.notes||'')}</textarea>
  </div>

</div>`;

const saveLabel = isEdit
    ? '💾 Update VLAN'
    : `<span id="fv_save_label">💾 Add VLAN</span>`;


openModal(
    isEdit
    ? `Edit VLAN ${escHtml(String(v.vlan_id||''))}`
    : 'Add New VLAN',
    body,
    `
    <button class="btn" onclick="closeModal()">Cancel</button>

    <button class="btn btn-primary"
        onclick="${
            isEdit
            ? `doUpdateVlan(${_vlanEditIdx})`
            : `doSaveVlan(null)`
        }">
        ${saveLabel}
    </button>
    `
);

  setTimeout(()=>{
    if(!isEdit&&v.vlan_id) vlanPreviewIds(v.vlan_id);
    if(v.client_id&&v.client_id!=='-') vlanAutoFill(v.client_id);
    const ripEl=document.getElementById('fv_rip');
    const fipEl=document.getElementById('fv_fip');
    if(ripEl&&ripEl.value&&ripEl.value!=='-'){validateVlanIPInput(ripEl);vlanCheckRealIp(ripEl.value);}
    if(fipEl&&fipEl.value&&fipEl.value!=='-'){validateVlanIPInput(fipEl);vlanCheckFakeIp(fipEl.value);}
  },60);
}
async function doUpdateVlan(editIdx){

    const token = sessionStorage.getItem("authToken");

    const v = db.vlans[editIdx];

    if(!v){
        showToast("VLAN not found","error");
        return;
    }

    console.log("EDIT INDEX:", editIdx);
    console.log("VLAN:", v);

    const getValue=(id)=>{

        const el=document.getElementById(id);

        return el ? el.value.trim() : "";

    };


  const payload={
    status:getValue("fv_status").toLowerCase(),
    type:getValue("fv_type").toLowerCase(),
    service:getValue("fv_svc").toLowerCase(),
    zone:getValue("fv_zone").toLowerCase(),

    client_id:getValue("fv_cid").toUpperCase() || "-",
    client_name:getValue("fv_cname").toUpperCase() || "-",

    real_ip:getValue("fv_rip")==="-" ? null : getValue("fv_rip"),
    fake_ip:getValue("fv_fip")==="-" ? null : getValue("fv_fip"),

    dsp_id:getValue("fv_dsp") 
        ? Number(getValue("fv_dsp")) 
        : null,

    bng_card:getValue("fv_bng") || null,
    cdn:getValue("fv_cdn") || null,

    primary_path:getValue("fv_pp") || null,
    backup_path:getValue("fv_bp") || null,
    other_path:getValue("fv_op") || null,

    source:getValue("fv_src") || null,
    notes:getValue("fv_notes") || null
};


    console.log(
        "PUT VLAN:",
        v.id,
        payload
    );


    try{


     const res = await fetch(
    `http://10.249.2.9/api/ip-manager/vlans-v2/${v.id}`,
    {
        method:"PATCH",

        headers:{
            "Content-Type":"application/json",
            "Accept":"application/json",
            "Authorization":`Bearer ${token}`
        },

        body:JSON.stringify(payload)
    }
);


const text = await res.text();

let result;

try{
    result = JSON.parse(text);
}
catch(e){
    result = {
        raw:text
    };
}


console.log(
    "PUT STATUS:",
    res.status
);


console.log(
    "PUT RESPONSE:",
    result
);





        console.log(
            "UPDATE RESPONSE",
            result
        );



        if(!res.ok){

            throw new Error(
                result.error ||
                result.message ||
                "Update failed"
            );

        }


        showToast(
            "VLAN updated successfully",
            "success"
        );


        closeModal();


        await fetchVlans();


    }
    catch(err){

        console.error(
            "UPDATE VLAN ERROR",
            err
        );


        showToast(
            err.message,
            "error"
        );

    }

}
// ── Live VLAN-ID preview ──────────────────────────────────────
function vlanPreviewIds(raw){
  const pv=document.getElementById('fv_vid_preview');
  const chips=document.getElementById('fv_vid_chips');
  const count=document.getElementById('fv_vid_count');
  const err=document.getElementById('fv_vid_err');
  const saveBtn=document.getElementById('fv_save_label');
  if(!raw||!raw.trim()){if(pv)pv.style.display='none';return;}
  const ids=parseVlanInput(raw);
  if(err)err.style.display='none';
  if(!ids.length){if(err){err.textContent='No valid VLAN IDs found (1–4094)';err.style.display='block';}if(pv)pv.style.display='none';return;}
  if(pv)pv.style.display='block';
  if(count)count.textContent=ids.length;
  if(chips)chips.innerHTML=ids.slice(0,30).map(id=>`<span style="background:rgba(0,180,216,.1);border:1px solid rgba(0,180,216,.25);color:var(--accent);padding:1px 6px;border-radius:3px;font-size:10px;font-family:'IBM Plex Mono',monospace">${id}</span>`).join('')+(ids.length>30?`<span style="font-size:10px;color:var(--text3)">+${ids.length-30} more</span>`:'');
  if(saveBtn)saveBtn.textContent=ids.length>1?`💾 Add ${ids.length} VLANs`:'💾 Add VLAN';
}

// ── Auto-fill client name ─────────────────────────────────────
function vlanAutoFill(cid){
  const msgEl=document.getElementById('fv_cid_msg');
  const nameEl=document.getElementById('fv_cname');
  if(!cid||cid==='-'){if(msgEl)msgEl.innerHTML='';return;}
  const name=autoFillClientName(cid);
  if(name){
    if(nameEl&&!nameEl.value) nameEl.value=name;
    if(msgEl)msgEl.innerHTML=`<span style="color:var(--green);font-size:10px">✓ Found in subnets — ${escHtml(name)}</span>`;
  } else {
    if(msgEl)msgEl.innerHTML=`<span style="color:var(--text3);font-size:10px">Not found in existing tables — enter name manually</span>`;
  }
}

// ── Real-IP conflict check in modal ──────────────────────────
function vlanCheckRealIp(ip){
  const el=document.getElementById('fv_rip_msg');if(!el||!ip||ip==='-')return;
  const cid=document.getElementById('fv_cid')?.value||'';
  const c=vlanRealIPConflict(ip,cid);
  if(!c||c.type==='standalone') el.innerHTML=`<span style="color:var(--text3);font-size:10px">○ Not in Real IP Subnets — will save as standalone</span>`;
  else if(c.type==='same') el.innerHTML=`<span style="color:var(--green);font-size:10px">✓ Linked to Real IP Subnets — ${escHtml(c.clientId)} · ${escHtml(c.clientName)}</span>`;
  else el.innerHTML=`<span style="color:var(--red);font-size:10px">⚠ Conflict — ${escHtml(c.clientId)} owns this IP in Real IP Subnets · you can still save</span>`;
}

// ── Fake-IP conflict check in modal ──────────────────────────
function vlanCheckFakeIp(ip){
  const el=document.getElementById('fv_fip_msg');if(!el||!ip||ip==='-')return;
  const cid=document.getElementById('fv_cid')?.value||'';
  const c=vlanFakeIPConflict(ip,cid);
  if(!c||c.type==='standalone') el.innerHTML=`<span style="color:var(--text3);font-size:10px">○ Not in Internal Subnets — will save as standalone</span>`;
  else if(c.type==='same') el.innerHTML=`<span style="color:var(--green);font-size:10px">✓ Linked to Internal Subnets — ${escHtml(c.clientId)} · ${escHtml(c.clientName)}</span>`;
  else el.innerHTML=`<span style="color:var(--red);font-size:10px">⚠ Conflict — ${escHtml(c.clientId)} owns this Fake-IP in Internal Subnets · you can still save</span>`;
}

// -- IP validation for VLAN modal --
function isValidIPorCIDR(val){
  if(!val||val==='-')return true;
  var m=val.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(\/\d{1,2})?$/);
  if(!m)return false;
  var parts=m[1].split('.');
  if(!parts.every(function(p){var n=parseInt(p,10);return n>=0&&n<=255;}))return false;
  if(m[2]){var pfx=parseInt(m[2].slice(1),10);if(pfx<0||pfx>32)return false;}
  return true;
}
function validateVlanIPInput(el){
  var val=el.value.trim();
  if(!val||val==='-'){el.classList.remove('ip-invalid','ip-valid');return;}
  if(isValidIPorCIDR(val)){el.classList.remove('ip-invalid');el.classList.add('ip-valid');}
  else{el.classList.remove('ip-valid');el.classList.add('ip-invalid');}
}

// ── Save VLAN(s) ──────────────────────────────────────────────
async function doSaveVlan(editIdx){

    const token = sessionStorage.getItem("authToken");


    const getValue = id => {
        const el=document.getElementById(id);
        return el ? el.value.trim() : "";
    };


    const vlanId = Number(getValue("fv_vid"));


    if(!vlanId){
        showToast("VLAN ID required","error");
        return;
    }


    const payload = {

        id: vlanId,

        status:
            getValue("fv_status").toLowerCase(),

        type:
            getValue("fv_type").toLowerCase(),

        service:
            getValue("fv_svc").toLowerCase(),

        zone:
            getValue("fv_zone").toLowerCase(),


        client_id:
            getValue("fv_cid").toUpperCase() || "-",


        client_name:
            getValue("fv_cname").toUpperCase() || "-",


        real_ip:
            getValue("fv_rip") || null,


        fake_ip:
            getValue("fv_fip") || null,


        dsp_id:
            getValue("fv_dsp")
            ?
            Number(getValue("fv_dsp"))
            :
            null,


        bng_card:
            getValue("fv_bng") || null,


        cdn:
            getValue("fv_cdn") || null,


        source:
            getValue("fv_src") || null,


        primary_path:
            getValue("fv_pp") || null,


        backup_path:
            getValue("fv_bp") || null,


        other_path:
            getValue("fv_op") || null,


        notes:
            getValue("fv_notes") || null

    };



    const editing =
        editIdx !== null &&
        editIdx !== "null";



    const vlanDb =
        editing
        ?
        db.vlans[editIdx]
        :
        null;



    const url =
editing
?
`http://10.249.2.9/api/ip-manager/vlans-v2/${vlanDb.vlan_id}`
:
"http://10.249.2.9/api/ip-manager/vlans-v2";



    const method =
        editing
        ?
        "PUT"
        :
        "POST";



    console.log("========== VLAN SAVE ==========");
    console.log(method,url);
    console.log(JSON.stringify(payload,null,2));



    try{


        const res = await fetch(url,{

            method,


            headers:{

                "Content-Type":"application/json",

                "Accept":"application/json",

                "Authorization":
                `Bearer ${token}`

            },


            body:
            JSON.stringify(payload)

        });



        const text = await res.text();


        let result={};


        try{
            result=JSON.parse(text);
        }
        catch{
            result={raw:text};
        }



        console.log("STATUS",res.status);
        console.log("RESPONSE",result);



        if(!res.ok){

            throw new Error(
                result.error ||
                result.message ||
                "VLAN save failed"
            );

        }



        showToast(
            editing
            ?
            "VLAN updated successfully"
            :
            "VLAN created successfully",
            "success"
        );


        closeModal();


        await fetchVlans();


    }
    catch(err){

        console.error(
            "VLAN SAVE ERROR",
            err
        );


        showToast(
            err.message,
            "error"
        );

    }

}

// ── Reserved Range Modal ──────────────────────────────────────
function openReservedRangeModal(){
  const body=`
<div style="margin-bottom:12px;font-size:12px;color:var(--text2)">Reserve VLAN IDs so they cannot be accidentally reused.</div>
<div class="form-row"><label>Client-ID <span style="font-size:10px;font-weight:400;color:var(--text3)">(optional — leave blank if no client)</span></label>
  <input type="text" id="f_res_cid" placeholder="e.g. TRI-009 or leave blank" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>
<div class="form-row"><label>Label / Note</label>
  <input type="text" id="f_res_cname" placeholder="e.g. TRI expansion Q3 or Future use" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase"></div>
<div class="form-row"><label>Reservation Type</label>
  <select id="f_res_type" onchange="resTypeToggle()">
    <option value="block">Block Range (e.g. 100–199)</option>
    <option value="individual">Individual VLANs (e.g. 658,659,660)</option>
  </select></div>
<div id="f_res_block_row" style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">
  <div class="form-row"><label>From VLAN</label><input type="number" id="f_res_from" placeholder="100" min="1" max="4094"></div>
  <div class="form-row"><label>To VLAN</label><input type="number" id="f_res_to" placeholder="199" min="1" max="4094"></div>
</div>
<div id="f_res_ind_row" style="display:none" class="form-row">
  <label>VLAN IDs (comma-separated)</label>
  <input type="text" id="f_res_ids" placeholder="e.g. 658,659,660"></div>

${db.vlanReservedRanges.length?`<div style="margin-top:14px;font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px">Current Reserved Ranges</div>
${db.vlanReservedRanges.map((rr,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
  <span style="font-size:11px;font-family:'IBM Plex Mono',monospace;color:var(--accent)">${escHtml(rr.type==='block'?'VLAN '+rr.from+'–'+rr.to:rr.vlan_ids||'')}</span>
  <span style="font-size:11px;color:var(--text2)">${escHtml(rr.client_id||'no client')}${rr.client_name?' · '+escHtml(rr.client_name):''}</span>
  <button class="action-btn del" onclick="deleteReservedRange(${i});closeModal();openReservedRangeModal()">🗑️</button>
</div>`).join('')}`:''}`;

  openModal('🔒 Reserve VLAN Range',body,
    `<button class="btn" onclick="closeModal()">Cancel</button>
     <button class="btn btn-primary" onclick="doAddReservedRange()">🔒 Reserve</button>`);
}

function resTypeToggle(){
  const t=sel('f_res_type');
  const br=document.getElementById('f_res_block_row');
  const ir=document.getElementById('f_res_ind_row');
  if(br)br.style.display=t==='block'?'grid':'none';
  if(ir)ir.style.display=t==='individual'?'block':'none';
}

async function doAddReservedRange(){
  const cid=v('f_res_cid');
  const type=sel('f_res_type');
  const rr={client_id:cid,client_name:v('f_res_cname'),type};
  if(type==='block'){
    const from=v('f_res_from'),to=v('f_res_to');
    if(!from||!to){showToast('❌ From and To VLAN are required','error');return;}
    if(parseInt(from,10)>parseInt(to,10)){showToast('❌ From must be ≤ To','error');return;}
    rr.from=from;rr.to=to;
  } else {
    const ids=v('f_res_ids');if(!ids){showToast('❌ Enter VLAN IDs','error');return;}
    rr.vlan_ids=ids;
  }
  db.vlanReservedRanges.push(rr);closeModal();render();showToast('Range reserved 🔒','success');
  api('saveVlanMeta',{vlanCdnList:db.vlanCdnList,vlanReservedRanges:db.vlanReservedRanges});
}

function deleteReservedRange(idx){
  confirmDelete('Remove this reserved range?',function(){doRemoveReservedRange(idx);});return;}
function doRemoveReservedRange(idx){
  db.vlanReservedRanges.splice(idx,1);render();showToast('Range removed ✓','success');
  api('saveVlanMeta',{vlanCdnList:db.vlanCdnList,vlanReservedRanges:db.vlanReservedRanges});
}

// ── CDN Manager Modal ─────────────────────────────────────────
function getCdnColor(name){
  var n=(name||'').toUpperCase();
  var map={
    'AKAMAI':       {bg:'rgba(45,212,191,.15)',  border:'rgba(45,212,191,.35)',  color:'var(--teal)'},
    'CLOUDFLARE':   {bg:'rgba(255,166,87,.15)',  border:'rgba(255,166,87,.35)',  color:'var(--orange)'},
    'LIMELIGHT':    {bg:'rgba(188,140,255,.15)', border:'rgba(188,140,255,.35)', color:'var(--purple)'},
    'FASTLY':       {bg:'rgba(63,185,80,.15)',   border:'rgba(63,185,80,.35)',   color:'var(--green)'},
    'AWS':          {bg:'rgba(210,153,34,.15)',  border:'rgba(210,153,34,.35)',  color:'var(--yellow)'},
    'AWS CLOUDFRONT':{bg:'rgba(210,153,34,.15)',border:'rgba(210,153,34,.35)',  color:'var(--yellow)'},
    'GOOGLE':       {bg:'rgba(0,180,216,.15)',   border:'rgba(0,180,216,.35)',   color:'var(--accent)'},
    'GGC':          {bg:'rgba(0,180,216,.15)',   border:'rgba(0,180,216,.35)',   color:'var(--accent)'},
    'NFX':          {bg:'rgba(248,81,73,.15)',   border:'rgba(248,81,73,.35)',   color:'var(--red)'},
    'NETFLIX':      {bg:'rgba(248,81,73,.15)',   border:'rgba(248,81,73,.35)',   color:'var(--red)'},
    'FNA':          {bg:'rgba(63,185,80,.15)',   border:'rgba(63,185,80,.35)',   color:'var(--green)'},
    'SHAHID':       {bg:'rgba(188,140,255,.15)', border:'rgba(188,140,255,.35)', color:'var(--purple)'},
    'IX':           {bg:'rgba(45,212,191,.15)',  border:'rgba(45,212,191,.35)',  color:'var(--teal)'},
    'TIKTOK':       {bg:'rgba(248,81,73,.15)',   border:'rgba(248,81,73,.35)',   color:'var(--red)'},
  };
  // Fallback: pick color based on char code sum
  var c=map[n];
  if(!c){
    var sum=0;for(var i=0;i<n.length;i++)sum+=n.charCodeAt(i);
    var colors=[
      {bg:'rgba(0,180,216,.15)',   border:'rgba(0,180,216,.35)',   color:'var(--accent)'},
      {bg:'rgba(63,185,80,.15)',   border:'rgba(63,185,80,.35)',   color:'var(--green)'},
      {bg:'rgba(188,140,255,.15)', border:'rgba(188,140,255,.35)', color:'var(--purple)'},
      {bg:'rgba(210,153,34,.15)',  border:'rgba(210,153,34,.35)',  color:'var(--yellow)'},
      {bg:'rgba(45,212,191,.15)',  border:'rgba(45,212,191,.35)',  color:'var(--teal)'},
      {bg:'rgba(255,166,87,.15)',  border:'rgba(255,166,87,.35)',  color:'var(--orange)'},
    ];
    c=colors[sum%colors.length];
  }
  return c;
}
function openCdnManagerModal(){
  function listHtml(){
    return db.vlanCdnList.map((c,i)=>{var cl=getCdnColor(c);return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">
      <span style="background:${cl.bg};border:1px solid ${cl.border};border-radius:20px;padding:1px 8px;font-size:11px;color:${cl.color};font-family:'IBM Plex Mono',monospace">${escHtml(c)}</span>
      <button class="action-btn del" onclick="removeCdnItem(${i})">🗑️</button>
    </div>`}).join('')||'<div style="color:var(--text3);font-size:12px">No CDN providers yet</div>';
  }
  openModal('📡 CDN Provider List',
    `<div id="cdn-list-inner">${listHtml()}</div>
     <div class="form-row" style="margin-top:12px"><label>Add new CDN provider</label>
       <div style="display:flex;gap:8px">
         <input type="text" id="f_cdn_new" placeholder="e.g. AKAMAI" oninput="this.value=this.value.toUpperCase()" style="text-transform:uppercase;flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-size:13px;font-family:'IBM Plex Mono',monospace;outline:none">
         <button class="btn btn-primary" onclick="addCdnItem()">＋ Add</button>
       </div></div>`,
    `<button class="btn btn-primary" onclick="closeModal()">Done</button>`);
}

function addCdnItem(){
  const name=v('f_cdn_new').toUpperCase();
  if(!name){showToast('Enter a CDN name','error');return;}
  if(db.vlanCdnList.includes(name)){showToast('Already in list','error');return;}
  db.vlanCdnList.push(name);
  const el=document.getElementById('cdn-list-inner');
  if(el)el.innerHTML=db.vlanCdnList.map((c,i)=>{var cl=getCdnColor(c);return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="background:${cl.bg};border:1px solid ${cl.border};border-radius:20px;padding:1px 8px;font-size:11px;color:${cl.color};font-family:'IBM Plex Mono',monospace">${escHtml(c)}</span><button class="action-btn del" onclick="removeCdnItem(${i})">🗑️</button></div>`}).join('');
  const inp=document.getElementById('f_cdn_new');if(inp)inp.value='';
  api('saveVlanMeta',{vlanCdnList:db.vlanCdnList,vlanReservedRanges:db.vlanReservedRanges});
  showToast(name+' added ✓','success');
}

function removeCdnItem(idx){
  db.vlanCdnList.splice(idx,1);
  const el=document.getElementById('cdn-list-inner');
  if(el)el.innerHTML=db.vlanCdnList.map((c,i)=>{var cl=getCdnColor(c);return `<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="background:${cl.bg};border:1px solid ${cl.border};border-radius:20px;padding:1px 8px;font-size:11px;color:${cl.color};font-family:'IBM Plex Mono',monospace">${escHtml(c)}</span><button class="action-btn del" onclick="removeCdnItem(${i})">🗑️</button></div>`}).join('')||'<div style="color:var(--text3);font-size:12px">No CDN providers yet</div>';
  api('saveVlanMeta',{vlanCdnList:db.vlanCdnList,vlanReservedRanges:db.vlanReservedRanges});
  showToast('Removed ✓','success');
}


// ============================================================
// DSP PAGE
// ============================================================
function renderDSP(){

    const dspStats = {};


    db.dspList.forEach(d => {

        const name =
            d.dsp_name ||
            d.name ||
            d.dsp ||
            d;


        dspStats[name] = 0;

    });



    Object.keys(db.subnets).forEach(s=>{

        (db.subnets[s] || []).forEach(r=>{


            const dsp =
                r.dsp ||
                r.dsp_name;


            if(dsp && dspStats[dsp] !== undefined){

                dspStats[dsp]++;

            }


        });

    });



    const cards = db.dspList.map((d,i)=>{


        const name =
            d.dsp_name ||
            d.name ||
            d.dsp ||
            d;


        const id =
            d.id || i;



        return `

        <div class="dsp-card">

            <div style="display:flex;flex-direction:column;gap:4px">

                <div>
                    <span class="badge ${dspBadge(name)}">
                        ${escHtml(name)}
                    </span>
                </div>


                <div style="
                    font-size:11px;
                    color:var(--text3);
                    font-family:IBM Plex Mono,monospace">

                    ${dspStats[name] || 0} client(s)

                </div>

            </div>


            ${
                can('deleteDsp')
                ?
                `<button 
                    class="action-btn del"
                    onclick="removeDSP(${id})">
                    🗑️
                </button>`
                :
                ''
            }


        </div>

        `;


    }).join('');



    const addBtn =
        can('addDsp')
        ?
        `<button 
            class="btn btn-primary"
            onclick="openAddDSP()">
            ＋ Add DSP
        </button>`
        :
        `<span class="badge badge-viewer">
            👁 View Only
        </span>`;



    return `

    <div class="page-header">

        <div>

            <div class="page-title">
                DSP Providers
            </div>


            <div class="page-subtitle">
                ${db.dspList.length} providers
            </div>

        </div>


        <div class="header-actions">
            ${addBtn}
        </div>


    </div>


    <div class="dsp-grid">

        ${cards}

    </div>

    `;

}
function openAddDSP(){

    openModal(
        'Add DSP Provider',

        `
        <div class="form-row">

            <label>
                DSP Name 
                <span style="color:var(--red)">*</span>
            </label>

            <input
                type="text"
                id="f_dsp_name"
                placeholder="e.g. NEW ISP"
                oninput="this.value=this.value.toUpperCase()"
                style="text-transform:uppercase"
            >

        </div>


        <div class="form-row">

            <label>
                Code Name
                <span style="color:var(--red)">*</span>
            </label>

            <input
                type="text"
                id="f_dsp_code_name"
                placeholder="e.g. ISP001"
                oninput="this.value=this.value.toUpperCase()"
                style="text-transform:uppercase"
            >

        </div>
        `,


        `
        <button 
            class="btn"
            onclick="closeModal()"
        >
            Cancel
        </button>


        <button 
            class="btn btn-primary"
            onclick="doAddDSP()"
        >
            ➕ Add DSP
        </button>
        `
    );

}async function doAddDSP(){

    const dsp_name = v('f_dsp_name')
        .trim()
        .toUpperCase();

    const code_name = v('f_dsp_code_name')
        .trim()
        .toUpperCase();


    if(!dsp_name){
        showToast(
            "Enter a DSP name",
            "error"
        );
        return;
    }


    if(!code_name){
        showToast(
            "Enter a code name",
            "error"
        );
        return;
    }


    const token =
        sessionStorage.getItem("authToken");


    try {


        const res = await fetch(
            "http://10.249.2.9/api/ip-manager/dsp-v2",
            {
                method:"POST",

                headers:{
                    "Content-Type":"application/json",
                    "Accept":"application/json",
                    "Authorization":
                    `Bearer ${token}`
                },

                body:JSON.stringify({

                    dsp_name:dsp_name,

                    code_name:code_name

                })

            }
        );


        const data =
            await res.json();



        console.log(
            "ADD DSP RESPONSE",
            data
        );



        if(!res.ok){

            throw new Error(
                data.message ||
                "Failed to add DSP"
            );

        }



        // update local engine data

        if(!db.dspList){

            db.dspList=[];

        }


        db.dspList.push({

            dsp_name:dsp_name,

            code_name:code_name

        });



        closeModal();


        render();


        buildSidebarNav();



        showToast(
            dsp_name+" added ✓",
            "success"
        );



    }
    catch(err){


        console.error(
            "ADD DSP ERROR",
            err
        );


        showToast(
            err.message,
            "error"
        );


    }


}async function removeDSP(idx){const name=db.dspList[idx];let usage=0;REAL_SUBNETS.forEach(s=>{(db.subnets[s]||[]).forEach(r=>{if(r.dsp===name)usage++;});});if(usage>0&&!confirm('"'+name+'" used by '+usage+' client(s). Remove anyway?'))return;confirmDelete('Remove DSP <b>'+escHtml(name)+'</b>?',function(){doDeleteDsp(idx,name);});return;}
async function doDeleteDsp(idx,name){db.dspList.splice(idx,1);render();buildSidebarNav();showToast(name+' removed ✓','success');bgSync('saveDSP',{dspList:db.dspList},()=>{db.dspList.splice(idx,0,name);render();});}

// ============================================================
// WAN POPUP
// ============================================================
function showWanPopup(event,clientId){
event.stopPropagation();
const wans=db.wan.filter(w=>w.client_id===clientId);if(!wans.length)return;
const popup=document.getElementById('wan-popup');if(!popup)return;
document.getElementById('wan-popup-title').textContent='🔗 WAN — '+clientId;
document.getElementById('wan-popup-body').innerHTML=wans.map((w,i)=>{
const subnetHtml=w.vlan_subnet?(isValidSubnet(w.vlan_subnet)?'<span class="ip-chip">'+escHtml(w.vlan_subnet)+'</span>':'<span style="color:var(--red);font-size:11px">'+escHtml(w.vlan_subnet)+'</span>'):'<span style="color:var(--text3)">—</span>';
return '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin-bottom:8px">'
+'<div style="font-size:11px;font-weight:700;color:var(--purple);margin-bottom:6px">Link '+(i+1)+(w.branch_name?' — '+escHtml(w.branch_name):'')+' </div>'
+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 12px;font-size:11px;color:var(--text2)">'
+'<div>Branch: <b style="color:var(--text);font-family:IBM Plex Mono,monospace">'+escHtml(w.branch_code||'—')+'</b></div>'
+'<div>VLAN: <b style="color:var(--text);font-family:IBM Plex Mono,monospace">'+(w.vlan_id?'VLAN '+escHtml(String(w.vlan_id)):'—')+'</b></div>'
+'<div>DSP: <b style="color:var(--text);font-family:IBM Plex Mono,monospace">'+escHtml(w.dsp||'—')+'</b></div>'
+'<div style="display:flex;align-items:center;gap:5px">BW/Status: '+renderUpdown(w.updown)+'</div>'
+'<div style="grid-column:span 2;display:flex;align-items:center;gap:6px">Subnet: '+subnetHtml+'</div>'
+'</div></div>';
}).join('');
popup.style.display='block';
var _main=document.getElementById('main-content');
if(_main){
  _main.style.overflow='hidden';
  _main.style.touchAction='none';
  if(!_main._wanWheelHandler){
    _main._wanWheelHandler=function(e){e.preventDefault();e.stopPropagation();};
  }
  _main.addEventListener('wheel',_main._wanWheelHandler,{passive:false});
}
popup.style.left='0px';popup.style.top='-9999px';
requestAnimationFrame(()=>{
const popupH=popup.offsetHeight,popupW=popup.offsetWidth;
const spaceBelow=window.innerHeight-event.clientY-20,spaceRight=window.innerWidth-event.clientX-20;
const top=spaceBelow>=popupH?event.clientY+10:Math.max(10,event.clientY-popupH-10);
const left=spaceRight>=popupW?event.clientX:Math.max(10,event.clientX-popupW);
popup.style.left=left+'px';popup.style.top=top+'px';
});
}

// ============================================================
// USER PERMISSIONS PAGE
// ============================================================
const PERM_LABELS={
assignReal:{label:'Assign Real IP',group:'Real IP Subnets'},editReal:{label:'Edit Real IP',group:'Real IP Subnets'},deleteRealSubnet:{label:'Delete Real IP',group:'Real IP Subnets'},
assignFake:{label:'Assign Fake IP',group:'Internal (Fake IP)'},editFake:{label:'Edit Fake IP',group:'Internal (Fake IP)'},deleteFake:{label:'Delete Fake IP',group:'Internal (Fake IP)'},
addFakeSubnet:{label:'Add Fake Subnet',group:'Internal (Fake IP)'},deleteFakeSubnet:{label:'Delete Fake Subnet',group:'Internal (Fake IP)'},
addWan:{label:'Add WAN',group:'WAN Solutions'},editWan:{label:'Edit WAN',group:'WAN Solutions'},deleteWan:{label:'Delete WAN',group:'WAN Solutions'},
addTunnel:{label:'Add Tunnel',group:'IP Tunnels'},editTunnel:{label:'Edit Tunnel',group:'IP Tunnels'},deleteTunnel:{label:'Delete Tunnel',group:'IP Tunnels'},
addVpn:{label:'Add VPN',group:'VPN'},editVpn:{label:'Edit VPN',group:'VPN'},deleteVpn:{label:'Delete VPN',group:'VPN'},
addDsp:{label:'Add DSP',group:'DSP Providers'},editDsp:{label:'Edit DSP',group:'DSP Providers'},deleteDsp:{label:'Delete DSP',group:'DSP Providers'},
addVlan:{label:'Add VLAN',group:'VLAN Tracking'},editVlan:{label:'Edit VLAN',group:'VLAN Tracking'},deleteVlan:{label:'Delete VLAN',group:'VLAN Tracking'},
manageUsers:{label:'Manage Users',group:'General'},exportExcel:{label:'Export to Excel',group:'General'},
};
let PERM_GROUPS=['Real IP Subnets','Internal (Fake IP)','WAN Solutions','IP Tunnels','VPN','DSP Providers','VLAN Tracking','General'];
let PERM_KEYS=Object.keys(PERM_LABELS);
let usersDb=[];

async function loadUsers(){
  if(!can('manageUsers') && !canSee('seeUsers')) return;
  showLoading(true);
  const res=await api('getUsers');
  showLoading(false);
  if(res.ok){usersDb=res.users||[];}
  else if(can('manageUsers')) showToast('Failed to load users: '+res.error,'error');
}

function renderUsers(){
if(!can('manageUsers'))return'<div class="empty-state"><div class="icon">🔒</div><p>Access denied</p></div>';
const grouped={};PERM_GROUPS.forEach(g=>grouped[g]=[]);PERM_KEYS.forEach(k=>grouped[PERM_LABELS[k].group].push(k));
function permGrid(username,perms,isNew){const cardPfx=isNew?'new':username.replace(/[^a-z0-9]/gi,'_');return PERM_GROUPS.map(g=>'<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px">'+escHtml(g)+'</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">'+grouped[g].map(k=>{const id='uc-'+cardPfx+'-'+k;const checked=perms&&perms[k]!==undefined?perms[k]:false;return'<label style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px;background:rgba(255,255,255,0.02);border:1px solid var(--border)"><input type="checkbox" id="'+escAttr(id)+'" '+(checked?'checked':'')+'><span style="color:var(--text2)">'+escHtml(PERM_LABELS[k].label)+'</span></label>';}).join('')+'</div></div>').join('');}
function roleRadios(username,currentRole,isNew){const name=isNew?'new-role':'role-'+username.replace(/[^a-z0-9]/gi,'_');const safeName=username.replace(/[^a-z0-9]/gi,'_');return['admin','editor','viewer'].map(r=>'<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px"><input type="radio" name="'+escAttr(name)+'" value="'+r+'" '+(currentRole===r?'checked':'')+'onchange="applyRolePreset(\''+escAttr(username)+'\',this.value,\''+(isNew?'new':safeName)+'\')">'+roleBadge(r)+'</label>').join('');}
const otherUsers=usersDb.filter(u=>u.username!==session.username);
const userCards=otherUsers.length?otherUsers.map(u=>{const safeName=u.username.replace(/[^a-z0-9]/gi,'_');return'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-bottom:12px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><span style="font-size:14px;font-weight:700;font-family:IBM Plex Mono,monospace">'+escHtml(u.username)+'</span><div style="display:flex;align-items:center;gap:8px">'+roleRadios(u.username,u.role,false)+'<button class="btn btn-sm btn-danger" onclick="deleteUser(\''+escAttr(u.username)+'\')">🗑️</button></div></div>'+permGrid(u.username,u.perms,false)+'<button class="btn btn-primary btn-sm" style="margin-top:10px;width:100%" onclick="saveUser(\''+escAttr(u.username)+'\',\''+escAttr(safeName)+'\')">💾 Save Changes</button></div>';}).join(''):'<div style="color:var(--text3);font-size:13px;padding:12px 0">No other users yet — add one using the form.</div>';
const newCard='<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:18px 20px"><div class="form-row"><label>Username <span style="color:var(--red)">*</span></label><input type="text" id="new-username" placeholder="e.g. sarah" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-size:13px;font-family:IBM Plex Mono,monospace;outline:none"></div><div class="form-row"><label>Password <span style="color:var(--red)">*</span></label><input type="password" id="new-password" placeholder="Set password" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-size:13px;font-family:IBM Plex Mono,monospace;outline:none"></div><div class="form-row"><label>Role</label><div style="display:flex;gap:10px;margin-top:4px">'+roleRadios('new','editor',true)+'</div></div><div class="form-row"><label>Permissions</label></div>'+permGrid('new',DEFAULT_PERMISSIONS.editor,true)+'<button class="btn btn-primary" style="width:100%;margin-top:10px" onclick="createUser()">＋ Create User</button></div>';
return '<div class="page-header"><div><div class="page-title">User Permissions</div><div class="page-subtitle">Manage users and their permissions — stored in Google Sheets</div></div><button class="btn" onclick="loadUsers().then(()=>{const cc=document.getElementById(\'main-content\');if(cc)cc.innerHTML=renderUsers();updateTopStats();})"></div><div style="background:rgba(0,180,216,0.07);border:1px solid rgba(0,180,216,0.2);border-radius:8px;padding:12px 16px;font-size:12px;color:var(--text2);margin-bottom:16px"><b style="color:var(--accent)">How it works:</b> Users are stored in the <b>Users</b> tab of your Google Sheet. Each user has a role plus optional per-permission overrides.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start"><div><div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;margin-bottom:8px">Other Users ('+otherUsers.length+')</div>'+userCards+'</div><div><div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;margin-bottom:8px">Add New User</div>'+newCard+'</div></div>';
}

function applyRolePreset(username,role,cardPfx){const defaults=DEFAULT_PERMISSIONS[role]||DEFAULT_PERMISSIONS.viewer;PERM_KEYS.forEach(k=>{const el=document.getElementById('uc-'+cardPfx+'-'+k);if(el)el.checked=!!defaults[k];});if(username==='new')return;const idx=usersDb.findIndex(u=>u.username===username);if(idx>=0){usersDb[idx].role=role;usersDb[idx].perms={...defaults};}const existing=usersDb[idx]||{};const payload={username,password:existing.password||'',role,perms:{...defaults}};api('saveUser',payload).then(res=>{if(res.ok)showToast(username+': role set to '+role.toUpperCase()+' ✓','success');else showToast('Auto-save failed: '+res.error,'error');});}
function readPermsFromCard(cardPfx){const perms={};PERM_KEYS.forEach(k=>{const el=document.getElementById('uc-'+cardPfx+'-'+k);if(el)perms[k]=el.checked;});return perms;}
function readRoleFromCard(radioName){const checked=document.querySelector('input[name="'+radioName+'"]:checked');return checked?checked.value:'viewer';}
async function saveUser(username,cardPfx){const role=readRoleFromCard('role-'+cardPfx);const perms=readPermsFromCard(cardPfx);const idx=usersDb.findIndex(u=>u.username===username);const existing=usersDb[idx]||{};if(idx>=0){usersDb[idx]={...existing,role,perms};}const payload={username,password:'',role,perms};showToast('Saving…','success');const res=await api('saveUser',payload);if(res.ok){
  showToast(username+' saved ✓','success');
  // If saving own user, update session perms immediately
  if(session && username===session.username){
    session.role=role;session.perms=perms;
  }
  // Rebuild sidebar for affected user (if they're logged in)
  buildSidebarNav();
}else showToast('Save failed: '+res.error,'error');}
async function createUser(){const username=document.getElementById('new-username')?.value?.trim()?.toLowerCase();const password=document.getElementById('new-password')?.value?.trim();if(!username||!password){showToast('Username and password are required','error');return;}if(usersDb.find(u=>u.username===username)){showToast('User "'+username+'" already exists','error');return;}const role=readRoleFromCard('new-role');const perms=readPermsFromCard('new');const payload={username,password,role,perms};usersDb.push(payload);render();showToast('Creating user…','success');const res=await api('saveUser',payload);if(res.ok)showToast(username+' created ✓','success');else{showToast('Create failed: '+res.error,'error');usersDb.pop();render();}}
async function deleteUser(username){confirmDelete('Delete user <b>'+escHtml(username)+'</b>?<br><small style="color:var(--text3)">They will no longer be able to log in.</small>',function(){doDeleteUser(username);});return;}
async function doDeleteUser(username){if(username)return;usersDb=usersDb.filter(u=>u.username!==username);render();showToast('Deleting…','success');const res=await api('deleteUser',{username});if(res.ok)showToast(username+' deleted ✓','success');else{showToast('Delete failed: '+res.error,'error');await loadUsers();render();}}

// ============================================================
// EXPORT TO EXCEL
// ============================================================
async function exportToExcel(){
showToast('Building Excel file…','success');
if(!window.XLSX){await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});}
const wb=XLSX.utils.book_new();
REAL_SUBNETS.forEach(s=>{const data=db.subnets[s]||[];const assigned=data.filter(r=>r.client_id);if(!assigned.length)return;const wsData=[['Real IP','Client ID','Client Name','Fake IP','VLAN ID','DSP','Block ID'],...assigned.map(r=>[r.real_ip,r.client_id,r.client_name,r.fake_ip,r.vlan_id,r.dsp,r.block_id])];const ws=XLSX.utils.aoa_to_sheet(wsData);ws['!cols']=[{wch:15},{wch:12},{wch:25},{wch:15},{wch:8},{wch:14},{wch:18}];XLSX.utils.book_append_sheet(wb,ws,s+' (Real)');});
Object.entries(db.internalSubnets).forEach(([subnet,data])=>{const assigned=data.filter(r=>r.client_id);if(!assigned.length)return;const wsData=[['Internal IP','Client ID','Client Name','Block ID'],...assigned.map(r=>[r.internal_ip,r.client_id,r.client_name,r.block_id])];const ws=XLSX.utils.aoa_to_sheet(wsData);ws['!cols']=[{wch:15},{wch:12},{wch:25},{wch:18}];XLSX.utils.book_append_sheet(wb,ws,('Int '+subnet).substring(0,31));});
if(db.wan.length){const wsData=[['Client ID','Branch Code','Branch Name','VLAN ID','DSP','UP/DOWN','Subnet HO→BR'],...db.wan.map(r=>[r.client_id,r.branch_code,r.branch_name,r.vlan_id,r.dsp,r.updown,r.vlan_subnet])];const ws=XLSX.utils.aoa_to_sheet(wsData);XLSX.utils.book_append_sheet(wb,ws,'WAN Solutions');}
if(db.tunnels.length){const wsData=[['Client ID','Client Name','Local IP','Remote IP','Interface','Description'],...db.tunnels.map(r=>[r.client_id,r.client_name,r.tunnel_local_ip,r.tunnel_remote_ip,r.tunnel_interface,r.description])];const ws=XLSX.utils.aoa_to_sheet(wsData);XLSX.utils.book_append_sheet(wb,ws,'IP Tunnels');}
if(db.vpn.length){const wsData=[['Client ID','Client Name','VPN Type','VPN IP','Username','Password','Description'],...db.vpn.map(r=>[r.client_id,r.client_name,r.vpn_type,r.vpn_ip,r.vpn_username,r.vpn_password||'',r.description])];const ws=XLSX.utils.aoa_to_sheet(wsData);XLSX.utils.book_append_sheet(wb,ws,'VPN');}
if(db.vlans.length){const wsData=[['VLAN ID','Status','Type','Service','Client ID','Client Name','Real IP','Fake IP','DSP','BNG Card','CDN','Primary Path','Backup Path','Other Path','Source','Notes','Last Modified'],...db.vlans.map(r=>[r.vlan_id,r.status,r.assignment_type,r.service_category,r.client_id,r.client_name,r.real_ip,r.fake_ip,r.dsp,r.bng_card,r.cdn,r.primary_path,r.backup_path,r.other_path,r.source,r.notes,r.last_modified])];const ws=XLSX.utils.aoa_to_sheet(wsData);XLSX.utils.book_append_sheet(wb,ws,'VLAN Tracking');}
if(db.dspList.length){const ws=XLSX.utils.aoa_to_sheet([['DSP Provider'],...db.dspList.map(d=>[d])]);XLSX.utils.book_append_sheet(wb,ws,'DSP Providers');}
// Credentials sheet
if(db.credentials&&db.credentials.length){const wsData=[['Subnet','Gateway','VLAN','Category','Net Description','IP Address','Node Type','Device Description','Username','Password','Login URL','Additional'],...db.credentials.map(r=>[r.subnet,r.gateway,r.vlan,r.category,r.net_desc,r.ip_address,r.node_type,r.device_desc,r.username,r.password,r.login_url,r.additional])];const ws=XLSX.utils.aoa_to_sheet(wsData);ws['!cols']=[{wch:18},{wch:15},{wch:6},{wch:12},{wch:20},{wch:15},{wch:14},{wch:25},{wch:12},{wch:14},{wch:25},{wch:20}];XLSX.utils.book_append_sheet(wb,ws,'Credentials');}
const date=new Date().toISOString().slice(0,10);XLSX.writeFile(wb,'EB_IP_Manager_V14_'+date+'.xlsx');showToast('Excel exported ✓','success');
}

// ============================================================
// HELPERS
// ============================================================
function dspBadge(dsp){

    if(!dsp)
        return 'badge-gray';


    // create a stable color based on DSP name
    const colors = [
        'badge-blue',
        'badge-green',
        'badge-purple',
        'badge-yellow',
        'badge-orange',
        'badge-gray'
    ];


    let hash = 0;


    for(let i = 0; i < dsp.length; i++){

        hash =
            dsp.charCodeAt(i) +
            ((hash << 5) - hash);

    }


    const index =
        Math.abs(hash) % colors.length;


    return colors[index];

}function renderPager(totalPages){if(totalPages<=1)return'';let btns='';const s=Math.max(1,currentPageNum-3),e=Math.min(totalPages,s+6);if(s>1)btns+='<button class="page-btn" onclick="goPage(1)">1</button><span class="page-info">…</span>';for(let i=s;i<=e;i++)btns+='<button class="page-btn '+(i===currentPageNum?'active':'')+'" onclick="goPage('+i+')">'+i+'</button>';if(e<totalPages)btns+='<span class="page-info">…</span><button class="page-btn" onclick="goPage('+totalPages+')">'+totalPages+'</button>';return'<div class="pagination"><button class="page-btn" onclick="goPage('+Math.max(1,currentPageNum-1)+')">‹</button>'+btns+'<button class="page-btn" onclick="goPage('+Math.min(totalPages,currentPageNum+1)+')">›</button></div>';}
function goPage(n){currentPageNum=n;render();window.scrollTo(0,0);}
function v(id){const e=document.getElementById(id);return e?e.value.trim():'';}
function sel(id){const e=document.getElementById(id);return e?e.value:'';}
// ── Confirmation modal helper (replaces browser confirm()) ─
function confirmModal(message, onYes, title){
  title = title || 'Confirm';
  openModal(title,
    '<div style="padding:8px 0;font-size:14px;line-height:1.6">'+message+'</div>',
    '<button class="btn" onclick="closeModal()">Cancel</button>'
    +'<button class="btn btn-danger" style="margin-left:8px" onclick="closeModal();('+onYes.toString()+')();">Yes, Delete</button>'
  );
}
function openModal(title,body,footer){document.getElementById('modal-title').textContent=title;document.getElementById('modal-body').innerHTML=body;document.getElementById('modal-footer').innerHTML=footer;document.getElementById('modal-overlay').classList.add('open');}
function closeModal(){document.getElementById('modal-overlay').classList.remove('open');}
// Modal closes only via X button or Cancel — not by clicking outside
function showLoading(on){document.getElementById('loading-overlay').classList.toggle('show',on);}

// ============================================================
// INIT
// ============================================================
if(window.location.search.includes('setup')||window.location.hash.includes('setup')){localStorage.removeItem('eb_api_url');API_URL='';}
checkSetup();

