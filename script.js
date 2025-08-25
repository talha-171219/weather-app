const apiKey = "1fcd1f2253e99277a1fe30eaebc18456";

async function getWeather() {
  const city = document.getElementById("cityInput").value;
  if (!city) return;

  // Current weather
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
  const weatherRes = await fetch(weatherUrl);
  const weatherData = await weatherRes.json();

  document.getElementById("cityName").innerText = weatherData.name;
  document.getElementById("date").innerText = new Date().toDateString();
  document.getElementById("temperature").innerText = `${Math.round(weatherData.main.temp)}°C`;
  document.getElementById("condition").innerText = weatherData.weather[0].description;

  // 5-day forecast
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
  const forecastRes = await fetch(forecastUrl);
  const forecastData = await forecastRes.json();

  const forecastContainer = document.getElementById("forecast");
  forecastContainer.innerHTML = "";

  // Every 8th item = next day at same time
  for (let i = 0; i < forecastData.list.length; i += 8) {
    const day = forecastData.list[i];
    const date = new Date(day.dt_txt);
    const options = { weekday: "short" };

    const card = document.createElement("div");
    card.classList.add("forecast-card");
    card.innerHTML = `
      <h3>${date.toLocaleDateString("en-US", options)}</h3>
      <p>${Math.round(day.main.temp)}°C</p>
      <p>${day.weather[0].main}</p>
    `;
    forecastContainer.appendChild(card);
  }
}
