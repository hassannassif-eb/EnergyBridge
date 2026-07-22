
// ============================================================
// EB IP Manager v14 — Final Patch
// 
// PAGINATION LOGIC (the correct way):
//   - We build a flat list of ALL rows (header rows + child rows)
//   - Each row has a type: 'single', 'group-header', or 'child'
//   - Child rows start as hidden
//   - When user expands a group, we re-render with that group expanded
//   - The flat row list is paginated at 15 rows PER PAGE
//   - This means: expand a 100-VLAN group on page 1 → 
//     you see 1 header + 14 children on page 1,
//     next 15 children on page 2, etc.
//   - Collapsing re-renders back to compact view
// ============================================================
(function applyV14(){

  // Stub removed functions
  window.openReservedRangeModal=function(){};
  window.resTypeToggle=function(){};
  window.doAddReservedRange=function(){};
  window.deleteReservedRange=function(){};

  // Track which groups are expanded (by safeGid)
  window._vlanExpandedGroups={};

  // ── Solid sticky column background ───────────────────────
  var stickyStyle=document.createElement('style');
  stickyStyle.textContent=
    '.vlan-sticky-left{background:var(--bg2)!important;}'+
    'tbody tr:hover .vlan-sticky-left{background:#1a2130!important;}'+
    'tbody tr:hover td[style*="position:sticky"]{background:#1a2130!important;}';
  document.head.appendChild(stickyStyle);

  // ── Helper: build flat row list from groups ───────────────
  // Returns array of items:
  //   {type:'single', g, v, idx}
  //   {type:'group-header', g, safeGid, isExpanded}
  //   {type:'child', g, m, safeGid}  — only if group is expanded
  function buildFlatRows(allGroups){
    var rows=[];
    allGroups.forEach(function(g){
      if(g.type==='single'){
        rows.push({type:'single',g:g,v:g.row,idx:g.idx});
      } else {
        var safeGid=g.gid.replace(/[^a-z0-9]/gi,'_');
        var isExpanded=!!window._vlanExpandedGroups[safeGid];
        rows.push({type:'group-header',g:g,safeGid:safeGid,isExpanded:isExpanded});
        if(isExpanded){
          g.members.forEach(function(m){
            rows.push({type:'child',g:g,m:m,safeGid:safeGid});
          });
        }
      }
    });
    return rows;
  }

  // ── Toggle group expand/collapse then re-render ───────────
  window.toggleVlanGroup=function(safeGid){
    if(window._vlanExpandedGroups[safeGid]){
      delete window._vlanExpandedGroups[safeGid];
    } else {
      window._vlanExpandedGroups[safeGid]=true;
      // When expanding: jump to the page where this group header is
      // so the user sees the expanded content immediately
    }
    render();
    // After render, scroll to the group header row
    requestAnimationFrame(function(){
      var el=document.getElementById('grphead-'+safeGid);
      if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'});
    });
  };

  // ── Main renderVlan ───────────────────────────────────────
  window.renderVlan=function(){
    currentVlanPage=currentVlanPage||1;
    var conflictItems=buildVlanConflicts();
    var cfBadge=document.getElementById('badge-vlan');
    if(cfBadge)cfBadge.textContent=db.vlans.length;

    var cfVid=currentColFilters.vVid||'',cfCid=currentColFilters.vCid||'',
        cfName=currentColFilters.vName||'',cfStatus=currentColFilters.vStatus||'',
        cfType=currentColFilters.vType||'',cfSvc=currentColFilters.vSvc||'',
        cfZone=currentColFilters.vZone||'';

    var f=db.vlans;
    if(currentFilter!=='all')f=f.filter(function(v){return v.status===currentFilter||v.assignment_type===currentFilter;});
    if(currentSearch){var q=currentSearch.toLowerCase();
      f=f.filter(function(v){return[v.vlan_id,v.client_id,v.client_name,v.real_ip,v.fake_ip,v.assignment_type,v.status,v.service_category,v.bng_card,v.cdn,v.zone,v.source,v.primary_path,v.backup_path,v.other_path,v.notes,v.dsp].some(function(x){return String(x||'').toLowerCase().includes(q);});});}
    if(cfVid)   f=f.filter(function(v){return String(v.vlan_id||'').includes(cfVid);});
    if(cfCid)   f=f.filter(function(v){return String(v.client_id||'').toLowerCase().includes(cfCid.toLowerCase());});
    if(cfName)  f=f.filter(function(v){return String(v.client_name||'').toLowerCase().includes(cfName.toLowerCase());});
    if(cfStatus)f=f.filter(function(v){return String(v.status||'').toLowerCase().includes(cfStatus.toLowerCase());});
    if(cfType)  f=f.filter(function(v){return String(v.assignment_type||'').toLowerCase().includes(cfType.toLowerCase());});
    if(cfSvc)   f=f.filter(function(v){return String(v.service_category||'').toLowerCase().includes(cfSvc.toLowerCase());});
    if(cfZone)  f=f.filter(function(v){return String(v.zone||'').toLowerCase().includes(cfZone.toLowerCase());});

    // Sort VLAN ID smallest to largest
    f=f.slice().sort(function(a,b){return parseInt(a.vlan_id,10)-parseInt(b.vlan_id,10);});

    // Build groups then flat rows (expanded groups add child rows)
    var allGroups=buildVlanGroups(f);
    var flatRows=buildFlatRows(allGroups);

    // Paginate the flat rows — 15 per page regardless of type
    var totalRows=flatRows.length;
    var totalPages=Math.max(1,Math.ceil(totalRows/VLAN_PAGE_SIZE));
    if(currentVlanPage>totalPages)currentVlanPage=totalPages;
    if(currentVlanPage<1)currentVlanPage=1;
    var pageRows=flatRows.slice((currentVlanPage-1)*VLAN_PAGE_SIZE,currentVlanPage*VLAN_PAGE_SIZE);

    // Conflict banner
    var conflictBanner='';
    if(conflictItems.length){
      var cfRows2=conflictItems.map(function(x){return'<div class="cf-item">'+escHtml(x)+'</div>';}).join('');
      conflictBanner='<div class="cf-banner" id="vlan-cf-banner"><div class="cf-left">'+
        '<div class="cf-title">&#9888; '+conflictItems.length+' Conflict'+(conflictItems.length>1?'s':'')+' detected'+
        '<span class="cf-toggle" onclick="var d=document.getElementById(\'cf-detail\');var open=d.style.display!==\'none\';d.style.display=open?\'none\':\'block\';this.textContent=open?\'&#9660; show details\':\'&#9650; hide details\';">&#9660; show details</span></div>'+
        '<div id="cf-detail" style="display:none;margin-top:4px">'+cfRows2+'</div></div>'+
        '<button class="cf-dismiss" onclick="document.getElementById(\'vlan-cf-banner\').style.display=\'none\'">&#10005; Dismiss</button></div>';
    }

    var typeColor={PPPoE:'badge-blue',Corporate:'badge-purple',Reseller:'badge-orange',Management:'badge-yellow',Reserved:'badge-yellow'};
    var svcColor={HSI:'badge-teal',Corporate:'badge-purple',Management:'badge-yellow',CDN:'badge-orange'};
    var statusColor={Active:'badge-green',Disabled:'badge-red',Reserved:'badge-yellow',Free:'badge-gray'};
    var BG2='var(--bg2)';
    var DASH='<span style="color:var(--text3)">&#8212;</span>';

    // ── Render each row ───────────────────────────────────────
    var tableRows='';
    pageRows.forEach(function(item){

      if(item.type==='single'){
        var v=item.v,idx=item.idx;
        var isLocked=v.locked==='1'||v.locked==='true';
        var idCount={};db.vlans.forEach(function(vv){var id=String(vv.vlan_id||'');if(id)idCount[id]=(idCount[id]||0)+1;});
        var isDup=(idCount[String(v.vlan_id||'')]||0)>1;
        var isDisabled=v.status==='Disabled',isReserved=v.status==='Reserved';
        var rowBg=isLocked?'rgba(0,180,216,0.04)':isDup||(vlanRealIPConflict(v.real_ip,v.client_id)||{}).type==='diff'||(vlanFakeIPConflict(v.fake_ip,v.client_id)||{}).type==='diff'?'rgba(248,81,73,0.04)':isReserved&&v.client_id&&v.client_id!=='-'?'rgba(188,140,255,0.04)':isReserved?'rgba(210,153,34,0.03)':'';
        var rowStyle='background:'+rowBg+(isDisabled&&!isLocked?';opacity:.65':'');
        var cdn=v.cdn?'<span style="background:rgba(255,166,87,.15);border:1px solid rgba(255,166,87,.35);border-radius:20px;padding:1px 7px;font-size:10px;color:var(--orange);font-family:\'IBM Plex Mono\',monospace">'+escHtml(v.cdn)+'</span>':DASH;
        var editBtn=can('editVlan')?'<button class="action-btn edit" onclick="openVlanModal('+idx+')">&#9999;&#65039;</button>':'';
        var lockBtn=can('editVlan')?'<button class="action-btn" onclick="lockVlan('+idx+')" title="Lock">&#128274;</button>':'';
        var unlockBtn=can('editVlan')?'<button class="action-btn" onclick="unlockVlan('+idx+')" title="Unlock">&#128275;</button>':'';
        var delBtn=can('deleteVlan')?'<button class="action-btn del" onclick="deleteVlanRow('+idx+')">&#128465;&#65039;</button>':'';
        var actCell=isLocked?'<span style="font-size:10px;color:var(--text3)">&#128274;</span>'+unlockBtn:editBtn+lockBtn+delBtn;
        var vidCell='<span style="font-family:\'IBM Plex Mono\',monospace;font-weight:700">'+escHtml(String(v.vlan_id||''))+'</span>';
        if(isDup)vidCell+=' <span class="vlan-warn">&#9888; &times;'+(idCount[String(v.vlan_id||'')]||0)+'</span>';
        if(isLocked)vidCell+=' <span class="badge badge-gray" style="font-size:9px">&#128274;</span>';
        tableRows+='<tr style="'+rowStyle+'">'+
          '<td style="position:sticky;left:0;z-index:2;border-right:1px solid var(--border);background:'+BG2+'">'+vidCell+'</td>'+
          '<td>'+(v.status?'<span class="badge '+(statusColor[v.status]||'badge-gray')+'">'+escHtml(v.status)+'</span>':DASH)+'</td>'+
          '<td>'+(v.assignment_type?'<span class="badge '+(typeColor[v.assignment_type]||'badge-gray')+'">'+escHtml(v.assignment_type)+'</span>':DASH)+'</td>'+
          '<td>'+(v.service_category?'<span class="badge '+(svcColor[v.service_category]||'badge-gray')+'">'+escHtml(v.service_category)+'</span>':DASH)+'</td>'+
          '<td style="font-size:11px;color:var(--text2)">'+escHtml(v.zone||'&#8212;')+'</td>'+
          '<td style="color:var(--accent);font-weight:600;font-size:11px">'+escHtml(v.client_id||'&#8212;')+'</td>'+
          '<td class="name-cell">'+escHtml(v.client_name||'&#8212;')+'</td>'+
          '<td>'+renderRealIpCell(v.real_ip,v.client_id)+'</td>'+
          '<td>'+renderFakeIpCell(v.fake_ip,v.client_id)+'</td>'+
          '<td>'+(v.dsp?'<span class="badge '+dspBadge(v.dsp)+'">'+escHtml(v.dsp)+'</span>':DASH)+'</td>'+
          '<td style="font-size:11px;color:var(--teal)">'+escHtml(v.bng_card||'&#8212;')+'</td>'+
          '<td>'+cdn+'</td>'+
          '<td style="font-size:11px;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(v.primary_path||'&#8212;')+'</td>'+
          '<td style="font-size:11px;color:var(--text2);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(v.backup_path||'&#8212;')+'</td>'+
          '<td style="font-size:11px;color:var(--text2);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+escHtml(v.other_path||'&#8212;')+'</td>'+
          '<td style="font-size:11px;color:var(--text2)">'+escHtml(v.source||'&#8212;')+'</td>'+
          '<td style="font-size:11px;color:var(--text3);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escAttr(v.notes||'')+'">'+escHtml(v.notes||'&#8212;')+'</td>'+
          '<td class="ts-cell">'+escHtml(v.last_modified||'&#8212;')+'</td>'+
          '<td style="white-space:nowrap;position:sticky;right:0;background:'+BG2+';border-left:1px solid var(--border)">'+actCell+'</td>'+
          '</tr>';

      } else if(item.type==='group-header'){
        var g=item.g,safeGid=item.safeGid,isExpanded=item.isExpanded;
        var lead=g.lead,members=g.members;
        var isReservedGrp=lead.status==='Reserved',hasClient=lead.client_id&&lead.client_id!=='-';
        var allIds=members.map(function(m){return Number(m.row.vlan_id);}).sort(function(a,b){return a-b;});
        var displayIds=compressVlanIds(allIds),cnt=members.length;
        var grpBarColor=isReservedGrp?(hasClient?'var(--purple)':'var(--yellow)'):'var(--accent)';
        var grpBadgeStyle=isReservedGrp?(hasClient?'background:rgba(188,140,255,.12);border:1px solid rgba(188,140,255,.3);color:var(--purple)':'background:rgba(210,153,34,.12);border:1px solid rgba(210,153,34,.3);color:var(--yellow)'):'background:rgba(0,180,216,.12);border:1px solid rgba(0,180,216,.3);color:var(--accent)';
        var grpBg=isReservedGrp?(hasClient?'rgba(188,140,255,.04)':'rgba(210,153,34,.03)'):'rgba(0,180,216,.03)';
        var statusBadge=lead.status?'<span class="badge '+(statusColor[lead.status]||'badge-gray')+'">'+escHtml(lead.status)+'</span>':DASH;
        var typeBadge=lead.assignment_type?'<span class="badge '+(typeColor[lead.assignment_type]||'badge-gray')+'">'+escHtml(lead.assignment_type)+'</span>':DASH;
        var grpEditBtn=can('editVlan')?'<button class="action-btn edit" onclick="openVlanGroupEditModal(\''+escAttr(g.gid)+'\')" title="Bulk edit">&#9999;&#65039; all</button>':'';
        var grpDelBtn=can('deleteVlan')?'<button class="action-btn del" onclick="deleteVlanGroup(\''+escAttr(g.gid)+'\')">&#128465;&#65039;</button>':'';
        var expandIcon=isExpanded?'&#9660;':'&#9654;';
        var expandLabel=isExpanded?'collapse &#9650;':'expand &#9660;';
        tableRows+='<tr style="background:'+grpBg+'" id="grphead-'+safeGid+'">'+
          '<td style="position:sticky;left:0;z-index:2;border-right:1px solid var(--border);background:'+BG2+'">'+
            '<span style="display:inline-block;width:3px;height:14px;background:'+grpBarColor+';border-radius:2px;margin-right:5px;vertical-align:middle"></span>'+
            '<span style="cursor:pointer;color:'+grpBarColor+';font-size:11px;font-weight:700" onclick="toggleVlanGroup(\''+safeGid+'\')">'+
              '<span>'+expandIcon+'</span> '+escHtml(displayIds)+'</span>'+
            '<span style="'+grpBadgeStyle+';display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-family:\'IBM Plex Mono\',monospace;margin-left:4px">'+cnt+' VLANs</span>'+
          '</td>'+
          '<td>'+statusBadge+'</td><td>'+typeBadge+'</td>'+
          '<td>'+(lead.service_category?'<span class="badge '+(svcColor[lead.service_category]||'badge-gray')+'">'+escHtml(lead.service_category)+'</span>':DASH)+'</td>'+
          '<td style="font-size:11px;color:var(--text2)">'+escHtml(lead.zone||'&#8212;')+'</td>'+
          '<td style="color:'+grpBarColor+';font-weight:600;font-size:11px">'+escHtml(lead.client_id||'&#8212;')+'</td>'+
          '<td class="name-cell">'+escHtml(lead.client_name||'&#8212;')+'</td>'+
          '<td style="font-size:11px;color:var(--text3);font-style:italic">'+(isReservedGrp?'not assigned yet':'shared pool')+'</td>'+
          '<td style="font-size:11px;color:var(--text3);font-style:italic">'+(isReservedGrp?'not assigned yet':'multiple')+'</td>'+
          '<td>'+(lead.dsp?'<span class="badge '+dspBadge(lead.dsp)+'">'+escHtml(lead.dsp)+'</span>':DASH)+'</td>'+
          '<td style="font-size:11px;color:var(--teal)">'+escHtml(lead.bng_card||'&#8212;')+'</td>'+
          '<td style="color:var(--text3)">&#8212;</td>'+
          '<td style="font-size:11px;color:var(--text2)">'+escHtml(lead.primary_path||'&#8212;')+'</td>'+
          '<td style="font-size:11px;color:var(--text2)">'+escHtml(lead.backup_path||'&#8212;')+'</td>'+
          '<td style="font-size:11px;color:var(--text2)">'+escHtml(lead.other_path||'&#8212;')+'</td>'+
          '<td style="font-size:11px;color:var(--text2)">'+escHtml(lead.source||'&#8212;')+'</td>'+
          '<td style="font-size:11px;color:var(--text3);font-style:italic">'+escHtml(lead.notes||'&#8212;')+'</td>'+
          '<td class="ts-cell">'+escHtml(lead.last_modified||'&#8212;')+'</td>'+
          '<td style="white-space:nowrap;position:sticky;right:0;background:'+BG2+';border-left:1px solid var(--border)">'+
            '<button class="action-btn" style="font-size:10px;color:'+grpBarColor+'" onclick="toggleVlanGroup(\''+safeGid+'\')">'+expandLabel+'</button>'+
            grpEditBtn+grpDelBtn+
          '</td>'+
          '</tr>';

      } else if(item.type==='child'){
        var g=item.g,m=item.m,safeGid=item.safeGid;
        var v=m.row,idx=m.idx;
        var lead=g.lead;
        var isReservedGrp=lead.status==='Reserved',hasClient=lead.client_id&&lead.client_id!=='-';
        var isLocked=v.locked==='1'||v.locked==='true';
        var childBg=isReservedGrp?(hasClient?'rgba(188,140,255,.02)':'rgba(210,153,34,.02)'):'rgba(0,180,216,.015)';
        var barColor=isReservedGrp?(hasClient?'rgba(188,140,255,.4)':'rgba(210,153,34,.4)'):'rgba(0,180,216,.35)';
        var cdn=v.cdn?'<span style="background:rgba(255,166,87,.15);border:1px solid rgba(255,166,87,.35);border-radius:20px;padding:1px 6px;font-size:9px;color:var(--orange);font-family:\'IBM Plex Mono\',monospace">'+escHtml(v.cdn)+'</span>':DASH;
        var cEditBtn=can('editVlan')?'<button class="action-btn edit" onclick="openVlanModal('+idx+')">&#9999;&#65039;</button>':'';
        var cDelBtn=can('deleteVlan')?'<button class="action-btn del" onclick="deleteVlanRow('+idx+')">&#128465;&#65039;</button>':'';
        var cAct=isLocked?'<span style="font-size:10px;color:var(--text3)">&#128274;</span>'+(can('editVlan')?'<button class="action-btn" onclick="unlockVlan('+idx+')">&#128275;</button>':''):cEditBtn+cDelBtn;
        var typeColor2={PPPoE:'badge-blue',Corporate:'badge-purple',Reseller:'badge-orange',Management:'badge-yellow',Reserved:'badge-yellow'};
        var svcColor2={HSI:'badge-teal',Corporate:'badge-purple',Management:'badge-yellow',CDN:'badge-orange'};
        var statusColor2={Active:'badge-green',Disabled:'badge-red',Reserved:'badge-yellow',Free:'badge-gray'};
        tableRows+='<tr style="background:'+childBg+'">'+
          '<td style="position:sticky;left:0;z-index:2;border-right:1px solid var(--border);background:'+BG2+'">'+
            '<span style="display:inline-block;width:3px;height:14px;background:'+barColor+';border-radius:2px;margin-right:5px;vertical-align:middle"></span>'+
            '<span style="font-family:\'IBM Plex Mono\',monospace;font-weight:700;font-size:11px">'+escHtml(String(v.vlan_id||''))+'</span>'+
          '</td>'+
          '<td>'+(v.status?'<span class="badge '+(statusColor2[v.status]||'badge-gray')+'" style="font-size:9px">'+escHtml(v.status)+'</span>':'&#8212;')+'</td>'+
          '<td>'+(v.assignment_type?'<span class="badge '+(typeColor2[v.assignment_type]||'badge-gray')+'" style="font-size:9px">'+escHtml(v.assignment_type)+'</span>':'&#8212;')+'</td>'+
          '<td>'+(v.service_category?'<span class="badge '+(svcColor2[v.service_category]||'badge-gray')+'" style="font-size:9px">'+escHtml(v.service_category)+'</span>':'&#8212;')+'</td>'+
          '<td style="font-size:10px;color:var(--text2)">'+escHtml(v.zone||'&#8212;')+'</td>'+
          '<td style="color:var(--accent);font-size:11px">'+escHtml(v.client_id||'&#8212;')+'</td>'+
          '<td style="font-size:12px;font-weight:500">'+escHtml(v.client_name||'&#8212;')+'</td>'+
          '<td style="font-size:11px">'+(isReservedGrp?'<span style="color:var(--text3);font-style:italic">pending</span>':renderRealIpCell(v.real_ip,v.client_id))+'</td>'+
          '<td style="font-size:11px">'+(isReservedGrp?'<span style="color:var(--text3);font-style:italic">pending</span>':renderFakeIpCell(v.fake_ip,v.client_id))+'</td>'+
          '<td>'+(v.dsp?'<span class="badge '+dspBadge(v.dsp)+'" style="font-size:9px">'+escHtml(v.dsp)+'</span>':DASH)+'</td>'+
          '<td style="font-size:10px;color:var(--teal)">'+escHtml(v.bng_card||'&#8212;')+'</td>'+
          '<td>'+cdn+'</td>'+
          '<td style="font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(v.primary_path||'&#8212;')+'</td>'+
          '<td style="font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(v.backup_path||'&#8212;')+'</td>'+
          '<td style="font-size:10px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(v.other_path||'&#8212;')+'</td>'+
          '<td style="font-size:10px;color:var(--text2)">'+escHtml(v.source||'&#8212;')+'</td>'+
          '<td style="font-size:10px;color:var(--text3)">'+escHtml(v.notes||'&#8212;')+'</td>'+
          '<td class="ts-cell">'+escHtml(v.last_modified||'&#8212;')+'</td>'+
          '<td style="white-space:nowrap;position:sticky;right:0;background:'+BG2+';border-left:1px solid var(--border)">'+cAct+'</td>'+
          '</tr>';
      }
    });

    if(!tableRows)tableRows='<tr><td colspan="19"><div class="empty-state"><div class="icon">&#127991;&#65039;</div><p>No VLANs yet</p></div></td></tr>';

    // Paginator
    var pagerHtml='';
    if(totalPages>1){
      var btns='';
      var s=Math.max(1,currentVlanPage-3),e=Math.min(totalPages,s+6);
      if(s>1)btns+='<button class="page-btn" onclick="currentVlanPage=1;render()">1</button><span class="page-info">&hellip;</span>';
      for(var i=s;i<=e;i++)btns+='<button class="page-btn '+(i===currentVlanPage?'active':'')+'" onclick="currentVlanPage='+i+';render()">'+i+'</button>';
      if(e<totalPages)btns+='<span class="page-info">&hellip;</span><button class="page-btn" onclick="currentVlanPage='+totalPages+';render()">'+totalPages+'</button>';
      pagerHtml='<div class="pagination" style="padding:12px 0">'+
        '<button class="page-btn" onclick="currentVlanPage=Math.max(1,currentVlanPage-1);render()">&lsaquo;</button>'+
        btns+
        '<button class="page-btn" onclick="currentVlanPage=Math.min('+totalPages+',currentVlanPage+1);render()">&rsaquo;</button>'+
        '</div>';
    }

    var addBtn=can('addVlan')?
      '<button class="btn btn-primary" onclick="openVlanModal(null)">&#xFF0B; Add VLAN</button>'+
      '<button class="btn" onclick="openCdnManagerModal()">&#128225; CDN List</button>':
      '<span class="badge badge-viewer">&#128065; View Only</span>';

    var typeChips=VLAN_TYPES.map(function(t){
      var cnt=db.vlans.filter(function(v){return v.assignment_type===t;}).length;
      return'<span class="filter-chip '+(currentFilter===t?'active':'')+'" onclick="currentFilter=\''+t+'\';currentVlanPage=1;window._vlanExpandedGroups={};render()">'+escHtml(t)+' ('+cnt+')</span>';
    }).join('');

    // Count visible rows info
    var expandedCount=Object.keys(window._vlanExpandedGroups).length;
    var rowInfo='Page '+currentVlanPage+'/'+totalPages+' &middot; Showing '+pageRows.length+' of '+totalRows+' rows &middot; '+f.length+' VLANs'+(expandedCount>0?' &middot; <span style="color:var(--accent)">'+expandedCount+' group'+(expandedCount>1?'s':'')+' expanded</span>':'');

    return'<div class="page-header">'+
      '<div><div class="page-title">VLAN Tracking</div>'+
      '<div class="page-subtitle">'+db.vlans.length+' VLANs tracked'+(conflictItems.length?' &mdash; <span style="color:var(--red)">&#9888; '+conflictItems.length+' conflict'+(conflictItems.length>1?'s':'')+'</span>':'')+'</div></div>'+
      '<div class="header-actions">'+addBtn+'</div></div>'+
      '<div class="toolbar">'+
        '<div class="search-box"><input type="text" id="gs" placeholder="Search VLAN ID, client, IP&hellip;" value="'+escAttr(currentSearch)+'" oninput="currentSearch=this.value;currentVlanPage=1;window._vlanExpandedGroups={};renderAndFocus(\'gs\');"></div>'+
        '<select class="filter-select" onchange="currentFilter=this.value;currentVlanPage=1;window._vlanExpandedGroups={};render()">'+
          '<option value="all"'+(currentFilter==='all'?' selected':'')+'>All Status</option>'+
          VLAN_STATUSES.map(function(s){return'<option value="'+escAttr(s)+'"'+(currentFilter===s?' selected':'')+'>'+escHtml(s)+'</option>';}).join('')+
        '</select>'+
        '<select class="filter-select" onchange="currentFilter=this.value;currentVlanPage=1;window._vlanExpandedGroups={};render()">'+
          '<option value="all"'+(currentFilter==='all'?' selected':'')+'>All Types</option>'+
          VLAN_TYPES.map(function(t){return'<option value="'+escAttr(t)+'"'+(currentFilter===t?' selected':'')+'>'+escHtml(t)+'</option>';}).join('')+
        '</select>'+
        '<div class="filter-row">'+
          '<span class="filter-chip '+(currentFilter==='all'?'active':'')+'" onclick="currentFilter=\'all\';currentVlanPage=1;window._vlanExpandedGroups={};render()">All ('+db.vlans.length+')</span>'+
          typeChips+
        '</div>'+
      '</div>'+
      conflictBanner+
      '<div class="table-wrap" style="overflow-x:auto">'+
        '<div class="table-info">'+
          '<span>'+rowInfo+'</span>'+
          '<span style="color:var(--text3);font-size:11px">&#9654; = collapsed &middot; click to expand &middot; expands across pages</span>'+
        '</div>'+
        '<table style="min-width:1820px;border-collapse:collapse">'+
        '<thead><tr>'+
          '<th style="min-width:140px;position:sticky;left:0;background:var(--bg3);z-index:6;border-right:1px solid var(--border)"><span class="th-label">VLAN-ID</span><input class="col-filter" id="cf-vvid" placeholder="filter&hellip;" value="'+escAttr(cfVid)+'" oninput="currentColFilters.vVid=this.value;currentVlanPage=1;renderAndFocus(\'cf-vvid\')"></th>'+
          '<th style="min-width:85px"><span class="th-label">Status</span><input class="col-filter" id="cf-vstatus" placeholder="filter&hellip;" value="'+escAttr(cfStatus)+'" oninput="currentColFilters.vStatus=this.value;currentVlanPage=1;renderAndFocus(\'cf-vstatus\')"></th>'+
          '<th style="min-width:95px"><span class="th-label">Type</span><input class="col-filter" id="cf-vtype" placeholder="filter&hellip;" value="'+escAttr(cfType)+'" oninput="currentColFilters.vType=this.value;currentVlanPage=1;renderAndFocus(\'cf-vtype\')"></th>'+
          '<th style="min-width:90px"><span class="th-label">Service</span><input class="col-filter" id="cf-vsvc" placeholder="filter&hellip;" value="'+escAttr(cfSvc)+'" oninput="currentColFilters.vSvc=this.value;currentVlanPage=1;renderAndFocus(\'cf-vsvc\')"></th>'+
          '<th style="min-width:90px"><span class="th-label">Zone</span><input class="col-filter" id="cf-vzone" placeholder="filter&hellip;" value="'+escAttr(cfZone)+'" oninput="currentColFilters.vZone=this.value;currentVlanPage=1;renderAndFocus(\'cf-vzone\')"></th>'+
          '<th style="min-width:100px"><span class="th-label">Client-ID</span><input class="col-filter" id="cf-vcid" placeholder="filter&hellip;" value="'+escAttr(cfCid)+'" oninput="currentColFilters.vCid=this.value;currentVlanPage=1;renderAndFocus(\'cf-vcid\')"></th>'+
          '<th style="min-width:140px"><span class="th-label">Client-Name</span><input class="col-filter" id="cf-vname" placeholder="filter&hellip;" value="'+escAttr(cfName)+'" oninput="currentColFilters.vName=this.value;currentVlanPage=1;renderAndFocus(\'cf-vname\')"></th>'+
          '<th style="min-width:160px"><span class="th-label">Real-IP</span></th>'+
          '<th style="min-width:160px"><span class="th-label">Fake-IP</span></th>'+
          '<th style="min-width:90px"><span class="th-label">DSP</span></th>'+
          '<th style="min-width:100px"><span class="th-label">BNG-Card</span></th>'+
          '<th style="min-width:100px"><span class="th-label">CDN</span></th>'+
          '<th style="min-width:120px"><span class="th-label">Primary-Path</span></th>'+
          '<th style="min-width:120px"><span class="th-label">Backup-Path</span></th>'+
          '<th style="min-width:100px"><span class="th-label">Other-Path</span></th>'+
          '<th style="min-width:90px"><span class="th-label">Source</span></th>'+
          '<th style="min-width:130px"><span class="th-label">Notes</span></th>'+
          '<th style="min-width:120px"><span class="th-label">Modified</span></th>'+
          '<th style="min-width:90px;position:sticky;right:0;background:var(--bg3);z-index:6;border-left:1px solid var(--border)"></th>'+
        '</tr></thead>'+
        '<tbody>'+tableRows+'</tbody>'+
        '</table>'+
      '</div>'+
      pagerHtml;
  };

  // ── Override renderUsers — 3-col permission grid ──────────
  window.renderUsers=function(){
    if(!can('manageUsers'))return'<div class="empty-state"><div class="icon">&#128274;</div><p>Access denied</p></div>';
    var grouped={};
    PERM_GROUPS.forEach(function(g){grouped[g]=[];});
    PERM_KEYS.forEach(function(k){if(PERM_LABELS[k])grouped[PERM_LABELS[k].group].push(k);});
    function permGrid(username,perms,isNew){
      var cardPfx=isNew?'new':username.replace(/[^a-z0-9]/gi,'_');
      return PERM_GROUPS.map(function(g){
        var keys=grouped[g]||[];
        if(!keys.length)return'';
        return'<div style="margin-bottom:12px">'+
          '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:5px">'+escHtml(g)+'</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px">'+
          keys.map(function(k){
            var id='uc-'+cardPfx+'-'+k;
            var checked=perms&&perms[k]!==undefined?perms[k]:false;
            return'<label style="display:flex;align-items:center;gap:5px;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;background:rgba(255,255,255,0.02);border:1px solid var(--border)">'+
              '<input type="checkbox" id="'+escAttr(id)+'" '+(checked?'checked':'')+'>'+
              '<span style="color:var(--text2)">'+escHtml(PERM_LABELS[k].label)+'</span></label>';
          }).join('')+'</div></div>';
      }).join('');
    }
    function roleRadios(username,currentRole,isNew){
      var name=isNew?'new-role':'role-'+username.replace(/[^a-z0-9]/gi,'_');
      var safeName=username.replace(/[^a-z0-9]/gi,'_');
      return['admin','editor','viewer'].map(function(r){
        return'<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px">'+
          '<input type="radio" name="'+escAttr(name)+'" value="'+r+'" '+(currentRole===r?'checked':'')+
          ' onchange="applyRolePreset(\''+escAttr(username)+'\',this.value,\''+(isNew?'new':safeName)+'\')">'+roleBadge(r)+'</label>';
      }).join('');
    }
    var otherUsers=usersDb.filter(function(u){return u.username!==session.username;});
    var userCards=otherUsers.length
      ?otherUsers.map(function(u){
          var safeName=u.username.replace(/[^a-z0-9]/gi,'_');
          return'<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:18px 20px;margin-bottom:12px">'+
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
            '<span style="font-size:14px;font-weight:700;font-family:IBM Plex Mono,monospace">'+escHtml(u.username)+'</span>'+
            '<div style="display:flex;align-items:center;gap:8px">'+roleRadios(u.username,u.role,false)+
            '<button class="btn btn-sm btn-danger" onclick="deleteUser(\''+escAttr(u.username)+'\')">\ud83d\uddd1\ufe0f</button></div></div>'+
            permGrid(u.username,u.perms,false)+
            '<button class="btn btn-primary btn-sm" style="margin-top:10px;width:100%" onclick="saveUser(\''+escAttr(u.username)+'\',\''+escAttr(safeName)+'\')">&#128190; Save Changes</button></div>';
        }).join('')
      :'<div style="color:var(--text3);font-size:13px;padding:12px 0">No other users yet.</div>';
    var newCard='<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:18px 20px">'+
      '<div class="form-row"><label>Username <span style="color:var(--red)">*</span></label>'+
      '<input type="text" id="new-username" placeholder="e.g. sarah" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-size:13px;font-family:IBM Plex Mono,monospace;outline:none"></div>'+
      '<div class="form-row"><label>Password <span style="color:var(--red)">*</span></label>'+
      '<input type="password" id="new-password" placeholder="Set password" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-size:13px;font-family:IBM Plex Mono,monospace;outline:none"></div>'+
      '<div class="form-row"><label>Role</label><div style="display:flex;gap:10px;margin-top:4px">'+roleRadios('new','editor',true)+'</div></div>'+
      '<div class="form-row"><label>Permissions</label></div>'+
      permGrid('new',DEFAULT_PERMISSIONS.editor,true)+
      '<button class="btn btn-primary" style="width:100%;margin-top:10px" onclick="createUser()">&#xFF0B; Create User</button></div>';
    return'<div class="page-header"><div><div class="page-title">User Permissions</div>'+
      '<div class="page-subtitle">Add / Edit / Delete are now separate permissions per section</div></div>'+
      '</div>'+
      
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">'+
      '<div><div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;margin-bottom:8px">Other Users ('+otherUsers.length+')</div>'+userCards+'</div>'+
      '<div><div style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;margin-bottom:8px">Add New User</div>'+newCard+'</div></div>';
  };

  // Reset vlan page + expanded groups on navigation
  var _sp=window.showPage;
  window.showPage=function(page,param){
    if(page==='vlan'){currentVlanPage=1;window._vlanExpandedGroups={};}
    _sp(page,param);
  };

  console.log('%c\u2713 EB IP Manager v14 ready','color:#00b4d8;font-weight:bold;font-size:14px');
})();


// ── WAN GROUPING + SEARCH SCROLL PATCH ──
// ── WAN Page State ────────────────────────────────────────────
window._wanExpandedGroups = window._wanExpandedGroups || {};

// ── Build WAN groups by client_id ────────────────────────────
function buildWanGroups(wanList) {
  var groups = [], seen = new Set();
  wanList.forEach(function(r, i) {
    if (seen.has(i)) return;
    var cid = r.client_id || '';
    var members = wanList.map(function(rr, ii) {
      return {row: rr, idx: ii};
    }).filter(function(x) { return x.row.client_id === cid; });
    members.forEach(function(m) { seen.add(m.idx); });
    if (members.length <= 1) {
      groups.push({type:'single', row:r, idx:i});
    } else {
      groups.push({type:'group', cid:cid, members:members, lead:r, leadIdx:i});
    }
  });
  return groups;
}

// ── Build flat rows for pagination ───────────────────────────
function buildWanFlatRows(groups) {
  var rows = [];
  groups.forEach(function(g) {
    if (g.type === 'single') {
      rows.push({type:'single', g:g});
    } else {
      var safeId = g.cid.replace(/[^a-z0-9]/gi,'_');
      var isExpanded = !!window._wanExpandedGroups[safeId];
      rows.push({type:'group-header', g:g, safeId:safeId, isExpanded:isExpanded});
      if (isExpanded) {
        g.members.forEach(function(m) {
          rows.push({type:'child', g:g, m:m, safeId:safeId});
        });
      }
    }
  });
  return rows;
}

// ── Toggle WAN group expand/collapse ─────────────────────────
window.toggleWanGroup = function(safeId) {
  if (window._wanExpandedGroups[safeId]) {
    delete window._wanExpandedGroups[safeId];
  } else {
    window._wanExpandedGroups[safeId] = true;
  }
  render();
};

// ── renderWan override ────────────────────────────────────────
window.renderWan = function() {
  currentWanPage = currentWanPage || 1;
  var cfCID = currentColFilters.wanCid||'';
  var cfCode = currentColFilters.wanCode||'';
  var cfName = currentColFilters.wanName||'';
  var cfVlan = currentColFilters.wanVlan||'';
  var cfDsp = currentColFilters.wanDsp||'';
  var cfUpdown = currentColFilters.wanUpdown||'';
  var cfSubnet = currentColFilters.wanSubnet||'';

  var f = db.wan;
  if (currentSearch) {
    var q = currentSearch.toLowerCase();
    f = f.filter(function(r) {
      return [r.client_id,r.branch_name,r.branch_code,r.dsp,r.vlan_id,r.updown,r.vlan_subnet]
        .some(function(v) { return String(v||'').toLowerCase().includes(q); });
    });
  }
  if(cfCID)    f=f.filter(function(r){return String(r.client_id||'').toLowerCase().includes(cfCID.toLowerCase());});
  if(cfCode)   f=f.filter(function(r){return String(r.branch_code||'').toLowerCase().includes(cfCode.toLowerCase());});
  if(cfName)   f=f.filter(function(r){return String(r.branch_name||'').toLowerCase().includes(cfName.toLowerCase());});
  if(cfVlan)   f=f.filter(function(r){return String(r.vlan_id||'').toLowerCase().includes(cfVlan.toLowerCase());});
  if(cfDsp)    f=f.filter(function(r){return String(r.dsp||'').toLowerCase().includes(cfDsp.toLowerCase());});
  if(cfUpdown) f=f.filter(function(r){return String(r.updown||'').toLowerCase().includes(cfUpdown.toLowerCase());});
  if(cfSubnet) f=f.filter(function(r){return String(r.vlan_subnet||'').toLowerCase().includes(cfSubnet.toLowerCase());});

  var allGroups = buildWanGroups(f);
  var flatRows = buildWanFlatRows(allGroups);
  var totalRows = flatRows.length;
  var totalPages = Math.max(1, Math.ceil(totalRows / WAN_PAGE_SIZE));
  if(currentWanPage > totalPages) currentWanPage = totalPages;
  if(currentWanPage < 1) currentWanPage = 1;
  var pageRows = flatRows.slice((currentWanPage-1)*WAN_PAGE_SIZE, currentWanPage*WAN_PAGE_SIZE);

  var BG2 = 'var(--bg2)';
  var DASH = '<span style="color:var(--text3)">&#8212;</span>';

  var tableRows = '';
  pageRows.forEach(function(item) {
    if (item.type === 'single') {
      var r = item.g.row, idx = item.g.idx;
      tableRows += buildWanRow(r, idx, false, false, '');

    } else if (item.type === 'group-header') {
      var g = item.g, safeId = item.safeId, isExpanded = item.isExpanded;
      var cnt = g.members.length;
      var lead = g.lead;
      var grpColor = 'var(--purple)';
      var editBtn = can('editWan') ? '<button class="action-btn edit" title="Rename Client ID for all branches" onclick="renameWanGroup(\''+safeId+'\',\''+escAttr(g.cid)+'\')">&#9999;&#65039;</button>' : '';
      var delBtn  = can('deleteWan') ? '<button class="action-btn del" onclick="deleteWanGroup(\''+escAttr(g.cid)+'\')">&#128465;&#65039;</button>' : '';
      var expandLbl = isExpanded ? 'collapse &#9650;' : 'expand &#9660;';
      tableRows +=
        '<tr style="background:rgba(188,140,255,.04)" id="wangrp-'+safeId+'">' +
        '<td style="position:sticky;left:0;z-index:2;background:'+BG2+';border-right:1px solid var(--border)">' +
          '<span style="display:inline-block;width:3px;height:14px;background:'+grpColor+';border-radius:2px;margin-right:5px;vertical-align:middle"></span>' +
          '<span style="cursor:pointer;color:'+grpColor+';font-size:11px;font-weight:700" onclick="toggleWanGroup(\''+safeId+'\')">' +
            '<span>'+( isExpanded ? '&#9660;' : '&#9654;')+'</span> '+escHtml(g.cid)+'</span>' +
          '<span style="background:rgba(188,140,255,.12);border:1px solid rgba(188,140,255,.3);color:var(--purple);display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-family:\'IBM Plex Mono\',monospace;margin-left:6px">'+cnt+' branches</span>' +
        '</td>' +
        '<td><span style="color:var(--text3);font-size:11px;font-style:italic">multiple</span></td>' +
        '<td><span style="color:var(--text3);font-size:11px;font-style:italic">multiple branches</span></td>' +
        '<td>'+DASH+'</td>' +
        '<td>'+(lead.dsp ? '<span class="badge '+dspBadge(lead.dsp)+'">'+escHtml(lead.dsp)+'</span>' : DASH)+'</td>' +
        '<td>'+DASH+'</td>' +
        '<td>'+DASH+'</td>' +
        '<td style="white-space:nowrap;position:sticky;right:0;background:'+BG2+';border-left:1px solid var(--border)">' +
          '<button class="action-btn" style="font-size:10px;color:'+grpColor+'" onclick="toggleWanGroup(\''+safeId+'\')">'+expandLbl+'</button>' +
          editBtn + delBtn +
        '</td>' +
        '</tr>';

    } else if (item.type === 'child') {
      var r = item.m.row, idx = item.m.idx;
      tableRows += buildWanRow(r, idx, true, false, item.safeId);
    }
  });

  if (!tableRows) tableRows = '<tr><td colspan="8"><div class="empty-state"><div class="icon">&#128279;</div><p>No WAN solutions yet</p></div></td></tr>';

  // Paginator
  var pagerHtml = '';
  if (totalPages > 1) {
    var btns = '';
    var s = Math.max(1, currentWanPage-3), e = Math.min(totalPages, s+6);
    if(s>1) btns += '<button class="page-btn" onclick="currentWanPage=1;render()">1</button><span class="page-info">&hellip;</span>';
    for(var i=s;i<=e;i++) btns += '<button class="page-btn '+(i===currentWanPage?'active':'')+'" onclick="currentWanPage='+i+';render()">'+i+'</button>';
    if(e<totalPages) btns += '<span class="page-info">&hellip;</span><button class="page-btn" onclick="currentWanPage='+totalPages+';render()">'+totalPages+'</button>';
    pagerHtml = '<div class="pagination" style="padding:12px 0">' +
      '<button class="page-btn" onclick="currentWanPage=Math.max(1,currentWanPage-1);render()">&lsaquo;</button>'+btns+
      '<button class="page-btn" onclick="currentWanPage=Math.min('+totalPages+',currentWanPage+1);render()">&rsaquo;</button></div>';
  }

  var addBtn = can('addWan') ?
    '<button class="btn btn-primary" onclick="addWanRow()">&#xFF0B; Add WAN Link</button>' :
    '<span class="badge badge-viewer">&#128065; View Only</span>';

  var expandedCount = Object.keys(window._wanExpandedGroups).length;
  var rowInfo = 'Page '+currentWanPage+'/'+totalPages+' &middot; '+pageRows.length+' rows &middot; '+f.length+' links'+(expandedCount?' &middot; <span style="color:var(--accent)">'+expandedCount+' client'+(expandedCount>1?'s':'')+' expanded</span>':'');

  return '<div class="page-header"><div><div class="page-title">WAN Solutions</div>' +
    '<div class="page-subtitle">Branch / HO configuration &mdash; '+db.wan.length+' total</div></div>' +
    '<div class="header-actions">'+addBtn+'</div></div>' +
    '<div class="toolbar"><div class="search-box"><input type="text" id="gs" placeholder="Search anything&hellip; (live)" value="'+escAttr(currentSearch)+'" oninput="currentSearch=this.value;currentWanPage=1;window._wanExpandedGroups={};renderAndFocus(\'gs\');"></div></div>' +
    '<div class="table-wrap">' +
      '<div class="table-info"><span>'+rowInfo+'</span><span style="color:var(--text3);font-size:11px">&#9654; = grouped by client &middot; click to expand</span></div>' +
      '<table style="table-layout:fixed;width:100%"><thead><tr>' +
        '<th style="width:130px;position:sticky;left:0;background:var(--bg3);z-index:6;border-right:1px solid var(--border)"><span class="th-label">Client ID/HO</span><input class="col-filter" id="cf-wan-cid" placeholder="filter&hellip;" value="'+escAttr(cfCID)+'" oninput="currentColFilters.wanCid=this.value;currentWanPage=1;renderAndFocus(\'cf-wan-cid\');"></th>' +
        '<th style="width:90px"><span class="th-label">Branch Code</span><input class="col-filter" id="cf-wan-code" placeholder="filter&hellip;" value="'+escAttr(cfCode)+'" oninput="currentColFilters.wanCode=this.value;currentWanPage=1;renderAndFocus(\'cf-wan-code\');"></th>' +
        '<th style="width:180px"><span class="th-label">Branch Name</span><input class="col-filter" id="cf-wan-name" placeholder="filter&hellip;" value="'+escAttr(cfName)+'" oninput="currentColFilters.wanName=this.value;currentWanPage=1;renderAndFocus(\'cf-wan-name\');"></th>' +
        '<th style="width:80px"><span class="th-label">VLAN</span><input class="col-filter" id="cf-wan-vlan" placeholder="filter&hellip;" value="'+escAttr(cfVlan)+'" oninput="currentColFilters.wanVlan=this.value;currentWanPage=1;renderAndFocus(\'cf-wan-vlan\');"></th>' +
        '<th style="width:100px"><span class="th-label">DSP</span><input class="col-filter" id="cf-wan-dsp" placeholder="filter&hellip;" value="'+escAttr(cfDsp)+'" oninput="currentColFilters.wanDsp=this.value;currentWanPage=1;renderAndFocus(\'cf-wan-dsp\');"></th>' +
        '<th style="width:100px"><span class="th-label">UP/DOWN</span><input class="col-filter" id="cf-wan-updown" placeholder="filter&hellip;" value="'+escAttr(cfUpdown)+'" oninput="currentColFilters.wanUpdown=this.value;currentWanPage=1;renderAndFocus(\'cf-wan-updown\');"></th>' +
        '<th style="width:140px"><span class="th-label">Subnet HO&rarr;BR</span><input class="col-filter" id="cf-wan-subnet" placeholder="filter&hellip;" value="'+escAttr(cfSubnet)+'" oninput="currentColFilters.wanSubnet=this.value;currentWanPage=1;renderAndFocus(\'cf-wan-subnet\');"></th>' +
        '<th style="width:110px;position:sticky;right:0;background:var(--bg3);z-index:6;border-left:1px solid var(--border)"></th>' +
      '</tr></thead><tbody>'+tableRows+'</tbody></table>' +
    '</div>' +
    pagerHtml;
};

// ── Helper: render single WAN row ─────────────────────────────
function buildWanRow(r, idx, isChild, isSingle, safeId) {
  var BG2 = 'var(--bg2)';
  var DASH = '<span style="color:var(--text3)">&#8212;</span>';
  var act = (can('editWan') ? '<button class="action-btn edit" onclick="editWanRow('+idx+')">&#9999;&#65039;</button>' : '') +
            (can('deleteWan') ? '<button class="action-btn del" onclick="deleteWanRow('+idx+')">&#128465;&#65039;</button>' : '');
  var nameCell = '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;font-weight:500" title="'+escAttr(r.branch_name||'')+'">'+escHtml(r.branch_name||'&#8212;')+'</div>';
  var subnetCell = !r.vlan_subnet ? DASH :
    isValidSubnet(r.vlan_subnet) ? '<span class="ip-chip">'+escHtml(r.vlan_subnet)+'</span>' :
    '<span style="color:var(--red);font-size:11px">'+escHtml(r.vlan_subnet)+'</span>';
  var bg = isChild ? 'background:rgba(188,140,255,.02)' : '';
  var barStyle = isChild ? '<span style="display:inline-block;width:3px;height:14px;background:rgba(188,140,255,.4);border-radius:2px;margin-right:5px;vertical-align:middle"></span>' : '';

  return '<tr style="'+bg+'">' +
    '<td style="position:sticky;left:0;z-index:2;background:'+BG2+';border-right:1px solid var(--border)">'+barStyle+'<span style="color:var(--accent);font-weight:600;font-size:11px">'+escHtml(r.client_id||'&#8212;')+'</span></td>' +
    '<td style="font-size:11px;white-space:nowrap">'+(r.branch_code?'<span style="color:var(--text2)">'+escHtml(r.branch_code)+'</span>':DASH)+'</td>' +
    '<td>'+nameCell+'</td>' +
    '<td>'+(r.vlan_id?'<span class="badge badge-yellow">VLAN '+escHtml(String(r.vlan_id))+'</span>':DASH)+'</td>' +
    '<td>'+(r.dsp?'<span class="badge '+dspBadge(r.dsp)+'">'+escHtml(r.dsp)+'</span>':DASH)+'</td>' +
    '<td style="white-space:nowrap">'+renderUpdown(r.updown)+'</td>' +
    '<td style="white-space:nowrap">'+subnetCell+'</td>' +
    '<td style="white-space:nowrap;position:sticky;right:0;background:'+BG2+';border-left:1px solid var(--border)">'+act+'</td>' +
    '</tr>';
}

// ── WAN group bulk-open modal ─────────────────────────────────
// openWanGroupEdit removed - use individual edit buttons per branch

// ── Rename Client ID for all WAN entries in a group ─────────
window.renameWanGroup = function(safeId, oldCid) {
  var cnt = db.wan.filter(function(r){return r.client_id===oldCid;}).length;
  var formHtml = 
    '<div class="form-row" style="margin-bottom:8px">'
    +'<label style="font-size:11px;color:var(--text2);margin-bottom:6px;display:block">'
    +'Current Client ID</label>'
    +'<div style="font-size:13px;font-weight:700;color:var(--purple);font-family:IBM Plex Mono,monospace;padding:8px 12px;background:var(--bg3);border-radius:6px;border:1px solid var(--border)">'
    +escHtml(oldCid)
    +'</div></div>'
    +'<div class="form-row">'
    +'<label>New Client ID / HO <span style="color:var(--red)">*</span></label>'
    +'<input type="text" id="f_rename_cid" value="'+escAttr(oldCid)+'" '
    +'placeholder="e.g. TRI-999" '
    +'oninput="this.value=this.value.toUpperCase()" '
    +'style="text-transform:uppercase" autocomplete="off">'
    +'<div class="hint">All '+cnt+' branch'+(cnt!==1?'es':'')+' will be updated</div>'
    +'</div>';
  openModal(
    'Rename WAN Group — '+escHtml(oldCid),
    formHtml,
    '<button class="btn btn-primary" onclick="doRenameWanGroup(\''+escAttr(safeId)+'\',\''+escAttr(oldCid)+'\')">&#128190; Save</button>'
  );
  setTimeout(function(){ var el=document.getElementById('f_rename_cid'); if(el){el.focus();el.select();} },100);
};

window.doRenameWanGroup = function(safeId, oldCid) {
  var el = document.getElementById('f_rename_cid');
  if (!el) return;
  var newCid = el.value.trim().toUpperCase();
  if (!newCid) { toast('❌ Client ID cannot be empty', 'error'); el.classList.add('ip-invalid'); el.focus(); return; }
  if (newCid === oldCid) { closeModal(); return; }
  var conflict = db.wan.some(function(r){ return r.client_id === newCid && r.client_id !== oldCid; });
  if (conflict) { toast('❌ Client ID "'+newCid+'" already exists as a different group', 'error'); el.classList.add('ip-invalid'); el.focus(); return; }
  var count = 0;
  db.wan.forEach(function(r) { if (r.client_id === oldCid) { r.client_id = newCid; count++; } });
  db.wan.forEach(function(r) { if (r.client_id === newCid) { api('editWan', Object.assign({index: db.wan.indexOf(r)}, r)); } });
  closeModal();
  toast('✓ Renamed "'+oldCid+'" → "'+newCid+'" for '+count+' branches', 'success');
  window._wanExpandedGroups = {};
  render(); updateTopStats();
};

// ── Delete all WAN entries for a client ──────────────────────
window.deleteWanGroup = function(cid) {
  var members = db.wan.filter(function(r){return r.client_id===cid;});
  if(!members.length){toast('Group not found','error');return;}
  confirmDelete('Delete all <b>'+members.length+'</b> WAN links for <b>'+escHtml(cid)+'</b>?',function(){doDeleteWanGroupConfirmed(cid);});return;}
function doDeleteWanGroupConfirmed(cid){
  var members = db.wan.filter(function(r){return r.client_id===cid;});
  if(!members.length){toast('Group not found','error');return;}
  // Collect original indices BEFORE any splice (highest first to avoid shifting)
  var indexes = members.map(function(m){return db.wan.indexOf(m);}).sort(function(a,b){return b-a;});
  indexes.forEach(function(i){db.wan.splice(i,1);});
  render();updateTopStats();toast('All WAN links for "'+cid+'" deleted ✓','success');
  // Delete from sheets: send indices in DESCENDING order so sheet rows don't shift between deletes
  api('batchDeleteWan',{indexes:indexes});
};

// ── render() now calls window.renderWan ──────────────────────
var _origRender = window.render;
window.render = function() {
  var c = document.getElementById('main-content'); if(!c) return;
  if(currentPage==='wan') { c.innerHTML=window.renderWan(); updateTopStats(); return; }
  _origRender();
};

// ── Clean scroll-to-top on navigation ──────────────────────
// The inline showPage already sets _justNavigated=true and scrollTop=0
// No additional render override needed — keep chain clean

// ── Tunnel + VPN pagination patch ──
// ── Paginated renderTunnels override ─────────────────────────
(function(){

window.renderTunnels = function(){
  currentTunnelPage = currentTunnelPage || 1;
  var cfCID   = currentColFilters.tunCid||'';
  var cfName  = currentColFilters.tunName||'';
  var cfLocal = currentColFilters.tunLocal||'';
  var cfRemote= currentColFilters.tunRemote||'';
  var cfIface = currentColFilters.tunIface||'';

  var f = db.tunnels;
  if(currentSearch){var q=currentSearch.toLowerCase();f=f.filter(function(r){return[r.client_id,r.client_name,r.tunnel_local_ip,r.tunnel_remote_ip,r.tunnel_interface,r.description].some(function(v){return String(v||'').toLowerCase().includes(q);});});}
  if(cfCID)   f=f.filter(function(r){return String(r.client_id||'').toLowerCase().includes(cfCID.toLowerCase());});
  if(cfName)  f=f.filter(function(r){return String(r.client_name||'').toLowerCase().includes(cfName.toLowerCase());});
  if(cfLocal) f=f.filter(function(r){return String(r.tunnel_local_ip||'').toLowerCase().includes(cfLocal.toLowerCase());});
  if(cfRemote)f=f.filter(function(r){return String(r.tunnel_remote_ip||'').toLowerCase().includes(cfRemote.toLowerCase());});
  if(cfIface) f=f.filter(function(r){return String(r.tunnel_interface||'').toLowerCase().includes(cfIface.toLowerCase());});

  var total=f.length, totalPages=Math.max(1,Math.ceil(total/TUNNEL_PAGE_SIZE));
  if(currentTunnelPage>totalPages)currentTunnelPage=totalPages;
  var paged=f.slice((currentTunnelPage-1)*TUNNEL_PAGE_SIZE, currentTunnelPage*TUNNEL_PAGE_SIZE);

  var DASH='<span style="color:var(--text3)">&#8212;</span>';
  var rows=paged.map(function(r){
    var idx=db.tunnels.indexOf(r);
    var act=(can('editTunnel')?'<button class="action-btn edit" onclick="editTunnelRow('+idx+')">&#9999;&#65039;</button>':'')+
            (can('deleteTunnel')?'<button class="action-btn del" onclick="deleteTunnelRow('+idx+')">&#128465;&#65039;</button>':'');
    var localCell=r.tunnel_local_ip?'<span class="ip-chip">'+escHtml(r.tunnel_local_ip)+'</span>':DASH;
    var remoteCell=r.tunnel_remote_ip?'<span class="ip-chip">'+escHtml(r.tunnel_remote_ip)+'</span>':DASH;
    var ifaceCell=r.tunnel_interface?'<span style="background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:1px 7px;font-size:11px;font-family:IBM Plex Mono,monospace;color:var(--teal)">'+escHtml(r.tunnel_interface)+'</span>':DASH;
    return '<tr>'+
      '<td style="color:var(--accent);font-weight:600"><span style="cursor:pointer" onclick="renderSearch();document.getElementById(\'gs\').value=\''+escAttr(r.client_id||'')+'\';currentSearch=\''+escAttr(r.client_id||'')+'\';renderAndFocus(\'gs\')">'+escHtml(r.client_id||DASH)+'</span></td>'+
      '<td><b>'+escHtml(r.client_name||'')+'</b></td>'+
      '<td>'+localCell+'</td>'+
      '<td>'+remoteCell+'</td>'+
      '<td>'+ifaceCell+'</td>'+
      '<td style="color:var(--text3);font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escAttr(r.description||'')+'">'+escHtml(r.description||'')+'</td>'+
      '<td style="white-space:nowrap">'+act+'</td>'+
      '</tr>';
  }).join('');

  if(!rows)rows='<tr><td colspan="7"><div class="empty-state"><div class="icon">&#128279;</div><p>No tunnels yet</p></div></td></tr>';

  var pager='';
  if(totalPages>1){
    var s=Math.max(1,currentTunnelPage-3),e=Math.min(totalPages,s+6),btns='';
    if(s>1)btns+='<button class="page-btn" onclick="currentTunnelPage=1;render()">1</button><span class="page-info">&hellip;</span>';
    for(var i=s;i<=e;i++)btns+='<button class="page-btn '+(i===currentTunnelPage?'active':'')+'" onclick="currentTunnelPage='+i+';render()">'+i+'</button>';
    if(e<totalPages)btns+='<span class="page-info">&hellip;</span><button class="page-btn" onclick="currentTunnelPage='+totalPages+';render()">'+totalPages+'</button>';
    pager='<div class="pagination" style="padding:12px 0">'+
      '<button class="page-btn" onclick="currentTunnelPage=Math.max(1,currentTunnelPage-1);render()">&lsaquo;</button>'+btns+
      '<button class="page-btn" onclick="currentTunnelPage=Math.min('+totalPages+',currentTunnelPage+1);render()">&rsaquo;</button></div>';
  }

  var addBtn=can('addTunnel')?'<button class="btn btn-primary" onclick="addTunnelRow()">&#xFF0B; Add IP Tunnel</button>':'<span class="badge badge-viewer">&#128065; View Only</span>';
  var infoRow='Page '+currentTunnelPage+'/'+totalPages+' &middot; Showing '+paged.length+' of '+total+' tunnel'+(total!==1?'s':'');

  var thBase='padding:8px 10px;text-align:left;background:var(--bg3);border-bottom:1px solid var(--border);font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--text2);white-space:nowrap;';
  return '<div class="page-header"><div><div class="page-title">IP Tunnels</div>'+
    '<div class="page-subtitle">Client tunnel endpoints &mdash; '+db.tunnels.length+' total</div></div>'+
    '<div class="header-actions">'+addBtn+'</div></div>'+
    '<div class="toolbar"><div class="search-box"><input type="text" id="gs" placeholder="Search client, IP, interface… (live)" value="'+escAttr(currentSearch)+'" oninput="currentSearch=this.value;currentTunnelPage=1;renderAndFocus(\'gs\');"></div></div>'+
    '<div class="table-wrap"><div class="table-info"><span>'+infoRow+'</span></div>'+
    '<table style="width:100%"><thead><tr>'+
    '<th style="min-width:110px;'+thBase+'"><span class="th-label">Client ID</span><input class="col-filter" id="cf-tun-cid" placeholder="filter…" value="'+escAttr(cfCID)+'" oninput="currentColFilters.tunCid=this.value;currentTunnelPage=1;renderAndFocus(\'cf-tun-cid\');"></th>'+
    '<th style="min-width:160px;'+thBase+'"><span class="th-label">Client Name</span><input class="col-filter" id="cf-tun-name" placeholder="filter…" value="'+escAttr(cfName)+'" oninput="currentColFilters.tunName=this.value;currentTunnelPage=1;renderAndFocus(\'cf-tun-name\');"></th>'+
    '<th style="min-width:130px;'+thBase+'"><span class="th-label">Local IP (Our Side)</span><input class="col-filter" id="cf-tun-local" placeholder="filter…" value="'+escAttr(cfLocal)+'" oninput="currentColFilters.tunLocal=this.value;currentTunnelPage=1;renderAndFocus(\'cf-tun-local\');"></th>'+
    '<th style="min-width:130px;'+thBase+'"><span class="th-label">Remote IP (Client)</span><input class="col-filter" id="cf-tun-remote" placeholder="filter…" value="'+escAttr(cfRemote)+'" oninput="currentColFilters.tunRemote=this.value;currentTunnelPage=1;renderAndFocus(\'cf-tun-remote\');"></th>'+
    '<th style="min-width:120px;'+thBase+'"><span class="th-label">Interface</span><input class="col-filter" id="cf-tun-iface" placeholder="filter…" value="'+escAttr(cfIface)+'" oninput="currentColFilters.tunIface=this.value;currentTunnelPage=1;renderAndFocus(\'cf-tun-iface\');"></th>'+
    '<th style="'+thBase+'"><span class="th-label">Description</span></th>'+
    '<th style="'+thBase+'"></th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>'+pager;
};
})();

// ── Paginated renderVPN override ──────────────────────────────
(function(){
window.renderVPN_paginated = function(){
  currentVpnPage = currentVpnPage || 1;
  var cfCID  = currentColFilters.vpnCid||'';
  var cfName = currentColFilters.vpnName||'';
  var cfType = currentColFilters.vpnType||'';
  var cfIP   = currentColFilters.vpnIP||'';
  var cfUser = currentColFilters.vpnUser||'';

  var f = db.vpn;
  if(currentFilter!=='all')f=f.filter(function(r){return String(r.vpn_type||'').toUpperCase()===String(currentFilter).toUpperCase();});
  if(currentSearch){var q=currentSearch.toLowerCase();f=f.filter(function(r){return[r.client_id,r.client_name,r.vpn_type,r.vpn_ip,r.vpn_username,r.description].some(function(v){return String(v||'').toLowerCase().includes(q);});});}
  if(cfCID) f=f.filter(function(r){return String(r.client_id||'').toLowerCase().includes(cfCID.toLowerCase());});
  if(cfName)f=f.filter(function(r){return String(r.client_name||'').toLowerCase().includes(cfName.toLowerCase());});
  if(cfType)f=f.filter(function(r){return String(r.vpn_type||'').toLowerCase().includes(cfType.toLowerCase());});
  if(cfIP)  f=f.filter(function(r){return String(r.vpn_ip||'').toLowerCase().includes(cfIP.toLowerCase());});
  if(cfUser)f=f.filter(function(r){return String(r.vpn_username||'').toLowerCase().includes(cfUser.toLowerCase());});

  var total=f.length, totalPages=Math.max(1,Math.ceil(total/VPN_PAGE_SIZE));
  if(currentVpnPage>totalPages)currentVpnPage=totalPages;
  var paged=f.slice((currentVpnPage-1)*VPN_PAGE_SIZE, currentVpnPage*VPN_PAGE_SIZE);

  var DASH='<span style="color:var(--text3)">&#8212;</span>';
  var typeColors={'PPTP':'badge-red','L2TP':'badge-orange','SSTP':'badge-purple','IPSEC':'badge-teal','OPENVPN':'badge-green','WIREGUARD':'badge-blue'};

  var rows=paged.map(function(r){
    var idx=db.vpn.indexOf(r);
    var act=(can('editVpn')?'<button class="action-btn edit" onclick="editVpnRow('+idx+')">&#9999;&#65039;</button>':'')+
            (can('deleteVpn')?'<button class="action-btn del" onclick="deleteVpnRow('+idx+')">&#128465;&#65039;</button>':'');
    var typeClass=typeColors[String(r.vpn_type||'').toUpperCase()]||'badge-blue';
    var typeCell=r.vpn_type?'<span class="badge '+typeClass+'">'+escHtml(r.vpn_type)+'</span>':DASH;
    var ipCell=r.vpn_ip?'<span class="ip-chip">'+escHtml(r.vpn_ip)+'</span>':DASH;
    var pwCell=r.vpn_password?'<span style="letter-spacing:2px;color:var(--text3)">&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;</span>':DASH;
    return '<tr>'+
      '<td style="color:var(--accent);font-weight:600">'+escHtml(r.client_id||'')+'</td>'+
      '<td><b>'+escHtml(r.client_name||'')+'</b></td>'+
      '<td>'+typeCell+'</td>'+
      '<td>'+ipCell+'</td>'+
      '<td style="color:var(--text2)">'+escHtml(r.vpn_username||'')+'</td>'+
      '<td>'+pwCell+'</td>'+
      '<td style="color:var(--text3);font-size:11px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escAttr(r.description||'')+'">'+escHtml(r.description||'')+'</td>'+
      '<td style="white-space:nowrap">'+act+'</td>'+
      '</tr>';
  }).join('');

  if(!rows)rows='<tr><td colspan="8"><div class="empty-state"><div class="icon">&#128274;</div><p>No VPN entries yet</p></div></td></tr>';

  var pager='';
  if(totalPages>1){
    var s=Math.max(1,currentVpnPage-3),e=Math.min(totalPages,s+6),btns='';
    if(s>1)btns+='<button class="page-btn" onclick="currentVpnPage=1;render()">1</button><span class="page-info">&hellip;</span>';
    for(var i=s;i<=e;i++)btns+='<button class="page-btn '+(i===currentVpnPage?'active':'')+'" onclick="currentVpnPage='+i+';render()">'+i+'</button>';
    if(e<totalPages)btns+='<span class="page-info">&hellip;</span><button class="page-btn" onclick="currentVpnPage='+totalPages+';render()">'+totalPages+'</button>';
    pager='<div class="pagination" style="padding:12px 0">'+
      '<button class="page-btn" onclick="currentVpnPage=Math.max(1,currentVpnPage-1);render()">&lsaquo;</button>'+btns+
      '<button class="page-btn" onclick="currentVpnPage=Math.min('+totalPages+',currentVpnPage+1);render()">&rsaquo;</button></div>';
  }

  // Build type filter buttons
  var typeCounts={};
  db.vpn.forEach(function(r){var t=String(r.vpn_type||'').toUpperCase();typeCounts[t]=(typeCounts[t]||0)+1;});
  var typeFilters='<span class="filter-chip'+(currentFilter==='all'?' active':'')+'" onclick="currentFilter=\'all\';currentVpnPage=1;render()">All ('+db.vpn.length+')</span>';
  Object.keys(typeCounts).sort().forEach(function(t){
    typeFilters+='<span class="filter-chip'+(currentFilter===t?' active':'')+'" onclick="currentFilter=\''+t+'\';currentVpnPage=1;render()">'+t+' ('+typeCounts[t]+')</span>';
  });

  var addBtn=can('addVpn')?'<button class="btn btn-primary" onclick="addVpnRow()">&#xFF0B; Add VPN</button>':'<span class="badge badge-viewer">&#128065; View Only</span>';
  var infoRow='Page '+currentVpnPage+'/'+totalPages+' &middot; Showing '+paged.length+' of '+total+' VPN'+(total!==1?'s':'');

  var thBase='padding:8px 10px;text-align:left;background:var(--bg3);border-bottom:1px solid var(--border);font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--text2);white-space:nowrap;';
  return '<div class="page-header"><div><div class="page-title">VPN</div>'+
    '<div class="page-subtitle">Client VPN configurations &mdash; '+db.vpn.length+' total</div></div>'+
    '<div class="header-actions">'+addBtn+'</div></div>'+
    '<div class="toolbar"><div class="search-box"><input type="text" id="gs" placeholder="Search client, IP, type, username… (live)" value="'+escAttr(currentSearch)+'" oninput="currentSearch=this.value;currentVpnPage=1;renderAndFocus(\'gs\');"></div>'+
    '<div class="filter-tabs">'+typeFilters+'</div></div>'+
    '<div class="table-info"><span>'+infoRow+'</span></div>'+
    '<div class="table-wrap"><table style="width:100%"><thead><tr>'+
    '<th style="min-width:110px;'+thBase+'"><span class="th-label">Client ID</span><input class="col-filter" id="cf-vpn-cid" placeholder="filter…" value="'+escAttr(cfCID)+'" oninput="currentColFilters.vpnCid=this.value;currentVpnPage=1;renderAndFocus(\'cf-vpn-cid\');"></th>'+
    '<th style="min-width:150px;'+thBase+'"><span class="th-label">Client Name</span><input class="col-filter" id="cf-vpn-name" placeholder="filter…" value="'+escAttr(cfName)+'" oninput="currentColFilters.vpnName=this.value;currentVpnPage=1;renderAndFocus(\'cf-vpn-name\');"></th>'+
    '<th style="min-width:100px;'+thBase+'"><span class="th-label">VPN Type</span><input class="col-filter" id="cf-vpn-type" placeholder="filter…" value="'+escAttr(cfType)+'" oninput="currentColFilters.vpnType=this.value;currentVpnPage=1;renderAndFocus(\'cf-vpn-type\');"></th>'+
    '<th style="min-width:140px;'+thBase+'"><span class="th-label">VPN IP</span><input class="col-filter" id="cf-vpn-ip" placeholder="filter…" value="'+escAttr(cfIP)+'" oninput="currentColFilters.vpnIP=this.value;currentVpnPage=1;renderAndFocus(\'cf-vpn-ip\');"></th>'+
    '<th style="min-width:120px;'+thBase+'"><span class="th-label">Username</span><input class="col-filter" id="cf-vpn-user" placeholder="filter…" value="'+escAttr(cfUser)+'" oninput="currentColFilters.vpnUser=this.value;currentVpnPage=1;renderAndFocus(\'cf-vpn-user\');"></th>'+
    '<th style="'+thBase+'"><span class="th-label">Password</span></th>'+
    '<th style="'+thBase+'"><span class="th-label">Description</span></th>'+
    '<th style="'+thBase+'"></th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>'+pager;
};

// Hook into render()
var _rTunVpn = window.render;
window.render = function(){
  _rTunVpn();
  var c=document.getElementById('main-content'); if(!c) return;
  if(currentPage==='tunnels'){c.innerHTML=window.renderTunnels();updateTopStats();return;}
  if(currentPage==='vpn'){c.innerHTML=window.renderVPN_paginated();updateTopStats();return;}
};
})();


// ── Confirm Delete Modal ────────────────────────────────────
window.confirmDelete = function(message, onConfirm, title) {
  title = title || '🗑️ Confirm Delete';
  var bodyHtml = '<div style="padding:8px 0 4px;font-size:14px;line-height:1.6">' + message + '</div>';
  openModal(title, bodyHtml,
    '<button class="btn" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-danger" style="margin-left:8px" onclick="closeModal();setTimeout(onConfirm,50)" id="confirm-yes-btn">Yes, Delete</button>'
  );
  // Store callback so the button can call it
  window._pendingConfirm = onConfirm;
  document.getElementById('confirm-yes-btn') && (document.getElementById('confirm-yes-btn').onclick = function(){ closeModal(); setTimeout(window._pendingConfirm, 50); });
};

// ── Sign Out Confirmation ─────────────────────────────────────
window.confirmSignOut = function() {
  openModal('Sign Out',
    '<div style="padding:8px 0;font-size:14px">Are you sure you want to sign out?</div>',
    '<button class="btn" onclick="closeModal()">Cancel</button>' +
    '<button class="btn btn-danger" style="margin-left:8px" onclick="closeModal();doLogout();">Sign Out</button>'
  );
};

console.log('%c✓ EB IP Manager v14 WAN+Search patch loaded','color:#00b4d8;font-weight:bold');

// ── Silent background refresh every 30s ─────────────────────
function doSilentRefresh(){
  if(!session)return;
  // Fetch without triggering the freeze overlay (don't call setSyncing)
  fetch(API_URL,{method:'POST',body:JSON.stringify({action:'getAll',user:session.username,password:session.password,payload:{}})}).then(function(r){return r.json();}).then(function(dataRes){
    if(!dataRes.ok)return;
    db.subnets=dataRes.data.subnets||db.subnets;
    db.internalSubnets=dataRes.data.internalSubnets||db.internalSubnets;
    db.wan=dataRes.data.wan||db.wan;
    db.tunnels=dataRes.data.tunnels||db.tunnels;
    db.vpn=dataRes.data.vpn||db.vpn;
    db.vlans=(dataRes.data.vlans||db.vlans).slice().sort(function(a,b){return parseInt(a.vlan_id,10)-parseInt(b.vlan_id,10);});
    db.vlanCdnList=dataRes.data.vlanCdnList||db.vlanCdnList;
    db.dspList=(dataRes.data.dspList&&dataRes.data.dspList.length)?dataRes.data.dspList:db.dspList;
    buildSidebarNav();
    if(currentPage!=='search' && currentPage!=='users')render();
    updateTopStats();
  }).catch(function(){});
  // Also refresh credentials silently
  if(window.loadCredentials) window.loadCredentials(true).then(function(){
    if(currentPage==='credentials'){var c=document.getElementById('main-content');if(c)c.innerHTML=window.renderCredentials();}
  });
}
// Start bg refresh timer after login — 30s interval
var _bgRefreshTimer=null;
var _origShowApp3=window.showApp;
window.showApp=function(){
  _origShowApp3();
  if(_bgRefreshTimer)clearInterval(_bgRefreshTimer);
  _bgRefreshTimer=setInterval(doSilentRefresh,30000);
  var expBtn=document.getElementById('topbar-export-btn');
  if(expBtn)expBtn.style.display=can('exportExcel')?'inline-flex':'none';
  // Show export button only if user has permission
  var expBtn=document.getElementById('topbar-export-btn');
  if(expBtn)expBtn.style.display=can('exportExcel')?'inline-flex':'none';
  // Load credentials on login
  setTimeout(function(){
    if(window.loadCredentials) window.loadCredentials(false).then(function(){
      updateTopStats(); // update badge after credentials load
    });
  },500);
  // Show export button only if user has permission
  var expBtn=document.getElementById('topbar-export-btn');
  if(expBtn)expBtn.style.display=can('exportExcel')?'inline-flex':'none';
};
// Also add manual refresh button logic
window.doManualRefresh=function(){
  var btn=document.getElementById('topbar-refresh-btn');
  if(btn){btn.style.animation='spin 0.5s linear';setTimeout(function(){btn.style.animation='';},600);}
  doSilentRefresh();
  window.loadCredentials && window.loadCredentials();
  toast('🔄 Refreshed','success');
};

// ── Credentials + Visibility Patch ──
// ════════════════════════════════════════════════════════════
// EB IP Manager V14 — Credentials + Section Visibility Patch
// ════════════════════════════════════════════════════════════
(function(){

// ── Wait for core globals ────────────────────────────────────
if(typeof DEFAULT_PERMISSIONS === 'undefined'){
  console.warn('patch.js: DEFAULT_PERMISSIONS not ready');
  window.addEventListener('load', function(){
    if(typeof DEFAULT_PERMISSIONS !== 'undefined'){
      console.log('patch.js: permissions ready');
    }
  });
}

if(typeof PERM_LABELS === 'undefined'){
  console.warn('patch.js: PERM_LABELS not ready');
}


// ── Section visibility permission keys ──────────────────────
var SECTION_VISIBILITY_KEYS = [
  'seeDashboard','seeRealIP','seeFakeIP','seeWan',
  'seeVlan','seeTunnels','seeVpn','seeSearch',
  'seeDsp','seeCredentials','seeUsers'
];

var SECTION_VISIBILITY_LABELS = {
  seeDashboard:'Dashboard',
  seeRealIP:'Real IP Subnets',
  seeFakeIP:'Internal (Fake IP)',
  seeWan:'WAN Solutions',
  seeVlan:'VLAN Tracking',
  seeTunnels:'IP Tunnels',
  seeVpn:'VPN',
  seeSearch:'Client Search',
  seeDsp:'DSP Providers',
  seeCredentials:'Credentials',
  seeUsers:'Users'
};


// ── Add visibility keys safely ───────────────────────────────
if(typeof DEFAULT_PERMISSIONS !== 'undefined'){

  Object.keys(DEFAULT_PERMISSIONS).forEach(function(role){

    SECTION_VISIBILITY_KEYS.forEach(function(k){

      if(DEFAULT_PERMISSIONS[role][k]===undefined){
        DEFAULT_PERMISSIONS[role][k]=(role==='admin');
      }

    });

  });


  if(DEFAULT_PERMISSIONS.admin){

    SECTION_VISIBILITY_KEYS.forEach(function(k){
      DEFAULT_PERMISSIONS.admin[k]=true;
    });

  }

}

// ── Section visibility permission keys ──────────────────────
var SECTION_VISIBILITY_KEYS = [
  'seeDashboard','seeRealIP','seeFakeIP','seeWan',
  'seeVlan','seeTunnels','seeVpn','seeSearch','seeDsp','seeCredentials','seeUsers'
];
var SECTION_VISIBILITY_LABELS = {
  seeDashboard:  'Dashboard',
  seeRealIP:     'Real IP Subnets',
  seeFakeIP:     'Internal (Fake IP)',
  seeWan:        'WAN Solutions',
  seeVlan:       'VLAN Tracking',
  seeTunnels:    'IP Tunnels',
  seeVpn:        'VPN',
  seeSearch:     'Client Search',
  seeDsp:        'DSP Providers',
  seeCredentials:'Credentials'
};

// ── Add visibility keys to DEFAULT_PERMISSIONS ───────────────
// Admin always sees everything
Object.keys(DEFAULT_PERMISSIONS).forEach(function(role){
  SECTION_VISIBILITY_KEYS.forEach(function(k){
    if(DEFAULT_PERMISSIONS[role][k]===undefined){
      DEFAULT_PERMISSIONS[role][k] = (role==='admin');
    }
  });
});
// Admin: force all true
SECTION_VISIBILITY_KEYS.forEach(function(k){
  DEFAULT_PERMISSIONS.admin[k]=true;
});

// ── can() already handles perms — visibility check helper ────
window.canSee=function(section){

  if(typeof session==='undefined' || !session){
    return false;
  }

  if(session.role==='admin'){
    return true;
  }


  var p=session.perms||{};


  if(p[section]===undefined){

    if(typeof DEFAULT_PERMISSIONS!=='undefined' &&
       DEFAULT_PERMISSIONS[session.role]){

      return DEFAULT_PERMISSIONS[session.role][section]!==false;

    }

    return false;
  }


  return !!p[section];

};

// ── Sidebar visibility — hide sections user can't see ────────
var _origBuildSidebar = window.buildSidebarNav || buildSidebarNav;
window.buildSidebarNav = function(){

  _origBuildSidebar();


  // Map: sidebar section label → permission key
  var sectionMap = {

    'Real IP Subnets':    'seeRealIP',
    'Internal (Fake IP)': 'seeFakeIP',
    'WAN':                'seeWan',
    'DSP Providers':      'seeDsp',
    'Credentials':        'seeCredentials'

  };


  // Map: nav item id → permission key
  var navMap = {

    'nav-dashboard':   'seeDashboard',
    'nav-vlan':        'seeVlan',
    'nav-tunnels':     'seeTunnels',
    'nav-vpn':         'seeVpn',
    'nav-search':      'seeSearch',
    'nav-dsp':         'seeDsp',
    'nav-credentials': 'seeCredentials',
    'nav-clients':     'seeClients'

  };


  // User Permissions
  var uw2 = document.getElementById('nav-users-wrap');

  if(uw2){

    uw2.style.display =
      (can('manageUsers') || canSee('seeUsers'))
      ? 'block'
      : 'none';

  }



  // Hide/show individual nav items
  Object.keys(navMap).forEach(function(navId){

    var el = document.getElementById(navId);

    if(el){

      el.style.display =
        canSee(navMap[navId])
        ? ''
        : 'none';

    }

  });



  // Hide/show sidebar sections
  document.querySelectorAll('.sidebar-section')
  .forEach(function(sec){

    var label = sec.querySelector('.sidebar-label');

    if(!label) return;


    var txt = label.textContent.trim();

    var permKey = sectionMap[txt];


    if(permKey){

      sec.style.display =
        canSee(permKey)
        ? ''
        : 'none';

    }

  });



  // Network Services section
  document.querySelectorAll('.sidebar-section')
  .forEach(function(sec){

    var label = sec.querySelector('.sidebar-label');

    if(!label ||
       label.textContent.trim() !== 'Network Services')
       return;


    var anyVisible =
      canSee('seeVlan') ||
      canSee('seeTunnels') ||
      canSee('seeVpn');


    sec.style.display =
      anyVisible ? '' : 'none';

  });



  // Tools section
  // Show if Search OR DSP OR Clients are visible
  document.querySelectorAll('.sidebar-section')
  .forEach(function(sec){

    var label = sec.querySelector('.sidebar-label');

    if(!label ||
       label.textContent.trim() !== 'Tools')
       return;


    var anyTools =
      canSee('seeSearch') ||
      canSee('seeDsp') ||
      canSee('seeClients');


    sec.style.display =
      anyTools ? '' : 'none';

  });



  // Update badges
  var clb = document.getElementById('badge-clients');

  if(clb){

    clb.textContent =
      db.clients ? db.clients.length : 0;

  }


};

// ── showPage guard — redirect if no visibility permission ────
var _spOrig2 = window.showPage;
window.showPage = function(page, param){
  var pagePermMap = {
    'dashboard':'seeDashboard','subnet':'seeRealIP','internal':'seeFakeIP',
    'wan':'seeWan','vlan':'seeVlan','tunnels':'seeTunnels',
    'vpn':'seeVpn','search':'seeSearch','credentials':'seeCredentials','users':'seeUsers'
  };
  var permKey = pagePermMap[page];
  if(permKey && !canSee(permKey) && session && session.role!=='admin'){
    _spOrig2('dashboard', null);
    toast('⛔ You do not have access to this section','error');
    return;
  }
  _spOrig2(page, param);
};

// ── Credentials data ─────────────────────────────────────────
window.db = window.db || {};
db.credentials = db.credentials || [];
db.credNodeTypes = db.credNodeTypes || ['vCenter','ESXI','Proxmox','Switch','Router','Firewall','ILO','iDRAC','Windows Server','Linux Server','NAS','Storage','Other'];
db.credCategories = db.credCategories || ['Server','Network','Storage','Security','Other'];

// ── Load credentials from getAll ─────────────────────────────
var _origLoadAll = window.loadAllData;
// We hook into the getAll response to pick up credentials
// The getAll response includes credentials if backend supports it
// For now we load separately
window.loadCredentials = async function(silent){
  var res;
  if(silent){
    // Silent fetch — no freeze overlay
    try{
      var r=await fetch(API_URL,{method:'POST',body:JSON.stringify({action:'getCredentials',user:session.username,password:session.password,payload:{}})});
      res=await r.json();
    }catch(e){return;}
  } else {
    res = await api('getCredentials',{});
  }
  if(res && res.ok && res.data){
    db.credentials = res.data;
    db.credNodeTypes = res.nodeTypes || db.credNodeTypes;
    db.credCategories = res.categories || db.credCategories;
  }
};

// ── renderCredentials ────────────────────────────────────────
window.renderCredentials = function(){
  if(!canSee('seeCredentials')){
    return '<div class="empty-state"><div class="icon">&#128274;</div><p>Access denied</p></div>';
  }

  var cfSearch = currentSearch||'';
  var cfCat = currentFilter==='all'?'':currentFilter;
  // Column filters
  var cfSubnet = currentColFilters.crSubnet||'';
  var cfGateway= currentColFilters.crGateway||'';
  var cfVlan   = currentColFilters.crVlan||'';
  var cfNetDesc= currentColFilters.crNetDesc||'';
  var cfIP     = currentColFilters.crIP||'';
  var cfNode   = currentColFilters.crNode||'';
  var cfDevDesc= currentColFilters.crDevDesc||'';
  var cfUsername=currentColFilters.crUsername||'';
  var cfUrl    = currentColFilters.crUrl||'';

  var f = db.credentials;
  if(cfSearch){
    var q=cfSearch.toLowerCase();
    f=f.filter(function(r){
      return [r.subnet,r.gateway,r.vlan,r.net_desc,r.ip_address,r.node_type,
              r.device_desc,r.username,r.login_url,r.additional,r.category]
        .some(function(v){return String(v||'').toLowerCase().includes(q);});
    });
  }
  if(cfCat)    f=f.filter(function(r){return String(r.category||'')===cfCat;});
  if(cfSubnet) f=f.filter(function(r){return String(r.subnet||'').toLowerCase().includes(cfSubnet.toLowerCase());});
  if(cfGateway)f=f.filter(function(r){return String(r.gateway||'').toLowerCase().includes(cfGateway.toLowerCase());});
  if(cfVlan)   f=f.filter(function(r){return String(r.vlan||'').toLowerCase().includes(cfVlan.toLowerCase());});
  if(cfNetDesc)f=f.filter(function(r){return String(r.net_desc||'').toLowerCase().includes(cfNetDesc.toLowerCase());});
  if(cfIP)     f=f.filter(function(r){return String(r.ip_address||'').toLowerCase().includes(cfIP.toLowerCase());});
  if(cfNode)   f=f.filter(function(r){return String(r.node_type||'').toLowerCase().includes(cfNode.toLowerCase());});
  if(cfDevDesc)f=f.filter(function(r){return String(r.device_desc||'').toLowerCase().includes(cfDevDesc.toLowerCase());});
  if(cfUsername)f=f.filter(function(r){return String(r.username||'').toLowerCase().includes(cfUsername.toLowerCase());});
  if(cfUrl)    f=f.filter(function(r){return String(r.login_url||'').toLowerCase().includes(cfUrl.toLowerCase());});

  var DASH='<span style="color:var(--text3)">&#8212;</span>';

  // Category filter chips
  var catCounts={};
  db.credentials.forEach(function(r){var c=r.category||'Other';catCounts[c]=(catCounts[c]||0)+1;});
  var catChips='<span class="filter-chip'+(currentFilter==='all'?' active':'')+'" onclick="currentFilter=\'all\';render()">All ('+db.credentials.length+')</span>';
  db.credCategories.forEach(function(c){
    if(catCounts[c]){
      catChips+='<span class="filter-chip'+(currentFilter===c?' active':'')+'" onclick="currentFilter=\''+escAttr(c)+'\';render()">'+escHtml(c)+' ('+catCounts[c]+')</span>';
    }
  });

  // Table rows
  // Pagination
  currentCredPage = currentCredPage || 1;
  var totalCred = f.length;
  var totalCredPages = Math.max(1,Math.ceil(totalCred/CRED_PAGE_SIZE));
  if(currentCredPage>totalCredPages)currentCredPage=totalCredPages;
  var pagedCreds=f.slice((currentCredPage-1)*CRED_PAGE_SIZE,currentCredPage*CRED_PAGE_SIZE);
  var rows = pagedCreds.map(function(r,i){
    var realIdx = db.credentials.indexOf(r);
    var pwId = 'cred-pw-'+realIdx;
    var nodeColor = {vCenter:'badge-purple',ESXI:'badge-teal',Proxmox:'badge-green',Switch:'badge-blue',
      Router:'badge-orange',Firewall:'badge-red',ILO:'badge-yellow',iDRAC:'badge-yellow',
      'Windows Server':'badge-blue','Linux Server':'badge-teal',NAS:'badge-orange',Storage:'badge-purple',Other:'badge-viewer'}
    var nodeClass = nodeColor[r.node_type]||'badge-viewer';
    var nodeCell = r.node_type?'<span class="badge '+nodeClass+'">'+escHtml(r.node_type)+'</span>':DASH;
    var loginCell = r.login_url?'<a href="'+escAttr(r.login_url)+'" target="_blank" style="color:var(--accent);font-size:11px;font-family:IBM Plex Mono,monospace">'+escHtml(r.login_url)+'</a>':DASH;
    var pwCell = r.password
      ? '<div style="display:flex;align-items:center;gap:4px">'+
        '<span id="'+pwId+'" style="font-family:IBM Plex Mono,monospace;font-size:12px;letter-spacing:2px;color:var(--text3)">••••••</span>'+
        '<button class="action-btn" title="Show/hide" onclick="toggleCredPw(\''+pwId+'\',\''+escAttr(r.password)+'\')">'+
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'+
        '</button>'+
        '<button class="action-btn" title="Copy password" onclick="copyCredPw(\''+escAttr(r.password)+'\')">'+
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'+
        '</button></div>'
      : DASH;
    var act = (can('editCredentials')?'<button class="action-btn edit" onclick="editCredRow('+realIdx+')">&#9999;&#65039;</button>':'')+
              (can('deleteCredentials')?'<button class="action-btn del" onclick="deleteCredRow('+realIdx+')">&#128465;&#65039;</button>':'');
    return '<tr>'+
      '<td style="font-size:11px;font-family:IBM Plex Mono,monospace;color:var(--text2)">'+escHtml(r.subnet||'')+'</td>'+
      '<td style="font-size:11px;font-family:IBM Plex Mono,monospace">'+escHtml(r.gateway||'')+'</td>'+
      '<td>'+(r.vlan?'<span class="badge badge-yellow">'+escHtml(r.vlan)+'</span>':DASH)+'</td>'+
      '<td style="font-size:11px;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escAttr(r.net_desc||'')+'">'+escHtml(r.net_desc||'')+'</td>'+
      '<td><span class="ip-chip">'+escHtml(r.ip_address||'')+'</span></td>'+
      '<td>'+nodeCell+'</td>'+
      '<td style="font-size:11px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escAttr(r.device_desc||'')+'">'+escHtml(r.device_desc||'')+'</td>'+
      '<td style="font-size:11px;color:var(--text2)">'+escHtml(r.username||'')+'</td>'+
      '<td>'+pwCell+'</td>'+
      '<td>'+loginCell+'</td>'+
      '<td style="font-size:11px;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+escAttr(r.additional||'')+'">'+escHtml(r.additional||'')+'</td>'+
      '<td style="white-space:nowrap">'+act+'</td>'+
      '</tr>';
  }).join('');

  if(!rows) rows='<tr><td colspan="12"><div class="empty-state"><div class="icon">&#128273;</div><p>No credentials yet</p></div></td></tr>';
  var credPager='';
  if(totalCredPages>1){
    var btns='',s=Math.max(1,currentCredPage-3),e=Math.min(totalCredPages,s+6);
    if(s>1)btns+='<button class="page-btn" onclick="currentCredPage=1;render()">1</button><span class="page-info">&hellip;</span>';
    for(var i=s;i<=e;i++)btns+='<button class="page-btn '+(i===currentCredPage?'active':'')+'\'" onclick="currentCredPage='+i+';render()">'+i+'</button>';
    if(e<totalCredPages)btns+='<span class="page-info">&hellip;</span><button class="page-btn" onclick="currentCredPage='+totalCredPages+';render()">'+totalCredPages+'</button>';
    credPager='<div class="pagination" style="padding:12px 0">'
      +'<button class="page-btn" onclick="currentCredPage=Math.max(1,currentCredPage-1);render()">&lsaquo;</button>'+btns
      +'<button class="page-btn" onclick="currentCredPage=Math.min('+totalCredPages+',currentCredPage+1);render()">&rsaquo;</button></div>';
  }

  var addBtn = can('addCredentials')
    ? '<button class="btn btn-primary" onclick="addCredRow()">&#xFF0B; Add Credential</button>':'';
  var manageBtn = can('addCredentials')
    ? '<button class="btn" onclick="openCredNodeManager()" style="margin-left:8px">⚙️ Node Types</button>'+
      '<button class="btn" onclick="openCredCatManager()" style="margin-left:6px">⚙️ Categories</button>':''  ;

  var thBase='padding:8px 10px;text-align:left;background:var(--bg3);border-bottom:1px solid var(--border);font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--text2);white-space:nowrap;';

  return '<div class="page-header"><div><div class="page-title">&#128273; Credentials</div>'+
    '<div class="page-subtitle">Device credentials &mdash; '+db.credentials.length+' total &middot; Page '+currentCredPage+'/'+totalCredPages+'</div></div>'+
    '<div class="header-actions">'+addBtn+manageBtn+'</div></div>'+
    '<div class="toolbar"><div class="search-box"><input type="text" id="gs" placeholder="Search IP, device, username… (live)" value="'+escAttr(currentSearch)+'" oninput="currentSearch=this.value;renderAndFocus(\'gs\');"></div>'+
    '<div class="filter-tabs">'+catChips+'</div></div>'+
    '<div class="table-wrap" style="overflow-x:auto"><table style="width:100%;min-width:1100px"><thead><tr>'+
    '<th style="'+thBase+'"><span class="th-label">Subnet</span><input class="col-filter" id="cf-cr-subnet" placeholder="filter…" value="'+escAttr(cfSubnet)+'" oninput="currentColFilters.crSubnet=this.value;cfSubnet=this.value;currentCredPage=1;renderAndFocus(\'cf-cr-subnet\');"></th>'+
    '<th style="'+thBase+'"><span class="th-label">Gateway</span><input class="col-filter" id="cf-cr-gw" placeholder="filter…" value="'+escAttr(cfGateway)+'" oninput="currentColFilters.crGateway=this.value;cfGateway=this.value;currentCredPage=1;renderAndFocus(\'cf-cr-gw\');"></th>'+
    '<th style="'+thBase+'"><span class="th-label">VLAN</span><input class="col-filter" id="cf-cr-vlan" placeholder="filter…" value="'+escAttr(cfVlan)+'" oninput="currentColFilters.crVlan=this.value;cfVlan=this.value;currentCredPage=1;renderAndFocus(\'cf-cr-vlan\');"></th>'+
    '<th style="'+thBase+'"><span class="th-label">Net Desc</span><input class="col-filter" id="cf-cr-nd" placeholder="filter…" value="'+escAttr(cfNetDesc)+'" oninput="currentColFilters.crNetDesc=this.value;cfNetDesc=this.value;currentCredPage=1;renderAndFocus(\'cf-cr-nd\');"></th>'+
    '<th style="'+thBase+'"><span class="th-label">IP Address</span><input class="col-filter" id="cf-cr-ip" placeholder="filter…" value="'+escAttr(cfIP)+'" oninput="currentColFilters.crIP=this.value;cfIP=this.value;currentCredPage=1;renderAndFocus(\'cf-cr-ip\');"></th>'+
    '<th style="'+thBase+'"><span class="th-label">Node Type</span><input class="col-filter" id="cf-cr-node" placeholder="filter…" value="'+escAttr(cfNode)+'" oninput="currentColFilters.crNode=this.value;cfNode=this.value;currentCredPage=1;renderAndFocus(\'cf-cr-node\');"></th>'+
    '<th style="'+thBase+'"><span class="th-label">Device Desc</span><input class="col-filter" id="cf-cr-dd" placeholder="filter…" value="'+escAttr(cfDevDesc)+'" oninput="currentColFilters.crDevDesc=this.value;cfDevDesc=this.value;currentCredPage=1;renderAndFocus(\'cf-cr-dd\');"></th>'+
    '<th style="'+thBase+'"><span class="th-label">Username</span><input class="col-filter" id="cf-cr-user" placeholder="filter…" value="'+escAttr(cfUsername)+'" oninput="currentColFilters.crUsername=this.value;cfUsername=this.value;currentCredPage=1;renderAndFocus(\'cf-cr-user\');"></th>'+
    '<th style="'+thBase+'">Password</th>'+
    '<th style="'+thBase+'"><span class="th-label">Login URL</span><input class="col-filter" id="cf-cr-url" placeholder="filter…" value="'+escAttr(cfUrl)+'" oninput="currentColFilters.crUrl=this.value;cfUrl=this.value;currentCredPage=1;renderAndFocus(\'cf-cr-url\');"></th>'+
    '<th style="'+thBase+'">Additional</th>'+
    '<th style="'+thBase+'"></th>'+
    '</tr></thead><tbody>'+rows+'</tbody></table></div>'+credPager;
};

// ── Password reveal/copy helpers ─────────────────────────────
window.toggleCredPw = function(elId, pw){
  var el=document.getElementById(elId);
  if(!el) return;
  if(el.textContent==='••••••'){el.textContent=pw;el.style.color='var(--accent)';}
  else{el.textContent='••••••';el.style.color='var(--text3)';}
};
window.copyCredPw = function(pw){
  navigator.clipboard.writeText(pw).then(function(){toast('✓ Password copied','success');});
};

// ── Credential form ───────────────────────────────────────────
function credForm(r){
  r=r||{};
  var nodeOpts=db.credNodeTypes.map(function(n){
    return '<option value="'+escAttr(n)+'"'+(r.node_type===n?' selected':'')+'>'+escHtml(n)+'</option>';
  }).join('');
  var catOpts=db.credCategories.map(function(c){
    return '<option value="'+escAttr(c)+'"'+(r.category===c?' selected':'')+'>'+escHtml(c)+'</option>';
  }).join('');
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
    '<div class="form-row"><label>Subnet</label><input type="text" id="fc_subnet" value="'+escAttr(r.subnet||'')+'" placeholder="e.g. 10.249.128.0/27" oninput="validateVlanIPInput(this)"></div>'+
    '<div class="form-row"><label>Gateway</label><input type="text" id="fc_gateway" value="'+escAttr(r.gateway||'')+'" placeholder="e.g. 10.249.0.129" oninput="validateIPInput(this)"></div>'+
    '<div class="form-row"><label>VLAN ID</label><input type="text" id="fc_vlan" value="'+escAttr(r.vlan||'')+'" placeholder="e.g. 32" oninput="this.value=this.value.replace(/[^0-9]/g,\'\')" maxlength="4"></div>'+
    '<div class="form-row"><label>Category</label><select id="fc_category"><option value="">— None —</option>'+catOpts+'</select></div>'+
    '</div>'+
    '<div class="form-row"><label>Network Description</label><input type="text" id="fc_net_desc" value="'+escAttr(r.net_desc||'')+'" placeholder="e.g. Hyper-V, ESXI, ILO, iDRAC"></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
    '<div class="form-row"><label>IP Address <span style="color:var(--red)">*</span></label><input type="text" id="fc_ip" value="'+escAttr(r.ip_address||'')+'" placeholder="e.g. 10.249.0.135" oninput="validateVlanIPInput(this)"></div>'+
    '<div class="form-row"><label>Node Type</label><select id="fc_node_type"><option value="">— None —</option>'+nodeOpts+'</select></div>'+
    '</div>'+
    '<div class="form-row"><label>Device Description</label><input type="text" id="fc_device_desc" value="'+escAttr(r.device_desc||'')+'" placeholder="e.g. ThinkSystem SR530 (DNS-4, DNS-5)"></div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
    '<div class="form-row"><label>Username</label><input type="text" id="fc_username" value="'+escAttr(r.username||'')+'" placeholder="e.g. admin" autocomplete="off"></div>'+
    '<div class="form-row"><label>Password</label><input type="password" id="fc_password" value="'+escAttr(r.password||'')+'" placeholder="Password" autocomplete="new-password"></div>'+
    '</div>'+
    '<div class="form-row"><label>Login URL</label><input type="text" id="fc_login_url" value="'+escAttr(r.login_url||'')+'" placeholder="e.g. https://10.249.0.135"></div>'+
    '<div class="form-row"><label>Additional Credentials / Notes</label><textarea id="fc_additional" rows="2" style="width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:8px 12px;font-size:12px;resize:vertical">'+escHtml(r.additional||'')+'</textarea></div>';
}
function getCredData(){
  var v=function(id){var el=document.getElementById(id);return el?el.value.trim():'';};
  return {subnet:v('fc_subnet'),gateway:v('fc_gateway'),vlan:v('fc_vlan'),category:v('fc_category'),
    net_desc:v('fc_net_desc'),ip_address:v('fc_ip'),node_type:v('fc_node_type'),
    device_desc:v('fc_device_desc'),username:v('fc_username'),password:v('fc_password'),
    login_url:v('fc_login_url'),additional:v('fc_additional')};
}

window.addCredRow = function(){
  openModal('Add Credential',credForm(),
    '<button class="btn" onclick="closeModal()">Cancel</button>'
    +'<button class="btn btn-primary" style="margin-left:8px" onclick="doAddCred()">&#xFF0B; Add</button>');
};
window.editCredRow = function(idx){
  var r=db.credentials[idx];if(!r)return;
  openModal('Edit Credential',credForm(r),
    '<button class="btn btn-primary" onclick="doEditCred('+idx+')">&#128190; Save</button>');
};
window.doAddCred = async function(){
  var d=getCredData();
  if(!d.ip_address||d.ip_address==='-'){toast('❌ IP Address is required','error');return;}
  if(d.gateway&&d.gateway!=='-'&&!isValidIP(d.gateway)){
    toast('❌ Gateway must be a valid IPv4 address','error');
    var el=document.getElementById('fc_gateway');
    if(el){el.classList.add('ip-invalid');el.focus();}return;}
  if(d.subnet&&d.subnet!=='-'&&!isValidIPorCIDR(d.subnet)){
    toast('❌ Subnet must be a valid IP/CIDR (e.g. 10.249.128.0/27)','error');
    var el2=document.getElementById('fc_subnet');
    if(el2){el2.classList.add('ip-invalid');el2.focus();}return;}
  db.credentials.unshift(d);
  closeModal();render();toast('Credential added ✓','success');
  var res=await api('addCredential',d);
  if(!res||!res.ok){db.credentials.shift();render();toast('⚠️ Sync failed','error');}
};
window.doEditCred = async function(idx){
  var d=getCredData();
  if(!d.ip_address||d.ip_address==='-'){toast('❌ IP Address is required','error');return;}
  if(d.gateway&&d.gateway!=='-'&&!isValidIP(d.gateway)){
    toast('❌ Gateway must be a valid IPv4 address','error');
    var el=document.getElementById('fc_gateway');
    if(el){el.classList.add('ip-invalid');el.focus();}return;}
  if(d.subnet&&d.subnet!=='-'&&!isValidIPorCIDR(d.subnet)){
    toast('❌ Subnet must be a valid IP/CIDR (e.g. 10.249.128.0/27)','error');
    var el2=document.getElementById('fc_subnet');
    if(el2){el2.classList.add('ip-invalid');el2.focus();}return;}
  var old=db.credentials[idx];
  db.credentials[idx]=d;
  closeModal();render();toast('Credential updated ✓','success');
  var res=await api('editCredential',Object.assign({index:idx},d));
  if(!res||!res.ok){db.credentials[idx]=old;render();toast('⚠️ Sync failed','error');}
};
window.deleteCredRow = function(idx){
  var r=db.credentials[idx]; if(!r)return;
  var label=r.ip_address||r.device_desc||'this entry';
  openModal('🗑️ Delete Credential',
    '<div style="padding:8px 0;font-size:14px">Are you sure you want to delete the credential for <b style="color:var(--accent)">'+escHtml(label)+'</b>?</div>'
    +'<div style="font-size:12px;color:var(--text3);margin-top:6px">This cannot be undone.</div>',
    '<button class="btn" onclick="closeModal()">Cancel</button>'
    +'<button class="btn btn-danger" style="margin-left:8px" onclick="doDeleteCred('+idx+')">🗑️ Delete</button>'
  );
};
window.doDeleteCred = async function(idx){
  closeModal();
  var r=db.credentials[idx]; if(!r)return;
  var removed=db.credentials.splice(idx,1)[0];
  render();toast('Deleted ✓','success');
  var res=await api('deleteCredential',{index:idx});
  if(!res||!res.ok){db.credentials.splice(idx,0,removed);render();toast('⚠️ Sync failed','error');}
};

// ── Node Type manager ────────────────────────────────────────
window.openCredNodeManager = function(){
  function listHtml(){
    return db.credNodeTypes.map(function(n,i){
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">'+
        '<span style="font-size:13px">'+escHtml(n)+'</span>'+
        (can('deleteCredentials') ? '<button class="action-btn del" onclick="removeCredNode('+i+')">&#128465;&#65039;</button>' : '')+
        '</div>';
    }).join('')||'<div style="color:var(--text3);font-size:12px">No node types</div>';
  }
  function refresh(){var el=document.getElementById('cred-node-list');if(el)el.innerHTML=listHtml();}
  openModal('⚙️ Node Types',
    '<div id="cred-node-list">'+listHtml()+'</div>'+
    '<div style="display:flex;gap:8px;margin-top:12px">'+
    (can('addCredentials') ? '<input type="text" id="new-node-type" placeholder="Add node type..." style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:7px 10px;font-size:13px"><button class="btn btn-primary" onclick="addCredNode()">+ Add</button>' : '')+
    '</div>','');
  window.removeCredNode=function(i){db.credNodeTypes.splice(i,1);refresh();api('saveCredMeta',{nodeTypes:db.credNodeTypes,categories:db.credCategories});};
  window.addCredNode=function(){var el=document.getElementById('new-node-type');if(!el||!el.value.trim())return;db.credNodeTypes.push(el.value.trim());el.value='';refresh();api('saveCredMeta',{nodeTypes:db.credNodeTypes,categories:db.credCategories});};
};

// ── Category manager ─────────────────────────────────────────
window.openCredCatManager = function(){
  function listHtml(){
    return db.credCategories.map(function(c,i){
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)">'+
        '<span style="font-size:13px">'+escHtml(c)+'</span>'+
        (can('deleteCredentials') ? '<button class="action-btn del" onclick="removeCredCat('+i+')">&#128465;&#65039;</button>' : '')+
        '</div>';
    }).join('')||'<div style="color:var(--text3);font-size:12px">No categories</div>';
  }
  function refresh(){var el=document.getElementById('cred-cat-list');if(el)el.innerHTML=listHtml();}
  openModal('⚙️ Categories',
    '<div id="cred-cat-list">'+listHtml()+'</div>'+
    '<div style="display:flex;gap:8px;margin-top:12px">'+
    (can('addCredentials') ? '<input type="text" id="new-cred-cat" placeholder="Add category..." style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:7px 10px;font-size:13px"><button class="btn btn-primary" onclick="addCredCat()">+ Add</button>' : '')+
    '</div>','');
  window.removeCredCat=function(i){db.credCategories.splice(i,1);refresh();api('saveCredMeta',{nodeTypes:db.credNodeTypes,categories:db.credCategories});};
  window.addCredCat=function(){var el=document.getElementById('new-cred-cat');if(!el||!el.value.trim())return;db.credCategories.push(el.value.trim());el.value='';refresh();api('saveCredMeta',{nodeTypes:db.credNodeTypes,categories:db.credCategories});};
};

// ── Hook render() to handle credentials page ─────────────────
var _rCred = window.render;
window.render = function(){
  _rCred();
  var c=document.getElementById('main-content');if(!c)return;
  if(currentPage==='credentials'){
    c.innerHTML=window.renderCredentials();
    updateTopStats();
  }
};

// ── Users page render hook ───────────────────────────────────
var _rBase = window.render;
window.render = function(){
  _rBase();
  if(currentPage==='users'){
    var _doRender=function(){var c=document.getElementById('main-content');if(c){c.innerHTML=window.renderUsers();updateTopStats();};};
    if(can('manageUsers')||canSee('seeUsers')){
      if(!usersDb||!usersDb.length) loadUsers().then(_doRender);
      else _doRender();
    }
  }
};

// ── Hook loadAllData to also load credentials ─────────────────
var _origShowApp = window.showApp;
window.showApp = function(){
  _origShowApp();
  window.loadCredentials();
};

// ── Update PERM_LABELS + PERM_KEYS to include credentials ────
PERM_LABELS['addCredentials']   = {label:'Add Credentials',    group:'Credentials'};
PERM_LABELS['editCredentials']  = {label:'Edit Credentials',   group:'Credentials'};
PERM_LABELS['deleteCredentials']= {label:'Delete Credentials', group:'Credentials'};
PERM_GROUPS.push('Credentials');
PERM_GROUPS.push('Section Visibility');
// Section Visibility labels — order = display order
PERM_LABELS['seeDashboard'] ={label:'👁 Dashboard',          group:'Section Visibility'};
PERM_LABELS['seeRealIP']    ={label:'👁 Real IP Subnets',    group:'Section Visibility'};
PERM_LABELS['seeFakeIP']    ={label:'👁 Internal (Fake IP)', group:'Section Visibility'};
PERM_LABELS['seeWan']       ={label:'👁 WAN Solutions',      group:'Section Visibility'};
PERM_LABELS['seeVlan']      ={label:'👁 VLAN Tracking',      group:'Section Visibility'};
PERM_LABELS['seeTunnels']   ={label:'👁 IP Tunnels',         group:'Section Visibility'};
PERM_LABELS['seeVpn']       ={label:'👁 VPN',               group:'Section Visibility'};
PERM_LABELS['seeDsp']       ={label:'👁 DSP Providers',      group:'Section Visibility'};
PERM_LABELS['seeSearch']    ={label:'👁 Client Search',      group:'Section Visibility'};
PERM_LABELS['seeCredentials']={label:'👁 Credentials',       group:'Section Visibility'};
PERM_LABELS['seeUsers']      ={label:'👁 User Permissions',  group:'Section Visibility'};
PERM_KEYS = Object.keys(PERM_LABELS);
DEFAULT_PERMISSIONS.admin.addCredentials    = true;
DEFAULT_PERMISSIONS.admin.editCredentials   = true;
DEFAULT_PERMISSIONS.admin.deleteCredentials = true;
DEFAULT_PERMISSIONS.editor.addCredentials   = false;
DEFAULT_PERMISSIONS.editor.editCredentials  = false;
DEFAULT_PERMISSIONS.editor.deleteCredentials= false;
DEFAULT_PERMISSIONS.editor.addDsp           = false;
DEFAULT_PERMISSIONS.editor.editDsp          = false;
DEFAULT_PERMISSIONS.editor.deleteDsp        = false;
DEFAULT_PERMISSIONS.editor.seeCredentials   = false;
DEFAULT_PERMISSIONS.viewer.addCredentials   = false;
DEFAULT_PERMISSIONS.viewer.editCredentials  = false;
DEFAULT_PERMISSIONS.viewer.deleteCredentials= false;

}
)();

// ── New renderUsers — ONE panel, dropdown + shared checkboxes ─
window._usersPageSelected = window._usersPageSelected || null;

window.renderUsers = function(){
  // Must be able to see the page at minimum
  if(!canSee('seeUsers')) return '<div class="empty-state"><div class="icon">&#128274;</div><p>Access denied</p></div>';
  // canEdit = true only if manageUsers permission granted
  var canEdit = can('manageUsers');
  // View-only mode: show banner but still render the full panel
  var viewOnlyBanner = !canEdit
    ? '<div style="background:rgba(0,180,216,0.07);border:1px solid rgba(0,180,216,0.2);border-radius:8px;padding:10px 14px;font-size:12px;color:var(--text2);margin-bottom:14px;display:flex;align-items:center;gap:8px">'
      +'<span style="font-size:16px">&#128065;</span>'
      +'<span><b>View-only</b> &mdash; you can see permissions but cannot make changes.</span>'
      +'</div>'
    : '';

  // Use current selection (reset happens on navigation/logout)
  var selUser = window._usersPageSelected || null;
  var selData = selUser ? (usersDb.find(function(u){return u.username===selUser;})||null) : null;

  // Determine which perms + role to show in the shared checkboxes
  // If user selected → show their perms. If not → show editor defaults (for new user creation)
  var activeRole  = selData ? (selData.role||'viewer') : 'editor';
  var activePerms = selData ? (selData.perms||{}) : (DEFAULT_PERMISSIONS['editor']||{});

  // Build ALL permission groups including Credentials + Section Visibility
  var allGroups = [];
  PERM_GROUPS.forEach(function(g){ allGroups.push(g); });
  // Add Credentials and Section Visibility if not already in PERM_GROUPS
  ['Credentials','Section Visibility'].forEach(function(g){
    if(allGroups.indexOf(g)===-1) allGroups.push(g);
  });

  var groupMap = {};
  PERM_KEYS.forEach(function(k){
    var meta = PERM_LABELS[k]; if(!meta) return;
    var g = meta.group||'General';
    if(!groupMap[g]) groupMap[g] = [];
    groupMap[g].push(k);
  });

  var pfx = selData ? 'edit' : 'new';

  var gridCols = allGroups.filter(function(g){ return groupMap[g] && groupMap[g].length; }).map(function(g){
    var keys = groupMap[g];
    var rows = keys.map(function(k){
      var label = (PERM_LABELS[k]||{}).label || k;
      // Strip leading "👁 " from visibility labels for cleaner display
      label = label.replace(/^👁 /,'');
      var checked = activePerms[k] !== undefined ? activePerms[k] : !!(DEFAULT_PERMISSIONS[activeRole]||{})[k];
      var disabled = canEdit ? '' : ' disabled style="opacity:0.5;cursor:not-allowed"';
      return '<label style="font-size:12px;display:flex;align-items:center;gap:6px;'+(canEdit?'cursor:pointer':'cursor:not-allowed;opacity:0.7')+';padding:2px 0;color:var(--text)">'+
        '<input type="checkbox" id="uc-'+pfx+'-'+k+'"'+(checked?' checked':'')+disabled+'>'+
        '<span>'+escHtml(label)+'</span></label>';
    }).join('');
    return '<div style="border:1px solid var(--border);border-radius:6px;padding:10px 12px;background:var(--bg2)">'+
      '<div style="font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--accent2);margin-bottom:8px">'+escHtml(g)+'</div>'+
      rows+'</div>';
  }).join('');

  var permGrid = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:8px;margin:12px 0">'+gridCols+'</div>';

  function roleRadios(name, sel){
    return ['admin','editor','viewer'].map(function(r){
      return '<label style="display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer;color:var(--text)">'+
        '<input type="radio" name="'+name+'" value="'+r+'"'+(sel===r?' checked':'')+
        (name==='nu-role'?' onchange="usersPageNewRoleChanged()"':name==='ep-role'?' onchange="usersPageEditRoleChanged()"':'')+'>'+
        r.charAt(0).toUpperCase()+r.slice(1)+'</label>';
    }).join('');
  }

  // Hide the 'admin' user from the list — admin manages others only
  var userOpts = usersDb.filter(function(u){ return u.username !== 'admin'; }).map(function(u){
    return '<option value="'+escAttr(u.username)+'"'+(u.username===selUser?' selected':'')+'>'+escHtml(u.username)+'</option>';
  }).join('');

  var isCreating = !selData;

  return '<div class="page-header"><div>'+
    '<div class="page-title">&#128100; User Permissions</div>'+
    '<div class="page-subtitle">Manage user access &mdash; '+usersDb.length+' user'+(usersDb.length!==1?'s':'')+'</div>'+
    '</div></div>'+
    viewOnlyBanner+

    '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:16px">'+

    // ── TOP ROW: Create new user ────────────────────────────
    '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:14px">'+
      '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--text2);margin-bottom:10px">&#43; Create new user</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1.5fr auto;gap:8px;align-items:center">'+
        '<input type="text" id="nu-username" placeholder="Username" autocomplete="off" style="font-size:13px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:7px 10px">'+
        '<input type="password" id="nu-password" placeholder="Password" autocomplete="new-password" style="font-size:13px;background:var(--bg2);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:7px 10px">'+
        '<div style="display:flex;align-items:center;gap:12px">'+roleRadios('nu-role','editor')+'</div>'+
        (canEdit ? '<button class="btn btn-primary" onclick="usersPageCreate()" style="white-space:nowrap;font-size:13px">&#xFF0B; Create</button>' : '')+
      '</div>'+
    '</div>'+

    // ── DIVIDER ─────────────────────────────────────────────
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'+
      '<div style="flex:1;height:1px;background:var(--border)"></div>'+
      '<span style="font-size:11px;color:var(--text3);white-space:nowrap">OR select existing user to edit</span>'+
      '<div style="flex:1;height:1px;background:var(--border)"></div>'+
    '</div>'+

    // ── DROPDOWN: Select user ────────────────────────────────
    '<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-bottom:14px">'+
      '<select id="up-user-select" onchange="usersPageSelect(this.value)" style="font-size:13px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:7px 10px">'+
        '<option value="">— Select a user to edit —</option>'+userOpts+
      '</select>'+
      (selData && canEdit ? '<button class="btn" onclick="usersPageDelete(\''+escAttr(selUser)+'\')" style="font-size:12px;color:var(--red);border-color:var(--red);white-space:nowrap">&#128465;&#65039; Delete</button>' : '<span></span>')+
    '</div>'+

    // ── SELECTED USER INFO OR NEW USER HINT ─────────────────
    (selData ?
      '<div style="display:flex;align-items:center;gap:12px;background:var(--bg3);border-radius:6px;padding:10px 14px;margin-bottom:8px">'+
        '<div style="width:32px;height:32px;border-radius:50%;background:rgba(0,180,216,.15);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--accent)">'+
          escHtml((selUser||'?').substring(0,2).toUpperCase())+
        '</div>'+
        '<span style="font-size:14px;font-weight:600;color:var(--text);flex:1">'+escHtml(selUser)+'</span>'+
        '<div style="display:flex;gap:12px">'+roleRadios('ep-role',activeRole)+'</div>'+
      '</div>'
    :
      '<div style="background:rgba(0,180,216,.07);border:1px solid rgba(0,180,216,.2);border-radius:6px;padding:9px 14px;margin-bottom:8px;font-size:12px;color:var(--text2)">'+
        '&#128161; Type a username above and pick a role — then customize the permissions below before clicking <b>+ Create</b>'+
      '</div>'
    )+

    // ── SHARED PERMISSIONS CHECKBOXES ───────────────────────
    '<div style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--text2);margin-bottom:6px">'+
      (selData ? 'Permissions for '+escHtml(selUser) : 'Default permissions (customize before creating)')+
    '</div>'+
    permGrid+

    // ── SAVE BUTTON (only when editing) ─────────────────────
    (selData && canEdit ?
      '<div style="display:flex;justify-content:flex-end;margin-top:12px">'+
        '<button class="btn btn-primary" onclick="usersPageSave(\''+escAttr(selUser)+'\')" style="font-size:13px">&#128190; Save changes</button>'+
      '</div>'
    : '')+

    '</div>';
};

// ── When new user role changes → reload checkboxes with defaults ─
// When role changes for EXISTING user → update checkboxes
window.usersPageEditRoleChanged = function(){
  var checked = document.querySelector('input[name="ep-role"]:checked');
  var role = checked ? checked.value : 'viewer';
  var defaults = DEFAULT_PERMISSIONS[role] || {};
  PERM_KEYS.forEach(function(k){
    var el = document.getElementById('uc-edit-'+k);
    if(el) el.checked = !!defaults[k];
  });
};

window.usersPageNewRoleChanged = function(){
  var checked = document.querySelector('input[name="nu-role"]:checked');
  var role = checked ? checked.value : 'editor';
  var defaults = DEFAULT_PERMISSIONS[role] || {};
  PERM_KEYS.forEach(function(k){
    var el = document.getElementById('uc-new-'+k);
    if(el) el.checked = !!defaults[k];
  });
};

window.usersPageSelect = function(username){
  window._usersPageSelected = username || null;
  // If usersDb not loaded yet, load first then render
  if(!usersDb || !usersDb.length) {
    loadUsers().then(function(){
      var c = document.getElementById('main-content');
      if(c){ c.innerHTML = window.renderUsers(); updateTopStats(); }
    });
  } else {
    var c = document.getElementById('main-content');
    if(c){ c.innerHTML = window.renderUsers(); updateTopStats(); }
  }
};

window.usersPageCreate = async function(){
  var uEl = document.getElementById('nu-username');
  var pEl = document.getElementById('nu-password');
  if(!uEl||!pEl) return;
  var username = uEl.value.trim().toLowerCase();
  var password = pEl.value.trim();
  if(!username){ toast('❌ Username is required','error'); uEl.focus(); return; }
  if(!password){ toast('❌ Password is required','error'); pEl.focus(); return; }
  if(username === 'admin'){
    toast('❌ Username "admin" is reserved and cannot be created','error'); uEl.focus(); return;
  }
  if(usersDb.find(function(u){return u.username===username;})){
    toast('❌ Username "'+username+'" already exists','error'); uEl.focus(); return;
  }
  var role = readRoleFromCard('nu-role');
  var perms = readPermsFromCard('new');
  var payload = {username:username, password:password, role:role, perms:perms};
  var res = await api('saveUser', payload);
  if(res.ok){
    usersDb.push({username:username, password:password, role:role, perms:perms});
    window._usersPageSelected = null;
    var c = document.getElementById('main-content');
    if(c) c.innerHTML = window.renderUsers();
    toast('✓ User "'+username+'" created','success');
    buildSidebarNav();
  } else {
    toast('❌ Failed: '+(res.error||'unknown'),'error');
  }
};

window.usersPageSave = async function(username){
  var role = readRoleFromCard('ep-role');
  var perms = readPermsFromCard('edit');
  var idx = usersDb.findIndex(function(u){return u.username===username;});
  if(idx>=0) usersDb[idx] = Object.assign({}, usersDb[idx], {role:role, perms:perms});
  var payload = {username:username, password:'', role:role, perms:perms};
  var res = await api('saveUser', payload);
  if(res.ok){
    if(session && username===session.username){
      session.role=role; session.perms=perms;
      toast('✓ Saved — permissions updated','success');
      buildSidebarNav();
    } else {
      toast('✓ '+username+' saved — they must sign out and back in to apply changes','success');
    }
  } else {
    toast('❌ Failed: '+(res.error||'unknown'),'error');
  }
};

window.usersPageDelete = function(username){
  confirmDelete('Delete user <b>'+escHtml(username)+'</b>?<br><small style="color:var(--text3)">They will no longer be able to log in.</small>', async function(){
    var res = await api('deleteUser',{username:username});
    if(res.ok){
      usersDb = usersDb.filter(function(u){return u.username!==username;});
      window._usersPageSelected = null;
      var c = document.getElementById('main-content');
      if(c) c.innerHTML = window.renderUsers();
      toast('✓ User deleted','success');
    } else {
      toast('❌ Failed: '+(res.error||'unknown'),'error');
    }
  },'Delete User');
};
