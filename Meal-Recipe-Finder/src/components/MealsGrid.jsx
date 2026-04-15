function MealCard({ meal, onSelect }) {
  return (
    <button type="button" className="meal-card" onClick={() => onSelect(meal.idMeal)}>
      <img src={meal.strMealThumb} alt={meal.strMeal} loading="lazy" />
      <div className="meal-card-overlay">
        <h3>{meal.strMeal}</h3>
        <span>Open recipe</span>
      </div>
    </button>
  );
}

function MealsGrid({ meals, onMealSelect }) {
  if (meals.length === 0) {
    return (
      <div className="empty-state">
        <p>Search for a meal to see matching dishes here.</p>
      </div>
    );
  }

  return (
    <div className="meals-grid" aria-label="Meal search results">
      {meals.map((meal) => (
        <MealCard key={meal.idMeal} meal={meal} onSelect={onMealSelect} />
      ))}
    </div>
  );
}

export default MealsGrid;