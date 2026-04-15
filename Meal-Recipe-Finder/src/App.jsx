import { useEffect, useRef, useState } from 'react';
import './App.css';
import HeroSection from './components/HeroSection.jsx';
import MealsGrid from './components/MealsGrid.jsx';
import RecipeDetails from './components/RecipeDetails.jsx';
import SearchBar from './components/SearchBar.jsx';
import StatusMessage from './components/StatusMessage.jsx';

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

      <HeroSection>
        <SearchBar
          searchText={searchText}
          onSearchTextChange={setSearchText}
          onSubmit={searchMeals}
          onRandom={getRandomMeal}
          isLoading={isLoading}
        />

        <StatusMessage isLoading={isLoading} status={status} error={error} />
      </HeroSection>

      <section className="content-grid" id="main-content">
        <div className="panel">
          <div className="panel-header">
            <h2>Search results</h2>
            <span>{results.length} meals</span>
          </div>

          <MealsGrid meals={results} onMealSelect={openMeal} />
        </div>

        <aside className="panel recipe-panel" id="meal-details">
          <div className="panel-header">
            <h2>Recipe details</h2>
          </div>

          <RecipeDetails meal={selectedMeal} ingredients={ingredients} />
        </aside>
      </section>
    </main>
  );
}

export default App;