const env = "GEMINI_API_KEY=AIzaSyAvIJrtzIcWpfEZIXnX5wCpgRmrn0RM7gc";
const match = env.match(/GEMINI_API_KEY=["']?(AIza[a-zA-Z0-9-_]+)["']?/);
console.log(match ? match[1] : "nomatch");
