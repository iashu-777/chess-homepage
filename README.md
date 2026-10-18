# Chess Arena

Multiplayer chess (Express + Socket.IO + MongoDB), login/signup, stats, profile, aur Stockfish ke against "Play vs Computer".

## Folder structure

```
server.js              # Express + Socket.IO server (API + frontend dono yahi serve karta hai)
routes/auth.js         # /auth/signup, /auth/login, /auth/profile, /auth/stats, /auth/updateProfile
middleware/authenticate.js   # JWT check
models/user.js, models/Match.js
public/                # Saara frontend (HTML, CSS, JS, images, Stockfish engine)
uploads/               # Profile pictures (git me commit nahi hoti)
.env.example           # .env ka template
```

## Local pe kaise chalayein

1. **Node.js 18.11+** chahiye. Check: `node -v`
2. Dependencies install karo (purana `node_modules` aur `package-lock.json` delete karke):
   ```bash
   npm install
   ```
3. `.env` file banao (`.env.example` copy karke) aur values bharo:
   ```
   MONGO_URI=<apna MongoDB Atlas URI ya mongodb://127.0.0.1:27017/chess_db>
   PORT=3000
   JWT_SECRET=<koi lamba random string>
   ```
   Atlas use kar rahe ho to Atlas → Network Access me apna IP allow hona chahiye.
4. Server start karo:
   ```bash
   npm run dev     # file save karne pe auto-restart
   # ya
   npm start
   ```
5. Browser me kholo: **http://localhost:3000**

   Live Server / port 5500 / Vite ki zarurat nahi hai — frontend bhi isi server se aata hai.

## Multiplayer test karna

Do alag browser windows kholo (ek normal + ek incognito), dono me http://localhost:3000/index_multiplayer.html,
dono me same time (10/15/20 min) choose karo — match ban jayega.

## Abhi kya baaki hai (TODO)

- Game khatam hone pe user ke wins/losses/rating update nahi hote (multiplayer me login user se link nahi hai, sirf socket id save hoti hai)
- Awards page abhi static demo data hai
- Leaderboard page nahi bana
- Deployment config (baad me)
