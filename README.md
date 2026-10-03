# YN Music — AI Music Search

Frontend GitHub Pages + Cloudflare Worker backend. Không upload MP3. Kết quả đến từ YouTube Data API và phát bằng YouTube IFrame Player.

## 1. Chuẩn bị API key

### YouTube
1. Vào Google Cloud Console.
2. Tạo project.
3. Enable **YouTube Data API v3**.
4. Tạo API key.
5. Key này chỉ đặt trong Worker secret, KHÔNG đặt trong `config.js`.

### OpenAI (tùy chọn nhưng cần cho AI Search)
Tạo API key OpenAI. Nếu không cấu hình, app vẫn tìm trực tiếp bằng câu người dùng nhập.

## 2. Deploy backend Cloudflare Worker

Cần Node.js.

```bash
cd worker
npm install
npx wrangler login

npx wrangler secret put YOUTUBE_API_KEY
# dán YouTube API key

npx wrangler secret put OPENAI_API_KEY
# dán OpenAI API key

npm run deploy
```

Sau deploy, Cloudflare trả URL dạng:

```text
https://ynguyen-music-api.<subdomain>.workers.dev
```

Mở `config.js` ở thư mục gốc và sửa:

```js
window.YN_CONFIG = {
  API_BASE: "https://ynguyen-music-api.<subdomain>.workers.dev"
};
```

`ALLOWED_ORIGIN` trong `worker/wrangler.toml` đã đặt cho:

```text
https://ynguyenit-ui.github.io
```

## 3. Deploy frontend lên GitHub Pages

Copy các file/thư mục sau vào repo `ynguyen-music`:

```text
index.html
style.css
app.js
config.js
README.md
worker/
```

Commit + push. Trong GitHub repo:
**Settings → Pages → Deploy from a branch → main / root**.

Website:
`https://ynguyenit-ui.github.io/ynguyen-music/`

## 4. Test

Tìm thử:
- `nhạc Việt chill để code`
- `Bolero buồn nhẹ nhàng`
- `EDM năng lượng tập gym`
- `nhạc giống See Tình nhưng nhẹ hơn`

Player dùng YouTube IFrame API. Favorites và History lưu trong `localStorage` của trình duyệt.

## 5. Bảo mật

- Không commit `YOUTUBE_API_KEY` hay `OPENAI_API_KEY`.
- Secret chỉ lưu bằng `wrangler secret put`.
- Nên cấu hình restriction/quota cho API key trong Google Cloud.
- Nếu public app có traffic lớn, thêm rate-limit/cache ở Worker.

## Cấu trúc

```text
ynguyen-music/
├─ index.html
├─ style.css
├─ app.js
├─ config.js
├─ README.md
└─ worker/
   ├─ package.json
   ├─ wrangler.toml
   └─ src/
      └─ index.js
```
