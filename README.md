# 🧾 Lost & Found Web Platform

# Can visit : https://lost-and-found-orpin-tau.vercel.app/

A full-stack Node.js web application that helps users report lost items, register found items, and connect both parties to return belongings safely.

---

## 🚀 Features

✔ User Authentication (Passport)  
✔ MongoDB Atlas integration  
✔ Report Lost Items  
✔ Register Found Items  
✔ User Profile & Dashboard  
✔ Rewards / Thanks System  
✔ Cloudinary image uploads  
✔ Session-based login with MongoStore  
✔ Responsive UI using EJS Templates  
✔ Deployed on Vercel  

---

## 🛠 Tech Stack

**Frontend**
- HTML / CSS / EJS
- Bootstrap UI

**Backend**
- Node.js / Express.js
- Passport.js (Local Strategy)

**Database**
- MongoDB Atlas
- connect-mongo (sessions)

**Cloud**
- Cloudinary (media uploads)
- Vercel (backend deployment)

---

## 📦 Installation & Setup (Local)

Clone the repository:
```
git clone https://github.com/Vishwajeet0188/LostAndFound.git
cd LostAndFound
npm install
```

Create a `.env` file and in .env store your variables in given format :
```
ATLAS_DB=<your mongo atlas url>
SESSION_SECRET=<your random secret>
CLOUD_NAME=<cloudinary>
CLOUD_API_KEY=<cloudinary>
CLOUD_API_SECRET=<cloudinary>
```

Run locally:
```
npm start
```

App will run at:
```
http://localhost:8080
```

---

## 🌍 Deployment Notes (Vercel)

Make sure:

✔ `app.listen()` is removed  
✔ `module.exports = app;` is present  
✔ `connect-mongo@4 / latest version` is used  
✔ Cookies use `secure: true`  
✔ Environment Variables added in Vercel panel  

---

## 📄 License
This project is licensed for educational & demonstration purposes.

---

## 🤝 Contributions
PRs and feedback are welcome!

---

## 👤 Author
**Vishwajeet Singh**

GitHub: `@Vishwajeet0188`

