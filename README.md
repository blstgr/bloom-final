# Bloom

Bloom is a watering app for people who keep forgetting to water their plants. You take a photo,
Bloom tells you what the plant is and when it needs water, and shows which plants are thirsty
today.

What you can do in it:

- identify a plant from a photo and add it to your plants
- see which plants need water today and log a watering
- browse plants and read about them before you buy one
- save plants you like to favourites

What's new in this version:

- [Watering that follows the weather](#watering-that-follows-the-weather)
- [Plants that survive a restart](#plants-that-survive-a-restart)
- [A Library for your climate](#a-library-for-your-climate)
- [UX improvements](#ux-improvements): tab fade, search from the Library, dark mode

# Watering that follows the weather

Before, every plant had a fixed interval. A Monstera got water every 14 days in a wet October
and a hot July alike, in Kyiv and in Dubai.

Now Bloom reads the forecast for where you are (Open-Meteo) and moves each plant's next watering
date. It uses evapotranspiration, a single number for how fast water leaves soil that takes in
temperature, humidity, wind and sun. Dry, hot weather brings the date closer, cool and damp
weather pushes it back. The change is capped, so the weather adjusts the plant's own interval
instead of replacing it.

Your location comes from the phone's GPS, asked once right after sign-in. If you say no, Bloom
uses the city from your time zone. You can also turn detection off and pick any city by hand, or
turn the whole feature off if your home is climate controlled.

![Weather settings and city search](docs/screenshots/weather-watering.gif)

# Plants that survive a restart

Before, closing the app lost every plant you had added and every watering you had logged. Since
the schedule is calculated from the last watering, that reset the whole app.

Now your plants, watering history, favourites and settings are saved on the phone and come back
when you open the app. If one saved file is ever broken, the app still opens and only that part
starts fresh.

![Adding a plant, closing the app and opening it again](docs/screenshots/persistence.gif)

# A Library for your climate

The Library used to be an empty page with a search bar. Now it shows popular indoor plants,
ordered by how well they'd do where you live. Bloom looks at how short your winter days are, how
humid it is and how cold it gets (from Open-Meteo's weather history), so in Kyiv you get plants
that cope with low light, and in Dubai ones that like sun. Without a location you get the ten
most popular.

Chips on top filter the grid: All, Unkillable, Moody, Pet-safe, Sunbathers and Shady. The same
chips are used in Favourites.

![Library ranked by climate, filtered with chips](docs/screenshots/library-climate.gif)

# UX improvements

### Tab fade

Switching tabs used to be an instant cut. Now screens cross-fade, and the empty states on Home
and Water sit in exactly the same place, so the fade looks like one screen turning into another.

![Switching tabs](docs/screenshots/tab-fade.gif)

### Search from the Library

Tapping the search bar in the Library opens a search screen with your recent searches. Plants
Bloom already knows show up as you type, without waiting for the network, and tapping one opens
its page. City search in settings works the same way, with the same screen.

![Searching from the Library](docs/screenshots/library-search.gif)

### Dark mode

Bloom follows the phone's light or dark setting by default. In settings you can turn that off and
pick dark or light yourself. All colours come from one theme, so every screen and component
switches together.

![Light and dark](docs/screenshots/dark-mode.png)

# State management

Bloom uses both Context and Redux, each where it fits better.

| State | Where | Why |
|---|---|---|
| Your plants, watering history, plant search history | Context (`PlantDataProvider`) | Belongs to the plants feature, comes with functions that call the APIs, and is used by many screens |
| Weather forecast | Context (`WeatherProvider`) | Loaded from the network with loading and error states, cached by location |
| Current theme | Context (`ThemeProvider`) | Read by every component and changes rarely, the usual case for Context |
| Favourites | Redux (`favoritesSlice`) | Small and shared between screens that have nothing to do with each other |
| Settings: weather switches, city, recent cities, theme choice | Redux (`settingsSlice`) | Same as favourites, and easy to save: a listener writes the slice to storage when it changes |
| Search text, focus, open modals | `useState` | Only the screen itself needs it |

All the "does this plant need water?" logic goes through one hook, so the tab bar badge and the
Water screen always agree.

# Code structure

```
src/
├── components/ui/   reusable components, one folder per component
├── features/        plants, watering, weather, settings: logic and feature components
├── navigation/      navigators, typed route params, tab bar
├── screens/         one file per screen
├── services/        all network calls: Perenual, Pl@ntNet, DeepSeek, Unsplash, Open-Meteo
├── store/           Redux slices and saving to storage
└── theme/           colours, spacing, type, light and dark themes
```

- Every component has its own folder with an `index.ts`, and is imported through it.
- Screens only put things together. Data and state logic live in features and the store.
- No screen or component calls an API directly, everything goes through `services/`.
- Colours exist only in `theme/`, and the linter fails on a colour anywhere else.

# Running it

```bash
npm install
cp .env.example .env   # add keys for Perenual, Pl@ntNet, DeepSeek and Unsplash
npm run ios            # or: npm run android
```

Open-Meteo needs no key.

```bash
npm test               # 366 tests
npm run lint
npx tsc --noEmit
```
