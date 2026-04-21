const key = "AIzaSyAvIJrtzIcWpfEZIXnX5wCpgRmrn0RM7gc";
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
