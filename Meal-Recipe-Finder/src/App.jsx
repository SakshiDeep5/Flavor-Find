import { useEffect, useRef, useState } from 'react';
import './App.css';

const API_BASE = 'https://www.themealdb.com/api/json/v1/1';
const CACHE_DURATION = 30 * 60 * 1000;
const REQUEST_TIMEOUT = 8000;

function App() {
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState([]);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [status, setStatus] = useState('Search for a meal to get started.');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const cacheRef = useRef(new Map());
  const abortRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (character) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };

      return map[character];
    });

  const getCacheKey = (type, value) => `${type}:${value}`;

  const getCachedData = (key) => {
    const cachedEntry = cacheRef.current.get(key);

    if (!cachedEntry) {
      return null;
    }

    if (Date.now() - cachedEntry.timestamp > CACHE_DURATION) {
      cacheRef.current.delete(key);
      return null;
    }

    return cachedEntry.data;
  };

  const setCachedData = (key, data) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
    });
  };

  const createAbortController = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    abortRef.current = new AbortController();
    timeoutRef.current = window.setTimeout(() => {
      abortRef.current?.abort();
    }, REQUEST_TIMEOUT);

    return abortRef.current;
  };

  const fetchJson = async (url) => {
    const controller = createAbortController();
    const response = await fetch(url, { signal: controller.signal });

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    return response.json();
  };

  const extractIngredients = (meal) => {
    const ingredients = [];

    for (let index = 1; index <= 20; index += 1) {
      const ingredient = meal[`strIngredient${index}`];
      const measure = meal[`strMeasure${index}`];

      if (ingredient && ingredient.trim()) {
        ingredients.push(`${ingredient} - ${measure?.trim() || 'to taste'}`);
      }
    }

    return ingredients;
  };

  const setLoadingState = (message) => {
    setIsLoading(true);
    setError('');
    setStatus(message);
  };

  const handleAppError = (incomingError, fallbackMessage) => {
    if (incomingError?.name === 'AbortError') {
      return;
    }

    const message = String(incomingError?.message || '');

    if (message.toLowerCase().includes('http error')) {
      setError('The meal service returned an error. Please try again.');
    } else if (message.toLowerCase().includes('failed to fetch')) {
      setError('Network error. Check your connection and try again.');
    } else if (message.toLowerCase().includes('timeout')) {
      setError('Request timed out. Please try again.');
    } else {
      setError(fallbackMessage || message || 'Something went wrong.');
    }

    setStatus('');
  };

  const searchMeals = async (event) => {
    event.preventDefault();

    const term = searchText.trim();

    if (!term) {
      setResults([]);
      setSelectedMeal(null);
      setError('Please enter a search term.');
      setStatus('');
      return;
    }

    setLoadingState(`Searching for ${term}...`);
    setSelectedMeal(null);

    try {
      const cacheKey = getCacheKey('search', term.toLowerCase());
      const cachedData = getCachedData(cacheKey);
      const data =
        cachedData ||
        (await fetchJson(`${API_BASE}/search.php?s=${encodeURIComponent(term)}`));

      if (!cachedData) {
        setCachedData(cacheKey, data);
      }

      const meals = data?.meals || [];
      setResults(meals);

      if (meals.length === 0) {
        setError(`No results found for ${term}. Try a different keyword.`);
        setStatus('');
      } else {
        setError('');
        setStatus(`Showing ${meals.length} result${meals.length === 1 ? '' : 's'} for ${term}.`);
      }

      setSearchText('');
    } catch (incomingError) {
      handleAppError(incomingError, 'Failed to search meals.');
    } finally {
      setIsLoading(false);
    }
  };

  const openMeal = async (mealId) => {
    if (!mealId) {
      setError('Invalid meal selection.');
      return;
    }

    setLoadingState('Loading meal details...');

    try {
      const cacheKey = getCacheKey('lookup', mealId);
      const cachedData = getCachedData(cacheKey);
      const data =
        cachedData ||
        (await fetchJson(`${API_BASE}/lookup.php?i=${encodeURIComponent(mealId)}`));

      if (!cachedData) {
        setCachedData(cacheKey, data);
      }

      const meal = data?.meals?.[0] || null;

      if (!meal) {
        setError('Meal not found.');
        setSelectedMeal(null);
        setStatus('');
        return;
      }

      setSelectedMeal(meal);
      setError('');
      setStatus(`Viewing ${meal.strMeal}.`);

      window.requestAnimationFrame(() => {
        document.getElementById('meal-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (incomingError) {
      handleAppError(incomingError, 'Failed to load meal details.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRandomMeal = async () => {
    setResults([]);
    setSelectedMeal(null);
    setLoadingState('Finding a random meal...');

    try {
      const data = await fetchJson(`${API_BASE}/random.php`);
      const meal = data?.meals?.[0] || null;

      if (!meal) {
        setError('Failed to fetch a random meal.');
        setStatus('');
        return;
      }

      setSelectedMeal(meal);
      setError('');
      setStatus(`Random pick: ${meal.strMeal}.`);
    } catch (incomingError) {
      handleAppError(incomingError, 'Failed to fetch a random meal.');
    } finally {
      setIsLoading(false);
    }
  };

  const ingredients = selectedMeal ? extractIngredients(selectedMeal) : [];

  return (
    <main className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <section className="hero">
        <p className="eyebrow">Meal Recipe Finder</p>
        <h1>Find meals, open recipes, and explore random dishes.</h1>
        <p className="hero-copy">
          Search TheMealDB, inspect ingredients, and jump straight into detailed instructions.
        </p>

        <form className="search-bar" onSubmit={searchMeals}>
          <label className="sr-only" htmlFor="search">
            Search for meals
          </label>
          <input
            id="search"
            type="text"
            placeholder="Search for meals or keywords"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
          <button type="submit" disabled={isLoading}>
            Search
          </button>
          <button type="button" className="secondary" onClick={getRandomMeal} disabled={isLoading}>
            Random meal
          </button>
        </form>

        <div className="status-row" aria-live="polite" aria-atomic="true">
          {isLoading ? <p className="status loading">Loading...</p> : null}
          {!isLoading && status ? <p className="status">{status}</p> : null}
          {error ? <p className="status error" role="alert">{error}</p> : null}
        </div>
      </section>

      <section className="content-grid" id="main-content">
        <div className="panel">
          <div className="panel-header">
            <h2>Search results</h2>
            <span>{results.length} meals</span>
          </div>

          {results.length > 0 ? (
            <div className="meals-grid" aria-label="Meal search results">
              {results.map((meal) => (
                <button key={meal.idMeal} type="button" className="meal-card" onClick={() => openMeal(meal.idMeal)}>
                  <img src={meal.strMealThumb} alt={escapeHtml(meal.strMeal)} loading="lazy" />
                  <div className="meal-card-overlay">
                    <h3>{meal.strMeal}</h3>
                    <span>Open recipe</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Search for a meal to see matching dishes here.</p>
            </div>
          )}
        </div>

        <aside className="panel recipe-panel" id="meal-details">
          <div className="panel-header">
            <h2>Recipe details</h2>
          </div>

          {selectedMeal ? (
            <article className="recipe-card">
              <img src={selectedMeal.strMealThumb} alt={selectedMeal.strMeal} />
              <div className="recipe-meta">
                {selectedMeal.strCategory ? <p><strong>Category:</strong> {selectedMeal.strCategory}</p> : null}
                {selectedMeal.strArea ? <p><strong>Origin:</strong> {selectedMeal.strArea}</p> : null}
                {selectedMeal.strTags ? <p><strong>Tags:</strong> {selectedMeal.strTags}</p> : null}
              </div>

              <section>
                <h3>Instructions</h3>
                <p>{selectedMeal.strInstructions}</p>
              </section>

              <section>
                <h3>Ingredients</h3>
                <ul className="ingredient-list">
                  {ingredients.map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              </section>

              {selectedMeal.strYoutube ? (
                <a className="video-link" href={selectedMeal.strYoutube} target="_blank" rel="noreferrer">
                  Watch on YouTube
                </a>
              ) : null}
            </article>
          ) : (
            <div className="empty-state detail-empty">
              <p>Select a meal card or use Random meal to see the recipe here.</p>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

export default App;