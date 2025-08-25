const apiKey = "1fcd1f2253e99277a1fe30eaebc18456";

// থিম টগল
const themeBtn = document.getElementById("toggle-theme");
themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  themeBtn.textContent = document.body.classList.contains("dark") ? "☀️ Light Mode" : "🌙 Dark Mode";
});

// এলিমেন্ট রেফারেন্স
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const locateBtn = document.getElementById("locate-btn");
const locName = document.getElementById("location-name");
const curTemp = document.getElementById("current-temp");
const curDesc = document.getElementById("current-desc");
const curHum = document.getElementById("current-humidity");
const curWind = document.getElementById("current-wind");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const curIcon = document.getElementById("current-icon");
const forecastEl = document.getElementById("forecast");

// শহর সার্চ ইভেন্ট
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) getWeatherByCity(city);
});

// লোকেশন বাটন
locateBtn.addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => alert("লোকেশন এ ব্লক দেওয়া আছে!")
    );
  }
});

// শহর ভিত্তিক ফেঞ্চ
async function getWeatherByCity(city) {
  try {
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`
    );
    const [loc] = await geoRes.json();
    if (!loc) throw "কোনো রেজাল্ট পাওয়া যায় নি!";
    getWeatherByCoords(loc.lat, loc.lon, loc.name);
  } catch (err) {
    alert(err);
  }
}

// কোঅর্ডিনেট ভিত্তিক ফেঞ্চ
async function getWeatherByCoords(lat, lon, name = null) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}` +
      `&exclude=minutely,hourly,alerts&units=metric&appid=${apiKey}`
    );
    const data = await res.json();

    locName.textContent = name || data.timezone;
    curTemp.textContent = `${Math.round(data.current.temp)}°C`;
    curDesc.textContent = data.current.weather[0].description;
    curHum.textContent = data.current.humidity;
    curWind.textContent = data.current.wind_speed;
    curIcon.src = `https://openweathermap.org/img/wn/${data.current.weather[0].icon}@2x.png`;
    sunriseEl.textContent = new Date(data.current.sunrise * 1000)
      .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    sunsetEl.textContent = new Date(data.current.sunset * 1000)
      .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // ৭ দিনের পূর্বাভাস
    forecastEl.innerHTML = "";
    data.daily.slice(0, 7).forEach(day => {
      const date = new Date(day.dt * 1000);
      const card = document.createElement("div");
      card.className = "day-card";
      card.innerHTML = `
        <p>${date.toLocaleDateString('en-US',{weekday:'short'})}</p>
        <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="">
        <p>${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</p>
      `;
      forecastEl.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    alert("কিছু একটা ভুল হয়েছে। পরে চেষ্টা করো।");
  }
}

// ডিফল্ট হিসেবে রাজশাহী
getWeatherByCity("Rajshahi");
