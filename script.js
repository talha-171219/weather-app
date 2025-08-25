// আপনার API Key বসান (আপনার দেওয়া key)
const apiKey = "1fcd1f2253e99277a1fe30eaebc18456";

// DOM refs
const bg = document.getElementById("bgOverlay");
const themeToggle = document.getElementById("themeToggle");
const unitToggle = document.getElementById("unitToggle");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const locateBtn = document.getElementById("locateBtn");

const placeName = document.getElementById("placeName");
const conditionText = document.getElementById("conditionText");
const currentIcon = document.getElementById("currentIcon");
const currentTemp = document.getElementById("currentTemp");
const todayHigh = document.getElementById("todayHigh");
const todayLow = document.getElementById("todayLow");
const feelsLike = document.getElementById("feelsLike");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");
const clouds = document.getElementById("clouds");
const sunrise = document.getElementById("sunrise");
const sunset = document.getElementById("sunset");

const hourlyStrip = document.getElementById("hourlyStrip");
const dailyGrid = document.getElementById("dailyGrid");
const addFavBtn = document.getElementById("addFavBtn");
const clearFavBtn = document.getElementById("clearFavBtn");
const favorites = document.getElementById("favorites");

// State
let useCelsius = true;
let lastCityMeta = null; // { name, country, lat, lon, tzOffsetSec }
let favList = JSON.parse(localStorage.getItem("favCities") || "[]");

// Utils
const toKmH = (ms) => Math.round(ms * 3.6);
const fmtTemp = (tC) => useCelsius ? `${Math.round(tC)}°C` : `${Math.round(tC * 9/5 + 32)}°F`;
const fmtTime = (ts, tzOffset) => {
  const d = new Date((ts + tzOffset) * 1000);
  return d.toUTCString().match(/\d{2}:\d{2}/)[0];
};
const dayName = (ts, tzOffset) => {
  const d = new Date((ts + tzOffset) * 1000);
  return d.toUTCString().slice(0,3);
};
const dateKeyLocal = (ts, tzOffset) => {
  const d = new Date((ts + tzOffset) * 1000);
  return d.toISOString().slice(0,10); // yyyy-mm-dd in pseudo-local
};
const pickIcon = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

// Background mood
function setBackgroundBy(weatherId, isNight) {
  // Simple mapping: clear vs cloudy/rain/night
  if (isNight) {
    bg.classList.add("night");
  } else {
    bg.classList.remove("night");
  }
}

// Fetch helpers (free plan)
async function fetchCurrentByCity(q) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&units=metric&appid=${apiKey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Current weather failed (${r.status})`);
  return r.json();
}
async function fetchForecastByCoords(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Forecast failed (${r.status})`);
  return r.json();
}
async function fetchCurrentByCoords(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Current weather failed (${r.status})`);
  return r.json();
}

// Group 3-hour forecast into day-level (min/max + representative icon)
function buildDailyFromForecast(list, tzOffsetSec) {
  const byDay = new Map();
  for (const it of list) {
    const key = dateKeyLocal(it.dt, tzOffsetSec);
    const arr = byDay.get(key) || [];
    arr.push(it);
    byDay.set(key, arr);
  }

  // Build day entries
  const days = [];
  for (const [key, arr] of byDay.entries()) {
    let min = Infinity, max = -Infinity, icon = null, pickNoon = null;
    for (const it of arr) {
      const t = it.main.temp;
      min = Math.min(min, t);
      max = Math.max(max, t);
      // Prefer 12:00 local icon; fallback first
      const localHour = new Date((it.dt + tzOffsetSec) * 1000).getUTCHours();
      if (localHour === 12) pickNoon = it.weather[0].icon;
      if (!icon) icon = it.weather[0].icon;
    }
    const finalIcon = pickNoon || icon;
    const dtAny = arr[0].dt;
    days.push({
      dt: dtAny,
      min: Math.round(min),
      max: Math.round(max),
      icon: finalIcon
    });
  }

  // sort by dt and take next 5 days
  days.sort((a,b)=>a.dt-b.dt);
  return days.slice(0,5);
}

// Renderers
function renderCurrent(current, forecast) {
  const name = `${current.name || "—"}, ${current.sys?.country || ""}`;
  const desc = (current.weather?.[0]?.description || "—");
  const icon = current.weather?.[0]?.icon || "01d";
  const tzOffset = forecast?.city?.timezone ?? current.timezone ?? 0;

  // Compute today min/max from forecast for better accuracy
  let todayMin = current.main?.temp_min ?? current.main?.temp;
  let todayMax = current.main?.temp_max ?? current.main?.temp;
  if (forecast && forecast.list?.length) {
    const todayKey = dateKeyLocal(forecast.list[0].dt, tzOffset);
    const todayItems = forecast.list.filter(it => dateKeyLocal(it.dt, tzOffset) === todayKey);
    if (todayItems.length) {
      todayMin = Math.min(...todayItems.map(it=>it.main.temp_min));
      todayMax = Math.max(...todayItems.map(it=>it.main.temp_max));
    }
  }

  placeName.textContent = name;
  conditionText.textContent = desc.charAt(0).toUpperCase()+desc.slice(1);
  currentIcon.src = pickIcon(icon);
  currentTemp.textContent = fmtTemp(current.main?.temp);

  todayHigh.textContent = fmtTemp(todayMax).replace(/°C|°F/,'°');
  todayLow.textContent = fmtTemp(todayMin).replace(/°C|°F/,'°');

  feelsLike.textContent = fmtTemp(current.main?.feels_like);
  humidity.textContent = `${current.main?.humidity ?? "—"}%`;
  wind.textContent = `${toKmH(current.wind?.speed ?? 0)} km/h`;
  pressure.textContent = `${current.main?.pressure ?? "—"} hPa`;
  visibility.textContent = `${Math.round((current.visibility ?? 0)/1000)} km`;
  clouds.textContent = `${current.clouds?.all ?? 0}%`;
  sunrise.textContent = fmtTime(current.sys?.sunrise ?? 0, tzOffset);
  sunset.textContent = fmtTime(current.sys?.sunset ?? 0, tzOffset);

  const isNight = icon.endsWith("n");
  setBackgroundBy(current.weather?.[0]?.id, isNight);

  // Keep meta
  lastCityMeta = {
    name: current.name, country: current.sys?.country,
    lat: current.coord?.lat, lon: current.coord?.lon,
    tzOffsetSec: tzOffset
  };
}

function renderHourly(forecast, tzOffset) {
  hourlyStrip.innerHTML = "";
  const next12 = forecast.list.slice(0, 12); // 12 x 3h = 36h; but we’ll label local HH:MM and keep first 12 items
  for (const it of next12) {
    const item = document.createElement("div");
    item.className = "h-item";
    const hour = new Date((it.dt + tzOffset) * 1000).toUTCString().match(/\d{2}:\d{2}/)[0];
    item.innerHTML = `
      <div class="h-time">${hour}</div>
      <img src="${pickIcon(it.weather[0].icon)}" alt="">
      <div class="h-temp">${fmtTemp(it.main.temp)}</div>
    `;
    hourlyStrip.appendChild(item);
  }
}

function renderDaily(forecast, tzOffset) {
  dailyGrid.innerHTML = "";
  const days = buildDailyFromForecast(forecast.list, tzOffset);
  for (const d of days) {
    const div = document.createElement("div");
    div.className = "d-item";
    div.innerHTML = `
      <div class="d-name">${dayName(d.dt, tzOffset)}</div>
      <img src="${pickIcon(d.icon)}" alt="">
      <div class="d-range">${Math.round(d.max)}° / ${Math.round(d.min)}°</div>
    `;
    dailyGrid.appendChild(div);
  }
}

async function renderFavorites() {
  favorites.innerHTML = "";
  if (!favList.length) {
    favorites.innerHTML = `<div class="muted">কোনো প্রিয় শহর নেই। উপরের ⭐ বাটনে যোগ করুন।</div>`;
    return;
  }
  for (const name of favList) {
    try {
      const cur = await fetchCurrentByCity(name);
      const icon = cur.weather?.[0]?.icon || "01d";
      const card = document.createElement("div");
      card.className = "fav-card";
      card.innerHTML = `
        <div class="fav-left">
          <img src="${pickIcon(icon)}" alt="">
          <div>
            <div class="fav-name">${cur.name}, ${cur.sys?.country || ""}</div>
            <div class="muted">${(cur.weather?.[0]?.description || "").toUpperCase()}</div>
          </div>
        </div>
        <div class="fav-right">
          <div class="fav-temp">${fmtTemp(cur.main?.temp)}</div>
          <button class="fav-del" data-city="${name}">✖</button>
        </div>
      `;
      favorites.appendChild(card);
    } catch (e) {
      // ignore a single favorite failure
    }
  }

  favorites.addEventListener("click", (e) => {
    const btn = e.target.closest(".fav-del");
    if (!btn) return;
    const city = btn.dataset.city;
    favList = favList.filter(c => c.toLowerCase() !== city.toLowerCase());
    localStorage.setItem("favCities", JSON.stringify(favList));
    renderFavorites();
  }, { once:true });
}

// Core loader
async function loadByCity(q){
  try{
    const current = await fetchCurrentByCity(q);
    const forecast = await fetchForecastByCoords(current.coord.lat, current.coord.lon);
    renderCurrent(current, forecast);
    const tz = forecast.city.timezone || 0;
    renderHourly(forecast, tz);
    renderDaily(forecast, tz);
  }catch(err){
    alert("ডাটা লোড করতে সমস্যা হয়েছে। শহরের বানান ঠিক আছে কিনা দেখুন বা পরে চেষ্টা করুন.");
    console.error(err);
  }
}

async function loadByCoords(lat, lon){
  try{
    const current = await fetchCurrentByCoords(lat, lon);
    const forecast = await fetchForecastByCoords(lat, lon);
    renderCurrent(current, forecast);
    const tz = forecast.city.timezone || 0;
    renderHourly(forecast, tz);
    renderDaily(forecast, tz);
  }catch(err){
    alert("লোকেশন থেকে ডাটা পাওয়া যায়নি। পরে চেষ্টা করুন.");
    console.error(err);
  }
}

// Events
searchForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const q = searchInput.value.trim();
  if (q) loadByCity(q);
});

locateBtn.addEventListener("click", ()=>{
  if (!navigator.geolocation){
    alert("আপনার ব্রাউজার লোকেশন সাপোর্ট করে না।");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => loadByCoords(pos.coords.latitude, pos.coords.longitude),
    err => alert("লোকেশন অনুমতি দিন অথবা পরে চেষ্টা করুন।")
  );
});

themeToggle.addEventListener("click", ()=>{
  document.body.classList.toggle("dark");
  themeToggle.textContent = document.body.classList.contains("dark") ? "☀️ Light" : "🌙 Dark";
});

unitToggle.addEventListener("click", ()=>{
  useCelsius = !useCelsius;
  unitToggle.textContent = useCelsius ? "°C" : "°F";
  // Re-render current view by reloading last city if available
  if (lastCityMeta?.lat && lastCityMeta?.lon){
    loadByCoords(lastCityMeta.lat, lastCityMeta.lon);
  }
});

addFavBtn.addEventListener("click", ()=>{
  if (!lastCityMeta?.name) return;
  const name = lastCityMeta.name;
  if (!favList.some(c => c.toLowerCase() === name.toLowerCase())){
    favList.push(name);
    localStorage.setItem("favCities", JSON.stringify(favList));
    renderFavorites();
  }
});

clearFavBtn.addEventListener("click", ()=>{
  if (confirm("সব প্রিয় শহর মুছে ফেলতে চান?")){
    favList = [];
    localStorage.setItem("favCities", JSON.stringify(favList));
    renderFavorites();
  }
});

// Initial
(async function init(){
  // কিছু ডিফল্ট ফেভারিট যদি না থাকে
  if (!favList.length){
    favList = ["Rajshahi","Dhaka","Chattogram","Sylhet"];
    localStorage.setItem("favCities", JSON.stringify(favList));
  }
  renderFavorites();

  // ডিফল্ট লোড: Bogra (তুমি Bogra-তে আছো বলে)
  loadByCity("Bogra");
})();
