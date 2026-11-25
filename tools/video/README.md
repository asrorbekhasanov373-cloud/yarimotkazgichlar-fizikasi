# Video tayyorlash vositalari

Saytdagi interaktiv rasmlardan oʻzbekcha ovozli, musiqali MP4 videolar yasash.

| Fayl | Vazifasi |
|---|---|
| `render.js` | Sayt sahifasini Playwright bilan ochib, animatsiyani kadrma-kadr (virtual vaqt) yozadi; sarlavha kartalari, izohlar, oʻtishlar, kamera harakati. Natija: video + `.json` (sahnalar vaqti). |
| `music.py` | Original fon musiqasi va ovoz effektlarini sintez qiladi, ovozni joylaydi va nutq paytida musiqani pasaytiradi (ducking). |
| `narr_expr.json` | Har bir sahna uchun ovoz matni. Muhim atama oldidan tire (—); `*atama*` — sekinroq va balandroq oʻqiladigan gap. Faqat `ʻ` (U+02BB) va `ʼ` (U+02BC) ishlatilsin: oddiy `'` bilan ovoz «oʻ»ni «o» deb oʻqiydi. |
| `tts_expr.py` | Matnni Microsoft Edge oʻzbekcha neyron ovozi (Sardor yoki Madina) bilan oʻqitadi; har bir gap butunligicha sintez qilinadi. |
| `convert.py`, `batch.py`, `clean.sh` | Sardor ovozini muallif ovozi tembriga oʻtkazish (Seed-VC, CPU) va tozalash. |
| `spaces_stub.py` | Seed-VC kodini CPU da ishlatish uchun `spaces` paketi oʻrnini bosuvchi fayl (`seed-vc/spaces.py` sifatida nusxalanadi). |

## Ishga tushirish (qisqacha)

1. Saytni mahalliy serverda oching: repozitoriy ildizida `python3 -m http.server 8765`.
2. Ovoz: `pip install edge-tts`, soʻng `python3 tts_expr.py uz-UZ-SardorNeural narr_expr.json voice.json`
   (tarmoqda `speech.platform.bing.com` ochiq boʻlishi kerak).
3. Video: `node render.js pn1 chiqish.mp4` (`VOICE_JSON` muhit oʻzgaruvchisi bilan boshqa ovoz faylini berish mumkin).
4. Musiqa va ovozni qoʻshish: `python3 music.py pn1 chiqish.json audio.wav voice.json`, soʻng
   `ffmpeg -i chiqish.mp4 -i audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest yakuniy.mp4`.

### Muallif ovozi (ixtiyoriy)

- Seed-VC kodi: `git clone https://huggingface.co/spaces/Plachta/Seed-VC seed-vc` va `spaces_stub.py` ni `seed-vc/spaces.py` ga nusxalang.
- Python muhiti: `torch torchaudio scipy librosa huggingface-hub munch einops pydub transformers<4.50 soundfile hydra-core pyyaml descript-audio-codec numpy audioop-lts`.
- Tarmoq: `huggingface.co`, `us.aws.cdn.hf.co` va boshqa hf.co CDN manzillari; `HF_HUB_DISABLE_XET=1`.
- **Ovoz namunasi (`ref15.wav`) bu repozitoriyda saqlanmaydi** — u ochiq; namunani har safar alohida bering.
- `REF=ref15.wav STEPS=18 python batch.py pn1 pn2 …` → `voice_user.json`, soʻng 3–4-qadamlar shu fayl bilan.
