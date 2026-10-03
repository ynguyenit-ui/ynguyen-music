const cfg = window.YN_CONFIG || {};
const $ = (s) => document.querySelector(s);
const state = {
  results: [], queue: [], currentIndex: -1, player: null, playerReady: false,
  favorites: JSON.parse(localStorage.getItem("yn_favorites") || "[]"),
  history: JSON.parse(localStorage.getItem("yn_history") || "[]"),
  view: "home"
};

function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function save(){localStorage.setItem("yn_favorites",JSON.stringify(state.favorites));localStorage.setItem("yn_history",JSON.stringify(state.history.slice(0,30)));}
function isFav(id){return state.favorites.some(x=>x.id===id);}
function setStatus(s){$("#status").textContent=s||"";}

window.onYouTubeIframeAPIReady = () => {
  state.player = new YT.Player("youtubePlayer", {
  height: "270",
  width: "480",

  playerVars: {
    autoplay: 0,
    controls: 1,
    playsinline: 1,
    origin: window.location.origin
  },

  events: {
    onReady: () => {
      state.playerReady = true;
    },

    onStateChange: e => {
      if (e.data === YT.PlayerState.ENDED) next();

      $("#playBtn").textContent =
        e.data === YT.PlayerState.PLAYING ? "❚❚" : "▶";
    },

    onError: e => {
      console.error("YouTube Player Error:", e.data);
      setStatus("Không phát được video này. YouTube error: " + e.data);
    }
  }
});
    events:{
      onReady:()=>state.playerReady=true,
      onStateChange:e=>{
        if(e.data===YT.PlayerState.ENDED) next();
        $("#playBtn").textContent=e.data===YT.PlayerState.PLAYING?"❚❚":"▶";
      }
    }
  });
};

async function api(path, options={}){
  if(!cfg.API_BASE || cfg.API_BASE.includes("YOUR-WORKER")) throw new Error("Chưa cấu hình API_BASE trong config.js");
  const r = await fetch(cfg.API_BASE + path, options);
  const data = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || `API lỗi ${r.status}`);
  return data;
}

async function search(raw){
  raw=raw.trim(); if(!raw)return;
  setStatus("AI đang hiểu yêu cầu và tìm nhạc…");
  $("#resultTitle").textContent="Đang tìm…";
  try{
    const data=await api("/api/search",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({query:raw})
    });
    state.results=data.items||[]; state.queue=[...state.results];
    state.history=[{query:raw,at:Date.now()},...state.history.filter(x=>x.query!==raw)].slice(0,30); save();
    $("#resultEyebrow").textContent="KẾT QUẢ AI";
    $("#resultTitle").textContent=data.intent?.label || `Kết quả cho “${raw}”`;
    $("#aiReason").textContent=data.intent?.reason || "";
    renderTracks(state.results);
    setStatus(`${state.results.length} kết quả · truy vấn: ${data.intent?.searchQuery || raw}`);
  }catch(e){setStatus("Lỗi: "+e.message);$("#resultTitle").textContent="Không thể tìm nhạc";}
}

function renderTracks(items){
  const box=$("#results"); box.classList.remove("empty");
  if(!items.length){box.innerHTML='<div class="empty-state">♫<br><span>Chưa có dữ liệu</span></div>';return;}
  box.innerHTML=items.map((t,i)=>`
    <article class="track ${current()?.id===t.id?"current":""}" data-id="${esc(t.id)}">
      <img src="${esc(t.thumbnail)}" alt="" loading="lazy">
      <div class="track-info"><strong>${esc(t.title)}</strong><span>${esc(t.channel)}</span></div>
      <div class="channel">${esc(t.publishedAt?.slice(0,10)||"YouTube")}</div>
      <div class="track-actions">
        <button class="icon-btn fav ${isFav(t.id)?"on":""}" data-fav="${esc(t.id)}">${isFav(t.id)?"♥":"♡"}</button>
        <button class="icon-btn" data-play="${esc(t.id)}">▶</button>
      </div>
    </article>`).join("");
}
function current(){return state.queue[state.currentIndex]||null;}
function playById(id){
  let idx=state.queue.findIndex(x=>x.id===id);
  if(idx<0){state.queue=[...state.results];idx=state.queue.findIndex(x=>x.id===id);}
  if(idx<0)return; state.currentIndex=idx; loadCurrent();
}
function loadCurrent(){
  const t=current(); if(!t)return;
  $("#nowCover").src=t.thumbnail;$("#nowTitle").textContent=t.title;$("#nowArtist").textContent=t.channel;
  $("#youtubeLink").href=`https://www.youtube.com/watch?v=${encodeURIComponent(t.id)}`;
  $("#favNow").textContent=isFav(t.id)?"♥":"♡";
  if(state.playerReady) state.player.loadVideoById(t.id);
  renderTracks(state.view==="favorites"?state.favorites:state.results);
}
function next(){if(!state.queue.length)return;state.currentIndex=(state.currentIndex+1)%state.queue.length;loadCurrent();}
function prev(){if(!state.queue.length)return;state.currentIndex=(state.currentIndex-1+state.queue.length)%state.queue.length;loadCurrent();}
function toggleFav(id){
  const t=[...state.results,...state.queue].find(x=>x.id===id) || state.favorites.find(x=>x.id===id); if(!t)return;
  state.favorites=isFav(id)?state.favorites.filter(x=>x.id!==id):[t,...state.favorites];save();
  if(state.view==="favorites")renderTracks(state.favorites);else renderTracks(state.results);
  if(current()?.id===id)$("#favNow").textContent=isFav(id)?"♥":"♡";
}
function showView(v){
  state.view=v;document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===v));
  if(v==="favorites"){
    $("#resultEyebrow").textContent="THƯ VIỆN";$("#resultTitle").textContent="Bài hát yêu thích";$("#aiReason").textContent="";
    state.queue=[...state.favorites];renderTracks(state.favorites);setStatus(`${state.favorites.length} bài`);
  }else if(v==="history"){
    $("#resultEyebrow").textContent="GẦN ĐÂY";$("#resultTitle").textContent="Lịch sử tìm kiếm";$("#aiReason").textContent="";
    $("#results").innerHTML=state.history.length?state.history.map(h=>`<button class="history-row" data-query="${esc(h.query)}">${esc(h.query)}</button>`).join(""):'<div class="empty-state">↺<br><span>Chưa có lịch sử</span></div>';
    $("#results").classList.remove("empty");setStatus("");
  }else{
    $("#resultEyebrow").textContent="GỢI Ý";$("#resultTitle").textContent=state.results.length?"Kết quả gần nhất":"Bắt đầu bằng một cảm xúc";
    renderTracks(state.results);setStatus("");
  }
}
$("#searchForm").addEventListener("submit",e=>{e.preventDefault();state.view="home";search($("#searchInput").value);});
$("#chips").addEventListener("click",e=>{if(e.target.tagName==="BUTTON"){$("#searchInput").value=e.target.textContent;search(e.target.textContent);}});
$("#results").addEventListener("click",e=>{
  const p=e.target.closest("[data-play]"),f=e.target.closest("[data-fav]"),h=e.target.closest("[data-query]");
  if(p)playById(p.dataset.play);else if(f)toggleFav(f.dataset.fav);else if(h){$("#searchInput").value=h.dataset.query;showView("home");search(h.dataset.query);}
});
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
$("#nextBtn").onclick=next;$("#prevBtn").onclick=prev;
$("#playBtn").onclick=()=>{if(!state.playerReady)return;if(!current()&&state.queue.length){state.currentIndex=0;loadCurrent();return;}const s=state.player.getPlayerState();s===YT.PlayerState.PLAYING?state.player.pauseVideo():state.player.playVideo();};
$("#favNow").onclick=()=>current()&&toggleFav(current().id);
