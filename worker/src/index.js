const cors = (env) => ({
  "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
});
const json = (data,status,env) => new Response(JSON.stringify(data),{status,headers:cors(env)});

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors(env)});
    const url = new URL(request.url);
    if (url.pathname === "/") return json({ok:true,service:"YN Music API"},200,env);
    if (url.pathname !== "/api/search" || request.method !== "POST") return json({error:"Not found"},404,env);

    try {
      const body = await request.json();
      const raw = String(body.query || "").trim().slice(0,300);
      if (!raw) return json({error:"Thiếu query"},400,env);

      const intent = await understandIntent(raw, env);
      const qs = new URLSearchParams({
        part:"snippet", type:"video", maxResults:"20",
        q:intent.searchQuery, videoEmbeddable:"true",
        videoSyndicated:"true", safeSearch:"moderate",
        relevanceLanguage:intent.language || "vi",
        regionCode:intent.region || "VN",
        key:env.YOUTUBE_API_KEY
      });
      const yt = await fetch("https://www.googleapis.com/youtube/v3/search?" + qs);
      const y = await yt.json();
      if (!yt.ok) throw new Error(y?.error?.message || "YouTube API error");

      const items = (y.items || []).map(x=>({
        id:x.id.videoId,
        title:x.snippet.title,
        channel:x.snippet.channelTitle,
        thumbnail:x.snippet.thumbnails?.high?.url || x.snippet.thumbnails?.medium?.url || "",
        publishedAt:x.snippet.publishedAt
      }));
      return json({intent,items},200,env);
    } catch(e) {
      return json({error:e.message || "Server error"},500,env);
    }
  }
};

async function understandIntent(query, env) {
  if (!env.OPENAI_API_KEY) return fallbackIntent(query);

  const prompt = `Bạn là bộ phân tích truy vấn cho ứng dụng tìm nhạc.
Chỉ trả JSON hợp lệ, không markdown, theo schema:
{"searchQuery":"string","label":"string","reason":"string","language":"vi","region":"VN"}
Quy tắc:
- searchQuery phải ngắn, phù hợp để tìm video âm nhạc trên YouTube.
- Không bịa tên bài hát/nghệ sĩ nếu người dùng không nêu.
- Giữ nguyên tên nghệ sĩ/bài hát mà người dùng đã nêu.
- Có thể thêm từ khóa như official audio, live, acoustic, playlist khi phù hợp.
- label tối đa 60 ký tự.
- reason bằng tiếng Việt, tối đa 120 ký tự.
Yêu cầu người dùng: ${JSON.stringify(query)}`;

  const r = await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{"Authorization":`Bearer ${env.OPENAI_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-5-mini",input:prompt,max_output_tokens:220})
  });
  if(!r.ok) return fallbackIntent(query);
  const data=await r.json();
  const text=(data.output||[]).flatMap(o=>o.content||[]).find(c=>c.type==="output_text")?.text || "";
  try {
    const parsed=JSON.parse(text);
    return {
      searchQuery:String(parsed.searchQuery||query).slice(0,160),
      label:String(parsed.label||`Nhạc cho “${query}”`).slice(0,60),
      reason:String(parsed.reason||"").slice(0,140),
      language:String(parsed.language||"vi").slice(0,10),
      region:String(parsed.region||"VN").slice(0,2).toUpperCase()
    };
  } catch { return fallbackIntent(query); }
}
function fallbackIntent(q){
  return {searchQuery:q,label:`Kết quả cho “${q.slice(0,40)}”`,reason:"Tìm trực tiếp trên YouTube.",language:"vi",region:"VN"};
}

