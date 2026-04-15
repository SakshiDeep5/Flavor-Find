function RecipeDetails({ meal, ingredients }) {
  if (!meal) {
    return (
      <div className="empty-state detail-empty">
        <p>Select a meal card or use Random meal to see the recipe here.</p>
      </div>
    );
  }

  return (
    <article className="recipe-card">
      <img src={meal.strMealThumb} alt={meal.strMeal} />

      <div className="recipe-meta">
        {meal.strCategory ? (
          <p>
            <strong>Category:</strong> {meal.strCategory}
          </p>
        ) : null}
        {meal.strArea ? (
          <p>
            <strong>Origin:</strong> {meal.strArea}
          </p>
        ) : null}
        {meal.strTags ? (
          <p>
            <strong>Tags:</strong> {meal.strTags}
          </p>
        ) : null}
      </div>

      <section>
        <h3>Instructions</h3>
        <p>{meal.strInstructions}</p>
      </section>

      <section>
        <h3>Ingredients</h3>
        <ul className="ingredient-list">
          {ingredients.map((ingredient) => (
            <li key={ingredient}>{ingredient}</li>
          ))}
        </ul>
      </section>

      {meal.strYoutube ? (
        <a className="video-link" href={meal.strYoutube} target="_blank" rel="noreferrer">
          Watch on YouTube
        </a>
      ) : null}
    </article>
  );
}

export default RecipeDetails;