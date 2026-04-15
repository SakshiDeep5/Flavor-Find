/**
 * Meal Finder App - Production Grade
 * Implements modern JavaScript patterns, error handling, caching, and accessibility
 */

const MealFinder = (() => {
  // ==================== CONFIGURATION ====================
  const CONFIG = {
    API_BASE: 'https://www.themealdb.com/api/json/v1/1',
    ENDPOINTS: {
      SEARCH: '/search.php',
      LOOKUP: '/lookup.php',
      RANDOM: '/random.php'
    },
    CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
    DEBOUNCE_DELAY: 300, // milliseconds
    REQUEST_TIMEOUT: 8000 // milliseconds
  };

  // ==================== STATE MANAGEMENT ====================
  const state = {
    cache: new Map(),
    abortController: null,
    debounceTimer: null,
    lastSearchTime: 0,
    isLoading: false
  };

  // ==================== DOM REFERENCES ====================
  const DOM = {
    search: document.getElementById('search'),
    submit: document.getElementById('submit'),
    random: document.getElementById('random'),
    mealsEl: document.getElementById('meals'),
    resultHeading: document.getElementById('result-heading'),
    singleMealEl: document.getElementById('single-meal')
  };

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Generate cache key based on request type and parameters
   */
  const getCacheKey = (endpoint, param) => `${endpoint}:${param}`;

  /**
   * Check if cache entry is still valid
   */
  const isCacheValid = (timestamp) => {
    return Date.now() - timestamp < CONFIG.CACHE_DURATION;
  };

  /**
   * Get from cache if valid
   */
  const getFromCache = (key) => {
    const cached = state.cache.get(key);
    if (cached && isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    state.cache.delete(key);
    return null;
  };

  /**
   * Set cache entry
   */
  const setCache = (key, data) => {
    state.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  };

  /**
   * Debounce function to limit API calls during rapid input
   */
  const debounce = (callback, delay) => {
    return (...args) => {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(() => callback(...args), delay);
    };
  };

  /**
   * Abort previous request if still ongoing
   */
  const abortPreviousRequest = () => {
    if (state.abortController) {
      state.abortController.abort();
    }
    state.abortController = new AbortController();
  };

  /**
   * Show loading state
   */
  const showLoading = () => {
    DOM.resultHeading.innerHTML = '<p class="loading">Loading...</p>';
  };

  /**
   * Show error message
   */
  const showError = (message) => {
    DOM.resultHeading.innerHTML = `<p class="error" role="alert">${message}</p>`;
  };

  /**
   * Escape HTML to prevent XSS attacks
   */
  const escapeHtml = (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };

  /**
   * Fetch with timeout
   */
  const fetchWithTimeout = async (url, options = {}) => {
    const controller = options.signal ? new AbortController() : state.abortController;
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request was cancelled or timed out');
      }
      throw error;
    }
  };

  // ==================== API FUNCTIONS ====================

  /**
   * Search for meals by name
   */
  const searchMeal = async (e) => {
    e.preventDefault();

    // Clear single meal view
    DOM.singleMealEl.innerHTML = '';

    // Get search term
    const term = DOM.search.value.trim();

    // Validate input
    if (!term) {
      showError('Please enter a search term');
      DOM.search.focus();
      return;
    }

    // Cancel previous requests
    abortPreviousRequest();

    try {
      showLoading();

      // Check cache first
      const cacheKey = getCacheKey('search', term);
      let data = getFromCache(cacheKey);

      if (!data) {
        // Fetch from API
        const url = `${CONFIG.API_BASE}${CONFIG.ENDPOINTS.SEARCH}?s=${encodeURIComponent(term)}`;
        data = await fetchWithTimeout(url, { signal: state.abortController.signal });
        setCache(cacheKey, data);
      }

      // Display results
      displaySearchResults(data, term);

      // Clear search field
      DOM.search.value = '';
    } catch (error) {
      handleError(error, 'Failed to search meals');
    }
  };

  /**
   * Fetch meal by ID
   */
  const getMealById = async (mealID) => {
    if (!mealID || mealID.trim() === '') {
      showError('Invalid meal ID');
      return;
    }

    abortPreviousRequest();

    try {
      showLoading();

      // Check cache first
      const cacheKey = getCacheKey('lookup', mealID);
      let data = getFromCache(cacheKey);

      if (!data) {
        // Fetch from API
        const url = `${CONFIG.API_BASE}${CONFIG.ENDPOINTS.LOOKUP}?i=${encodeURIComponent(mealID)}`;
        data = await fetchWithTimeout(url, { signal: state.abortController.signal });
        setCache(cacheKey, data);
      }

      if (data.meals && data.meals.length > 0) {
        addMealToDOM(data.meals[0]);
      } else {
        showError('Meal not found');
      }
    } catch (error) {
      handleError(error, 'Failed to fetch meal details');
    }
  };

  /**
   * Get random meal
   */
  const getRandomMeal = async () => {
    // Clear previous results
    DOM.mealsEl.innerHTML = '';
    DOM.resultHeading.innerHTML = '';

    abortPreviousRequest();

    try {
      showLoading();

      const url = `${CONFIG.API_BASE}${CONFIG.ENDPOINTS.RANDOM}`;
      const data = await fetchWithTimeout(url, { signal: state.abortController.signal });

      if (data.meals && data.meals.length > 0) {
        addMealToDOM(data.meals[0]);
      } else {
        showError('Failed to fetch random meal');
      }
    } catch (error) {
      handleError(error, 'Failed to fetch random meal');
    }
  };

  // ==================== DOM MANIPULATION ====================

  /**
   * Display search results
   */
  const displaySearchResults = (data, term) => {
    DOM.resultHeading.innerHTML = '';

    if (!data.meals || data.meals.length === 0) {
      DOM.mealsEl.innerHTML = '';
      showError(`No search results found for "${escapeHtml(term)}". Try different keywords!`);
      return;
    }

    DOM.resultHeading.innerHTML = `<h2>Results for "${escapeHtml(term)}":</h2>`;

    DOM.mealsEl.innerHTML = data.meals
      .map(meal => createMealCard(meal))
      .join('');
  };

  /**
   * Create meal card HTML
   */
  const createMealCard = (meal) => {
    return `
      <div class="meal">
        <img 
          src="${meal.strMealThumb}" 
          alt="${escapeHtml(meal.strMeal)}"
          loading="lazy"
        />
        <div class="meal-info" data-mealid="${escapeHtml(meal.idMeal)}" tabindex="0" role="button">
          <h3>${escapeHtml(meal.strMeal)}</h3>
        </div>
      </div>
    `;
  };

  /**
   * Add meal details to DOM
   */
  const addMealToDOM = (meal) => {
    const ingredients = extractIngredients(meal);

    DOM.singleMealEl.innerHTML = `
      <div class="single-meal">
        <h1>${escapeHtml(meal.strMeal)}</h1>
        <img 
          src="${meal.strMealThumb}" 
          alt="${escapeHtml(meal.strMeal)}"
        />
        <div class="single-meal-info">
          ${meal.strCategory ? `<p><strong>Category:</strong> ${escapeHtml(meal.strCategory)}</p>` : ''}
          ${meal.strArea ? `<p><strong>Origin:</strong> ${escapeHtml(meal.strArea)}</p>` : ''}
        </div>
        <div class="main">
          <h2>Instructions</h2>
          <p>${escapeHtml(meal.strInstructions)}</p>
          <h2>Ingredients</h2>
          <ul>
            ${ingredients.map(ing => `<li>${escapeHtml(ing)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    // Scroll to view
    DOM.singleMealEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /**
   * Extract ingredients from meal object
   */
  const extractIngredients = (meal) => {
    const ingredients = [];

    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (ingredient && ingredient.trim()) {
        ingredients.push(`${ingredient} - ${measure || 'to taste'}`);
      }
    }

    return ingredients;
  };

  /**
   * Handle and display errors
   */
  const handleError = (error, fallbackMessage) => {
    console.error('Meal Finder Error:', error);

    if (error.name === 'AbortError') {
      return; // Silent abort - user cancelled the request
    }

    if (error.message.includes('timed out')) {
      showError('Request timed out. Please check your connection and try again.');
    } else if (error.message.includes('Failed to fetch')) {
      showError('Network error. Please check your connection.');
    } else {
      showError(fallbackMessage || error.message);
    }
  };

  // ==================== EVENT HANDLERS ====================

  /**
   * Handle meal card click - use event delegation and composedPath
   */
  const handleMealClick = (e) => {
    // Use composedPath() instead of deprecated e.path
    const path = e.composedPath();
    const mealInfo = path.find(item => {
      return item.classList && item.classList.contains('meal-info');
    });

    if (mealInfo) {
      const mealID = mealInfo.getAttribute('data-mealid');
      getMealById(mealID);
    }
  };

  /**
   * Handle keyboard navigation on meal cards
   */
  const handleMealKeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleMealClick(e);
    }
  };

  // ==================== INITIALIZATION ====================

  /**
   * Initialize event listeners
   */
  const init = () => {
    // Form submission
    DOM.submit.addEventListener('submit', searchMeal);

    // Random meal button
    DOM.random.addEventListener('click', getRandomMeal);

    // Meal card clicks with event delegation
    DOM.mealsEl.addEventListener('click', handleMealClick);
    DOM.mealsEl.addEventListener('keydown', handleMealKeydown);

    // Debounced search for real-time feedback (optional enhancement)
    // You can enable this for search-as-you-type functionality
    // DOM.search.addEventListener('input', debounce(searchMeal, CONFIG.DEBOUNCE_DELAY));
  };

  // ==================== PUBLIC API ====================

  return {
    init
  };
})();

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => MealFinder.init());
} else {
  MealFinder.init();
}